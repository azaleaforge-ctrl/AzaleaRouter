import { Router } from "express";
import { z } from "zod";
import type { DatabaseClient } from "@azalea-router/database";
import { WalletService } from "@azalea-router/billing";
import { PaymentService } from "@azalea-router/billing";
import { requireActiveAccount } from "../middleware/authorization.js";
import { requireCsrf } from "../middleware/csrf.js";
import { HttpError } from "../lib/http-error.js";

const paymentIntentSchema = z.object({
  amount_idr: z.string().regex(/^[1-9]\d{0,37}$/),
}).strict();

type RequestWithRawBody = import("express").Request & { rawBody?: Buffer };

export interface BillingRouterOptions {
  database: DatabaseClient;
  wallet: WalletService;
  payment?: PaymentService;
  csrfCookieName: string;
  allowedOrigins: string[];
}

export function createBillingRouter(options: BillingRouterOptions): Router {
  const router = Router();
  const csrf = requireCsrf({
    cookieName: options.csrfCookieName,
    allowedOrigins: options.allowedOrigins,
  });

  router.get("/wallet", requireActiveAccount(), async (req, res) => {
    const balance = await options.wallet.getBalance(req.auth!.userId);
    res.status(200).json({ wallet: balance });
  });

  router.post("/wallet/payment-intents", requireActiveAccount(), csrf, async (req, res) => {
    if (!options.payment) {
      throw new HttpError(503, "PAYMENT_PROVIDER_NOT_CONFIGURED", "Payment provider is not configured.");
    }
    const input = paymentIntentSchema.parse(req.body);
    const idempotencyKey = req.header("idempotency-key");
    if (!idempotencyKey) {
      throw new HttpError(400, "IDEMPOTENCY_KEY_REQUIRED", "Idempotency-Key header is required.");
    }
    const result = await options.payment.createIntent({
      userId: req.auth!.userId,
      amountIdr: input.amount_idr,
      idempotencyKey,
    });
    res.status(202).json({
      payment_intent: {
        id: result.id,
        provider: result.provider,
        provider_reference: result.providerReference,
        amount_idr: result.amountIdr,
        currency: result.currency,
        status: result.status,
        expires_at: result.expiresAt.toISOString(),
        checkout_url: null,
      },
    });
  });

  router.post("/payments/webhooks", async (req, res) => {
    if (!options.payment) {
      throw new HttpError(503, "PAYMENT_PROVIDER_NOT_CONFIGURED", "Payment provider is not configured.");
    }
    const rawBody = (req as RequestWithRawBody).rawBody;
    const signature = req.header("x-payment-signature");
    if (!rawBody || !signature) {
      throw new HttpError(400, "PAYMENT_WEBHOOK_INVALID", "Signed payment webhook body is required.");
    }
    const result = await options.payment.processWebhook(rawBody, signature);
    res.status(result.accepted ? 200 : 422).json(result);
  });

  return router;
}
