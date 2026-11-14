import assert from "node:assert/strict";
import test from "node:test";
import type { DatabaseClient } from "@azalea-router/database";
import { createJobHandlers } from "../src/handlers/index.js";

test("wallet cleanup expires only reserved rows past their expiry", async () => {
  let captured: unknown;
  const database = {
    walletReservation: {
      updateMany: async (args: unknown) => {
        captured = args;
        return { count: 5 };
      },
    },
  } as unknown as DatabaseClient;
  const handler = createJobHandlers(database).get("wallet.cleanup-expired-reservations");
  assert.ok(handler);
  const result = await handler({} as never);
  const query = captured as {
    where: { status: string; expiresAt: { lte: Date } };
    data: { status: string };
  };
  assert.equal(query.where.status, "reserved");
  assert.ok(query.where.expiresAt.lte instanceof Date);
  assert.equal(query.data.status, "expired");
  assert.deepEqual(result, { expired_wallet_reservations: 5 });
});
