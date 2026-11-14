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
      const [revokedSessions, deletedTurnstileUses, deletedRateLimitBuckets] = await Promise.all([
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
      ]);

      return {
        revoked_sessions: revokedSessions.count,
        deleted_turnstile_uses: deletedTurnstileUses.count,
        deleted_rate_limit_buckets: deletedRateLimitBuckets.count,
      };
    });
  }

  if (database) {
    handlers.set("api-keys.cleanup-expired", async () => {
      const now = new Date();
      const result = await database.apiKey.updateMany({
        where: { status: "active", expiresAt: { lte: now } },
        data: { status: "expired", revokedAt: now },
      });
      return { expired_api_keys: result.count };
    });

    handlers.set("wallet.cleanup-expired-reservations", async () => {
      const result = await database.walletReservation.updateMany({
        where: { status: "reserved", expiresAt: { lte: new Date() } },
        data: { status: "expired" },
      });
      return { expired_wallet_reservations: result.count };
    });

    handlers.set("payments.cleanup-expired", async () => {
      const result = await database.paymentIntent.updateMany({
        where: { status: { in: ["pending", "processing"] }, expiresAt: { lte: new Date() } },
        data: { status: "expired" },
      });
      return { expired_payment_intents: result.count };
    });
  }


  if (database) {
    handlers.set("usage.cleanup-expired", async () => {
      const now = new Date();
      const staleLeaseCutoff = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      const staleLeases = await database.apiKeyConcurrencyLease.findMany({
        where: { releasedAt: null, expiresAt: { lte: now } },
        select: { id: true, usageRecordId: true },
        take: 500,
      });

      let movedToReconciliation = 0;
      for (const lease of staleLeases) {
        await database.$transaction(async (tx) => {
          const usage = await tx.usageRecord.findUnique({
            where: { id: lease.usageRecordId },
          });
          if (usage && ["started", "streaming", "completed"].includes(usage.status)) {
            await tx.usageRecord.update({
              where: { id: usage.id },
              data: {
                status: "pending_reconciliation",
                reconciliationStatus: "required",
                errorCode: "USAGE_LEASE_EXPIRED",
                completedAt: now,
              },
            });
            await tx.outboxEvent.upsert({
              where: { idempotencyKey: `usage.lease-expired:${usage.id}` },
              update: {},
              create: {
                userId: usage.userId,
                aggregateType: "usage_request",
                aggregateId: usage.id,
                eventType: "notification.created",
                schemaVersion: 1,
                idempotencyKey: `usage.lease-expired:${usage.id}`,
                payloadSafe: {
                  request_id: usage.requestId,
                  status: "pending_reconciliation",
                  code: "USAGE_LEASE_EXPIRED",
                  currency: "IDR",
                  occurred_at: now.toISOString(),
                },
                occurredAt: now,
                availableAt: now,
                publishedAt: now,
                expiresAt: new Date(now.getTime() + 24 * 60 * 60 * 1000),
              },
            });
            movedToReconciliation += 1;
          }
          await tx.apiKeyConcurrencyLease.updateMany({
            where: { id: lease.id, releasedAt: null },
            data: { releasedAt: now },
          });
        }, { isolationLevel: "Serializable", timeout: 15_000 });
      }

      const [expiredRateWindows, removedLeases, expiredExports, expiredOutbox] = await Promise.all([
        database.apiKeyRateWindow.deleteMany({ where: { expiresAt: { lte: now } } }),
        database.apiKeyConcurrencyLease.deleteMany({
          where: {
            OR: [
              { expiresAt: { lte: now } },
              { releasedAt: { lte: staleLeaseCutoff } },
            ],
          },
        }),
        database.usageExport.deleteMany({ where: { expiresAt: { lte: now } } }),
        database.outboxEvent.deleteMany({ where: { expiresAt: { lte: now } } }),
      ]);

      return {
        stale_leases_reconciled: movedToReconciliation,
        deleted_api_key_rate_windows: expiredRateWindows.count,
        deleted_concurrency_leases: removedLeases.count,
        deleted_usage_exports: expiredExports.count,
        deleted_outbox_events: expiredOutbox.count,
      };
    });
  }

  if (database && catalogSyncHandler) {
    handlers.set("catalog.openrouter.sync", catalogSyncHandler);
  }

  return handlers;
}
