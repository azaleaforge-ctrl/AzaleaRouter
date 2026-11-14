import assert from "node:assert/strict";
import test from "node:test";
import type { DatabaseClient } from "@azalea-router/database";
import { createJobHandlers } from "../src/handlers/index.js";

test("API key cleanup expires only active keys whose expiry is elapsed", async () => {
  let query: unknown;
  const database = {
    apiKey: {
      updateMany: async (args: unknown) => {
        query = args;
        return { count: 3 };
      },
    },
  } as unknown as DatabaseClient;
  const handler = createJobHandlers(database).get("api-keys.cleanup-expired");
  assert.ok(handler);
  const result = await handler({} as never);
  const args = query as {
    where: { status: string; expiresAt: { lte: Date } };
    data: { status: string; revokedAt: Date };
  };
  assert.equal(args.where.status, "active");
  assert.ok(args.where.expiresAt.lte instanceof Date);
  assert.equal(args.data.status, "expired");
  assert.ok(args.data.revokedAt instanceof Date);
  assert.deepEqual(result, { expired_api_keys: 3 });
});
