import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import test from "node:test";
import { createDatabaseClient } from "../src/client.js";

const databaseUrl = process.env.DATABASE_URL;

test("PostgreSQL migration persists identity and enforces append-only consent", {
  skip: !databaseUrl,
}, async () => {
  const client = createDatabaseClient(databaseUrl!);
  await client.$connect();

  try {
    const nonce = randomUUID();
    const user = await client.user.create({
      data: {
        authSubjectId: `ci:${nonce}`,
        emailNormalized: `${nonce}@integration.azaleahouse.invalid`,
        status: "ACTIVE",
        profile: {
          create: {
            displayName: "CI integration user",
            locale: "id-ID",
            timezone: "Asia/Jakarta",
          },
        },
      },
    });

    const consent = await client.userConsent.create({
      data: {
        userId: user.id,
        consentType: "terms",
        documentVersion: "ci-test-v1",
        source: "ci",
      },
    });

    const persisted = await client.userConsent.findUnique({
      where: { id: consent.id },
    });
    assert.equal(persisted?.documentVersion, "ci-test-v1");

    await assert.rejects(
      client.userConsent.update({
        where: { id: consent.id },
        data: { documentVersion: "tampered" },
      }),
    );

    await assert.rejects(
      client.user.delete({ where: { id: user.id } }),
    );
  } finally {
    await client.$disconnect();
  }
});
