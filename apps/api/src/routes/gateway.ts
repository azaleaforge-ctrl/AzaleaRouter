import { Router } from "express";
import type { DatabaseClient } from "@azalea-router/database";
import type { ApiKeyService } from "../auth/api-key-service.js";
import { createApiKeyAuthentication } from "../middleware/api-key-authentication.js";
import { HttpError } from "../lib/http-error.js";
import type { GatewayCompletionInput, GatewayProviderAdapter } from "../gateway/provider-adapter.js";
import { z } from "zod";

const messageSchema = z.object({
  role: z.enum(["system", "developer", "user", "assistant", "tool"]),
  // BE-5 initially supports text-only requests. Multimodal payloads are rejected
  // rather than forwarded to endpoints whose input capability has not been verified.
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

export interface GatewayRouterOptions {
  database: DatabaseClient;
  apiKeys: ApiKeyService;
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
    if (
      input.max_tokens !== undefined &&
      endpoint.maxCompletionTokens !== null &&
      input.max_tokens > endpoint.maxCompletionTokens
    ) {
      throw new HttpError(400, "MAX_TOKENS_EXCEEDED", "max_tokens exceeds the selected endpoint's completion limit.");
    }

    // BE-6 adds request reservation, spend cap enforcement, usage persistence and final settlement.
    // A gateway request must not reach an upstream provider until that financial boundary is active.
    if (!options.enabled || !options.upstreamApproved || !options.settlementReady || !options.provider) {
      throw new HttpError(
        503,
        "GATEWAY_DISABLED",
        "The AI gateway is not enabled. Upstream legal approval and usage settlement are required.",
      );
    }
    if (key.spendLimitIdr !== null) {
      throw new HttpError(503, "SPEND_LIMIT_CONTROL_NOT_READY", "Per-key spend limit enforcement is not available yet.");
    }

    const controller = new AbortController();
    req.once("aborted", () => controller.abort());
    res.once("close", () => {
      if (!res.writableEnded) controller.abort();
    });

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
      ...(input.max_tokens === undefined ? {} : { max_tokens: input.max_tokens }),
      ...(input.temperature === undefined ? {} : { temperature: input.temperature }),
      ...(input.top_p === undefined ? {} : { top_p: input.top_p }),
      ...(input.stop === undefined ? {} : { stop: input.stop }),
    };

    const upstream = input.stream
      ? await options.provider.stream(providerInput, controller.signal)
      : await options.provider.complete(providerInput, controller.signal);

    res.status(upstream.status);
    res.setHeader("x-request-id", req.requestId);
    if (input.stream) {
      res.setHeader("content-type", "text/event-stream; charset=utf-8");
      res.setHeader("cache-control", "no-cache, no-transform");
      res.setHeader("connection", "keep-alive");
      if (!upstream.body) {
        res.end();
        return;
      }
      const reader = upstream.body.getReader();
      try {
        while (true) {
          const item = await reader.read();
          if (item.done) break;
          if (!res.write(Buffer.from(item.value))) {
            await new Promise<void>((resolve) => res.once("drain", resolve));
          }
        }
      } finally {
        reader.releaseLock();
        if (!res.writableEnded) res.end();
      }
      return;
    }

    res.setHeader("content-type", "application/json");
    if (!upstream.body) {
      res.end("{}");
      return;
    }
    const payload = await upstream.json().catch(() => null);
    if (payload === null) {
      throw new HttpError(502, "UPSTREAM_RESPONSE_INVALID", "Upstream provider returned an invalid response.");
    }
    res.send(payload);
  });

  return router;
}
