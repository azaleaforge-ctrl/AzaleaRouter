import type { DatabaseClient } from "@azalea-router/database";
import type { BackgroundJobHandler } from "../queue.js";
import { systemHealthCheckHandler } from "./system-health-check.js";

export function createJobHandlers(
  database?: DatabaseClient,
  catalogSyncHandler?: BackgroundJobHandler,
): ReadonlyMap<string, BackgroundJobHandler> {
  const handlers = new Map<string, BackgroundJobHandler>([
    ["system.health-check", systemHealthCheckHandler],
  ]);

  if (database) {
    handlers.set("auth.cleanup-expired", async () => {
      const now = new Date();
      const [revokedSessions, deletedTurnstileUses, deletedRateLimitBuckets, expiredPaymentIntents] = await Promise.all([
        database.authSession.updateMany({
          where: { revokedAt: null, refreshExpiresAt: { lte: now } },
          data: {
            revokedAt: now,
            encryptedAccessToken: "",
            encryptedRefreshToken: "",
          },
        }),
        database.turnstileTokenUse.deleteMany({ where: { expiresAt: { lt: now } } }),
        database.authRateLimit.deleteMany({ where: { expiresAt: { lt: now } } }),
        database.paymentIntent.updateMany({
          where: { status: { in: ["pending", "processing"] }, expiresAt: { lte: now } },
          data: { status: "expired" },
        }),
      ]);

      return {
        revoked_sessions: revokedSessions.count,
        deleted_turnstile_uses: deletedTurnstileUses.count,
        deleted_rate_limit_buckets: deletedRateLimitBuckets.count,
        expired_payment_intents: expiredPaymentIntents.count,
      };
    });
  }

  if (database && catalogSyncHandler) {
    handlers.set("catalog.openrouter.sync", catalogSyncHandler);
  }

  return handlers;
}
