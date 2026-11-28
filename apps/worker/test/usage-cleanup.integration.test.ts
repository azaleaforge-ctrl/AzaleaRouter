import assert from "node:assert/strict";
import { createHash, randomUUID } from "node:crypto";
import test from "node:test";
import { createDatabaseClient } from "@azalea-router/database";
import { createJobHandlers } from "../src/handlers/index.js";

const databaseUrl = process.env.DATABASE_URL;
const LEASE_BATCH_SIZE = 500;
const DAY_MS = 24 * 60 * 60 * 1000;

test("usage cleanup processes expired leases in bounded batches and honors retention", {
  skip: !databaseUrl,
}, async () => {
  const database = createDatabaseClient(databaseUrl!);
  await database.$connect();

  try {
    const suffix = randomUUID();
    const now = new Date();
    const expiredAt = new Date(now.getTime() - 60_000);
    const futureAt = new Date(now.getTime() + 60 * 60 * 1000);
    const oldReleasedAt = new Date(now.getTime() - DAY_MS - 60 * 60 * 1000);
    const hash = (value: string) => createHash("sha256").update(value).digest("hex");

    const user = await database.user.create({
      data: {
        authSubjectId: suffix,
        emailNormalized: `usage-cleanup-${suffix}@example.test`,
        status: "ACTIVE",
        emailVerifiedAt: now,
      },
    });
    const apiKey = await database.apiKey.create({
      data: {
        userId: user.id,
        name: "Usage cleanup integration",
        keyPrefix: "AZL-cleanup-test",
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
        source: "usage-cleanup-integration",
        slug: `developer-${suffix}`,
        displayName: "Usage Cleanup Integration",
      },
    });
    const provider = await database.catalogProvider.create({
      data: {
        source: "usage-cleanup-integration",
        slug: `provider-${suffix}`,
        displayName: "Usage Cleanup Integration",
      },
    });
    const model = await database.catalogModel.create({
      data: {
        source: "usage-cleanup-integration",
        sourceModelId: `usage-cleanup-integration/model-${suffix}`,
        canonicalSlug: `usage-cleanup-integration/model-${suffix}`,
        name: "Usage Cleanup Integration Model",
        inputModalities: ["text"],
        outputModalities: ["text"],
        supportedParameters: [],
        servedEndpoints: ["/v1/chat/completions"],
        rawMetadata: { test_fixture: true },
        isActive: true,
        lastSeenAt: now,
        developerId: developer.id,
      },
    });
    const endpoint = await database.catalogEndpoint.create({
      data: {
        source: "usage-cleanup-integration",
        sourceEndpointId: `usage-cleanup-integration:${suffix}`,
        modelId: model.id,
        providerId: provider.id,
        endpointName: "Usage cleanup integration endpoint",
        apiPath: "/v1/chat/completions",
        supportedParameters: [],
        isActive: true,
        rawMetadata: { test_fixture: true },
        sourceFetchedAt: now,
      },
    });

    const usageData = Array.from({ length: LEASE_BATCH_SIZE + 1 }, (_, index) => ({
      userId: user.id,
      apiKeyId: apiKey.id,
      catalogModelId: model.id,
      catalogEndpointId: endpoint.id,
      idempotencyKey: `usage-cleanup-${suffix}-${index}`,
      requestId: `usage-cleanup-request-${suffix}-${index}`,
      canonicalModelId: model.canonicalSlug,
      sourceModelId: model.sourceModelId,
      providerSlug: provider.slug,
      status: "streaming",
      startedAt: expiredAt,
    }));
    await database.usageRecord.createMany({ data: usageData });

    const usageRecords = await database.usageRecord.findMany({
      where: {
        userId: user.id,
        requestId: { startsWith: `usage-cleanup-request-${suffix}-` },
      },
      select: { id: true },
    });
    assert.equal(usageRecords.length, LEASE_BATCH_SIZE + 1);
    const usageIds = usageRecords.map((usage) => usage.id);

    await database.apiKeyConcurrencyLease.createMany({
      data: usageIds.map((usageRecordId) => ({
        apiKeyId: apiKey.id,
        usageRecordId,
        acquiredAt: expiredAt,
        expiresAt: expiredAt,
      })),
    });

    const oldReleasedUsage = await database.usageRecord.create({
      data: {
        userId: user.id,
        apiKeyId: apiKey.id,
        catalogModelId: model.id,
        catalogEndpointId: endpoint.id,
        idempotencyKey: `usage-cleanup-old-release-${suffix}`,
        requestId: `usage-cleanup-old-release-${suffix}`,
        canonicalModelId: model.canonicalSlug,
        sourceModelId: model.sourceModelId,
        providerSlug: provider.slug,
        status: "failed",
        startedAt: expiredAt,
        completedAt: expiredAt,
      },
    });
    await database.apiKeyConcurrencyLease.create({
      data: {
        apiKeyId: apiKey.id,
        usageRecordId: oldReleasedUsage.id,
        acquiredAt: oldReleasedAt,
        expiresAt: futureAt,
        releasedAt: oldReleasedAt,
      },
    });

    const expiredOutboxKey = `usage-cleanup-expired-outbox-${suffix}`;
    const retainedOutboxKey = `usage-cleanup-retained-outbox-${suffix}`;
    await database.outboxEvent.createMany({
      data: [
        {
          userId: user.id,
          aggregateType: "cleanup_test",
          aggregateId: suffix,
          eventType: "cleanup.expired",
          idempotencyKey: expiredOutboxKey,
          payloadSafe: { test_fixture: true },
          occurredAt: expiredAt,
          availableAt: expiredAt,
          publishedAt: expiredAt,
          expiresAt: expiredAt,
        },
        {
          userId: user.id,
          aggregateType: "cleanup_test",
          aggregateId: suffix,
          eventType: "cleanup.retained",
          idempotencyKey: retainedOutboxKey,
          payloadSafe: { test_fixture: true },
          occurredAt: now,
          availableAt: now,
          publishedAt: now,
          expiresAt: futureAt,
        },
      ],
    });
    await database.usageExport.createMany({
      data: [
        { userId: user.id, filters: { test_fixture: true }, expiresAt: expiredAt },
        { userId: user.id, filters: { test_fixture: true }, expiresAt: futureAt },
      ],
    });
    await database.apiKeyRateWindow.createMany({
      data: [
        { apiKeyId: apiKey.id, windowStart: expiredAt, expiresAt: expiredAt },
        { apiKeyId: apiKey.id, windowStart: now, expiresAt: futureAt },
      ],
    });

    const handler = createJobHandlers(database).get("usage.cleanup-expired");
    assert.ok(handler);

    const firstRun = await handler({} as never) as Record<string, number>;
    assert.equal(firstRun.stale_leases_reconciled, LEASE_BATCH_SIZE);
    assert.equal(firstRun.deleted_concurrency_leases, 1);
    assert.equal(firstRun.deleted_api_key_rate_windows, 1);
    assert.equal(firstRun.deleted_usage_exports, 1);
    assert.equal(firstRun.deleted_outbox_events, 1);

    const firstLeaseRows = await database.apiKeyConcurrencyLease.findMany({
      where: { usageRecordId: { in: usageIds } },
      select: { releasedAt: true },
    });
    assert.equal(firstLeaseRows.length, LEASE_BATCH_SIZE + 1);
    assert.equal(firstLeaseRows.filter((lease) => lease.releasedAt !== null).length, LEASE_BATCH_SIZE);
    assert.equal(firstLeaseRows.filter((lease) => lease.releasedAt === null).length, 1);

    assert.equal(
      await database.usageRecord.count({
        where: {
          id: { in: usageIds },
          status: "pending_reconciliation",
          reconciliationStatus: "pending",
          errorCode: "USAGE_LEASE_EXPIRED",
        },
      }),
      LEASE_BATCH_SIZE,
    );
    assert.equal(
      await database.usageRecord.count({
        where: { id: { in: usageIds }, status: "streaming" },
      }),
      1,
    );
    assert.equal(
      await database.outboxEvent.count({
        where: {
          aggregateType: "usage_request",
          aggregateId: { in: usageIds },
          eventType: "notification.created",
          idempotencyKey: { startsWith: "usage.lease-expired:" },
        },
      }),
      LEASE_BATCH_SIZE,
    );
    assert.equal(await database.outboxEvent.count({ where: { idempotencyKey: expiredOutboxKey } }), 0);
    assert.equal(await database.outboxEvent.count({ where: { idempotencyKey: retainedOutboxKey } }), 1);
    assert.equal(await database.usageExport.count({ where: { userId: user.id } }), 1);
    assert.equal(await database.apiKeyRateWindow.count({ where: { apiKeyId: apiKey.id } }), 1);
    assert.equal(
      await database.apiKeyConcurrencyLease.count({ where: { usageRecordId: oldReleasedUsage.id } }),
      0,
    );

    const secondRun = await handler({} as never) as Record<string, number>;
    assert.equal(secondRun.stale_leases_reconciled, 1);
    assert.equal(secondRun.deleted_concurrency_leases, 0);
    assert.equal(
      await database.apiKeyConcurrencyLease.count({
        where: { usageRecordId: { in: usageIds }, releasedAt: null },
      }),
      0,
    );
    assert.equal(
      await database.apiKeyConcurrencyLease.count({
        where: { usageRecordId: { in: usageIds } },
      }),
      LEASE_BATCH_SIZE + 1,
    );

    await database.apiKeyConcurrencyLease.updateMany({
      where: { usageRecordId: { in: usageIds } },
      data: { releasedAt: oldReleasedAt },
    });
    const retentionRun = await handler({} as never) as Record<string, number>;
    assert.equal(retentionRun.deleted_concurrency_leases, LEASE_BATCH_SIZE + 1);
    assert.equal(
      await database.apiKeyConcurrencyLease.count({
        where: { usageRecordId: { in: usageIds } },
      }),
      0,
    );
  } finally {
    await database.$disconnect();
  }
});
