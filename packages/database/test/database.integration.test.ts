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
    const sessionHash = randomUUID().replaceAll("-", "").padEnd(64, "a").slice(0, 64);
    const csrfHash = randomUUID().replaceAll("-", "").padEnd(64, "b").slice(0, 64);
    const session = await client.authSession.create({
      data: {
        userId: user.id,
        sessionTokenHash: sessionHash,
        csrfTokenHash: csrfHash,
        encryptedAccessToken: "test-aes-gcm-ciphertext",
        encryptedRefreshToken: "test-aes-gcm-refresh-ciphertext",
        encryptionKeyVersion: "test-v1",
        accessExpiresAt: new Date(Date.now() + 60_000),
        refreshExpiresAt: new Date(Date.now() + 86_400_000),
      },
    });
    assert.equal(session.userId, user.id);

    const tokenHash = randomUUID().replaceAll("-", "").padEnd(64, "c").slice(0, 64);
    const turnstileUse = await client.turnstileTokenUse.create({
      data: {
        tokenHash,
        action: "signup",
        hostname: "localhost",
        challengeAt: new Date(),
        expiresAt: new Date(Date.now() + 300_000),
      },
    });
    assert.equal(turnstileUse.action, "signup");
    await assert.rejects(client.turnstileTokenUse.create({
      data: {
        tokenHash,
        action: "signup",
        hostname: "localhost",
        challengeAt: new Date(),
        expiresAt: new Date(Date.now() + 300_000),
      },
    }));

    const rateLimit = await client.authRateLimit.create({
      data: {
        bucketHash: randomUUID().replaceAll("-", "").padEnd(64, "d").slice(0, 64),
        windowStart: new Date(),
        hitCount: 1,
        expiresAt: new Date(Date.now() + 600_000),
      },
    });
    assert.equal(rateLimit.hitCount, 1);

    await client.authSession.update({
      where: { id: session.id },
      data: { revokedAt: new Date() },
    });
    await assert.rejects(
      client.authSession.update({
        where: { id: session.id },
        data: { encryptedAccessToken: "tampered" },
      }),
    );
    await assert.rejects(client.authSession.delete({ where: { id: session.id } }));


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
