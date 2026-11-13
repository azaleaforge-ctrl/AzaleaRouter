import type { WalletService } from "@/lib/api-client/contracts/wallet";
import { validateTopUpAmount } from "@/lib/validation/wallet";
import type { MockContext } from "../context";
import {
  DEMO_TOPUP,
  DEMO_TRANSACTIONS,
  DEMO_WALLET_SNAPSHOT,
} from "../fixtures/wallet";
import { paginate, withinRange } from "../pagination";
import { fail, respond } from "../scenarios";

export function createWalletService(ctx: MockContext): WalletService {
  return {
    async getSnapshot(options) {
      return respond(ctx, options, (meta) => {
        if (meta.scenario === "empty") {
          return {
            ...DEMO_WALLET_SNAPSHOT,
            availableBalance: 0,
            reservedBalance: 0,
            totalTopUp: 0,
            totalDebit: 0,
            updatedAt: meta.generatedAt,
            stale: false,
            connection: "live" as const,
          };
        }
        return {
          ...DEMO_WALLET_SNAPSHOT,
          updatedAt: meta.generatedAt,
          stale: meta.stale,
          connection: meta.connection,
        };
      });
    },

    async listTransactions(query = {}, options) {
      return respond(ctx, options, (meta) => {
        if (meta.scenario === "empty") {
          return paginate([], query);
        }
        const filtered = DEMO_TRANSACTIONS.filter((transaction) => {
          if (query.type && transaction.type !== query.type) {
            return false;
          }
          if (query.status && transaction.status !== query.status) {
            return false;
          }
          return withinRange(transaction.createdAt, query.from, query.to);
        });
        return paginate(filtered, query);
      });
    },

    async createTopUp(input, options) {
      const amountError = validateTopUpAmount(input.amount);
      if (amountError) {
        return fail(ctx, options, "VALIDATION_ERROR", {
          fieldErrors: { amount: amountError },
        });
      }

      return respond(ctx, options, (meta) => {
        const expiresAt = new Date(
          new Date(meta.generatedAt).getTime() + 30 * 60 * 1000,
        ).toISOString();
        return {
          ...DEMO_TOPUP,
          id: `TOPUP-DEMO-${input.amount}-${input.method}`,
          amount: input.amount,
          method: input.method,
          createdAt: meta.generatedAt,
          expiresAt,
          timeline: [
            {
              at: meta.generatedAt,
              label: "Intent demo dibuat",
              done: true,
            },
            {
              at: meta.generatedAt,
              label: "Menunggu pembayaran simulasi",
              done: false,
            },
            {
              at: expiresAt,
              label: "Kedaluwarsa simulasi",
              done: false,
            },
          ],
        };
      });
    },

    async getTopUp(id, options) {
      if (!id.startsWith("TOPUP-DEMO-")) {
        return fail(ctx, options, "NOT_FOUND");
      }
      return respond(ctx, options, () => ({ ...DEMO_TOPUP, id }));
    },
  };
}
