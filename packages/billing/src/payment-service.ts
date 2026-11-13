import { createHash } from "node:crypto";
import type { DatabaseClient } from "@azalea-router/database";
import { parseIdrAmount } from "./money.js";
import type { PaymentProviderAdapter, VerifiedPaymentEvent } from "./payment-provider.js";
import { WalletService } from "./wallet-service.js";

export interface PaymentIntentResult {
  id: string;
  provider: string;
  providerReference: string;
  amountIdr: string;
  currency: "IDR";
  status: string;
  expiresAt: Date;
  checkoutUrl: null;
}

export interface WebhookProcessingResult {
  accepted: boolean;
  duplicate: boolean;
  status: "processed" | "rejected" | "failed";
  paymentIntentId: string | null;
}

function safeProviderError(error: unknown): string {
  if (error instanceof Error && error.message === "PAYMENT_SIGNATURE_INVALID") return "PAYMENT_SIGNATURE_INVALID";
  if (error instanceof Error && error.message === "PAYMENT_WEBHOOK_INVALID") return "PAYMENT_WEBHOOK_INVALID";
  return "PAYMENT_PROVIDER_ERROR";
}

function bodyHash(body: Buffer): string {
  return createHash("sha256").update(body).digest("hex");
}

export class PaymentService {
  private readonly wallet: WalletService;

  constructor(
    private readonly database: DatabaseClient,
    private readonly provider: PaymentProviderAdapter,
    private readonly options: { intentLifetimeSeconds: number; now?: () => Date },
  ) {
    this.wallet = new WalletService(database);
  }

  private now(): Date {
    return this.options.now?.() ?? new Date();
  }

  async createIntent(input: {
    userId: string;
    amountIdr: string;
    idempotencyKey: string;
  }): Promise<PaymentIntentResult> {
    parseIdrAmount(input.amountIdr);
    if (input.amountIdr === "0") throw new RangeError("Payment amount must be greater than zero.");
    if (!input.idempotencyKey || input.idempotencyKey.length < 8 || input.idempotencyKey.length > 128) {
      throw new RangeError("Payment idempotency key must contain between 8 and 128 characters.");
    }

    const existing = await this.database.paymentIntent.findUnique({
      where: { idempotencyKey: input.idempotencyKey },
    });
    if (existing) {
      if (existing.userId !== input.userId || existing.amount.toString() !== input.amountIdr) {
        throw new Error("IDEMPOTENCY_KEY_CONFLICT");
      }
      return {
        id: existing.id,
        provider: existing.provider,
        providerReference: existing.providerReference ?? "",
        amountIdr: existing.amount.toString(),
        currency: "IDR",
        status: existing.status,
        expiresAt: existing.expiresAt,
        checkoutUrl: null,
      };
    }

    await this.wallet.ensureWallet(input.userId);
    const expiresAt = new Date(this.now().getTime() + this.options.intentLifetimeSeconds * 1000);
    const intent = await this.database.paymentIntent.create({
      data: {
        userId: input.userId,
        provider: this.provider.providerName,
        idempotencyKey: input.idempotencyKey,
        amount: input.amountIdr,
        currency: "IDR",
        status: "pending",
        expiresAt,
      },
    });

    try {
      const providerIntent = await this.provider.createPaymentIntent({
        localPaymentIntentId: intent.id,
        amountIdr: input.amountIdr,
        idempotencyKey: input.idempotencyKey,
      });
      const updated = await this.database.paymentIntent.update({
        where: { id: intent.id },
        data: { providerReference: providerIntent.providerReference },
      });
      return {
        id: updated.id,
        provider: updated.provider,
        providerReference: updated.providerReference ?? "",
        amountIdr: updated.amount.toString(),
        currency: "IDR",
        status: updated.status,
        expiresAt: updated.expiresAt,
        checkoutUrl: null,
      };
    } catch {
      await this.database.paymentIntent.update({
        where: { id: intent.id },
        data: { status: "failed" },
      });
      throw new Error("PAYMENT_PROVIDER_UNAVAILABLE");
    }
  }

  async processWebhook(rawBody: Buffer, signature: string): Promise<WebhookProcessingResult> {
    let event: VerifiedPaymentEvent;
    try {
      event = await this.provider.verifyWebhook(rawBody, signature);
    } catch (error) {
      throw new Error(safeProviderError(error));
    }

    const payment = await this.database.paymentIntent.findUnique({
      where: { providerReference: event.reference },
    });
    const digest = bodyHash(rawBody);

    try {
      return await this.database.$transaction(async (tx) => {
        const webhook = await tx.paymentWebhook.create({
          data: {
            provider: this.provider.providerName,
            providerEventId: event.eventId,
            bodyHash: digest,
            signatureVerifiedAt: this.now(),
            status: payment ? "received" : "rejected",
            paymentIntentId: payment?.id ?? null,
            processedAt: payment ? null : this.now(),
            safeSummary: { event_type: event.type, result: payment ? "received" : "unknown_reference" },
          },
        });

        if (!payment) {
          return { accepted: false, duplicate: false, status: "rejected", paymentIntentId: null };
        }

        await tx.$queryRaw`SELECT "id" FROM "payment_intents" WHERE "id" = ${payment.id}::uuid FOR UPDATE`;
        const intent = await tx.paymentIntent.findUnique({ where: { id: payment.id } });
        if (!intent) {
          await tx.paymentWebhook.update({
            where: { id: webhook.id },
            data: { status: "rejected", processedAt: this.now() },
          });
          return { accepted: false, duplicate: false, status: "rejected", paymentIntentId: payment.id };
        }

        if (
          intent.provider !== this.provider.providerName ||
          intent.amount.toString() !== event.amount ||
          intent.currency !== event.currency
        ) {
          await tx.paymentWebhook.update({
            where: { id: webhook.id },
            data: {
              status: "rejected",
              processedAt: this.now(),
              safeSummary: { event_type: event.type, result: "intent_mismatch" },
            },
          });
          return { accepted: false, duplicate: false, status: "rejected", paymentIntentId: intent.id };
        }

        if (intent.status === "paid") {
          await tx.paymentWebhook.update({
            where: { id: webhook.id },
            data: { status: "processed", processedAt: this.now() },
          });
          return { accepted: true, duplicate: false, status: "processed", paymentIntentId: intent.id };
        }
        if (intent.expiresAt.getTime() <= this.now().getTime()) {
          await tx.paymentIntent.update({
            where: { id: intent.id },
            data: { status: "expired" },
          });
          await tx.paymentWebhook.update({
            where: { id: webhook.id },
            data: { status: "rejected", processedAt: this.now() },
          });
          return { accepted: false, duplicate: false, status: "rejected", paymentIntentId: intent.id };
        }

        if (intent.status !== "pending" && intent.status !== "processing") {
          await tx.paymentWebhook.update({
            where: { id: webhook.id },
            data: { status: "rejected", processedAt: this.now() },
          });
          return { accepted: false, duplicate: false, status: "rejected", paymentIntentId: intent.id };
        }

        if (event.type === "payment.failed") {
          await tx.paymentIntent.update({
            where: { id: intent.id },
            data: { status: "failed" },
          });
          await tx.paymentWebhook.update({
            where: { id: webhook.id },
            data: { status: "processed", processedAt: this.now() },
          });
          return { accepted: true, duplicate: false, status: "processed", paymentIntentId: intent.id };
        }

        const wallet = await tx.walletAccount.findUnique({ where: { userId: intent.userId } });
        if (!wallet || wallet.status !== "active" || wallet.currency !== "IDR") {
          await tx.paymentWebhook.update({
            where: { id: webhook.id },
            data: { status: "failed", processedAt: this.now(), safeSummary: { result: "wallet_not_ready" } },
          });
          return { accepted: false, duplicate: false, status: "failed", paymentIntentId: intent.id };
        }

        const clearing = await tx.ledgerAccount.upsert({
          where: { code: "asset.payment_clearing" },
          update: {},
          create: {
            code: "asset.payment_clearing",
            name: "Verified payment clearing",
            accountType: "asset",
            normalBalance: "debit",
            currency: "IDR",
          },
        });
        const ledger = await tx.ledgerTransaction.create({
          data: {
            idempotencyKey: `payment-credit:${this.provider.providerName}:${event.eventId}`.slice(0, 128),
            transactionType: "payment_credit",
            currency: "IDR",
            status: "pending",
            referenceType: "payment_intent",
            referenceId: intent.id,
            safeMetadata: { provider: this.provider.providerName, event_id: event.eventId },
          },
        });
        await tx.ledgerEntry.createMany({
          data: [
            {
              ledgerTransactionId: ledger.id,
              ledgerAccountId: clearing.id,
              direction: "debit",
              amount: intent.amount,
              currency: "IDR",
              memo: "Verified incoming payment",
            },
            {
              ledgerTransactionId: ledger.id,
              ledgerAccountId: wallet.ledgerAccountId,
              direction: "credit",
              amount: intent.amount,
              currency: "IDR",
              memo: "Prepaid wallet top-up",
            },
          ],
        });
        await tx.ledgerTransaction.update({
          where: { id: ledger.id },
          data: { status: "posted", postedAt: this.now() },
        });
        await tx.paymentIntent.update({
          where: { id: intent.id },
          data: { status: "paid" },
        });
        await tx.paymentWebhook.update({
          where: { id: webhook.id },
          data: { status: "processed", processedAt: this.now() },
        });
        return { accepted: true, duplicate: false, status: "processed", paymentIntentId: intent.id };
      }, { isolationLevel: "Serializable", timeout: 20_000 });
    } catch (error) {
      const code = error && typeof error === "object" && "code" in error
        ? String((error as { code?: unknown }).code)
        : "";
      if (code === "P2002") {
        const existing = await this.database.paymentWebhook.findUnique({
          where: {
            provider_providerEventId: {
              provider: this.provider.providerName,
              providerEventId: event.eventId,
            },
          },
        });
        if (existing) {
          return {
            accepted: existing.status === "processed",
            duplicate: true,
            status: existing.status === "processed" ? "processed" : existing.status === "failed" ? "failed" : "rejected",
            paymentIntentId: existing.paymentIntentId,
          };
        }
      }
      throw error;
    }
  }
}
