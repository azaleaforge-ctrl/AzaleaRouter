import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import test from "node:test";
import { LocalSandboxPaymentAdapter } from "../src/payment-provider.js";

test("local sandbox adapter returns no live checkout URL and verifies signed webhook", async () => {
  const adapter = new LocalSandboxPaymentAdapter("only-for-test-not-a-live-gateway-secret-key");
  const intent = await adapter.createPaymentIntent({
    localPaymentIntentId: randomUUID(),
    amountIdr: "125000",
    idempotencyKey: "topup-test-key-01",
  });
  assert.match(intent.providerReference, /^sandbox_/);
  assert.equal(intent.checkoutUrl, null);

  const rawBody = Buffer.from(JSON.stringify({
    id: "event-test-001",
    type: "payment.succeeded",
    data: {
      reference: intent.providerReference,
      amount: "125000",
      currency: "IDR",
    },
  }));
  const signature = adapter.signForTest(rawBody);
  const verified = await adapter.verifyWebhook(rawBody, signature);
  assert.equal(verified.eventId, "event-test-001");
  assert.equal(verified.amount, "125000");
  await assert.rejects(adapter.verifyWebhook(rawBody, "00".repeat(32)), /PAYMENT_SIGNATURE_INVALID/);
});

test("sandbox adapter rejects invalid event and amount shapes", async () => {
  const adapter = new LocalSandboxPaymentAdapter("only-for-test-not-a-live-gateway-secret-key");
  const raw = Buffer.from(JSON.stringify({
    id: "bad-event",
    type: "payment.succeeded",
    data: { reference: "sandbox-ref", amount: "1.25", currency: "IDR" },
  }));
  await assert.rejects(adapter.verifyWebhook(raw, adapter.signForTest(raw)), /PAYMENT_WEBHOOK_INVALID/);
});
