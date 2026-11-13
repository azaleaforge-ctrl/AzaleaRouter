import type { RequestHandler } from "express";
import { authenticatedPrincipalSchema } from "../auth/types.js";
import type { SessionVerifier } from "../auth/session-verifier.js";
import { HttpError } from "../lib/http-error.js";

export function createSessionResolver(
  verifier?: SessionVerifier,
): RequestHandler {
  if (!verifier) {
    // Auth remains unavailable until D-03 is decided and an adapter is configured.
    return (_req, _res, next) => next();
  }

  return async (req, _res, next) => {
    try {
      const candidate = await verifier.resolvePrincipal(req);
      if (candidate === null) {
        next();
        return;
      }

      const parsed = authenticatedPrincipalSchema.safeParse(candidate);
      if (!parsed.success) {
        next(new HttpError(401, "AUTH_INVALID", "Authentication credentials could not be validated."));
        return;
      }

      req.auth = parsed.data;
      next();
    } catch (error) {
      next(error);
    }
  };
}
