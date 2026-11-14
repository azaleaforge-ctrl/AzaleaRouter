import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import test from "node:test";
import { createDatabaseClient } from "@azalea-router/database";
import { WalletService } from "../src/wallet-service.js";

const databaseUrl = process.env.DATABASE_URL;

test("wallet reservation is concurrency-safe and settlement posts a balanced ledger once", {
  skip: !databaseUrl,
}, async () => {
  const database = createDatabaseClient(databaseUrl!);
  await database.$connect();

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
    const walletService = new WalletService(database);
    await walletService.ensureWallet(user.id);
    const wallet = await database.walletAccount.findUniqueOrThrow({ where: { userId: user.id } });

    const asset = await database.ledgerAccount.create({
      data: {
        code: `test.cash.${user.id}`,
        name: "Test cash asset",
        accountType: "asset",
        normalBalance: "debit",
        currency: "IDR",
      },
    });
    const fundingTransaction = await database.ledgerTransaction.create({
      data: {
        idempotencyKey: `test-fund-${randomUUID()}`,
        transactionType: "test_funding",
        currency: "IDR",
        status: "pending",
      },
    });
    await database.ledgerEntry.createMany({
      data: [
        {
          ledgerTransactionId: fundingTransaction.id,
          ledgerAccountId: asset.id,
          direction: "debit",
          amount: "125000",
          currency: "IDR",
        },
        {
          ledgerTransactionId: fundingTransaction.id,
          ledgerAccountId: wallet.ledgerAccountId,
          direction: "credit",
          amount: "125000",
          currency: "IDR",
        },
      ],
    });
    await database.ledgerTransaction.update({
      where: { id: fundingTransaction.id },
      data: { status: "posted", postedAt: new Date() },
    });

    const reservation = await walletService.reserve({
      userId: user.id,
      amount: "100",
      idempotencyKey: `test-reserve-${randomUUID()}`,
      expiresAt: new Date(Date.now() + 60_000),
    });
    assert.equal(reservation.status, "reserved");

    await assert.rejects(walletService.reserve({
      userId: user.id,
      amount: "125000",
      idempotencyKey: `test-overdraw-${randomUUID()}`,
      expiresAt: new Date(Date.now() + 60_000),
    }), /INSUFFICIENT_FUNDS/);

    const settled = await walletService.settleReservation({
      userId: user.id,
      reservationId: reservation.reservationId,
      idempotencyKey: `test-settle-${randomUUID()}`,
      actualAmount: "60",
    });
    const repeated = await walletService.settleReservation({
      userId: user.id,
      reservationId: reservation.reservationId,
      idempotencyKey: `test-settle-repeat-${randomUUID()}`,
      actualAmount: "60",
    });

    assert.equal(settled.status, "settled");
    assert.equal(settled.amount, "100");
    assert.equal(settled.settledAmount, "60");
    assert.equal(repeated.ledgerTransactionId, settled.ledgerTransactionId);
    const balanceAfterPartial = await walletService.getBalance(user.id);
    assert.equal(balanceAfterPartial.ledgerBalance, "124940");
    assert.equal(balanceAfterPartial.reservedBalance, "0");

    const zeroCostReservation = await walletService.reserve({
      userId: user.id,
      amount: "100",
      idempotencyKey: `test-zero-reserve-${randomUUID()}`,
      expiresAt: new Date(Date.now() + 60_000),
    });
    await assert.rejects(walletService.settleReservation({
      userId: user.id,
      reservationId: zeroCostReservation.reservationId,
      idempotencyKey: `test-over-reserve-${randomUUID()}`,
      actualAmount: "101",
    }), /SETTLEMENT_EXCEEDS_RESERVATION/);

    const zeroCost = await walletService.settleReservation({
      userId: user.id,
      reservationId: zeroCostReservation.reservationId,
      idempotencyKey: `test-zero-settle-${randomUUID()}`,
      actualAmount: "0",
    });
    assert.equal(zeroCost.status, "settled");
    assert.equal(zeroCost.settledAmount, "0");
    assert.equal(zeroCost.ledgerTransactionId, null);

    const balance = await walletService.getBalance(user.id);
    assert.equal(balance.ledgerBalance, "124940");
    assert.equal(balance.reservedBalance, "0");
    assert.equal(balance.availableBalance, "124900");
  } finally {
    // Financial rows are intentionally retained in this disposable CI database.
    await database.$disconnect();
  }
});
