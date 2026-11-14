import assert from "node:assert/strict";
import test from "node:test";
import type { DatabaseClient } from "@azalea-router/database";
import { createJobHandlers } from "../src/handlers/index.js";

test("usage cleanup routes abandoned streaming requests to reconciliation and prunes only expired records", async () => {
  const now = new Date();
  const usageTransitions: Array<{ id: string; status: string }> = [];
  const eventWrites: Array<{ idempotencyKey: string; expiresAt: Date }> = [];
  const leaseUpdates: string[] = [];
  const cleanupCalls: string[] = [];

  const transaction = {
    usageRecord: {
      findUnique: async () => ({
        id: "usage-1",
        userId: "user-1",
        requestId: "req-1",
        status: "streaming",
      }),
      update: async (args: { where: { id: string }; data: { status: string } }) => {
        usageTransitions.push({ id: args.where.id, status: args.data.status });
        return {};
      },
    },
    outboxEvent: {
      upsert: async (args: { where: { idempotencyKey: string }; create: { expiresAt: Date; payloadSafe: unknown } }) => {
        eventWrites.push({
          idempotencyKey: args.where.idempotencyKey,
          expiresAt: args.create.expiresAt,
        });
        assert.equal(typeof args.create.payloadSafe, "object");
        return {};
      },
    },
    apiKeyConcurrencyLease: {
      updateMany: async (args: { where: { id: string; releasedAt: null }; data: { releasedAt: Date } }) => {
        leaseUpdates.push(args.where.id);
        assert.ok(args.data.releasedAt instanceof Date);
        return { count: 1 };
      },
    },
  };

  const database = {
    apiKeyConcurrencyLease: {
      findMany: async (args: { where: { releasedAt: null; expiresAt: { lte: Date } }; select: { id: boolean; usageRecordId: boolean }; take: number }) => {
        assert.equal(args.where.releasedAt, null);
        assert.ok(args.where.expiresAt.lte instanceof Date);
        assert.equal(args.take, 500);
        return [{ id: "lease-1", usageRecordId: "usage-1" }];
      },
      deleteMany: async (args: unknown) => {
        cleanupCalls.push("leases");
        assert.equal(typeof args, "object");
        return { count: 2 };
      },
    },
    $transaction: async (callback: (tx: typeof transaction) => Promise<unknown>) => callback(transaction),
    apiKeyRateWindow: {
      deleteMany: async (args: { where: { expiresAt: { lte: Date } } }) => {
        cleanupCalls.push("rate-windows");
        assert.ok(args.where.expiresAt.lte instanceof Date);
        return { count: 3 };
      },
    },
    usageExport: {
      deleteMany: async (args: { where: { expiresAt: { lte: Date } } }) => {
        cleanupCalls.push("exports");
        assert.ok(args.where.expiresAt.lte instanceof Date);
        return { count: 1 };
      },
    },
    outboxEvent: {
      deleteMany: async (args: { where: { expiresAt: { lte: Date } } }) => {
        cleanupCalls.push("outbox");
        assert.ok(args.where.expiresAt.lte instanceof Date);
        return { count: 4 };
      },
    },
  } as unknown as DatabaseClient;

  const handler = createJobHandlers(database).get("usage.cleanup-expired");
  assert.ok(handler);
  const result = await handler({} as never);

  assert.deepEqual(usageTransitions, [{ id: "usage-1", status: "pending_reconciliation" }]);
  assert.deepEqual(eventWrites.map((item) => item.idempotencyKey), ["usage.lease-expired:usage-1"]);
  assert.ok(eventWrites[0]!.expiresAt.getTime() > now.getTime());
  assert.deepEqual(leaseUpdates, ["lease-1"]);
  assert.deepEqual(cleanupCalls.sort(), ["exports", "leases", "outbox", "rate-windows"]);
  assert.deepEqual(result, {
    stale_leases_reconciled: 1,
    deleted_api_key_rate_windows: 3,
    deleted_concurrency_leases: 2,
    deleted_usage_exports: 1,
    deleted_outbox_events: 4,
  });
});
