import { z } from "zod";

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
 * Shape returned by the configured auth adapter after it has verified the
 * credential with the selected identity authority.
 */
export const authenticatedPrincipalSchema = z.object({
  userId: z.string().min(1).max(128),
  email: z.string().email().max(320),
  role: z.enum(userRoles),
  status: z.enum(accountStatuses),
}).strict();

export type AuthenticatedPrincipal = z.infer<typeof authenticatedPrincipalSchema>;

declare global {
  namespace Express {
    interface Request {
      auth?: AuthenticatedPrincipal;
    }
  }
}
