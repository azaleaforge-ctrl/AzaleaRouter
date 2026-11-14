import type { DatabaseClient } from "@azalea-router/database";
import {
  calculateUsageCostIdr,
  parseIdrAmount,
  type UsageCostResult,
} from "./money.js";
import { WalletService } from "./wallet-service.js";

const DEFAULT_REPLAY_SECONDS = 24 * 60 * 60;
const CONCURRENCY_LEASE_SECONDS = 10 * 60;
const USAGE_RATE_WINDOW_MS = 60_000;

export interface UsageStartInput {
  userId: string;
  apiKeyId: string;
  requestId: string;
  idempotencyKey: string;
  catalogModelId: string;
  canonicalModelId: string;
  sourceModelId: string;
  catalogEndpointId: string;
  providerSlug: string;
  estimatedPromptTokens: number;
  maxCompletionTokens: number;
}

export interface UsageStartResult {
  usageRecordId: string;
  requestId: string;
  reservationId: string | null;
  reservedChargeIdr: string;
  currency: "IDR";
  status: "started";
  startedAt: Date;
}

export interface UsageFinalizationInput {
  usageRecordId: string;
  providerRequestId?: string;
  promptTokens: number;
  completionTokens: number;
  cachedTokens?: number;
  reasoningTokens?: number;
  latencyMs: number;
}

export interface UsageFinalizationResult {
  usageRecordId: string;
  status: "settled" | "pending_reconciliation";
  providerCostIdr: string;
  customerChargeIdr: string;
  currency: "IDR";
  reconciliationRequired: boolean;
}

export interface UsageServiceOptions {
  replayWindowSeconds?: number;
  concurrencyLeaseSeconds?: number;
  now?: () => number;
}

interface PricingContext {
  priceId: string;
  fxId: string;
  policyId: string;
  promptPrice: string;
  completionPrice: string;
  requestPrice: string;
  imagePrice: string;
  fxRate: string;
  markupBasisPoints: number;
  fixedFeeIdr: string;
}

function decimalString(value: { toString(): string } | string | null | undefined): string {
  if (value === null || value === undefined) return "0";
  return typeof value === "string" ? value : value.toString();
}

function safeCount(value: number, label: string): bigint {
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new RangeError(`${label} must be a safe non-negative integer.`);
  }
  return BigInt(value);
}

function periodStart(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

function colorForUserModel(userId: string, modelId: string): string {
  const palette = [
    "#2563EB", "#16A34A", "#DC2626", "#CA8A04",
    "#EA580C", "#9333EA", "#0891B2", "#DB2777",
    "#4F46E5", "#0D9488", "#65A30D", "#C026D3",
  ];
  // A stable deterministic assignment; the database unique constraint protects races.
  let hash = 2166136261;
  for (const character of `${userId}:${modelId}`) {
    hash ^= character.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return palette[(hash >>> 0) % palette.length]!;
}

export class UsageService {
  private readonly now: () => number;
  private readonly replayWindowSeconds: number;
  private readonly concurrencyLeaseSeconds: number;

  constructor(
    private readonly database: DatabaseClient,
    private readonly wallet: WalletService,
    options: UsageServiceOptions = {},
  ) {
    this.now = options.now ?? Date.now;
    this.replayWindowSeconds = options.replayWindowSeconds ?? DEFAULT_REPLAY_SECONDS;
    this.concurrencyLeaseSeconds = options.concurrencyLeaseSeconds ?? CONCURRENCY_LEASE_SECONDS;
  }

  private async loadPricing(endpointId: string): Promise<PricingContext> {
    const now = this.now();
    const price = await this.database.catalogPriceSnapshot.findFirst({
      where: { endpointId, currency: "USD" },
      orderBy: { sourceFetchedAt: "desc" },
    });
    if (!price) throw new Error("PRICING_NOT_READY");

    const policy = await this.database.pricingPolicySnapshot.findFirst({
      where: { catalogPriceSnapshotId: price.id },
      include: { fxRateSnapshot: true },
      orderBy: { createdAt: "desc" },
    });
    if (!policy) throw new Error("PRICING_POLICY_NOT_READY");

    const maximumAgeMs = policy.maximumStaleSeconds * 1000;
    if (
      price.sourceFetchedAt.getTime() > now + 60_000 ||
      now - price.sourceFetchedAt.getTime() > maximumAgeMs ||
      policy.fxRateSnapshot.sourceFetchedAt.getTime() > now + 60_000 ||
      now - policy.fxRateSnapshot.sourceFetchedAt.getTime() > maximumAgeMs
    ) {
      throw new Error("PRICING_SNAPSHOT_STALE");
    }

    if (
      policy.fxRateSnapshot.baseCurrency !== "USD" ||
      policy.fxRateSnapshot.quoteCurrency !== "IDR" ||
      /^0(?:\\.0+)?$/.test(decimalString(policy.fxRateSnapshot.rate))
    ) {
      throw new Error("FX_SNAPSHOT_INVALID");
    }

    return {
      priceId: price.id,
      fxId: policy.fxRateSnapshotId,
      policyId: policy.id,
      promptPrice: decimalString(price.promptPrice),
      completionPrice: decimalString(price.completionPrice),
      requestPrice: decimalString(price.requestPrice),
      imagePrice: decimalString(price.imagePrice),
      fxRate: decimalString(policy.fxRateSnapshot.rate),
      markupBasisPoints: policy.markupBasisPoints,
      fixedFeeIdr: decimalString(policy.fixedFeeIdr),
    };
  }

  private estimateCharge(pricing: PricingContext, promptTokens: number, completionTokens: number): UsageCostResult {
    safeCount(promptTokens, "Estimated prompt tokens");
    safeCount(completionTokens, "Completion token limit");
    return calculateUsageCostIdr({
      promptPriceUsdPerToken: pricing.promptPrice,
      completionPriceUsdPerToken: pricing.completionPrice,
      requestPriceUsd: pricing.requestPrice,
      imagePriceUsd: pricing.imagePrice,
      promptTokens,
      completionTokens,
      requestCount: 1,
      imageCount: 0,
      usdToIdrRate: pricing.fxRate,
      markupBasisPoints: pricing.markupBasisPoints,
      fixedFeeIdr: pricing.fixedFeeIdr,
    });
  }

  async begin(input: UsageStartInput): Promise<UsageStartResult> {
    if (!input.requestId || input.requestId.length > 100) throw new RangeError("Invalid request ID.");
    if (!input.idempotencyKey || input.idempotencyKey.length < 8 || input.idempotencyKey.length > 128) {
      throw new RangeError("Idempotency-Key must contain between 8 and 128 characters.");
    }
    const promptTokens = Number(safeCount(input.estimatedPromptTokens, "Estimated prompt tokens"));
    const completionLimit = Number(safeCount(input.maxCompletionTokens, "Completion token limit"));
    if (completionLimit < 1) throw new Error("MAX_TOKENS_REQUIRED");

    const pricing = await this.loadPricing(input.catalogEndpointId);
    const estimated = this.estimateCharge(pricing, promptTokens, completionLimit);
    const reservedChargeIdr = estimated.customerChargeIdr;
    if (reservedChargeIdr !== "0") await this.wallet.ensureWallet(input.userId);

    const now = new Date(this.now());
    const rateWindowStart = new Date(Math.floor(now.getTime() / USAGE_RATE_WINDOW_MS) * USAGE_RATE_WINDOW_MS);
    const rateWindowExpires = new Date(rateWindowStart.getTime() + USAGE_RATE_WINDOW_MS * 2);
    const leaseExpiresAt = new Date(now.getTime() + this.concurrencyLeaseSeconds * 1000);

    return this.database.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT "id" FROM "api_keys" WHERE "id" = ${input.apiKeyId}::uuid AND "user_id" = ${input.userId}::uuid FOR UPDATE`;
      const apiKey = await tx.apiKey.findFirst({
        where: { id: input.apiKeyId, userId: input.userId, status: "active" },
      });
      if (!apiKey || (apiKey.expiresAt && apiKey.expiresAt.getTime() <= now.getTime())) {
        throw new Error("API_KEY_INVALID");
      }

      const rateWindow = await tx.apiKeyRateWindow.upsert({
        where: { apiKeyId_windowStart: { apiKeyId: apiKey.id, windowStart: rateWindowStart } },
        create: {
          apiKeyId: apiKey.id,
          windowStart: rateWindowStart,
          requestCount: 1,
          expiresAt: rateWindowExpires,
        },
        update: { requestCount: { increment: 1 }, expiresAt: rateWindowExpires },
      });
      if (rateWindow.requestCount > apiKey.rateLimitRpm) throw new Error("API_KEY_RATE_LIMITED");

      const activeLeases = await tx.apiKeyConcurrencyLease.count({
        where: {
          apiKeyId: apiKey.id,
          releasedAt: null,
          expiresAt: { gt: now },
        },
      });
      if (activeLeases >= apiKey.concurrencyLimit) throw new Error("API_KEY_CONCURRENCY_LIMIT");

      const usageTotals = await tx.$queryRaw<Array<{ committed_and_reserved: string }>>`
        SELECT COALESCE(SUM(
          CASE
            WHEN "status" = 'settled' THEN COALESCE("customer_charge_idr", 0)
            WHEN "status" IN ('started','streaming','completed','unknown_cost','pending_reconciliation')
              THEN "reserved_charge_idr"
            ELSE 0
          END
        ), 0)::text AS committed_and_reserved
        FROM "usage_records"
        WHERE "api_key_id" = ${apiKey.id}::uuid
      `;
      const committedAndReserved = parseIdrAmount(usageTotals[0]?.committed_and_reserved ?? "0");
      if (apiKey.spendLimitIdr !== null) {
        const spendLimit = parseIdrAmount(decimalString(apiKey.spendLimitIdr));
        if (committedAndReserved + parseIdrAmount(reservedChargeIdr) > spendLimit) {
          throw new Error("API_KEY_SPEND_LIMIT_EXCEEDED");
        }
      }

      const existing = await tx.usageRecord.findUnique({
        where: { idempotencyKey: input.idempotencyKey },
      });
      if (existing) {
        if (existing.userId !== input.userId || existing.apiKeyId !== input.apiKeyId) {
          throw new Error("IDEMPOTENCY_KEY_CONFLICT");
        }
        throw new Error("REQUEST_ALREADY_PROCESSED");
      }

      const usage = await tx.usageRecord.create({
        data: {
          userId: input.userId,
          apiKeyId: input.apiKeyId,
          catalogModelId: input.catalogModelId,
          catalogEndpointId: input.catalogEndpointId,
          idempotencyKey: input.idempotencyKey,
          requestId: input.requestId,
          canonicalModelId: input.canonicalModelId,
          sourceModelId: input.sourceModelId,
          providerSlug: input.providerSlug,
          source: "api",
          status: "started",
          promptTokens: 0n,
          completionTokens: 0n,
          cachedTokens: 0n,
          reasoningTokens: 0n,
          totalTokens: 0n,
          reservedChargeIdr,
          promptPriceUsd: pricing.promptPrice,
          completionPriceUsd: pricing.completionPrice,
          catalogPriceSnapshotId: pricing.priceId,
          fxRateSnapshotId: pricing.fxId,
          pricingPolicySnapshotId: pricing.policyId,
        },
      });

      let reservationId: string | null = null;
      if (reservedChargeIdr !== "0") {
        const reservation = await this.wallet.reserveInTransaction(tx, {
          userId: input.userId,
          amount: reservedChargeIdr,
          idempotencyKey: `usage-reserve:${usage.id}`,
          expiresAt: leaseExpiresAt,
        });
        reservationId = reservation.reservationId;
        await tx.usageRecord.update({
          where: { id: usage.id },
          data: { walletReservationId: reservationId },
        });
      }

      await tx.apiKeyConcurrencyLease.create({
        data: {
          apiKeyId: apiKey.id,
          usageRecordId: usage.id,
          expiresAt: leaseExpiresAt,
        },
      });

      await tx.modelColorPreference.upsert({
        where: {
          userId_catalogModelId: {
            userId: input.userId,
            catalogModelId: input.catalogModelId,
          },
        },
        create: {
          userId: input.userId,
          catalogModelId: input.catalogModelId,
          color: colorForUserModel(input.userId, input.catalogModelId),
          assignmentMethod: "auto",
        },
        update: {},
      });

      await tx.outboxEvent.create({
        data: {
          userId: input.userId,
          aggregateType: "usage_request",
          aggregateId: usage.id,
          eventType: "usage.request.started",
          schemaVersion: 1,
          idempotencyKey: `usage.started:${usage.id}`,
          payloadSafe: {
            request_id: input.requestId,
            model_id: input.canonicalModelId,
            provider: input.providerSlug,
            status: "started",
            currency: "IDR",
            reserved_amount_idr: reservedChargeIdr,
          },
          occurredAt: now,
          availableAt: now,
          publishedAt: now,
          expiresAt: new Date(now.getTime() + this.replayWindowSeconds * 1000),
        },
      });

      return {
        usageRecordId: usage.id,
        requestId: input.requestId,
        reservationId,
        reservedChargeIdr,
        currency: "IDR",
        status: "started",
        startedAt: usage.startedAt,
      };
    }, { isolationLevel: "Serializable", timeout: 15_000 });
  }

  async markStreaming(usageRecordId: string): Promise<void> {
    const now = new Date(this.now());
    await this.database.$transaction(async (tx) => {
      await tx.usageRecord.updateMany({
        where: { id: usageRecordId, status: "started" },
        data: { status: "streaming" },
      });
      await tx.apiKeyConcurrencyLease.updateMany({
        where: { usageRecordId, releasedAt: null },
        data: { expiresAt: new Date(now.getTime() + this.concurrencyLeaseSeconds * 1000) },
      });
    });
  }

  async extendLease(usageRecordId: string): Promise<void> {
    const now = new Date(this.now());
    await this.database.apiKeyConcurrencyLease.updateMany({
      where: { usageRecordId, releasedAt: null },
      data: { expiresAt: new Date(now.getTime() + this.concurrencyLeaseSeconds * 1000) },
    });
  }

  async markPendingReconciliation(input: {
    usageRecordId: string;
    errorCode: string;
  }): Promise<void> {
    const now = new Date(this.now());
    await this.database.$transaction(async (tx) => {
      const usage = await tx.usageRecord.findUnique({ where: { id: input.usageRecordId } });
      if (!usage || ["settled", "released", "failed"].includes(usage.status)) return;
      if (usage.status !== "pending_reconciliation") {
        await tx.usageRecord.update({
          where: { id: usage.id },
          data: {
            status: "pending_reconciliation",
            reconciliationStatus: "required",
            errorCode: input.errorCode.slice(0, 80),
            completedAt: now,
          },
        });
      }
      await tx.apiKeyConcurrencyLease.updateMany({
        where: { usageRecordId: usage.id, releasedAt: null },
        data: { releasedAt: now },
      });
      await tx.outboxEvent.create({
        data: {
          userId: usage.userId,
          aggregateType: "usage_request",
          aggregateId: usage.id,
          eventType: "notification.created",
          schemaVersion: 1,
          idempotencyKey: `usage.unknown-cost:${usage.id}`,
          payloadSafe: {
            request_id: usage.requestId,
            status: "pending_reconciliation",
            currency: "IDR",
            code: input.errorCode.slice(0, 80),
            occurred_at: now.toISOString(),
          },
          occurredAt: now,
          availableAt: now,
          publishedAt: now,
          expiresAt: new Date(now.getTime() + this.replayWindowSeconds * 1000),
        },
      });
    }, { isolationLevel: "Serializable", timeout: 15_000 });
  }

  async finalize(input: UsageFinalizationInput): Promise<UsageFinalizationResult> {
    safeCount(input.promptTokens, "Prompt tokens");
    safeCount(input.completionTokens, "Completion tokens");
    safeCount(input.cachedTokens ?? 0, "Cached tokens");
    safeCount(input.reasoningTokens ?? 0, "Reasoning tokens");
    if (!Number.isSafeInteger(input.latencyMs) || input.latencyMs < 0) {
      throw new RangeError("Latency must be a safe non-negative integer.");
    }

    return this.database.$transaction(async (tx) => {
      const usage = await tx.usageRecord.findUnique({
        where: { id: input.usageRecordId },
        include: {
          catalogPriceSnapshot: true,
          fxRateSnapshot: true,
          pricingPolicySnapshot: true,
        },
      });
      if (!usage) throw new Error("USAGE_RECORD_NOT_FOUND");
      if (usage.status === "settled") {
        return {
          usageRecordId: usage.id,
          status: "settled",
          providerCostIdr: decimalString(usage.providerCostIdr),
          customerChargeIdr: decimalString(usage.customerChargeIdr),
          currency: "IDR",
          reconciliationRequired: false,
        };
      }
      if (!["started", "streaming", "completed"].includes(usage.status)) {
        throw new Error("USAGE_RECORD_NOT_FINALIZABLE");
      }
      if (!usage.catalogPriceSnapshot || !usage.fxRateSnapshot || !usage.pricingPolicySnapshot) {
        throw new Error("PRICING_SNAPSHOT_MISSING");
      }

      const pricing = {
        promptPriceUsdPerToken: decimalString(usage.catalogPriceSnapshot.promptPrice),
        completionPriceUsdPerToken: decimalString(usage.catalogPriceSnapshot.completionPrice),
        requestPriceUsd: decimalString(usage.catalogPriceSnapshot.requestPrice),
        imagePriceUsd: decimalString(usage.catalogPriceSnapshot.imagePrice),
        promptTokens: input.promptTokens,
        completionTokens: input.completionTokens,
        requestCount: 1,
        imageCount: 0,
        usdToIdrRate: decimalString(usage.fxRateSnapshot.rate),
        markupBasisPoints: usage.pricingPolicySnapshot.markupBasisPoints,
        fixedFeeIdr: decimalString(usage.pricingPolicySnapshot.fixedFeeIdr),
      };
      const cost = calculateUsageCostIdr(pricing);
      const heldAmount = parseIdrAmount(decimalString(usage.reservedChargeIdr));

      if (parseIdrAmount(cost.customerChargeIdr) > heldAmount) {
        const updated = await tx.usageRecord.update({
          where: { id: usage.id },
          data: {
            status: "pending_reconciliation",
            reconciliationStatus: "required",
            errorCode: "ACTUAL_COST_EXCEEDS_RESERVATION",
            providerRequestId: input.providerRequestId ?? null,
            promptTokens: BigInt(input.promptTokens),
            completionTokens: BigInt(input.completionTokens),
            cachedTokens: BigInt(input.cachedTokens ?? 0),
            reasoningTokens: BigInt(input.reasoningTokens ?? 0),
            totalTokens: BigInt(input.promptTokens + input.completionTokens),
            providerCostIdr: cost.providerCostIdr,
            customerChargeIdr: cost.customerChargeIdr,
            completedAt: new Date(this.now()),
            latencyMs: input.latencyMs,
          },
        });
        await tx.apiKeyConcurrencyLease.updateMany({
          where: { usageRecordId: usage.id, releasedAt: null },
          data: { releasedAt: new Date(this.now()) },
        });
        await tx.outboxEvent.create({
          data: {
            userId: usage.userId,
            aggregateType: "usage_request",
            aggregateId: usage.id,
            eventType: "notification.created",
            schemaVersion: 1,
            idempotencyKey: `usage.reconciliation:${usage.id}`,
            payloadSafe: {
              request_id: usage.requestId,
              status: "pending_reconciliation",
              currency: "IDR",
              reserved_amount_idr: decimalString(usage.reservedChargeIdr),
              actual_amount_idr: cost.customerChargeIdr,
              code: "ACTUAL_COST_EXCEEDS_RESERVATION",
            },
            occurredAt: new Date(this.now()),
            availableAt: new Date(this.now()),
            publishedAt: new Date(this.now()),
            expiresAt: new Date(this.now() + this.replayWindowSeconds * 1000),
          },
        });
        return {
          usageRecordId: updated.id,
          status: "pending_reconciliation",
          providerCostIdr: cost.providerCostIdr,
          customerChargeIdr: cost.customerChargeIdr,
          currency: "IDR",
          reconciliationRequired: true,
        };
      }

      if (usage.walletReservationId) {
        await this.wallet.settleReservationInTransaction(tx, {
          userId: usage.userId,
          reservationId: usage.walletReservationId,
          idempotencyKey: `usage-settle:${usage.id}`,
          actualAmount: cost.customerChargeIdr,
        });
      } else if (cost.customerChargeIdr !== "0") {
        throw new Error("WALLET_RESERVATION_MISSING");
      }

      const completedAt = new Date(this.now());
      const updated = await tx.usageRecord.update({
        where: { id: usage.id },
        data: {
          status: "settled",
          reconciliationStatus: "not_required",
          errorCode: null,
          providerRequestId: input.providerRequestId ?? null,
          promptTokens: BigInt(input.promptTokens),
          completionTokens: BigInt(input.completionTokens),
          cachedTokens: BigInt(input.cachedTokens ?? 0),
          reasoningTokens: BigInt(input.reasoningTokens ?? 0),
          totalTokens: BigInt(input.promptTokens + input.completionTokens),
          providerCostIdr: cost.providerCostIdr,
          customerChargeIdr: cost.customerChargeIdr,
          completedAt,
          settledAt: completedAt,
          latencyMs: input.latencyMs,
        },
      });

      const day = periodStart(completedAt);
      await tx.usageAggregate.upsert({
        where: {
          userId_catalogModelId_periodStart_period: {
            userId: usage.userId,
            catalogModelId: usage.catalogModelId,
            periodStart: day,
            period: "day",
          },
        },
        create: {
          userId: usage.userId,
          catalogModelId: usage.catalogModelId,
          periodStart: day,
          period: "day",
          requestCount: 1n,
          successfulRequestCount: 1n,
          failedRequestCount: 0n,
          promptTokens: BigInt(input.promptTokens),
          completionTokens: BigInt(input.completionTokens),
          cachedTokens: BigInt(input.cachedTokens ?? 0),
          reasoningTokens: BigInt(input.reasoningTokens ?? 0),
          totalTokens: BigInt(input.promptTokens + input.completionTokens),
          providerCostIdr: cost.providerCostIdr,
          customerChargeIdr: cost.customerChargeIdr,
          currency: "IDR",
          sourceUpdatedAt: completedAt,
        },
        update: {
          requestCount: { increment: 1n },
          successfulRequestCount: { increment: 1n },
          promptTokens: { increment: BigInt(input.promptTokens) },
          completionTokens: { increment: BigInt(input.completionTokens) },
          cachedTokens: { increment: BigInt(input.cachedTokens ?? 0) },
          reasoningTokens: { increment: BigInt(input.reasoningTokens ?? 0) },
          totalTokens: { increment: BigInt(input.promptTokens + input.completionTokens) },
          providerCostIdr: { increment: cost.providerCostIdr },
          customerChargeIdr: { increment: cost.customerChargeIdr },
          sourceUpdatedAt: completedAt,
        },
      });

      await tx.apiKeyConcurrencyLease.updateMany({
        where: { usageRecordId: usage.id, releasedAt: null },
        data: { releasedAt: completedAt },
      });

      await tx.outboxEvent.create({
        data: {
          userId: usage.userId,
          aggregateType: "usage_request",
          aggregateId: usage.id,
          eventType: "usage.request.settled",
          schemaVersion: 1,
          idempotencyKey: `usage.settled:${usage.id}`,
          payloadSafe: {
            request_id: usage.requestId,
            model_id: usage.canonicalModelId,
            status: "settled",
            prompt_tokens: input.promptTokens,
            completion_tokens: input.completionTokens,
            total_tokens: input.promptTokens + input.completionTokens,
            amount_idr: cost.customerChargeIdr,
            currency: "IDR",
            occurred_at: completedAt.toISOString(),
          },
          occurredAt: completedAt,
          availableAt: completedAt,
          publishedAt: completedAt,
          expiresAt: new Date(completedAt.getTime() + this.replayWindowSeconds * 1000),
        },
      });

      return {
        usageRecordId: updated.id,
        status: "settled",
        providerCostIdr: cost.providerCostIdr,
        customerChargeIdr: cost.customerChargeIdr,
        currency: "IDR",
        reconciliationRequired: false,
      };
    }, { isolationLevel: "Serializable", timeout: 20_000 });
  }

  async fail(input: {
    usageRecordId: string;
    errorCode: string;
    cancelled?: boolean;
  }): Promise<void> {
    const now = new Date(this.now());
    await this.database.$transaction(async (tx) => {
      const usage = await tx.usageRecord.findUnique({ where: { id: input.usageRecordId } });
      if (!usage || ["settled", "released"].includes(usage.status)) return;
      if (usage.walletReservationId) {
        await this.wallet.releaseReservationInTransaction(tx, usage.userId, usage.walletReservationId);
      }
      await tx.usageRecord.update({
        where: { id: usage.id },
        data: {
          status: input.cancelled ? "released" : "failed",
          reconciliationStatus: "not_required",
          errorCode: input.errorCode.slice(0, 80),
          completedAt: now,
        },
      });
      await tx.apiKeyConcurrencyLease.updateMany({
        where: { usageRecordId: usage.id, releasedAt: null },
        data: { releasedAt: now },
      });
      await tx.outboxEvent.create({
        data: {
          userId: usage.userId,
          aggregateType: "usage_request",
          aggregateId: usage.id,
          eventType: "usage.request.failed",
          schemaVersion: 1,
          idempotencyKey: `usage.failed:${usage.id}`,
          payloadSafe: {
            request_id: usage.requestId,
            model_id: usage.canonicalModelId,
            status: input.cancelled ? "released" : "failed",
            code: input.errorCode.slice(0, 80),
            occurred_at: now.toISOString(),
          },
          occurredAt: now,
          availableAt: now,
          publishedAt: now,
          expiresAt: new Date(now.getTime() + this.replayWindowSeconds * 1000),
        },
      });
    }, { isolationLevel: "Serializable", timeout: 15_000 });
  }

  async getModelColors(userId: string) {
    return this.database.modelColorPreference.findMany({
      where: { userId },
      include: { catalogModel: { select: { canonicalSlug: true, name: true } } },
      orderBy: { updatedAt: "desc" },
    });
  }

  async setModelColor(userId: string, catalogModelId: string, color: string) {
    const normalized = color.toUpperCase();
    if (!/^#[0-9A-F]{6}$/.test(normalized)) throw new Error("MODEL_COLOR_INVALID");
    const model = await this.database.catalogModel.findFirst({
      where: { id: catalogModelId, isActive: true },
      select: { id: true },
    });
    if (!model) throw new Error("MODEL_NOT_FOUND");
    return this.database.modelColorPreference.upsert({
      where: { userId_catalogModelId: { userId, catalogModelId } },
      create: {
        userId,
        catalogModelId,
        color: normalized,
        assignmentMethod: "manual",
      },
      update: {
        color: normalized,
        assignmentMethod: "manual",
      },
    });
  }
}
