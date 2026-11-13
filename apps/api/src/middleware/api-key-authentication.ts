import type { RequestHandler } from "express";
import type { ApiKeyService } from "../auth/api-key-service.js";
import { HttpError } from "../lib/http-error.js";

export function createApiKeyAuthentication(service: ApiKeyService): RequestHandler {
  return async (req, _res, next) => {
    const authorization = req.header("authorization");
    if (!authorization || !authorization.startsWith("Bearer ")) {
      next(new HttpError(401, "API_KEY_REQUIRED", "A valid AzaleaRouter API key is required."));
      return;
    }

    const token = authorization.slice("Bearer ".length).trim();
    try {
      req.apiKey = await service.authenticate(token);
      next();
    } catch (error) {
      const code = error instanceof Error ? error.message : "";
      next(new HttpError(
        code === "API_KEY_ACCOUNT_INACTIVE" ? 403 : 401,
        code === "API_KEY_ACCOUNT_INACTIVE" ? "ACCOUNT_NOT_ACTIVE" : "API_KEY_INVALID",
        code === "API_KEY_ACCOUNT_INACTIVE"
          ? "The account associated with this API key is not active."
          : "A valid AzaleaRouter API key is required.",
      ));
    }
  };
}
