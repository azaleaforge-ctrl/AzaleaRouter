import type {
  AdminMutationResult,
  AdminService,
} from "@/lib/api-client/contracts/admin";
import type { ApiMeta } from "@/lib/api-client/types";
import type { MockContext } from "../context";
import {
  DEMO_ADMIN_AUDIT_LOGS,
  DEMO_ADMIN_MODELS,
  DEMO_ADMIN_OVERVIEW,
  DEMO_ADMIN_PAYMENTS,
  DEMO_ADMIN_PROVIDERS,
  DEMO_ADMIN_USERS,
} from "../fixtures/admin";
import { paginate } from "../pagination";
import { deterministicId, fail, respond } from "../scenarios";

function mutation(
  meta: ApiMeta,
  action: string,
  target: string,
  reason: string,
): AdminMutationResult {
  return {
    simulated: true,
    applied: false,
    message:
      "Simulasi admin: perubahan tidak disimpan dan tidak mengubah data atau layanan nyata.",
    auditEntry: {
      id: deterministicId("AUDIT", `${action}:${target}:${meta.generatedAt}`),
      actor: "admin@demo.test",
      action,
      target,
      reason,
      createdAt: meta.generatedAt,
      simulated: true,
    },
  };
}

export function createAdminService(ctx: MockContext): AdminService {
  return {
    async getOverview(options) {
      return respond(ctx, options, (meta) => {
        if (meta.scenario === "empty") {
          return {
            ...DEMO_ADMIN_OVERVIEW,
            revenueIdr: 0,
            topUpIdr: 0,
            debitIdr: 0,
            marginIdr: 0,
            upstreamCostUsd: 0,
            requests: 0,
            errorRatePercent: 0,
            reservedBalanceIdr: 0,
            pendingReconciliationCount: 0,
            activeUsers: 0,
            generatedAt: meta.generatedAt,
          };
        }
        return { ...DEMO_ADMIN_OVERVIEW, generatedAt: meta.generatedAt };
      });
    },

    async listUsers(query = {}, options) {
      return respond(ctx, options, (meta) => {
        if (meta.scenario === "empty") {
          return paginate([], query);
        }
        const search = query.search?.trim().toLowerCase();
        const filtered = DEMO_ADMIN_USERS.filter((user) => {
          if (query.status && user.status !== query.status) {
            return false;
          }
          if (
            search &&
            ![user.name, user.email, user.id].some((value) =>
              value.toLowerCase().includes(search),
            )
          ) {
            return false;
          }
          return true;
        });
        return paginate(filtered, query);
      });
    },

    async listModels(query = {}, options) {
      return respond(ctx, options, (meta) => {
        if (meta.scenario === "empty") {
          return paginate([], query);
        }
        const search = query.search?.trim().toLowerCase();
        const filtered = DEMO_ADMIN_MODELS.filter((model) => {
          if (!search) {
            return true;
          }
          return [model.name, model.id, model.developerName].some((value) =>
            value.toLowerCase().includes(search),
          );
        });
        return paginate(filtered, query);
      });
    },

    async listProviders(options) {
      return respond(ctx, options, (meta) =>
        meta.scenario === "empty" ? [] : [...DEMO_ADMIN_PROVIDERS],
      );
    },

    async listPayments(query = {}, options) {
      return respond(ctx, options, (meta) =>
        meta.scenario === "empty"
          ? paginate([], query)
          : paginate(DEMO_ADMIN_PAYMENTS, query),
      );
    },

    async listAuditLogs(query = {}, options) {
      return respond(ctx, options, (meta) =>
        meta.scenario === "empty"
          ? paginate([], query)
          : paginate(DEMO_ADMIN_AUDIT_LOGS, query),
      );
    },

    async setUserStatus(input, options) {
      const user = DEMO_ADMIN_USERS.find((item) => item.id === input.userId);
      if (!user) {
        return fail(ctx, options, "NOT_FOUND");
      }
      return respond(ctx, options, (meta) =>
        mutation(
          meta,
          "user.status.changed",
          input.userId,
          `${input.reason} (target: ${input.status})`,
        ),
      );
    },

    async setModelStatus(input, options) {
      const model = DEMO_ADMIN_MODELS.find((item) => item.id === input.modelId);
      if (!model) {
        return fail(ctx, options, "NOT_FOUND");
      }
      return respond(ctx, options, (meta) =>
        mutation(
          meta,
          "model.status.changed",
          input.modelId,
          `${input.reason} (target: ${input.status})`,
        ),
      );
    },

    async refreshProvider(input, options) {
      const provider = DEMO_ADMIN_PROVIDERS.find(
        (item) => item.id === input.providerId,
      );
      if (!provider) {
        return fail(ctx, options, "NOT_FOUND");
      }
      return respond(ctx, options, (meta) =>
        mutation(
          meta,
          "provider.refresh.requested",
          input.providerId,
          "Refresh status provider disimulasikan.",
        ),
      );
    },
  };
}
