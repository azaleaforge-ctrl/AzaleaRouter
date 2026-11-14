import assert from "node:assert/strict";
import test from "node:test";
import {
  canAccessAssignedSupportResource,
  canAccessOwnedResource,
  hasPermission,
} from "../src/auth/permissions.js";
import type { AuthenticatedPrincipal } from "../src/auth/types.js";

const user: AuthenticatedPrincipal = {
  userId: "user-1",
  email: "user@example.test",
  role: "user",
  status: "active",
};

const support: AuthenticatedPrincipal = {
  userId: "support-1",
  email: "support@example.test",
  role: "support",
  status: "active",
};

const admin: AuthenticatedPrincipal = {
  userId: "admin-1",
  email: "admin@example.test",
  role: "admin",
  status: "active",
};

const superAdmin: AuthenticatedPrincipal = {
  userId: "root-1",
  email: "root@example.test",
  role: "super_admin",
  status: "active",
};

test("regular users receive only self-service permissions", () => {
  assert.equal(hasPermission(user.role, "account:read:self"), true);
  assert.equal(hasPermission(user.role, "users:read:any"), false);
  assert.equal(hasPermission(user.role, "wallet:adjust"), false);
  assert.equal(hasPermission(user.role, "security:manage"), false);
});

test("support can read assigned tickets but cannot browse all user records", () => {
  assert.equal(hasPermission(support.role, "support:tickets:read:assigned"), true);
  assert.equal(hasPermission(support.role, "users:read:any"), false);
  assert.equal(hasPermission(support.role, "payments:refund"), false);
  assert.equal(
    canAccessAssignedSupportResource(support, "customer-1", "support-1"),
    true,
  );
  assert.equal(
    canAccessAssignedSupportResource(support, "customer-1", "support-2"),
    false,
  );
});

test("admin has operational permissions but not super-admin security control", () => {
  assert.equal(hasPermission(admin.role, "users:read:any"), true);
  assert.equal(hasPermission(admin.role, "catalog:manage"), true);
  assert.equal(hasPermission(admin.role, "security:manage"), false);
});

test("super-admin has security management permission", () => {
  assert.equal(hasPermission(superAdmin.role, "security:manage"), true);
});

test("owner access is allowed; cross-user access requires explicit permission", () => {
  assert.equal(canAccessOwnedResource(user, "user-1"), true);
  assert.equal(canAccessOwnedResource(user, "user-2"), false);
  assert.equal(canAccessOwnedResource(admin, "user-2"), true);
});
