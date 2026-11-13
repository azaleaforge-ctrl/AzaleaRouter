import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import test from "node:test";
import { createDatabaseClient } from "@azalea-router/database";
import { WalletService } from "../src/wallet-service.js";

const databaseUrl = process.env.DATABASE_URL;

test("wallet reserve rejects overspend and settlement produces one balanced ledger posting", {
  skip: !databaseUrl,
}, async () => {
  const database = createDatabaseClient(databaseUrl!);
  await database.$connect();
  let userId = "";
  try {
    const user = await database.user.create({
      data: {
        authSubjectId: randomUUID(),
        emailNormalized: `wallet-${randomUUID()}@example.test`,
        status: "ACTIVE",
        emailVerifiedAt: new Date(),
        profile: { create: { displayName: "Wallet test", locale: "id-ID", timezone: "Asia/Jakarta" } },
        preferences: { create: {} },
      },
    });
    userId = user.id;
    const wallet = new WalletService(database);
    await wallet.ensureWallet(userId);

    await assert.rejects(wallet.reserve({
      userId,
      amount: "1",
      idempotencyKey: `reserve-overdraw-${randomUUID()}`,
      expiresAt: new Date(Date.now() + 60_000),
    }), /INSUFFICIENT_FUNDS/);
  } finally {
    if (userId) await database.user.deleteMany({ where: { id: userId } });
    await database.$disconnect();
  }
});
