import type { AuthenticatedPrincipal, UserRole } from "./types.js";

export const permissions = [
  "account:read:self",
  "account:update:self",
  "consent:read:self",
  "consent:write:self",
  "data:export:self",
  "data:delete:self",
  "support:tickets:create:self",
  "support:tickets:read:self",
  "support:tickets:reply:self",
  "support:tickets:read:assigned",
  "support:tickets:reply:assigned",
  "support:tickets:manage",
  "users:read:any",
  "users:manage",
  "catalog:manage",
  "providers:manage",
  "pricing:manage",
  "payments:read:any",
  "payments:refund",
  "wallet:adjust",
  "content:manage",
  "audit:read",
  "operations:read",
  "security:manage",
] as const;

export type Permission = (typeof permissions)[number];

const selfServicePermissions: readonly Permission[] = [
  "account:read:self",
  "account:update:self",
  "consent:read:self",
  "consent:write:self",
  "data:export:self",
  "data:delete:self",
  "support:tickets:create:self",
  "support:tickets:read:self",
  "support:tickets:reply:self",
];

const rolePermissions: Record<UserRole, readonly Permission[]> = {
  user: selfServicePermissions,
  support: [
    ...selfServicePermissions,
    "support:tickets:read:assigned",
    "support:tickets:reply:assigned",
  ],
  admin: [
    ...selfServicePermissions,
    "support:tickets:manage",
    "users:read:any",
    "users:manage",
    "catalog:manage",
    "providers:manage",
    "pricing:manage",
    "payments:read:any",
    "payments:refund",
    "wallet:adjust",
    "content:manage",
    "audit:read",
    "operations:read",
  ],
  super_admin: permissions,
};

export function hasPermission(role: UserRole, permission: Permission): boolean {
  return rolePermissions[role].includes(permission);
}

export function getRolePermissions(role: UserRole): readonly Permission[] {
  return rolePermissions[role];
}

export function canAccessOwnedResource(
  principal: AuthenticatedPrincipal,
  ownerUserId: string,
): boolean {
  return principal.userId === ownerUserId || hasPermission(principal.role, "users:read:any");
}

/**
 * Use only after loading the resource's real owner and assignee from the database.
 * Support access is limited to assigned resources; a role alone never grants
 * unrestricted cross-user access.
 */
export function canAccessAssignedSupportResource(
  principal: AuthenticatedPrincipal,
  ownerUserId: string,
  assignedSupportUserId: string | null,
): boolean {
  if (principal.userId === ownerUserId) return true;
  if (hasPermission(principal.role, "users:read:any")) return true;

  return (
    assignedSupportUserId === principal.userId &&
    hasPermission(principal.role, "support:tickets:read:assigned")
  );
}
