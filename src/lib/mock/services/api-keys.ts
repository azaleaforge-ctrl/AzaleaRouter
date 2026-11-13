import type { ApiKeyService } from "@/lib/api-client/contracts/api-keys";
import { maskApiKey } from "@/lib/formatters/api-key";
import { validateApiKeyLabel } from "@/lib/validation/api-keys";
import type { MockContext } from "../context";
import {
  DEMO_API_KEYS,
  DEMO_API_KEY_WARNING,
} from "../fixtures/api-keys";
import { deterministicId, deterministicToken, fail, respond } from "../scenarios";

function createSecret(seed: string): string {
  return `AZL-DEMO-${deterministicToken(seed, 32)}-NOT-A-REAL-KEY`;
}

export function createApiKeyService(ctx: MockContext): ApiKeyService {
  return {
    async list(options) {
      return respond(ctx, options, (meta) =>
        meta.scenario === "empty" ? [] : [...DEMO_API_KEYS],
      );
    },

    async create(input, options) {
      const labelError = validateApiKeyLabel(input.label);
      if (labelError) {
        return fail(ctx, options, "VALIDATION_ERROR", {
          fieldErrors: { label: labelError },
        });
      }

      return respond(ctx, options, (meta) => {
        const secret = createSecret(`${input.label}:${meta.generatedAt}`);
        return {
          key: {
            id: deterministicId("KEY", secret),
            label: input.label.trim(),
            maskedKey: maskApiKey(secret),
            status: "active" as const,
            scopes: input.scopes ?? ["chat:write"],
            spendLimitIdr: input.spendLimitIdr ?? null,
            rateLimitPerMinute: input.rateLimitPerMinute ?? null,
            modelAllowlist: input.modelAllowlist ?? [],
            lastUsedAt: null,
            createdAt: meta.generatedAt,
            revokedAt: null,
            expiresAt: input.expiresAt ?? null,
            simulated: true as const,
          },
          secret,
          tokenUsable: false as const,
          tokenKind: "demo-non-usable" as const,
          revealOnce: true as const,
          warning: DEMO_API_KEY_WARNING,
        };
      });
    },

    async revoke(id, options) {
      const existing = DEMO_API_KEYS.find((key) => key.id === id);
      if (!existing) {
        return fail(ctx, options, "NOT_FOUND");
      }
      return respond(ctx, options, (meta) => ({
        ...existing,
        status: "revoked" as const,
        revokedAt: meta.generatedAt,
      }));
    },

    async rotate(id, options) {
      const existing = DEMO_API_KEYS.find((key) => key.id === id);
      if (!existing) {
        return fail(ctx, options, "NOT_FOUND");
      }
      return respond(ctx, options, (meta) => {
        const secret = createSecret(`${id}:${meta.generatedAt}`);
        return {
          key: {
            ...existing,
            maskedKey: maskApiKey(secret),
            status: "active" as const,
            lastUsedAt: null,
            createdAt: meta.generatedAt,
            revokedAt: null,
          },
          secret,
          tokenUsable: false as const,
          tokenKind: "demo-non-usable" as const,
          revealOnce: true as const,
          warning: DEMO_API_KEY_WARNING,
        };
      });
    },
  };
}
