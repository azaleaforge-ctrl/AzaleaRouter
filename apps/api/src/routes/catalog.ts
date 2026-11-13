import { Router } from "express";
import type { DatabaseClient } from "@azalea-router/database";
import { z } from "zod";
import { HttpError } from "../lib/http-error.js";

const listQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(50),
  cursor: z.string().uuid().optional(),
  q: z.string().trim().min(1).max(120).optional(),
  developer: z.string().trim().min(1).max(255).optional(),
  provider: z.string().trim().min(1).max(255).optional(),
  input_modality: z.string().trim().min(1).max(32).optional(),
  output_modality: z.string().trim().min(1).max(32).optional(),
}).strict();

function toPrice(price: {
  currency: string;
  promptPrice: { toString(): string };
  completionPrice: { toString(): string };
  requestPrice: { toString(): string };
  imagePrice: { toString(): string };
  sourceFetchedAt: Date;
}) {
  return {
    currency: price.currency,
    prompt: price.promptPrice.toString(),
    completion: price.completionPrice.toString(),
    request: price.requestPrice.toString(),
    image: price.imagePrice.toString(),
    source_fetched_at: price.sourceFetchedAt.toISOString(),
  };
}

function toEndpoint(endpoint: {
  id: string;
  endpointName: string;
  modelVariant: string | null;
  apiPath: string;
  contextLength: number | null;
  maxCompletionTokens: number | null;
  maxPromptTokens: number | null;
  quantization: string | null;
  supportedParameters: string[];
  sourceFetchedAt: Date;
  provider: { slug: string; displayName: string };
  prices: Array<{
    currency: string;
    promptPrice: { toString(): string };
    completionPrice: { toString(): string };
    requestPrice: { toString(): string };
    imagePrice: { toString(): string };
    sourceFetchedAt: Date;
  }>;
}) {
  return {
    id: endpoint.id,
    provider: { slug: endpoint.provider.slug, name: endpoint.provider.displayName },
    name: endpoint.endpointName,
    model_variant: endpoint.modelVariant,
    api_path: endpoint.apiPath,
    context_length: endpoint.contextLength,
    max_completion_tokens: endpoint.maxCompletionTokens,
    max_prompt_tokens: endpoint.maxPromptTokens,
    quantization: endpoint.quantization,
    supported_parameters: endpoint.supportedParameters,
    source_fetched_at: endpoint.sourceFetchedAt.toISOString(),
    pricing: endpoint.prices[0] ? toPrice(endpoint.prices[0]) : null,
  };
}

function modelInclude() {
  return {
    developer: { select: { slug: true, displayName: true } },
    endpoints: {
      where: {
        isActive: true,
        apiPath: "/api/v1/chat/completions",
        prices: { some: { currency: "USD" } },
      },
      include: {
        provider: { select: { slug: true, displayName: true } },
        prices: {
          orderBy: { sourceFetchedAt: "desc" as const },
          take: 1,
        },
      },
      orderBy: [{ provider: { displayName: "asc" as const } }, { endpointName: "asc" as const }],
    },
  };
}

export function createCatalogRouter(database: DatabaseClient): Router {
  const router = Router();

  router.get("/catalog/status", async (_req, res) => {
    const [activeModels, latestRun] = await Promise.all([
      database.catalogModel.count({
        where: {
          source: "openrouter",
          isActive: true,
          endpoints: {
            some: {
              isActive: true,
              apiPath: "/api/v1/chat/completions",
              prices: { some: { currency: "USD" } },
            },
          },
        },
      }),
      database.catalogSyncRun.findFirst({
        where: { source: "openrouter" },
        orderBy: { startedAt: "desc" },
      }),
    ]);

    res.status(200).json({
      source: "openrouter",
      minimum_required_models: 50,
      active_canonical_chat_models: activeModels,
      ready_for_public_catalog: activeModels >= 50,
      last_sync: latestRun ? {
        id: latestRun.id,
        status: latestRun.status,
        started_at: latestRun.startedAt.toISOString(),
        completed_at: latestRun.completedAt?.toISOString() ?? null,
        discovered_models: latestRun.discoveredModels,
        validated_models: latestRun.validatedModels,
        active_models: latestRun.activeModels,
        discovered_endpoints: latestRun.discoveredEndpoints,
        price_snapshots: latestRun.priceSnapshots,
        error_code: latestRun.errorCode,
      } : null,
    });
  });

  router.get("/models", async (req, res) => {
    const query = listQuerySchema.parse(req.query);
    const clauses: object[] = [
      { source: "openrouter" },
      { isActive: true },
      {
        endpoints: {
          some: {
            isActive: true,
            apiPath: "/api/v1/chat/completions",
            prices: { some: { currency: "USD" } },
          },
        },
      },
    ];

    if (query.q) {
      clauses.push({
        OR: [
          { name: { contains: query.q, mode: "insensitive" } },
          { canonicalSlug: { contains: query.q, mode: "insensitive" } },
          { description: { contains: query.q, mode: "insensitive" } },
        ],
      });
    }
    if (query.developer) clauses.push({ developer: { slug: query.developer } });
    if (query.input_modality) clauses.push({ inputModalities: { has: query.input_modality } });
    if (query.output_modality) clauses.push({ outputModalities: { has: query.output_modality } });
    if (query.provider) {
      clauses.push({
        endpoints: {
          some: {
            isActive: true,
            apiPath: "/api/v1/chat/completions",
            provider: { slug: query.provider },
            prices: { some: { currency: "USD" } },
          },
        },
      });
    }

    const where = { AND: clauses };
    const [rows, totalActive] = await Promise.all([
      database.catalogModel.findMany({
        where,
        take: query.limit + 1,
        ...(query.cursor ? { cursor: { id: query.cursor }, skip: 1 } : {}),
        orderBy: [{ name: "asc" }, { id: "asc" }],
        include: modelInclude(),
      }),
      database.catalogModel.count({
        where: {
          source: "openrouter",
          isActive: true,
          endpoints: {
            some: {
              isActive: true,
              apiPath: "/api/v1/chat/completions",
              prices: { some: { currency: "USD" } },
            },
          },
        },
      }),
    ]);

    const hasMore = rows.length > query.limit;
    const items = rows.slice(0, query.limit);
    res.status(200).json({
      data: items.map((model) => ({
        id: model.id,
        canonical_id: model.canonicalSlug,
        source_model_id: model.sourceModelId,
        name: model.name,
        description: model.description,
        developer: model.developer ? {
          slug: model.developer.slug,
          name: model.developer.displayName,
        } : null,
        context_length: model.contextLength,
        max_completion_tokens: model.maxCompletionTokens,
        input_modalities: model.inputModalities,
        output_modalities: model.outputModalities,
        supported_parameters: model.supportedParameters,
        endpoints: model.endpoints.map(toEndpoint),
        last_verified_at: model.lastSeenAt.toISOString(),
      })),
      page: {
        limit: query.limit,
        next_cursor: hasMore ? items[items.length - 1]?.id ?? null : null,
      },
      total_active_models: totalActive,
      catalog_ready: totalActive >= 50,
    });
  });

  router.get("/models/:modelId", async (req, res) => {
    const modelId = req.params.modelId;
    if (!modelId || modelId.length > 64) {
      throw new HttpError(400, "MODEL_ID_INVALID", "Model identifier is invalid.");
    }
    const model = await database.catalogModel.findFirst({
      where: {
        OR: [{ id: modelId }, { canonicalSlug: modelId }],
        source: "openrouter",
        isActive: true,
        endpoints: {
          some: {
            isActive: true,
            apiPath: "/api/v1/chat/completions",
            prices: { some: { currency: "USD" } },
          },
        },
      },
      include: modelInclude(),
    });
    if (!model) throw new HttpError(404, "MODEL_NOT_FOUND", "Model was not found or is not currently available.");

    res.status(200).json({
      id: model.id,
      canonical_id: model.canonicalSlug,
      source_model_id: model.sourceModelId,
      name: model.name,
      description: model.description,
      developer: model.developer ? {
        slug: model.developer.slug,
        name: model.developer.displayName,
      } : null,
      context_length: model.contextLength,
      max_completion_tokens: model.maxCompletionTokens,
      input_modalities: model.inputModalities,
      output_modalities: model.outputModalities,
      supported_parameters: model.supportedParameters,
      endpoints: model.endpoints.map(toEndpoint),
      last_verified_at: model.lastSeenAt.toISOString(),
    });
  });

  router.get("/models/:modelId/endpoints", async (req, res) => {
    const modelId = req.params.modelId;
    const model = await database.catalogModel.findFirst({
      where: {
        OR: [{ id: modelId }, { canonicalSlug: modelId }],
        source: "openrouter",
        isActive: true,
      },
      include: {
        endpoints: {
          where: {
            isActive: true,
            apiPath: "/api/v1/chat/completions",
            prices: { some: { currency: "USD" } },
          },
          include: {
            provider: { select: { slug: true, displayName: true } },
            prices: { orderBy: { sourceFetchedAt: "desc" }, take: 1 },
          },
          orderBy: [{ provider: { displayName: "asc" } }, { endpointName: "asc" }],
        },
      },
    });
    if (!model) throw new HttpError(404, "MODEL_NOT_FOUND", "Model was not found.");
    res.status(200).json({
      canonical_id: model.canonicalSlug,
      endpoints: model.endpoints.map(toEndpoint),
    });
  });

  router.get("/developers", async (_req, res) => {
    const developers = await database.catalogDeveloper.findMany({
      where: {
        source: "openrouter",
        models: {
          some: {
            isActive: true,
            endpoints: {
              some: {
                isActive: true,
                apiPath: "/api/v1/chat/completions",
                prices: { some: { currency: "USD" } },
              },
            },
          },
        },
      },
      orderBy: { displayName: "asc" },
      select: {
        slug: true,
        displayName: true,
        _count: { select: { models: { where: { isActive: true } } } },
      },
    });
    res.status(200).json({
      data: developers.map((developer) => ({
        slug: developer.slug,
        name: developer.displayName,
        active_models: developer._count.models,
      })),
    });
  });

  router.get("/providers", async (_req, res) => {
    const providers = await database.catalogProvider.findMany({
      where: {
        source: "openrouter",
        endpoints: {
          some: {
            isActive: true,
            apiPath: "/api/v1/chat/completions",
            prices: { some: { currency: "USD" } },
            model: { isActive: true },
          },
        },
      },
      orderBy: { displayName: "asc" },
      select: {
        slug: true,
        displayName: true,
        _count: { select: { endpoints: { where: { isActive: true } } } },
      },
    });
    res.status(200).json({
      data: providers.map((provider) => ({
        slug: provider.slug,
        name: provider.displayName,
        active_endpoints: provider._count.endpoints,
      })),
    });
  });

  return router;
}

