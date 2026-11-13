import assert from "node:assert/strict";
import test from "node:test";
import type { DatabaseClient } from "@azalea-router/database";
import { createJobHandlers } from "../src/handlers/index.js";

test("auth cleanup revokes expired sessions and deletes expired challenge/rate buckets", async () => {
  const calls: string[] = [];
  const database = {
    authSession: {
      updateMany: async (args: unknown) => {
        calls.push("sessions");
        assert.deepEqual(args, {
          where: { revokedAt: null, refreshExpiresAt: { lte: args && new Date() } },
          data: {
            revokedAt: (args as { data: { revokedAt: Date } }).data.revokedAt,
            encryptedAccessToken: "",
            encryptedRefreshToken: "",
          },
        });
        return { count: 2 };
      },
    },
    turnstileTokenUse: {
      deleteMany: async () => {
        calls.push("turnstile");
        return { count: 7 };
      },
    },
    authRateLimit: {
      deleteMany: async () => {
        calls.push("rate-limit");
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
