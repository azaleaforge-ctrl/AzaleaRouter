import { Router } from "express";
import type { DatabaseClient } from "@azalea-router/database";
import type { UsageService, UsageStartResult } from "@azalea-router/billing";
import type { ApiKeyService } from "../auth/api-key-service.js";
import { createApiKeyAuthentication } from "../middleware/api-key-authentication.js";
import { HttpError } from "../lib/http-error.js";
import type { GatewayCompletionInput, GatewayProviderAdapter } from "../gateway/provider-adapter.js";
import { z } from "zod";
import "../auth/api-key-types.js";

const messageSchema = z.object({
  role: z.enum(["system", "developer", "user", "assistant", "tool"]),
  content: z.string().max(1_000_000),
  name: z.string().max(128).optional(),
  tool_call_id: z.string().max(128).optional(),
}).strict();

const chatCompletionSchema = z.object({
  model: z.string().trim().min(3).max(255),
  messages: z.array(messageSchema).min(1).max(256),
  max_tokens: z.number().int().min(1).max(131_072).optional(),
  temperature: z.number().min(0).max(2).optional(),
  top_p: z.number().min(0).max(1).optional(),
  stop: z.union([z.string().max(256), z.array(z.string().max(256)).max(16)]).optional(),
  stream: z.boolean().default(false),
  endpoint_id: z.string().uuid().optional(),
}).strict();

interface ProviderUsage {
  prompt_tokens: number;
  completion_tokens: number;
  cached_tokens: number;
  reasoning_tokens: number;
}

function safeTokenCount(value: unknown): number | null {
  if (typeof value !== "number" || !Number.isSafeInteger(value) || value < 0) return null;
  return value;
}

function extractUsage(value: unknown): ProviderUsage | null {
  if (!value || typeof value !== "object") return null;
  const root = value as Record<string, unknown>;
  const usage = root.usage;
  if (!usage || typeof usage !== "object") return null;
  const record = usage as Record<string, unknown>;
  const prompt = safeTokenCount(record.prompt_tokens);
  const completion = safeTokenCount(record.completion_tokens);
  if (prompt === null || completion === null) return null;

  const promptDetails = record.prompt_tokens_details && typeof record.prompt_tokens_details === "object"
    ? record.prompt_tokens_details as Record<string, unknown>
    : {};
  const completionDetails = record.completion_tokens_details && typeof record.completion_tokens_details === "object"
    ? record.completion_tokens_details as Record<string, unknown>
    : {};

  return {
    prompt_tokens: prompt,
    completion_tokens: completion,
    cached_tokens: safeTokenCount(promptDetails.cached_tokens) ?? 0,
    reasoning_tokens: safeTokenCount(completionDetails.reasoning_tokens) ?? 0,
  };
}

function extractRequestId(value: unknown): string | undefined {
  if (!value || typeof value !== "object") return undefined;
  const id = (value as Record<string, unknown>).id;
  return typeof id === "string" && id.length <= 255 ? id : undefined;
}

function mapUsageStartError(error: unknown): HttpError {
  const code = error instanceof Error ? error.message : "";
  const map: Record<string, { status: number; message: string }> = {
    PRICING_NOT_READY: { status: 503, message: "Current endpoint pricing is not available." },
    PRICING_POLICY_NOT_READY: { status: 503, message: "An approved pricing policy is not available." },
    PRICING_SNAPSHOT_STALE: { status: 503, message: "Current pricing data is stale." },
    FX_SNAPSHOT_INVALID: { status: 503, message: "A valid USD/IDR FX snapshot is not available." },
    WALLET_NOT_FOUND: { status: 402, message: "A prepaid wallet is required before using the gateway." },
    WALLET_NOT_ACTIVE: { status: 403, message: "The prepaid wallet is not active." },
    INSUFFICIENT_FUNDS: { status: 402, message: "Available wallet balance is insufficient for this request." },
    API_KEY_RATE_LIMITED: { status: 429, message: "API key requests per minute limit has been reached." },
    API_KEY_CONCURRENCY_LIMIT: { status: 429, message: "API key concurrent request limit has been reached." },
    API_KEY_SPEND_LIMIT_EXCEEDED: { status: 429, message: "API key spend limit has been reached." },
    API_KEY_INVALID: { status: 401, message: "A valid AzaleaRouter API key is required." },
    REQUEST_ALREADY_PROCESSED: { status: 409, message: "This idempotency key has already been used." },
    IDEMPOTENCY_KEY_CONFLICT: { status: 409, message: "This idempotency key belongs to another request." },
    MAX_TOKENS_REQUIRED: { status: 400, message: "max_tokens is required when the endpoint has no verified completion limit." },
  };
  const mapped = map[code];
  if (!mapped) return new HttpError(503, "USAGE_RESERVATION_FAILED", "The usage reservation could not be created.");
  return new HttpError(mapped.status, code, mapped.message);
}

function readSseUsageLine(line: string): { usage: ProviderUsage | null; requestId?: string } {
  const trimmed = line.trim();
  if (!trimmed.startsWith("data:")) return { usage: null };
  const data = trimmed.slice(5).trim();
  if (!data || data === "[DONE]") return { usage: null };
  try {
    const parsed: unknown = JSON.parse(data);
    const usage = extractUsage(parsed);
    const requestId = extractRequestId(parsed);
    return { usage, ...(requestId ? { requestId } : {}) };
  } catch {
    return { usage: null };
  }
}

export interface GatewayRouterOptions {
  database: DatabaseClient;
  apiKeys: ApiKeyService;
  usage: UsageService;
  provider?: GatewayProviderAdapter;
  enabled: boolean;
  upstreamApproved: boolean;
  settlementReady: boolean;
}

export function createGatewayRouter(options: GatewayRouterOptions): Router {
  const router = Router();
  const authenticate = createApiKeyAuthentication(options.apiKeys);

  router.post("/chat/completions", authenticate, async (req, res) => {
    const key = req.apiKey!;
    if (!key.scopes.includes("chat:completions")) {
      throw new HttpError(403, "API_KEY_SCOPE_FORBIDDEN", "This API key does not have chat completion permission.");
    }

    if (!options.enabled || !options.upstreamApproved || !options.settlementReady || !options.provider) {
      throw new HttpError(
        503,
        "GATEWAY_DISABLED",
        "The AI gateway is not enabled. Upstream commercial approval and usage settlement are required.",
      );
    }

    const input = chatCompletionSchema.parse(req.body);
    const model = await options.database.catalogModel.findFirst({
      where: {
        source: "openrouter",
        isActive: true,
        OR: [{ canonicalSlug: input.model }, { sourceModelId: input.model }],
        endpoints: {
          some: {
            isActive: true,
            apiPath: "/api/v1/chat/completions",
            prices: { some: { currency: "USD" } },
          },
        },
      },
      include: {
        endpoints: {
          where: {
            isActive: true,
            apiPath: "/api/v1/chat/completions",
            prices: { some: { currency: "USD" } },
            ...(input.endpoint_id ? { id: input.endpoint_id } : {}),
          },
          include: { provider: { select: { slug: true } } },
          orderBy: [{ provider: { displayName: "asc" } }, { endpointName: "asc" }],
          take: 1,
        },
      },
    });
    if (!model) throw new HttpError(404, "MODEL_NOT_FOUND", "Model is not currently available.");
    if (key.allowedModelIds.length > 0 && !key.allowedModelIds.includes(model.canonicalSlug)) {
      throw new HttpError(403, "API_KEY_MODEL_FORBIDDEN", "This API key is not allowed to use the requested model.");
    }
    const endpoint = model.endpoints[0];
    if (!endpoint) throw new HttpError(503, "MODEL_ENDPOINT_UNAVAILABLE", "No priced endpoint is currently available.");

    const maxTokens = input.max_tokens ?? endpoint.maxCompletionTokens ?? model.maxCompletionTokens;
    if (!maxTokens || maxTokens < 1) {
      throw new HttpError(400, "MAX_TOKENS_REQUIRED", "max_tokens is required when the endpoint has no verified completion limit.");
    }
    if (
      endpoint.maxCompletionTokens !== null &&
      maxTokens > endpoint.maxCompletionTokens
    ) {
      throw new HttpError(400, "MAX_TOKENS_EXCEEDED", "max_tokens exceeds the selected endpoint's completion limit.");
    }

    const promptText = input.messages.map((message) => message.content).join("\n");
    const estimatedPromptTokens = Buffer.byteLength(promptText, "utf8");
    if (endpoint.maxPromptTokens !== null && estimatedPromptTokens > endpoint.maxPromptTokens) {
      throw new HttpError(400, "PROMPT_LIMIT_EXCEEDED", "The request exceeds the selected endpoint's safe prompt-size limit.");
    }

    const requestId = req.requestId;
    const idempotencyKey = req.header("idempotency-key")?.trim() || requestId;
    let usageStart: UsageStartResult;
    try {
      usageStart = await options.usage.begin({
        userId: key.userId,
        apiKeyId: key.apiKeyId,
        requestId,
        idempotencyKey,
        catalogModelId: model.id,
        canonicalModelId: model.canonicalSlug,
        sourceModelId: model.sourceModelId,
        catalogEndpointId: endpoint.id,
        providerSlug: endpoint.provider.slug,
        estimatedPromptTokens,
        maxCompletionTokens: maxTokens,
      });
    } catch (error) {
      throw mapUsageStartError(error);
    }

    const providerInput: GatewayCompletionInput = {
      model: endpoint.modelVariant ?? model.sourceModelId,
      messages: input.messages.map((message) => ({
        role: message.role,
        content: message.content,
        ...(message.name === undefined ? {} : { name: message.name }),
        ...(message.tool_call_id === undefined ? {} : { tool_call_id: message.tool_call_id }),
      })),
      stream: input.stream,
      providerSlug: endpoint.provider.slug,
      max_tokens: maxTokens,
      ...(input.temperature === undefined ? {} : { temperature: input.temperature }),
      ...(input.top_p === undefined ? {} : { top_p: input.top_p }),
      ...(input.stop === undefined ? {} : { stop: input.stop }),
    };

    const controller = new AbortController();
    let clientDisconnected = false;
    req.once("aborted", () => {
      clientDisconnected = true;
      controller.abort();
    });
    res.once("close", () => {
      if (!res.writableEnded) {
        clientDisconnected = true;
        controller.abort();
      }
    });

    const startedAt = Date.now();
    let upstream: Response;
    try {
      upstream = input.stream
        ? await options.provider.stream(providerInput, controller.signal)
        : await options.provider.complete(providerInput, controller.signal);
    } catch {
      // A transport error can happen after the provider accepted the request.
      // Keep the reservation pending for reconciliation rather than refunding a
      // charge whose upstream outcome is not known.
      await options.usage.markPendingReconciliation({
        usageRecordId: usageStart.usageRecordId,
        errorCode: "UPSTREAM_TRANSPORT_RESULT_UNKNOWN",
      });
      throw new HttpError(503, "UPSTREAM_UNAVAILABLE", "The model provider is temporarily unavailable.");
    }

    if (!upstream.ok) {
      if (upstream.status >= 500) {
        await options.usage.markPendingReconciliation({
          usageRecordId: usageStart.usageRecordId,
          errorCode: "UPSTREAM_COST_UNKNOWN",
        });
      } else {
        await options.usage.fail({
          usageRecordId: usageStart.usageRecordId,
          errorCode: "UPSTREAM_REQUEST_REJECTED",
        });
      }
      const payload = await upstream.json().catch(() => ({
        error: { code: "UPSTREAM_REQUEST_FAILED", message: "Upstream model provider rejected the request." },
      }));
      res.status(upstream.status).setHeader("content-type", "application/json");
      res.setHeader("x-request-id", requestId);
      res.send(payload);
      return;
    }

    res.setHeader("x-request-id", requestId);
    if (input.stream) {
      if (!upstream.body) {
        await options.usage.markPendingReconciliation({
          usageRecordId: usageStart.usageRecordId,
          errorCode: "UPSTREAM_STREAM_BODY_MISSING",
        });
        res.status(502).end();
        return;
      }

      await options.usage.markStreaming(usageStart.usageRecordId);
      res.status(upstream.status);
      res.setHeader("content-type", "text/event-stream; charset=utf-8");
      res.setHeader("cache-control", "no-cache, no-transform");
      res.setHeader("connection", "keep-alive");
      res.flushHeaders();

      const reader = upstream.body.getReader();
      const decoder = new TextDecoder();
      let partialLine = "";
      const usageState: { value: ProviderUsage | null } = { value: null };
      let providerRequestId: string | undefined;
      let lastLeaseRefresh = Date.now();

      const consumeLine = (line: string) => {
        const parsed = readSseUsageLine(line);
        if (parsed.usage) usageState.value = parsed.usage;
        if (parsed.requestId) providerRequestId = parsed.requestId;
      };

      try {
        while (true) {
          const item = await reader.read();
          if (item.done) break;
          const bytes = Buffer.from(item.value);
          if (!res.write(bytes)) {
            await new Promise<void>((resolve) => {
              res.once("drain", resolve);
              res.once("close", resolve);
            });
          }

          partialLine += decoder.decode(item.value, { stream: true });
          const lines = partialLine.split(/\r?\n/);
          partialLine = lines.pop() ?? "";
          for (const line of lines) consumeLine(line);

          if (Date.now() - lastLeaseRefresh >= 30_000) {
            await options.usage.extendLease(usageStart.usageRecordId);
            lastLeaseRefresh = Date.now();
          }
          if (clientDisconnected) break;
        }
        partialLine += decoder.decode();
        if (partialLine) consumeLine(partialLine);
      } catch {
        clientDisconnected = true;
        controller.abort();
      } finally {
        reader.releaseLock();
        if (!res.writableEnded) res.end();
      }

      const finalUsage = usageState.value;
      if (clientDisconnected || !finalUsage) {
        await options.usage.markPendingReconciliation({
          usageRecordId: usageStart.usageRecordId,
          errorCode: clientDisconnected ? "CLIENT_DISCONNECTED_STREAM" : "STREAM_USAGE_TRAILER_MISSING",
        });
        return;
      }

      try {
        const final = await options.usage.finalize({
          usageRecordId: usageStart.usageRecordId,
          ...(providerRequestId ? { providerRequestId } : {}),
          promptTokens: finalUsage.prompt_tokens,
          completionTokens: finalUsage.completion_tokens,
          cachedTokens: finalUsage.cached_tokens,
          reasoningTokens: finalUsage.reasoning_tokens,
          latencyMs: Date.now() - startedAt,
        });
        if (final.reconciliationRequired) {
          // The response has already been streamed. The full reservation remains held
          // until an operator or reconciliation job resolves the amount difference.
        }
      } catch {
        await options.usage.markPendingReconciliation({
          usageRecordId: usageStart.usageRecordId,
          errorCode: "USAGE_SETTLEMENT_FAILED",
        });
      }
      return;
    }

    res.status(upstream.status).setHeader("content-type", "application/json");
    if (!upstream.body) {
      await options.usage.markPendingReconciliation({
        usageRecordId: usageStart.usageRecordId,
        errorCode: "UPSTREAM_RESPONSE_BODY_MISSING",
      });
      res.end("{}");
      return;
    }

    let payload: unknown;
    try {
      payload = await upstream.json();
    } catch {
      await options.usage.markPendingReconciliation({
        usageRecordId: usageStart.usageRecordId,
        errorCode: "UPSTREAM_RESPONSE_INVALID",
      });
      res.status(502).json({
        error: { code: "UPSTREAM_RESPONSE_INVALID", message: "Upstream provider returned an invalid response." },
      });
      return;
    }

    const finalUsage = extractUsage(payload);
    if (!finalUsage) {
      await options.usage.markPendingReconciliation({
        usageRecordId: usageStart.usageRecordId,
        errorCode: "UPSTREAM_USAGE_MISSING",
      });
    } else {
      try {
        await options.usage.finalize({
          usageRecordId: usageStart.usageRecordId,
          ...(extractRequestId(payload) ? { providerRequestId: extractRequestId(payload)! } : {}),
          promptTokens: finalUsage.prompt_tokens,
          completionTokens: finalUsage.completion_tokens,
          cachedTokens: finalUsage.cached_tokens,
          reasoningTokens: finalUsage.reasoning_tokens,
          latencyMs: Date.now() - startedAt,
        });
      } catch {
        await options.usage.markPendingReconciliation({
          usageRecordId: usageStart.usageRecordId,
          errorCode: "USAGE_SETTLEMENT_FAILED",
        });
      }
    }
    res.send(payload);
  });

  return router;
}
