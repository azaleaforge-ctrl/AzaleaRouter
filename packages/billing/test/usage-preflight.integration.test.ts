import assert from "node:assert/strict";
import { createHash, randomUUID } from "node:crypto";
import test from "node:test";
import { createDatabaseClient } from "@azalea-router/database";
import { UsageService, WalletService } from "../src/index.js";

const databaseUrl = process.env.DATABASE_URL;

test("gateway preflight persists per-key RPM and rejects over-limit requests before catalog work", {
  skip: !databaseUrl,
}, async () => {
  const database = createDatabaseClient(databaseUrl!);
  await database.$connect();

  try {
    const suffix = randomUUID();
    const user = await database.user.create({
      data: {
        authSubjectId: suffix,
        emailNormalized: `usage-preflight-${suffix}@example.test`,
        status: "ACTIVE",
        emailVerifiedAt: new Date(),
        profile: { create: { displayName: "Usage preflight test", locale: "id-ID", timezone: "Asia/Jakarta" } },
        preferences: { create: {} },
      },
    });
    const apiKey = await database.apiKey.create({
      data: {
        userId: user.id,
        name: "Preflight integration key",
        keyPrefix: "AZL-preflight",
        tokenHash: createHash("sha256").update(suffix).digest("hex"),
        pepperVersion: "integration-test-v1",
        scopes: ["chat:completions"],
        rateLimitRpm: 2,
        concurrencyLimit: 1,
        status: "active",
      },
    });
    const now = Date.now();
    const usage = new UsageService(database, new WalletService(database), { now: () => now });

    const attempts = await Promise.allSettled(
      Array.from({ length: 5 }, () => usage.preflight({ userId: user.id, apiKeyId: apiKey.id })),
    );
    const accepted = attempts.filter((attempt) => attempt.status === "fulfilled");
    const rejected = attempts.filter((attempt) => attempt.status === "rejected");
    assert.equal(accepted.length, 2);
    assert.equal(rejected.length, 3);
    for (const attempt of rejected) {
      assert.match(String((attempt as PromiseRejectedResult).reason), /API_KEY_RATE_LIMITED/);
    }

    const windows = await database.apiKeyRateWindow.findMany({ where: { apiKeyId: apiKey.id } });
    assert.equal(windows.length, 1);
    assert.equal(windows[0]!.requestCount, 2);

    await database.apiKey.update({ where: { id: apiKey.id }, data: { status: "revoked", revokedAt: new Date(now) } });
    await assert.rejects(
      usage.preflight({ userId: user.id, apiKeyId: apiKey.id }),
      /API_KEY_INVALID/,
    );
  } finally {
    await database.$disconnect();
  }
});
