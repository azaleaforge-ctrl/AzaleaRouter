import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import test from "node:test";
import { createDatabaseClient } from "../src/client.js";

const databaseUrl = process.env.DATABASE_URL;

test("posted ledger transactions require at least two balanced IDR entries and are immutable", {
  skip: !databaseUrl,
}, async () => {
  const database = createDatabaseClient(databaseUrl!);
  await database.$connect();

  try {
    const suffix = randomUUID();
    const asset = await database.ledgerAccount.create({
      data: {
        code: `test.asset.${suffix}`,
        name: "Ledger integration test asset",
        accountType: "asset",
        normalBalance: "debit",
        currency: "IDR",
      },
    });
    const liability = await database.ledgerAccount.create({
      data: {
        code: `test.liability.${suffix}`,
        name: "Ledger integration test liability",
        accountType: "liability",
        normalBalance: "credit",
        currency: "IDR",
      },
    });

    const unbalancedId = randomUUID();
    await assert.rejects(database.$transaction(async (tx) => {
      await tx.ledgerTransaction.create({
        data: {
          id: unbalancedId,
          idempotencyKey: `test-unbalanced-${suffix}`,
          transactionType: "test",
          currency: "IDR",
          status: "pending",
        },
      });
      await tx.ledgerEntry.createMany({
        data: [{
          ledgerTransactionId: unbalancedId,
          ledgerAccountId: asset.id,
          direction: "debit",
          amount: "100",
          currency: "IDR",
        }, {
          ledgerTransactionId: unbalancedId,
          ledgerAccountId: liability.id,
          direction: "credit",
          amount: "99",
          currency: "IDR",
        }],
      });
      await tx.ledgerTransaction.update({
        where: { id: unbalancedId },
        data: { status: "posted", postedAt: new Date() },
      });
    }));

    const transaction = await database.$transaction(async (tx) => {
      const created = await tx.ledgerTransaction.create({
        data: {
          idempotencyKey: `test-balanced-${suffix}`,
          transactionType: "test",
          currency: "IDR",
          status: "pending",
        },
      });
      await tx.ledgerEntry.createMany({
        data: [{
          ledgerTransactionId: created.id,
          ledgerAccountId: asset.id,
          direction: "debit",
          amount: "100",
          currency: "IDR",
        }, {
          ledgerTransactionId: created.id,
          ledgerAccountId: liability.id,
          direction: "credit",
          amount: "100",
          currency: "IDR",
        }],
      });
      return tx.ledgerTransaction.update({
        where: { id: created.id },
        data: { status: "posted", postedAt: new Date() },
      });
    });

    assert.equal(transaction.status, "posted");
    await assert.rejects(database.ledgerTransaction.update({
      where: { id: transaction.id },
      data: { referenceId: "tamper" },
    }));
    const entries = await database.ledgerEntry.findMany({
      where: { ledgerTransactionId: transaction.id },
    });
    assert.equal(entries.length, 2);
    await assert.rejects(database.ledgerEntry.update({
      where: { id: entries[0]!.id },
      data: { amount: "1" },
    }));
  } finally {
    await database.$disconnect();
  }
});
