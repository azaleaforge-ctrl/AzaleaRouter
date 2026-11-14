import assert from "node:assert/strict";
import test from "node:test";
import type { DatabaseClient } from "@azalea-router/database";
import { createJobHandlers } from "../src/handlers/index.js";

test("auth cleanup revokes expired sessions and deletes expired challenge/rate buckets", async () => {
  const calls: string[] = [];
  const database = {
    authSession: {
      updateMany: async (args: { where: { revokedAt: null; refreshExpiresAt: { lte: Date } }; data: { revokedAt: Date; encryptedAccessToken: string; encryptedRefreshToken: string } }) => {
        calls.push("sessions");
        assert.equal(args.where.revokedAt, null);
        assert.ok(args.where.refreshExpiresAt.lte instanceof Date);
        assert.ok(args.data.revokedAt instanceof Date);
        assert.equal(args.data.encryptedAccessToken, "");
        assert.equal(args.data.encryptedRefreshToken, "");
        return { count: 2 };
      },
    },
    turnstileTokenUse: {
      deleteMany: async (args: { where: { expiresAt: { lt: Date } } }) => {
        calls.push("turnstile");
        assert.ok(args.where.expiresAt.lt instanceof Date);
        return { count: 7 };
      },
    },
    authRateLimit: {
      deleteMany: async (args: { where: { expiresAt: { lt: Date } } }) => {
        calls.push("rate-limit");
        assert.ok(args.where.expiresAt.lt instanceof Date);
        return { count: 3 };
      },
    },
  } as unknown as DatabaseClient;

  const handler = createJobHandlers(database).get("auth.cleanup-expired");
  assert.ok(handler);
  const result = await handler({} as never);
  assert.deepEqual(calls.sort(), ["rate-limit", "sessions", "turnstile"]);
  assert.deepEqual(result, {
    revoked_sessions: 2,
    deleted_turnstile_uses: 7,
    deleted_rate_limit_buckets: 3,
  });
});
