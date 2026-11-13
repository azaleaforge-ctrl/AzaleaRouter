import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import test from "node:test";
import { createDatabaseClient } from "@azalea-router/database";
import { LocalSandboxPaymentAdapter } from "../src/payment-provider.js";
import { PaymentService } from "../src/payment-service.js";
import { WalletService } from "../src/wallet-service.js";

const databaseUrl = process.env.DATABASE_URL;

test("signed payment webhook credits wallet once and duplicate event is idempotent", {
  skip: !databaseUrl,
}, async () => {
  const database = createDatabaseClient(databaseUrl!);
  await database.$connect();

  try {
    const suffix = randomUUID();
    const user = await database.user.create({
      data: {
        authSubjectId: suffix,
        emailNormalized: `wallet-${suffix}@example.test`,
        status: "ACTIVE",
        emailVerifiedAt: new Date(),
        profile: { create: { displayName: "Billing test", locale: "id-ID", timezone: "Asia/Jakarta" } },
        preferences: { create: {} },
      },
    });

    const wallet = new WalletService(database);
    const adapter = new LocalSandboxPaymentAdapter("billing-integration-test-key-not-production");
    const service = new PaymentService(database, adapter, { intentLifetimeSeconds: 1800 });
    const intent = await service.createIntent({
      userId: user.id,
      amountIdr: "125000",
      idempotencyKey: `test-topup-${randomUUID()}`,
    });

    const rawBody = Buffer.from(JSON.stringify({
      id: `evt-${randomUUID()}`,
      type: "payment.succeeded",
      data: {
        reference: intent.providerReference,
        amount: "125000",
        currency: "IDR",
      },
    }));
    const signature = adapter.signForTest(rawBody);

    const first = await service.processWebhook(rawBody, signature);
    const second = await service.processWebhook(rawBody, signature);
    assert.equal(first.accepted, true);
    assert.equal(first.duplicate, false);
    assert.equal(second.accepted, true);
    assert.equal(second.duplicate, true);

    const balance = await wallet.getBalance(user.id);
    assert.equal(balance.ledgerBalance, "125000");
    assert.equal(balance.availableBalance, "125000");
  } finally {
    // Financial rows are intentionally retained in this disposable CI database:
    // ledger/payment history is protected by restrict FKs and immutability triggers.
    await database.$disconnect();
  }
});
