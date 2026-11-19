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
    assert.equal(balance.availableBalance, "124940");
  } finally {
    // Financial rows are intentionally retained in this disposable CI database.
    await database.$disconnect();
  }
});


test("competing reservations and concurrent settlement never overdraw or post duplicate debits", {
  skip: !databaseUrl,
}, async () => {
  const database = createDatabaseClient(databaseUrl!);
  await database.$connect();

  try {
    const user = await database.user.create({
      data: {
        authSubjectId: randomUUID(),
        emailNormalized: `wallet-race-${randomUUID()}@example.test`,
        status: "ACTIVE",
        emailVerifiedAt: new Date(),
        profile: { create: { displayName: "Wallet concurrency test", locale: "id-ID", timezone: "Asia/Jakarta" } },
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
    const funding = await database.ledgerTransaction.create({
      data: {
        idempotencyKey: `test-fund-race-${randomUUID()}`,
        transactionType: "test_funding",
        currency: "IDR",
        status: "pending",
      },
    });
    await database.ledgerEntry.createMany({
      data: [
        {
          ledgerTransactionId: funding.id,
          ledgerAccountId: asset.id,
          direction: "debit",
          amount: "125000",
          currency: "IDR",
        },
        {
          ledgerTransactionId: funding.id,
          ledgerAccountId: wallet.ledgerAccountId,
          direction: "credit",
          amount: "125000",
          currency: "IDR",
        },
      ],
    });
    await database.ledgerTransaction.update({
      where: { id: funding.id },
      data: { status: "posted", postedAt: new Date() },
    });

    const reserveExpiry = () => new Date(Date.now() + 60_000);
    const reserveAttempts = await Promise.allSettled([
      walletService.reserve({
        userId: user.id,
        amount: "80000",
        idempotencyKey: `test-race-reserve-a-${randomUUID()}`,
        expiresAt: reserveExpiry(),
      }),
      walletService.reserve({
        userId: user.id,
        amount: "80000",
        idempotencyKey: `test-race-reserve-b-${randomUUID()}`,
        expiresAt: reserveExpiry(),
      }),
    ]);
    const successfulReservations = reserveAttempts.filter(
      (result): result is PromiseFulfilledResult<Awaited<ReturnType<WalletService["reserve"]>>> => result.status === "fulfilled",
    );
    assert.equal(successfulReservations.length, 1, "only one competing reservation may consume the available 125000 IDR");

    const reservedRows = await database.walletReservation.findMany({
      where: { userId: user.id, status: "reserved" },
    });
    assert.equal(reservedRows.length, 1);
    const reservedBalance = await walletService.getBalance(user.id);
    assert.equal(reservedBalance.ledgerBalance, "125000");
    assert.equal(reservedBalance.reservedBalance, "80000");
    assert.equal(reservedBalance.availableBalance, "45000");

    const reservationId = successfulReservations[0]!.value.reservationId;
    const settleKeyA = `test-race-settle-a-${randomUUID()}`;
    const settleKeyB = `test-race-settle-b-${randomUUID()}`;
    const settleAttempts = await Promise.allSettled([
      walletService.settleReservation({
        userId: user.id,
        reservationId,
        idempotencyKey: settleKeyA,
        actualAmount: "70000",
      }),
      walletService.settleReservation({
        userId: user.id,
        reservationId,
        idempotencyKey: settleKeyB,
        actualAmount: "70000",
      }),
    ]);
    const successfulSettlements = settleAttempts.filter(
      (result): result is PromiseFulfilledResult<Awaited<ReturnType<WalletService["settleReservation"]>>> => result.status === "fulfilled",
    );
    assert.ok(successfulSettlements.length >= 1, "at least one concurrent settlement must commit");

    const retry = await walletService.settleReservation({
      userId: user.id,
      reservationId,
      idempotencyKey: `test-race-settle-retry-${randomUUID()}`,
      actualAmount: "70000",
    });
    const settlementTransactionId = successfulSettlements[0]!.value.ledgerTransactionId;
    assert.ok(settlementTransactionId);
    assert.equal(retry.ledgerTransactionId, settlementTransactionId);
    for (const result of successfulSettlements) {
      assert.equal(result.value.ledgerTransactionId, settlementTransactionId);
    }

    const settlementTransactions = await database.ledgerTransaction.findMany({
      where: {
        transactionType: "usage_settlement",
        referenceType: "wallet_reservation",
        referenceId: reservationId,
      },
    });
    assert.equal(settlementTransactions.length, 1, "a reservation must produce at most one posted settlement transaction");
    const entries = await database.ledgerEntry.findMany({
      where: { ledgerTransactionId: settlementTransactionId },
    });
    assert.equal(entries.length, 2);
    const debits = entries.filter((entry) => entry.direction === "debit")
      .reduce((total, entry) => total + BigInt(entry.amount.toString()), 0n);
    const credits = entries.filter((entry) => entry.direction === "credit")
      .reduce((total, entry) => total + BigInt(entry.amount.toString()), 0n);
    assert.equal(debits, 70000n);
    assert.equal(credits, 70000n);

    const finalBalance = await walletService.getBalance(user.id);
    assert.equal(finalBalance.ledgerBalance, "55000");
    assert.equal(finalBalance.reservedBalance, "0");
    assert.equal(finalBalance.availableBalance, "55000");
  } finally {
    // Financial rows are intentionally retained in this disposable CI database.
    await database.$disconnect();
  }
});
