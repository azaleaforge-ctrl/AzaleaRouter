import assert from "node:assert/strict";
import { createHash, randomUUID } from "node:crypto";
import test from "node:test";
import { createDatabaseClient, type DatabaseClient } from "@azalea-router/database";
import { UsageService, WalletService } from "../src/index.js";

const databaseUrl = process.env.DATABASE_URL;

type UsageFixture = {
  userId: string;
  apiKeyId: string;
  catalogModelId: string;
  catalogEndpointId: string;
  usage: UsageService;
  wallet: WalletService;
};

async function createUsageFixture(database: DatabaseClient): Promise<UsageFixture> {
  const suffix = randomUUID();
  const now = new Date();
  const nowMs = now.getTime();
  const hash = (value: string) => createHash("sha256").update(value).digest("hex");

  const user = await database.user.create({
    data: {
      authSubjectId: suffix,
      emailNormalized: `usage-settlement-${suffix}@example.test`,
      status: "ACTIVE",
      emailVerifiedAt: now,
      profile: {
        create: {
          displayName: "Usage settlement integration",
          locale: "id-ID",
          timezone: "Asia/Jakarta",
        },
      },
      preferences: { create: {} },
    },
  });

  const apiKey = await database.apiKey.create({
    data: {
      userId: user.id,
      name: "Usage settlement integration key",
      keyPrefix: "AZL-usage-test",
      tokenHash: hash(suffix),
      pepperVersion: "integration-test-v1",
      scopes: ["chat:completions"],
      rateLimitRpm: 100,
      concurrencyLimit: 2,
      status: "active",
    },
  });

  const developer = await database.catalogDeveloper.create({
    data: {
      source: "usage-integration-test",
      slug: `developer-${suffix}`,
      displayName: "Usage Integration Developer",
    },
  });
  const provider = await database.catalogProvider.create({
    data: {
      source: "usage-integration-test",
      slug: `provider-${suffix}`,
      displayName: "Usage Integration Provider",
    },
  });
  const model = await database.catalogModel.create({
    data: {
      source: "usage-integration-test",
      sourceModelId: `usage-integration-test/model-${suffix}`,
      canonicalSlug: `usage-integration-test/model-${suffix}`,
      name: "Usage Integration Model",
      inputModalities: ["text"],
      outputModalities: ["text"],
      supportedParameters: ["temperature"],
      servedEndpoints: ["/v1/chat/completions"],
      rawMetadata: { test_fixture: true },
      isActive: true,
      lastSeenAt: now,
      developerId: developer.id,
    },
  });
  const endpoint = await database.catalogEndpoint.create({
    data: {
      source: "usage-integration-test",
      sourceEndpointId: `usage-integration-test:${suffix}`,
      modelId: model.id,
      providerId: provider.id,
      endpointName: "Usage integration endpoint",
      apiPath: "/v1/chat/completions",
      supportedParameters: ["temperature"],
      isActive: true,
      rawMetadata: { test_fixture: true },
      sourceFetchedAt: now,
    },
  });
  const price = await database.catalogPriceSnapshot.create({
    data: {
      endpointId: endpoint.id,
      currency: "USD",
      promptPrice: "0.000001",
      completionPrice: "0.000002",
      requestPrice: "0",
      imagePrice: "0",
      sourceFetchedAt: now,
      sourcePayloadHash: hash(`price:${suffix}`),
    },
  });
  const fx = await database.fxRateSnapshot.create({
    data: {
      baseCurrency: "USD",
      quoteCurrency: "IDR",
      rate: "16000",
      source: "usage-integration-test",
      sourceFetchedAt: now,
      payloadHash: hash(`fx:${suffix}`),
    },
  });
  await database.pricingPolicySnapshot.create({
    data: {
      catalogPriceSnapshotId: price.id,
      fxRateSnapshotId: fx.id,
      policyVersion: "usage-integration-test-v1",
      markupBasisPoints: 0,
      fixedFeeIdr: "0",
      maximumStaleSeconds: 3600,
    },
  });

  const wallet = new WalletService(database);
  await wallet.ensureWallet(user.id);
  const walletAccount = await database.walletAccount.findUniqueOrThrow({
    where: { userId: user.id },
  });
  const fundingAsset = await database.ledgerAccount.create({
    data: {
      code: `test.usage-funding.${suffix}`,
      name: "Usage integration test funding asset",
      accountType: "asset",
      normalBalance: "debit",
      currency: "IDR",
    },
  });
  const funding = await database.ledgerTransaction.create({
    data: {
      idempotencyKey: `test-usage-funding-${suffix}`,
      transactionType: "test_funding",
      currency: "IDR",
      status: "pending",
    },
  });
  await database.ledgerEntry.createMany({
    data: [
      {
        ledgerTransactionId: funding.id,
        ledgerAccountId: fundingAsset.id,
        direction: "debit",
        amount: "1000",
        currency: "IDR",
      },
      {
        ledgerTransactionId: funding.id,
        ledgerAccountId: walletAccount.ledgerAccountId,
        direction: "credit",
        amount: "1000",
        currency: "IDR",
      },
    ],
  });
  await database.ledgerTransaction.update({
    where: { id: funding.id },
    data: { status: "posted", postedAt: now },
  });

  return {
    userId: user.id,
    apiKeyId: apiKey.id,
    catalogModelId: model.id,
    catalogEndpointId: endpoint.id,
    usage: new UsageService(database, wallet, { now: () => nowMs }),
    wallet,
  };
}

async function beginUsage(
  fixture: UsageFixture,
  suffix: string,
) {
  return fixture.usage.begin({
    userId: fixture.userId,
    apiKeyId: fixture.apiKeyId,
    requestId: `usage-request-${suffix}`,
    idempotencyKey: `usage-idempotency-${suffix}`,
    catalogModelId: fixture.catalogModelId,
    canonicalModelId: `usage-integration-test/model-${suffix}`,
    sourceModelId: `usage-integration-test/model-${suffix}`,
    catalogEndpointId: fixture.catalogEndpointId,
    providerSlug: `provider-${suffix}`,
    estimatedPromptTokens: 100,
    maxCompletionTokens: 100,
  });
}

test("usage settlement atomically posts one ledger charge, aggregate and outbox event", {
  skip: !databaseUrl,
}, async () => {
  const database = createDatabaseClient(databaseUrl!);
  await database.$connect();

  try {
    const suffix = randomUUID();
    const fixture = await createUsageFixture(database);
    const started = await beginUsage(fixture, suffix);

    assert.equal(started.reservedChargeIdr, "5");
    assert.ok(started.reservationId);

    const startedEvents = await database.outboxEvent.findMany({
      where: { aggregateId: started.usageRecordId },
    });
    assert.deepEqual(startedEvents.map((event) => event.eventType), ["usage.request.started"]);

    const finalized = await fixture.usage.finalize({
      usageRecordId: started.usageRecordId,
      providerRequestId: `provider-request-${suffix}`,
      promptTokens: 50,
      completionTokens: 50,
      cachedTokens: 0,
      reasoningTokens: 0,
      latencyMs: 123,
    });

    assert.equal(finalized.status, "settled");
    assert.equal(finalized.providerCostIdr, "3");
    assert.equal(finalized.customerChargeIdr, "3");
    assert.equal(finalized.reconciliationRequired, false);

    const reservation = await database.walletReservation.findUniqueOrThrow({
      where: { id: started.reservationId! },
    });
    assert.equal(reservation.status, "settled");
    assert.equal(reservation.settledAmount?.toString(), "3");

    const settlementTransactions = await database.ledgerTransaction.findMany({
      where: {
        transactionType: "usage_settlement",
        referenceType: "wallet_reservation",
        referenceId: reservation.id,
      },
    });
    assert.equal(settlementTransactions.length, 1);
    assert.equal(settlementTransactions[0]!.status, "posted");

    const entries = await database.ledgerEntry.findMany({
      where: { ledgerTransactionId: settlementTransactions[0]!.id },
    });
    assert.equal(entries.length, 2);
    const debits = entries
      .filter((entry) => entry.direction === "debit")
      .reduce((total, entry) => total + BigInt(entry.amount.toString()), 0n);
    const credits = entries
      .filter((entry) => entry.direction === "credit")
      .reduce((total, entry) => total + BigInt(entry.amount.toString()), 0n);
    assert.equal(debits, 3n);
    assert.equal(credits, 3n);

    const balance = await fixture.wallet.getBalance(fixture.userId);
    assert.equal(balance.ledgerBalance, "997");
    assert.equal(balance.reservedBalance, "0");
    assert.equal(balance.availableBalance, "997");

    const aggregate = await database.usageAggregate.findFirstOrThrow({
      where: {
        userId: fixture.userId,
        catalogModelId: fixture.catalogModelId,
        period: "day",
      },
    });
    assert.equal(aggregate.requestCount, 1n);
    assert.equal(aggregate.successfulRequestCount, 1n);
    assert.equal(aggregate.promptTokens, 50n);
    assert.equal(aggregate.completionTokens, 50n);
    assert.equal(aggregate.totalTokens, 100n);
    assert.equal(aggregate.customerChargeIdr.toString(), "3");

    const events = await database.outboxEvent.findMany({
      where: { aggregateId: started.usageRecordId },
      orderBy: { occurredAt: "asc" },
    });
    assert.deepEqual(
      events.map((event) => event.eventType).sort(),
      ["usage.request.settled", "usage.request.started"].sort(),
    );

    const repeated = await fixture.usage.finalize({
      usageRecordId: started.usageRecordId,
      providerRequestId: `provider-request-${suffix}`,
      promptTokens: 50,
      completionTokens: 50,
      cachedTokens: 0,
      reasoningTokens: 0,
      latencyMs: 123,
    });
    assert.equal(repeated.status, "settled");
    assert.equal(repeated.customerChargeIdr, "3");

    const repeatedTransactions = await database.ledgerTransaction.count({
      where: {
        transactionType: "usage_settlement",
        referenceType: "wallet_reservation",
        referenceId: reservation.id,
      },
    });
    const repeatedEvents = await database.outboxEvent.count({
      where: { aggregateId: started.usageRecordId },
    });
    const repeatedAggregate = await database.usageAggregate.findFirstOrThrow({
      where: {
        userId: fixture.userId,
        catalogModelId: fixture.catalogModelId,
        period: "day",
      },
    });
    assert.equal(repeatedTransactions, 1);
    assert.equal(repeatedEvents, 2);
    assert.equal(repeatedAggregate.requestCount, 1n);
  } finally {
    await database.$disconnect();
  }
});

test("usage above its reservation is held for reconciliation without a ledger debit", {
  skip: !databaseUrl,
}, async () => {
  const database = createDatabaseClient(databaseUrl!);
  await database.$connect();

  try {
    const suffix = randomUUID();
    const fixture = await createUsageFixture(database);
    const started = await beginUsage(fixture, suffix);

    assert.equal(started.reservedChargeIdr, "5");
    assert.ok(started.reservationId);

    const finalized = await fixture.usage.finalize({
      usageRecordId: started.usageRecordId,
      providerRequestId: `provider-request-${suffix}`,
      promptTokens: 100,
      completionTokens: 110,
      cachedTokens: 0,
      reasoningTokens: 0,
      latencyMs: 456,
    });

    assert.equal(finalized.status, "pending_reconciliation");
    assert.equal(finalized.providerCostIdr, "6");
    assert.equal(finalized.customerChargeIdr, "6");
    assert.equal(finalized.reconciliationRequired, true);

    const usageRecord = await database.usageRecord.findUniqueOrThrow({
      where: { id: started.usageRecordId },
    });
    assert.equal(usageRecord.status, "pending_reconciliation");
    assert.equal(usageRecord.reconciliationStatus, "pending");
    assert.equal(usageRecord.errorCode, "ACTUAL_COST_EXCEEDS_RESERVATION");

    const reservation = await database.walletReservation.findUniqueOrThrow({
      where: { id: started.reservationId! },
    });
    assert.equal(reservation.status, "reserved");
    assert.equal(reservation.settledAmount, null);

    const settlementCount = await database.ledgerTransaction.count({
      where: {
        transactionType: "usage_settlement",
        referenceType: "wallet_reservation",
        referenceId: reservation.id,
      },
    });
    assert.equal(settlementCount, 0);

    const balance = await fixture.wallet.getBalance(fixture.userId);
    assert.equal(balance.ledgerBalance, "1000");
    assert.equal(balance.reservedBalance, "5");
    assert.equal(balance.availableBalance, "995");

    const lease = await database.apiKeyConcurrencyLease.findUniqueOrThrow({
      where: { usageRecordId: started.usageRecordId },
    });
    assert.ok(lease.releasedAt);

    const events = await database.outboxEvent.findMany({
      where: { aggregateId: started.usageRecordId },
    });
    assert.deepEqual(
      events.map((event) => event.eventType).sort(),
      ["notification.created", "usage.request.started"].sort(),
    );

    const aggregateCount = await database.usageAggregate.count({
      where: {
        userId: fixture.userId,
        catalogModelId: fixture.catalogModelId,
      },
    });
    assert.equal(aggregateCount, 0);
  } finally {
    await database.$disconnect();
  }
});
