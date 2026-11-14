import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import test from "node:test";
import { ApiKeyService } from "../src/auth/api-key-service.js";
import { createDatabaseClient } from "@azalea-router/database";

const databaseUrl = process.env.DATABASE_URL;

test("AZL keys are shown once, stored only as peppered hashes, and rotate/revoke server-side", {
  skip: !databaseUrl,
}, async () => {
  const database = createDatabaseClient(databaseUrl!);
  await database.$connect();

  try {
    const suffix = randomUUID();
    const user = await database.user.create({
      data: {
        authSubjectId: suffix,
        emailNormalized: `api-key-${suffix}@example.test`,
        status: "ACTIVE",
        emailVerifiedAt: new Date(),
        profile: { create: { displayName: "API key test", locale: "id-ID", timezone: "Asia/Jakarta" } },
        preferences: { create: {} },
      },
    });
    const service = new ApiKeyService(database, "api-key-test-pepper-not-production-32-chars", "test-v1");
    const issued = await service.create(user.id, {
      name: "CI integration key",
      scopes: ["chat:completions"],
      allowed_model_ids: ["acme/canonical-chat"],
      spend_limit_idr: "50000",
      rate_limit_rpm: 30,
      concurrency_limit: 2,
    });

    assert.match(issued.api_key, /^AZL-[A-Za-z0-9_-]{43}$/);
    const stored = await database.apiKey.findUniqueOrThrow({ where: { id: issued.id } });
    assert.notEqual(stored.tokenHash, issued.api_key);
    assert.equal(stored.keyPrefix, issued.key_prefix);
    assert.deepEqual(stored.allowedModelIds, ["acme/canonical-chat"]);

    const authenticated = await service.authenticate(issued.api_key);
    assert.equal(authenticated.userId, user.id);
    assert.deepEqual(authenticated.scopes, ["chat:completions"]);

    const listed = await service.list(user.id);
    assert.equal(listed.length, 1);
    assert.equal("api_key" in listed[0]!, false);

    const rotated = await service.rotate(user.id, issued.id);
    assert.notEqual(rotated.api_key, issued.api_key);
    await assert.rejects(service.authenticate(issued.api_key), /API_KEY_INVALID/);
    assert.equal((await service.authenticate(rotated.api_key)).userId, user.id);

    const revoked = await service.revoke(user.id, rotated.id);
    assert.equal(revoked.status, "revoked");
    await assert.rejects(service.authenticate(rotated.api_key), /API_KEY_INVALID/);
  } finally {
    await database.$disconnect();
  }
});
