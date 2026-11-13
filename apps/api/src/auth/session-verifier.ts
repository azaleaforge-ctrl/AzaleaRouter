import type { Request } from "express";
import type { AuthenticatedPrincipal } from "./types.js";

/**
 * Vendor-neutral boundary for resolving a web session.
 *
 * Implementations must validate signatures/expiry/revocation with the selected
 * identity authority. They must not trust decoded JWT claims without verification.
 * The adapter owns credential extraction so cookie vs bearer-session decisions
 * do not leak into route handlers.
 */
export interface SessionVerifier {
  resolvePrincipal(request: Request): Promise<AuthenticatedPrincipal | null>;
}
