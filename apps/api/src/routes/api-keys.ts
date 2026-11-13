import { Router } from "express";
import { z } from "zod";
import type { ApiKeyService } from "../auth/api-key-service.js";
import { requireActiveAccount } from "../middleware/authorization.js";
import { requireCsrf } from "../middleware/csrf.js";
import { HttpError } from "../lib/http-error.js";

const keyIdSchema = z.string().uuid();

export function createApiKeyRouter(
  service: ApiKeyService,
  options: { csrfCookieName: string; allowedOrigins: string[] },
): Router {
  const router = Router();
  const csrf = requireCsrf(options);

  router.get("/me/api-keys", requireActiveAccount(), async (req, res) => {
    res.status(200).json({ data: await service.list(req.auth!.userId) });
  });

  router.post("/me/api-keys", requireActiveAccount(), csrf, async (req, res) => {
    const result = await service.create(req.auth!.userId, req.body);
    res.status(201).json({
      api_key: {
        id: result.id,
        name: result.name,
        key_prefix: result.key_prefix,
        api_key: result.api_key,
        scopes: result.scopes,
        allowed_model_ids: result.allowed_model_ids,
        rate_limit_rpm: result.rate_limit_rpm,
        concurrency_limit: result.concurrency_limit,
        spend_limit_idr: result.spend_limit_idr,
        expires_at: result.expires_at,
        created_at: result.created_at,
      },
      warning: "Copy this key now. It cannot be retrieved again.",
    });
  });

  router.post("/me/api-keys/:keyId/rotate", requireActiveAccount(), csrf, async (req, res) => {
    const parsed = keyIdSchema.safeParse(req.params.keyId);
    if (!parsed.success) throw new HttpError(400, "API_KEY_ID_INVALID", "API key identifier is invalid.");
    const result = await service.rotate(req.auth!.userId, parsed.data);
    res.status(201).json({
      api_key: {
        id: result.id,
        name: result.name,
        key_prefix: result.key_prefix,
        api_key: result.api_key,
        scopes: result.scopes,
        allowed_model_ids: result.allowed_model_ids,
        rate_limit_rpm: result.rate_limit_rpm,
        concurrency_limit: result.concurrency_limit,
        spend_limit_idr: result.spend_limit_idr,
        expires_at: result.expires_at,
        created_at: result.created_at,
      },
      warning: "The previous key was revoked. Copy this replacement now; it cannot be retrieved again.",
    });
  });

  router.delete("/me/api-keys/:keyId", requireActiveAccount(), csrf, async (req, res) => {
    const parsed = keyIdSchema.safeParse(req.params.keyId);
    if (!parsed.success) throw new HttpError(400, "API_KEY_ID_INVALID", "API key identifier is invalid.");
    const result = await service.revoke(req.auth!.userId, parsed.data);
    res.status(200).json({ id: result.id, status: result.status });
  });

  return router;
}
