import type { Request } from "express";

/**
 * Vendor-neutral boundary for resolving a web session.
 *
 * Implementations must validate signatures/expiry/revocation with the selected
 * identity authority. They must not trust decoded JWT claims without verification.
 * The adapter owns credential extraction so cookie vs bearer-session decisions
 * do not leak into route handlers.
 *
 * Return unknown so the API validates the adapter output at runtime before it
 * becomes an authenticated principal.
 */
export interface SessionVerifier {
  resolvePrincipal(request: Request): Promise<unknown | null>;
}
