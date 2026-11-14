import type { DatabaseClient } from "@azalea-router/database";

type WalletTransactionClient = Pick<
  DatabaseClient,
  "$queryRaw" | "walletAccount" | "ledgerAccount" | "ledgerTransaction" | "ledgerEntry" | "walletReservation"
>;
import { parseIdrAmount, toIdrAmount } from "./money.js";

export interface WalletBalance {
  currency: "IDR";
  ledgerBalance: string;
  reservedBalance: string;
  availableBalance: string;
  status: string;
}

export interface WalletReservationResult {
  reservationId: string;
  idempotencyKey: string;
  amount: string;
  currency: "IDR";
  status: string;
  expiresAt: Date;
  settledAmount?: string;
  ledgerTransactionId: string | null;
}

interface BalanceRows {
  credits: string;
  debits: string;
  reserved: string;
}

function decimalString(value: { toString(): string } | string): string {
  return typeof value === "string" ? value : value.toString();
}

async function lockWalletAccount(tx: WalletTransactionClient, userId: string): Promise<{
  id: string;
  ledgerAccountId: string;
  currency: string;
  status: string;
} | null> {
  await tx.$queryRaw`SELECT "id" FROM "wallet_accounts" WHERE "user_id" = ${userId}::uuid FOR UPDATE`;
  return tx.walletAccount.findUnique({
    where: { userId },
    select: { id: true, ledgerAccountId: true, currency: true, status: true },
  });
}

async function readBalanceRows(tx: WalletTransactionClient, ledgerAccountId: string, walletAccountId: string, now: Date): Promise<BalanceRows> {
  const rows = await tx.$queryRaw<Array<BalanceRows>>`
    SELECT
      COALESCE(SUM(CASE WHEN entry."direction" = 'credit' THEN entry."amount" ELSE 0 END), 0)::text AS credits,
      COALESCE(SUM(CASE WHEN entry."direction" = 'debit' THEN entry."amount" ELSE 0 END), 0)::text AS debits,
      COALESCE((
        SELECT SUM(reservation."amount")
        FROM "wallet_reservations" reservation
        WHERE reservation."wallet_account_id" = ${walletAccountId}::uuid
          AND reservation."status" = 'reserved'
          AND reservation."expires_at" > ${now}
      ), 0)::text AS reserved
    FROM "ledger_entries" entry
    INNER JOIN "ledger_transactions" transaction
      ON transaction."id" = entry."ledger_transaction_id"
    WHERE entry."ledger_account_id" = ${ledgerAccountId}::uuid
      AND transaction."status" = 'posted'
  `;
  return rows[0] ?? { credits: "0", debits: "0", reserved: "0" };
}

function calculateBalance(rows: BalanceRows): Omit<WalletBalance, "currency" | "status"> {
  const ledger = parseIdrAmount(rows.credits) - parseIdrAmount(rows.debits);
  if (ledger < 0n) throw new Error("Wallet ledger liability balance is negative.");
  const reserved = parseIdrAmount(rows.reserved);
  const available = ledger - reserved;
  if (available < 0n) throw new Error("Wallet active reservations exceed posted balance.");
  return {
    ledgerBalance: toIdrAmount(ledger),
    reservedBalance: toIdrAmount(reserved),
    availableBalance: toIdrAmount(available),
  };
}

export class WalletService {
  constructor(private readonly database: DatabaseClient) {}

  async ensureWallet(userId: string): Promise<{ id: string; status: string; currency: string }> {
    try {
      return await this.database.$transaction(async (tx) => {
        const existing = await tx.walletAccount.findUnique({
          where: { userId },
          select: { id: true, status: true, currency: true },
        });
        if (existing) return existing;

        const accountCode = `wallet.user.${userId}`;
        const ledgerAccount = await tx.ledgerAccount.create({
          data: {
            code: accountCode,
            name: "Customer prepaid wallet liability",
            accountType: "liability",
            normalBalance: "credit",
            currency: "IDR",
            ownerUserId: userId,
          },
        });
        return tx.walletAccount.create({
          data: {
            userId,
            ledgerAccountId: ledgerAccount.id,
            currency: "IDR",
            status: "active",
          },
          select: { id: true, status: true, currency: true },
        });
      }, { isolationLevel: "Serializable", timeout: 15_000 });
    } catch (error) {
      const code = error && typeof error === "object" && "code" in error
        ? String((error as { code?: unknown }).code)
        : "";
      if (code !== "P2002" && code !== "P2034") throw error;
      const existing = await this.database.walletAccount.findUnique({
        where: { userId },
        select: { id: true, status: true, currency: true },
      });
      if (!existing) throw error;
      return existing;
    }
  }

  async getBalance(userId: string): Promise<WalletBalance> {
    const wallet = await this.database.walletAccount.findUnique({
      where: { userId },
      select: { id: true, ledgerAccountId: true, currency: true, status: true },
    });
    if (!wallet) return {
      currency: "IDR",
      ledgerBalance: "0",
      reservedBalance: "0",
      availableBalance: "0",
      status: "not_created",
    };
    const rows = await readBalanceRows(this.database, wallet.ledgerAccountId, wallet.id, new Date());
    return {
      currency: "IDR",
      status: wallet.status,
      ...calculateBalance(rows),
    };
  }

  async reserveInTransaction(
    tx: WalletTransactionClient,
    input: {
      userId: string;
      amount: string;
      idempotencyKey: string;
      expiresAt: Date;
    },
  ): Promise<WalletReservationResult> {
    parseIdrAmount(input.amount);
    if (input.amount === "0") throw new RangeError("Reservation amount must be greater than zero.");
    if (input.idempotencyKey.length < 8 || input.idempotencyKey.length > 128) {
      throw new RangeError("Reservation idempotency key must contain between 8 and 128 characters.");
    }
    if (input.expiresAt.getTime() <= Date.now()) throw new RangeError("Reservation expiry must be in the future.");

    const existing = await tx.walletReservation.findUnique({
      where: { idempotencyKey: input.idempotencyKey },
    });
    if (existing) {
      if (existing.userId !== input.userId || decimalString(existing.amount) !== input.amount) {
        throw new Error("IDEMPOTENCY_KEY_CONFLICT");
      }
      return {
        reservationId: existing.id,
        idempotencyKey: existing.idempotencyKey,
        amount: decimalString(existing.amount),
        ...(existing.settledAmount === null ? {} : { settledAmount: decimalString(existing.settledAmount) }),
        currency: "IDR",
        status: existing.status,
        expiresAt: existing.expiresAt,
        ledgerTransactionId: existing.ledgerTransactionId,
      };
    }

    const wallet = await lockWalletAccount(tx, input.userId);
    if (!wallet) throw new Error("WALLET_NOT_FOUND");
    if (wallet.status !== "active" || wallet.currency !== "IDR") throw new Error("WALLET_NOT_ACTIVE");

    const balance = calculateBalance(await readBalanceRows(tx, wallet.ledgerAccountId, wallet.id, new Date()));
    if (parseIdrAmount(balance.availableBalance) < parseIdrAmount(input.amount)) {
      throw new Error("INSUFFICIENT_FUNDS");
    }

    const reservation = await tx.walletReservation.create({
      data: {
        userId: input.userId,
        walletAccountId: wallet.id,
        idempotencyKey: input.idempotencyKey,
        amount: input.amount,
        currency: "IDR",
        status: "reserved",
        expiresAt: input.expiresAt,
      },
    });

    return {
      reservationId: reservation.id,
      idempotencyKey: reservation.idempotencyKey,
      amount: decimalString(reservation.amount),
      currency: "IDR",
      status: reservation.status,
      expiresAt: reservation.expiresAt,
      ledgerTransactionId: reservation.ledgerTransactionId,
    };
  }

  async reserve(input: {
    userId: string;
    amount: string;
    idempotencyKey: string;
    expiresAt: Date;
  }): Promise<WalletReservationResult> {
    return this.database.$transaction(
      (tx) => this.reserveInTransaction(tx, input),
      { isolationLevel: "Serializable", timeout: 15_000 },
    );
  }

  async settleReservationInTransaction(
    tx: WalletTransactionClient,
    input: {
      userId: string;
      reservationId: string;
      idempotencyKey: string;
      actualAmount: string;
    },
  ): Promise<WalletReservationResult> {
    parseIdrAmount(input.actualAmount);
    if (input.idempotencyKey.length < 8 || input.idempotencyKey.length > 128) {
      throw new RangeError("Settlement idempotency key must contain between 8 and 128 characters.");
    }

    const reservation = await tx.walletReservation.findUnique({
      where: { id: input.reservationId },
    });
    if (!reservation || reservation.userId !== input.userId) throw new Error("RESERVATION_NOT_FOUND");
    const wallet = await lockWalletAccount(tx, input.userId);
    if (!wallet || wallet.id !== reservation.walletAccountId) throw new Error("WALLET_NOT_FOUND");

    const heldAmount = parseIdrAmount(decimalString(reservation.amount));
    const actualAmount = parseIdrAmount(input.actualAmount);
    if (actualAmount > heldAmount) throw new Error("SETTLEMENT_EXCEEDS_RESERVATION");

    if (reservation.status === "settled") {
      if (decimalString(reservation.settledAmount ?? "0") !== input.actualAmount) {
        throw new Error("SETTLEMENT_IDEMPOTENCY_CONFLICT");
      }
      return {
        reservationId: reservation.id,
        idempotencyKey: reservation.idempotencyKey,
        amount: decimalString(reservation.amount),
        settledAmount: decimalString(reservation.settledAmount ?? "0"),
        currency: "IDR",
        status: reservation.status,
        expiresAt: reservation.expiresAt,
        ledgerTransactionId: reservation.ledgerTransactionId,
      };
    }

    if (reservation.status !== "reserved" || reservation.expiresAt.getTime() <= Date.now()) {
      throw new Error("RESERVATION_NOT_SETTLEABLE");
    }

    // Zero-cost responses release the full hold without posting a zero-value
    // ledger entry (the ledger enforces strictly positive entries).
    if (actualAmount === 0n) {
      const updated = await tx.walletReservation.update({
        where: { id: reservation.id },
        data: {
          status: "settled",
          settledAmount: "0",
          ledgerTransactionId: null,
        },
      });
      return {
        reservationId: updated.id,
        idempotencyKey: updated.idempotencyKey,
        amount: decimalString(updated.amount),
        settledAmount: "0",
        currency: "IDR",
        status: updated.status,
        expiresAt: updated.expiresAt,
        ledgerTransactionId: null,
      };
    }

    const revenueAccount = await tx.ledgerAccount.upsert({
      where: { code: "revenue.ai_usage" },
      update: {},
      create: {
        code: "revenue.ai_usage",
        name: "AI usage revenue",
        accountType: "revenue",
        normalBalance: "credit",
        currency: "IDR",
      },
    });
    const transaction = await tx.ledgerTransaction.create({
      data: {
        idempotencyKey: input.idempotencyKey,
        transactionType: "usage_settlement",
        currency: "IDR",
        status: "pending",
        referenceType: "wallet_reservation",
        referenceId: reservation.id,
      },
    });

    await tx.ledgerEntry.createMany({
      data: [
        {
          ledgerTransactionId: transaction.id,
          ledgerAccountId: wallet.ledgerAccountId,
          direction: "debit",
          amount: input.actualAmount,
          currency: "IDR",
          memo: "Prepaid AI usage settlement",
        },
        {
          ledgerTransactionId: transaction.id,
          ledgerAccountId: revenueAccount.id,
          direction: "credit",
          amount: input.actualAmount,
          currency: "IDR",
          memo: "AI usage revenue",
        },
      ],
    });
    await tx.ledgerTransaction.update({
      where: { id: transaction.id },
      data: { status: "posted", postedAt: new Date() },
    });
    const updated = await tx.walletReservation.update({
      where: { id: reservation.id },
      data: {
        status: "settled",
        settledAmount: input.actualAmount,
        ledgerTransactionId: transaction.id,
      },
    });
    return {
      reservationId: updated.id,
      idempotencyKey: updated.idempotencyKey,
      amount: decimalString(updated.amount),
      settledAmount: input.actualAmount,
      currency: "IDR",
      status: updated.status,
      expiresAt: updated.expiresAt,
      ledgerTransactionId: updated.ledgerTransactionId,
    };
  }

  async settleReservation(input: {
    userId: string;
    reservationId: string;
    idempotencyKey: string;
    actualAmount: string;
  }): Promise<WalletReservationResult> {
    return this.database.$transaction(
      (tx) => this.settleReservationInTransaction(tx, input),
      { isolationLevel: "Serializable", timeout: 15_000 },
    );
  }

  async releaseReservationInTransaction(
    tx: WalletTransactionClient,
    userId: string,
    reservationId: string,
  ): Promise<WalletReservationResult> {
    const reservation = await tx.walletReservation.findUnique({ where: { id: reservationId } });
    if (!reservation || reservation.userId !== userId) throw new Error("RESERVATION_NOT_FOUND");
    await lockWalletAccount(tx, userId);
    if (reservation.status === "released" || reservation.status === "expired") {
      return {
        reservationId: reservation.id,
        idempotencyKey: reservation.idempotencyKey,
        amount: decimalString(reservation.amount),
        ...(reservation.settledAmount === null ? {} : { settledAmount: decimalString(reservation.settledAmount) }),
        currency: "IDR",
        status: reservation.status,
        expiresAt: reservation.expiresAt,
        ledgerTransactionId: reservation.ledgerTransactionId,
      };
    }
    if (reservation.status !== "reserved") throw new Error("RESERVATION_NOT_RELEASABLE");
    const updated = await tx.walletReservation.update({
      where: { id: reservation.id },
      data: { status: "released" },
    });
    return {
      reservationId: updated.id,
      idempotencyKey: updated.idempotencyKey,
      amount: decimalString(updated.amount),
      currency: "IDR",
      status: updated.status,
      expiresAt: updated.expiresAt,
      ledgerTransactionId: updated.ledgerTransactionId,
    };
  }

  async releaseReservation(userId: string, reservationId: string): Promise<WalletReservationResult> {
    return this.database.$transaction(
      (tx) => this.releaseReservationInTransaction(tx, userId, reservationId),
      { isolationLevel: "Serializable", timeout: 15_000 },
    );
  }

}
