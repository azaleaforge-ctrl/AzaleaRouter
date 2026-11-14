import type { RequestHandler } from "express";
import { sha256 } from "../auth/token-crypto.js";
import { HttpError } from "../lib/http-error.js";

function readCookie(header: string | undefined, name: string): string | null {
  if (!header) return null;
  for (const part of header.split(";")) {
    const separator = part.indexOf("=");
    if (separator < 0) continue;
    if (part.slice(0, separator).trim() !== name) continue;
    try {
      return decodeURIComponent(part.slice(separator + 1).trim());
    } catch {
      return null;
    }
  }
  return null;
}

export interface CsrfOptions {
  cookieName: string;
  allowedOrigins: string[];
}

export function requireCsrf(options: CsrfOptions): RequestHandler {
  const allowed = new Set(options.allowedOrigins);
  return (req, _res, next) => {
    const session = req.auth;
    if (!session?.sessionId || !session.csrfTokenHash) {
      next(new HttpError(401, "AUTH_REQUIRED", "Authentication is required."));
      return;
    }

    const origin = req.header("origin");
    if (!origin || !allowed.has(origin)) {
      next(new HttpError(403, "CSRF_ORIGIN_REJECTED", "Request origin is not allowed."));
      return;
    }

    const cookieToken = readCookie(req.header("cookie"), options.cookieName);
    const headerToken = req.header("x-csrf-token");
    if (
      !cookieToken ||
      !headerToken ||
      cookieToken !== headerToken ||
      sha256(cookieToken) !== session.csrfTokenHash
    ) {
      next(new HttpError(403, "CSRF_TOKEN_REJECTED", "CSRF validation failed."));
      return;
    }
    next();
  };
}
