import type { UsageService } from "@/lib/api-client/contracts/usage";
import { validateModelColor } from "@/lib/validation/usage";
import type { MockContext } from "../context";
import {
  DEMO_MODEL_COLORS,
  DEMO_USAGE_REQUESTS,
  DEMO_USAGE_SERIES,
  DEMO_USAGE_SUMMARY,
} from "../fixtures/usage";
import { paginate, withinRange } from "../pagination";
import {
  applyModelColorOverrides,
  setModelColorOverride,
} from "../model-color-store";
import { fail, respond } from "../scenarios";

export function createUsageService(ctx: MockContext): UsageService {
  return {
    async getSummary(query = {}, options) {
      return respond(ctx, options, (meta) => {
        if (meta.scenario === "empty") {
          return {
            ...DEMO_USAGE_SUMMARY,
            period: {
              from: query.from ?? DEMO_USAGE_SUMMARY.period.from,
              to: query.to ?? DEMO_USAGE_SUMMARY.period.to,
              timezone: "Asia/Jakarta" as const,
            },
            totalSpend: 0,
            totalRequests: 0,
            inputTokens: 0,
            cachedInputTokens: 0,
            outputTokens: 0,
            reasoningTokens: 0,
            topUpTotal: 0,
            availableBalance: 0,
            reservedBalance: 0,
            topModel: null,
            bySource: [],
          };
        }
        return {
          ...DEMO_USAGE_SUMMARY,
          period: {
            from: query.from ?? DEMO_USAGE_SUMMARY.period.from,
            to: query.to ?? DEMO_USAGE_SUMMARY.period.to,
            timezone: "Asia/Jakarta" as const,
          },
        };
      });
    },

    async getSeries(query, options) {
      return respond(ctx, options, (meta) => {
        if (meta.scenario === "empty") {
          return {
            metric: query.metric ?? "cost",
            points: [],
            simulated: true as const,
          };
        }
        return {
          metric: query.metric ?? "cost",
          points: DEMO_USAGE_SERIES.filter((point) =>
            withinRange(point.date, query.from, query.to),
          ),
          simulated: true as const,
        };
      });
    },

    async listRequests(query = {}, options) {
      return respond(ctx, options, (meta) => {
        if (meta.scenario === "empty") {
          return paginate([], query);
        }
        const filtered = DEMO_USAGE_REQUESTS.filter((request) => {
          if (query.modelId && request.modelId !== query.modelId) {
            return false;
          }
          if (query.source && request.source !== query.source) {
            return false;
          }
          if (
            query.billingStatus &&
            request.billingStatus !== query.billingStatus
          ) {
            return false;
          }
          return withinRange(request.createdAt, query.from, query.to);
        });
        return paginate(filtered, query);
      });
    },

    async listModelColors(options) {
      return respond(ctx, options, (meta) =>
        meta.scenario === "empty"
          ? []
          : applyModelColorOverrides(DEMO_MODEL_COLORS),
      );
    },

    async updateModelColor(input, options) {
      const colorError = validateModelColor(input.colorHex);
      if (colorError) {
        return fail(ctx, options, "VALIDATION_ERROR", {
          fieldErrors: { colorHex: colorError },
        });
      }

      const existing = DEMO_MODEL_COLORS.find(
        (color) => color.modelId === input.modelId,
      );
      if (!existing) {
        return fail(ctx, options, "NOT_FOUND");
      }

      return respond(ctx, options, (meta) => {
        setModelColorOverride(
          input.modelId,
          input.colorHex,
          meta.generatedAt,
        );
        return {
          ...existing,
          colorHex: input.colorHex,
          source: "manual" as const,
          assignedAt: meta.generatedAt,
        };
      });
    },
  };
}
