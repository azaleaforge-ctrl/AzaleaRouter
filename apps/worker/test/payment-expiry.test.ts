import assert from "node:assert/strict";
import test from "node:test";
import type { DatabaseClient } from "@azalea-router/database";
import { createJobHandlers } from "../src/handlers/index.js";

test("payments cleanup expires only unpaid intents whose expiry has elapsed", async () => {
  let captured: unknown;
  const database = {
    paymentIntent: {
      updateMany: async (args: unknown) => {
        captured = args;
        return { count: 4 };
      },
    },
  } as unknown as DatabaseClient;

  const handler = createJobHandlers(database).get("payments.cleanup-expired");
  assert.ok(handler);
  const result = await handler({} as never);
  const query = captured as {
    where: { status: { in: string[] }; expiresAt: { lte: Date } };
    data: { status: string };
  };
  assert.deepEqual(query.where.status.in, ["pending", "processing"]);
  assert.ok(query.where.expiresAt.lte instanceof Date);
  assert.equal(query.data.status, "expired");
  assert.deepEqual(result, { expired_payment_intents: 4 });
});
