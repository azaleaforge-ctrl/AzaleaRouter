import type { RequestHandler } from "express";
import { hasPermission, type Permission } from "../auth/permissions.js";
import type { AuthenticatedPrincipal } from "../auth/types.js";
import { HttpError } from "../lib/http-error.js";

export function requireAuthenticated(): RequestHandler {
  return (req, _res, next) => {
    if (!req.auth) {
      next(new HttpError(401, "AUTH_REQUIRED", "Authentication is required."));
      return;
    }
    next();
  };
}

export function requireActiveAccount(): RequestHandler {
  return (req, _res, next) => {
    if (!req.auth) {
      next(new HttpError(401, "AUTH_REQUIRED", "Authentication is required."));
      return;
    }

    if (req.auth.status !== "active") {
      next(new HttpError(403, "ACCOUNT_NOT_ACTIVE", "This account cannot perform this action."));
      return;
    }

    next();
  };
}

export function requirePermission(permission: Permission): RequestHandler {
  return (req, _res, next) => {
    if (!req.auth) {
      next(new HttpError(401, "AUTH_REQUIRED", "Authentication is required."));
      return;
    }

    if (req.auth.status !== "active") {
      next(new HttpError(403, "ACCOUNT_NOT_ACTIVE", "This account cannot perform this action."));
      return;
    }

    if (!hasPermission(req.auth.role, permission)) {
      next(new HttpError(403, "FORBIDDEN", "You do not have permission to perform this action."));
      return;
    }

    next();
  };
}

export function assertActivePrincipal(
  principal: AuthenticatedPrincipal,
): asserts principal is AuthenticatedPrincipal & { status: "active" } {
  if (principal.status !== "active") {
    throw new HttpError(403, "ACCOUNT_NOT_ACTIVE", "This account cannot perform this action.");
  }
}
