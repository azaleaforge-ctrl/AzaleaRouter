import type { RequestHandler } from "express";
import type { SessionVerifier } from "../auth/session-verifier.js";

export function createSessionResolver(
  verifier?: SessionVerifier,
): RequestHandler {
  if (!verifier) {
    // Auth remains unavailable until D-03 is decided and an adapter is configured.
    return (_req, _res, next) => next();
  }

  return async (req, _res, next) => {
    try {
      const principal = await verifier.resolvePrincipal(req);
      if (principal) req.auth = principal;
      next();
    } catch (error) {
      next(error);
    }
  };
}
