export const userRoles = ["user", "support", "admin", "super_admin"] as const;
export type UserRole = (typeof userRoles)[number];

export const accountStatuses = [
  "pending_verification",
  "active",
  "suspended",
  "deletion_pending",
  "deleted",
] as const;
export type AccountStatus = (typeof accountStatuses)[number];

/**
 * A verified identity resolved by the configured auth adapter.
 * Never construct this object from unverified request headers or body fields.
 */
export interface AuthenticatedPrincipal {
  userId: string;
  email: string;
  role: UserRole;
  status: AccountStatus;
}

declare global {
  namespace Express {
    interface Request {
      auth?: AuthenticatedPrincipal;
    }
  }
}
