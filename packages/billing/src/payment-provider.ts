import { createHmac, randomUUID, timingSafeEqual } from "node:crypto";
import { z } from "zod";

const webhookSchema = z.object({
  id: z.string().min(1).max(255),
  type: z.enum(["payment.succeeded", "payment.failed"]),
  data: z.object({
    reference: z.string().min(1).max(255),
    amount: z.string().regex(/^(?:0|[1-9]\d{0,37})$/),
    currency: z.literal("IDR"),
  }).strict(),
}).strict();

export interface CreateProviderPaymentIntentInput {
  localPaymentIntentId: string;
  amountIdr: string;
  idempotencyKey: string;
}

export interface ProviderPaymentIntent {
  providerReference: string;
  checkoutUrl: null;
}

export interface VerifiedPaymentEvent {
  eventId: string;
  type: "payment.succeeded" | "payment.failed";
  reference: string;
  amount: string;
  currency: "IDR";
}

export interface PaymentProviderAdapter {
  readonly providerName: string;
  createPaymentIntent(input: CreateProviderPaymentIntentInput): Promise<ProviderPaymentIntent>;
  verifyWebhook(rawBody: Buffer, signature: string): Promise<VerifiedPaymentEvent>;
}

/**
 * Explicitly non-production adapter. It creates no hosted checkout and supports
 * only locally signed test events. It is rejected in staging/production runtime.
 */
export class LocalSandboxPaymentAdapter implements PaymentProviderAdapter {
  readonly providerName = "local-sandbox";

  constructor(private readonly signingSecret: string) {
    if (signingSecret.length < 32) {
      throw new Error("Sandbox webhook signing key must contain at least 32 characters.");
    }
  }

  async createPaymentIntent(input: CreateProviderPaymentIntentInput): Promise<ProviderPaymentIntent> {
    return {
      providerReference: `sandbox_${input.localPaymentIntentId}_${randomUUID()}`,
      checkoutUrl: null,
    };
  }

  async verifyWebhook(rawBody: Buffer, signature: string): Promise<VerifiedPaymentEvent> {
    const expected = createHmac("sha256", this.signingSecret).update(rawBody).digest();
    let supplied: Buffer;
    try {
      supplied = Buffer.from(signature.replace(/^sha256=/, ""), "hex");
    } catch {
      throw new Error("PAYMENT_SIGNATURE_INVALID");
    }
    if (supplied.length !== expected.length || !timingSafeEqual(supplied, expected)) {
      throw new Error("PAYMENT_SIGNATURE_INVALID");
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(rawBody.toString("utf8"));
    } catch {
      throw new Error("PAYMENT_WEBHOOK_INVALID");
    }
    const result = webhookSchema.safeParse(parsed);
    if (!result.success) throw new Error("PAYMENT_WEBHOOK_INVALID");

    return {
      eventId: result.data.id,
      type: result.data.type,
      reference: result.data.data.reference,
      amount: result.data.data.amount,
      currency: result.data.data.currency,
    };
  }

  signForTest(rawBody: Buffer): string {
    return createHmac("sha256", this.signingSecret).update(rawBody).digest("hex");
  }
}
