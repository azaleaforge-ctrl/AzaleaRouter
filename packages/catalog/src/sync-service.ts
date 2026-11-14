import { createHash } from "node:crypto";
import type { DatabaseClient } from "@azalea-router/database";
import { CatalogSourceError, OpenRouterCatalogClient } from "./openrouter-client.js";
import type { OpenRouterEndpoint, OpenRouterModel } from "./schemas.js";

const SOURCE = "openrouter";
const CHAT_PATH = "/api/v1/chat/completions";

export interface CatalogSyncOptions {
  maximumModels?: number;
  endpointConcurrency?: number;
  now?: () => Date;
}

export interface CatalogSyncResult {
  runId: string;
  status: "succeeded" | "partial" | "failed";
  discoveredModels: number;
  validatedModels: number;
  activeModels: number;
  discoveredEndpoints: number;
  priceSnapshots: number;
  failedModelEndpoints: number;
  catalogReady: boolean;
  minimumRequiredModels: number;
}

function sha256(value: string): string {
  return createHash("sha256").update(value, "utf8").digest("hex");
}

function providerSlug(value: string): string {
  return value.toLowerCase().normalize("NFKD")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 255);
}

function sourceDate(unixSeconds: number | undefined): Date | null {
  if (unixSeconds === undefined) return null;
  const date = new Date(unixSeconds * 1000);
  return Number.isFinite(date.getTime()) ? date : null;
}

function decimalLooksValid(value: string): boolean {
  if (!/^\d+(?:\.\d+)?$/.test(value)) return false;
  const [whole = "", fraction = ""] = value.split(".");
  return whole.length <= 14 && fraction.length <= 24;
}

function hasChatCapability(model: OpenRouterModel): boolean {
  return (model.endpoints ?? []).includes(CHAT_PATH) &&
    (model.architecture?.output_modalities ?? []).includes("text");
}

function canonicalSlug(model: OpenRouterModel): string | null {
  const value = model.canonical_slug ?? model.id;
  const parts = value.split("/");
  if (parts.length !== 2 || parts.some((part) => !part.trim() || part === "." || part === "..")) return null;
  return value;
}

function validEndpoint(endpoint: OpenRouterEndpoint): boolean {
  return decimalLooksValid(endpoint.pricing.prompt) &&
    decimalLooksValid(endpoint.pricing.completion) &&
    decimalLooksValid(endpoint.pricing.request ?? "0") &&
    decimalLooksValid(endpoint.pricing.image ?? "0");
}

async function withConcurrency<T, R>(
  items: T[],
  concurrency: number,
  callback: (item: T) => Promise<R>,
): Promise<R[]> {
  const output: R[] = new Array(items.length);
  let nextIndex = 0;
  const count = Math.min(Math.max(1, concurrency), items.length);
  await Promise.all(Array.from({ length: count }, async () => {
    while (true) {
      const index = nextIndex;
      nextIndex += 1;
      if (index >= items.length) return;
      output[index] = await callback(items[index]!);
    }
  }));
  return output;
}

export class CatalogSyncService {
  private readonly now: () => Date;

  constructor(
    private readonly database: DatabaseClient,
    private readonly source: OpenRouterCatalogClient,
    private readonly options: CatalogSyncOptions = {},
  ) {
    this.now = options.now ?? (() => new Date());
  }

  async sync(): Promise<CatalogSyncResult> {
    const run = await this.database.catalogSyncRun.create({
      data: {
        source: SOURCE,
        status: "running",
      },
    });
    const fetchedAt = this.now();
    let discoveredModels = 0;
    let validatedModels = 0;
    let activeModels = 0;
    let discoveredEndpoints = 0;
    let priceSnapshots = 0;
    let failedModelEndpoints = 0;
    let completeScan = false;

    try {
      const sourceModels = await this.source.listChatModels();
      discoveredModels = sourceModels.length;
      if (sourceModels.length === 0) {
        throw new CatalogSourceError("CATALOG_SOURCE_EMPTY", "The upstream model catalog returned no eligible chat models.", true);
      }
      const maximumModels = this.options.maximumModels ?? 5000;
      if (sourceModels.length > maximumModels) {
        throw new CatalogSourceError("CATALOG_SIZE_LIMIT", "Source model list exceeded the configured safe limit.", false);
      }

      // Canonical slug is the identity key. Aliases/SKUs are never counted as separate models.
      const uniqueModels = new Map<string, OpenRouterModel>();
      for (const model of sourceModels) {
        if (!hasChatCapability(model)) continue;
        const slug = canonicalSlug(model);
        if (!slug || uniqueModels.has(slug)) continue;
        uniqueModels.set(slug, model);
      }

      const canonicalIdsSeen = new Set<string>();
      const results = await withConcurrency(
        [...uniqueModels.values()],
        this.options.endpointConcurrency ?? 4,
        async (model) => {
          const slug = canonicalSlug(model)!;
          try {
            const endpoints = await this.source.listModelEndpoints(model.id);
            const validEndpoints = endpoints.filter((endpoint) =>
              endpoint.model_id === model.id && validEndpoint(endpoint),
            );
            if (validEndpoints.length === 0) return { model, slug, endpointCount: 0, snapshots: 0, valid: false };

            const [developerSlug, modelPart] = slug.split("/");
            if (!developerSlug || !modelPart) return { model, slug, endpointCount: 0, snapshots: 0, valid: false };

            const developer = await this.database.catalogDeveloper.upsert({
              where: { source_slug: { source: SOURCE, slug: developerSlug } },
              update: { displayName: developerSlug },
              create: {
                source: SOURCE,
                slug: developerSlug,
                // OpenRouter's canonical author segment is preserved as supplied;
                // no guessed brand/display-name expansion is applied.
                displayName: developerSlug,
              },
            });

            const savedModel = await this.database.catalogModel.upsert({
              where: { source_canonicalSlug: { source: SOURCE, canonicalSlug: slug } },
              update: {
                sourceModelId: model.id,
                name: model.name,
                description: model.description ?? null,
                sourceCreatedAt: sourceDate(model.created),
                contextLength: model.context_length ?? null,
                maxCompletionTokens: model.top_provider?.max_completion_tokens ?? null,
                inputModalities: model.architecture?.input_modalities ?? [],
                outputModalities: model.architecture?.output_modalities ?? [],
                supportedParameters: model.supported_parameters ?? [],
                servedEndpoints: model.endpoints ?? [],
                rawMetadata: model as never,
                isActive: true,
                lastSeenAt: fetchedAt,
                developerId: developer.id,
              },
              create: {
                source: SOURCE,
                sourceModelId: model.id,
                canonicalSlug: slug,
                name: model.name,
                description: model.description ?? null,
                sourceCreatedAt: sourceDate(model.created),
                contextLength: model.context_length ?? null,
                maxCompletionTokens: model.top_provider?.max_completion_tokens ?? null,
                inputModalities: model.architecture?.input_modalities ?? [],
                outputModalities: model.architecture?.output_modalities ?? [],
                supportedParameters: model.supported_parameters ?? [],
                servedEndpoints: model.endpoints ?? [],
                rawMetadata: model as never,
                isActive: true,
                lastSeenAt: fetchedAt,
                developerId: developer.id,
              },
            });

            let savedEndpointCount = 0;
            let savedSnapshotCount = 0;
            for (const endpoint of validEndpoints) {
              const providerIdentifier = providerSlug(endpoint.tag);
              if (!providerIdentifier) continue;

              const provider = await this.database.catalogProvider.upsert({
                where: { source_slug: { source: SOURCE, slug: providerIdentifier } },
                update: { displayName: endpoint.provider_name },
                create: {
                  source: SOURCE,
                  slug: providerIdentifier,
                  displayName: endpoint.provider_name,
                },
              });

              const endpointIdentity = [
                slug,
                providerIdentifier,
                endpoint.name,
                endpoint.quantization ?? "",
                String(endpoint.context_length ?? ""),
                String(endpoint.max_completion_tokens ?? ""),
              ].join("|");
              const sourceEndpointId = sha256(endpointIdentity);
              const savedEndpoint = await this.database.catalogEndpoint.upsert({
                where: { source_sourceEndpointId: { source: SOURCE, sourceEndpointId } },
                update: {
                  endpointName: endpoint.name,
                  modelVariant: endpoint.model_id,
                  apiPath: CHAT_PATH,
                  contextLength: endpoint.context_length ?? null,
                  maxCompletionTokens: endpoint.max_completion_tokens ?? null,
                  maxPromptTokens: endpoint.max_prompt_tokens ?? null,
                  quantization: endpoint.quantization ?? null,
                  supportedParameters: endpoint.supported_parameters ?? [],
                  isActive: true,
                  rawMetadata: endpoint as never,
                  sourceFetchedAt: fetchedAt,
                },
                create: {
                  source: SOURCE,
                  sourceEndpointId,
                  modelId: savedModel.id,
                  providerId: provider.id,
                  endpointName: endpoint.name,
                  modelVariant: endpoint.model_id,
                  apiPath: CHAT_PATH,
                  contextLength: endpoint.context_length ?? null,
                  maxCompletionTokens: endpoint.max_completion_tokens ?? null,
                  maxPromptTokens: endpoint.max_prompt_tokens ?? null,
                  quantization: endpoint.quantization ?? null,
                  supportedParameters: endpoint.supported_parameters ?? [],
                  isActive: true,
                  rawMetadata: endpoint as never,
                  sourceFetchedAt: fetchedAt,
                },
              });
              savedEndpointCount += 1;

              const pricePayload = JSON.stringify({
                prompt: endpoint.pricing.prompt,
                completion: endpoint.pricing.completion,
                request: endpoint.pricing.request ?? "0",
                image: endpoint.pricing.image ?? "0",
              });
              const payloadHash = sha256(pricePayload);
              const latestPrice = await this.database.catalogPriceSnapshot.findFirst({
                where: { endpointId: savedEndpoint.id },
                orderBy: { sourceFetchedAt: "desc" },
                select: { sourcePayloadHash: true },
              });
              if (latestPrice?.sourcePayloadHash !== payloadHash) {
                await this.database.catalogPriceSnapshot.create({
                  data: {
                    endpointId: savedEndpoint.id,
                    currency: "USD",
                    promptPrice: endpoint.pricing.prompt,
                    completionPrice: endpoint.pricing.completion,
                    requestPrice: endpoint.pricing.request ?? "0",
                    imagePrice: endpoint.pricing.image ?? "0",
                    sourceFetchedAt: fetchedAt,
                    sourcePayloadHash: payloadHash,
                  },
                });
                savedSnapshotCount += 1;
              }
            }

            const valid = savedEndpointCount > 0;
            if (valid) canonicalIdsSeen.add(slug);
            return {
              model,
              slug,
              endpointCount: savedEndpointCount,
              snapshots: savedSnapshotCount,
              valid,
            };
          } catch {
            // Preserve last-known-good catalog rows; never deactivate the catalog after a partial upstream failure.
            failedModelEndpoints += 1;
            return { model, slug, endpointCount: 0, snapshots: 0, valid: false };
          }
        },
      );

      for (const result of results) {
        if (result.valid) {
          validatedModels += 1;
          activeModels += 1;
          discoveredEndpoints += result.endpointCount;
          priceSnapshots += result.snapshots;
        }
      }

      completeScan = failedModelEndpoints === 0;
      if (completeScan) {
        await this.database.catalogModel.updateMany({
          where: {
            source: SOURCE,
            canonicalSlug: { notIn: [...canonicalIdsSeen] },
          },
          data: { isActive: false },
        });
      }

      const status = failedModelEndpoints === 0 ? "succeeded" : "partial";
      const minimumRequiredModels = 50;
      const distinctActiveCount = await this.database.catalogModel.count({
        where: {
          source: SOURCE,
          isActive: true,
          endpoints: {
            some: {
              isActive: true,
              apiPath: CHAT_PATH,
              prices: { some: { currency: "USD" } },
            },
          },
        },
      });

      await this.database.catalogSyncRun.update({
        where: { id: run.id },
        data: {
          status,
          completedAt: this.now(),
          discoveredModels,
          validatedModels,
          activeModels: distinctActiveCount,
          discoveredEndpoints,
          priceSnapshots,
          safeSummary: {
            completeScan,
            failedModelEndpoints,
            minimumRequiredModels,
            catalogReady: distinctActiveCount >= minimumRequiredModels,
          } as never,
        },
      });

      return {
        runId: run.id,
        status,
        discoveredModels,
        validatedModels,
        activeModels: distinctActiveCount,
        discoveredEndpoints,
        priceSnapshots,
        failedModelEndpoints,
        catalogReady: distinctActiveCount >= minimumRequiredModels,
        minimumRequiredModels,
      };
    } catch (error) {
      const code = error instanceof CatalogSourceError ? error.code : "CATALOG_SYNC_FAILED";
      await this.database.catalogSyncRun.update({
        where: { id: run.id },
        data: {
          status: "failed",
          completedAt: this.now(),
          discoveredModels,
          validatedModels,
          activeModels,
          discoveredEndpoints,
          priceSnapshots,
          errorCode: code,
          safeSummary: { failedModelEndpoints } as never,
        },
      });
      throw new CatalogSourceError(code, "Model catalog synchronization failed.", error instanceof CatalogSourceError ? error.retryable : true);
    }
  }
}
