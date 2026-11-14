import assert from "node:assert/strict";
import { createHash, randomUUID } from "node:crypto";
import test from "node:test";
import { createDatabaseClient } from "../src/client.js";

const databaseUrl = process.env.DATABASE_URL;

test("database enforces unique non-plaintext API key storage", {
  skip: !databaseUrl,
}, async () => {
  const database = createDatabaseClient(databaseUrl!);
  await database.$connect();
  try {
    const suffix = randomUUID();
    const user = await database.user.create({
      data: {
        authSubjectId: suffix,
        emailNormalized: `api-key-db-${suffix}@example.test`,
        status: "ACTIVE",
        emailVerifiedAt: new Date(),
        profile: { create: { displayName: "API key database test", locale: "id-ID", timezone: "Asia/Jakarta" } },
        preferences: { create: {} },
      },
    });
    const opaqueToken = `AZL-${randomUUID().replaceAll("-", "")}`;
    const hash = createHash("sha256").update(opaqueToken).digest("hex");
    const key = await database.apiKey.create({
      data: {
        userId: user.id,
        name: "Database fixture key",
        keyPrefix: "AZL-12345678",
        tokenHash: hash,
        pepperVersion: "test-v1",
        scopes: ["chat:completions"],
        allowedModelIds: [],
        status: "active",
        rateLimitRpm: 30,
        concurrencyLimit: 2,
      },
    });
    assert.notEqual(key.tokenHash, opaqueToken);
    assert.match(key.tokenHash, /^[0-9a-f]{64}$/);
    assert.equal(key.keyPrefix, "AZL-12345678");
    await assert.rejects(database.apiKey.create({
      data: {
        userId: user.id,
        name: "Duplicate hash",
        keyPrefix: "AZL-abcdefgh",
        tokenHash: hash,
        pepperVersion: "test-v1",
        scopes: ["chat:completions"],
        allowedModelIds: [],
        status: "active",
        rateLimitRpm: 30,
        concurrencyLimit: 2,
      },
    }));
  } finally {
    await database.$disconnect();
  }
});
