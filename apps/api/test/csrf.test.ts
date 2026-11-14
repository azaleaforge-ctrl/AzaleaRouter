import assert from "node:assert/strict";
import test from "node:test";
import type { Request, Response, NextFunction } from "express";
import { sha256 } from "../src/auth/token-crypto.js";
import { requireCsrf } from "../src/middleware/csrf.js";

function runGuard(input: {
  cookie?: string;
  header?: string;
  origin?: string;
  csrfHash?: string;
}): Promise<unknown> {
  return new Promise((resolve) => {
    const req = {
      auth: {
        userId: "user-1",
        email: "user@example.test",
        role: "user",
        status: "active",
        sessionId: "9b944d73-23f4-4cb8-98df-2ea7d11d5674",
        csrfTokenHash: input.csrfHash ?? sha256("csrf-test-token"),
      },
      header(name: string) {
        if (name === "cookie") return input.cookie;
        if (name === "x-csrf-token") return input.header;
        if (name === "origin") return input.origin;
        return undefined;
      },
    } as unknown as Request;
    const next: NextFunction = (error?: unknown) => resolve(error ?? null);
    requireCsrf({ cookieName: "azlr_csrf", allowedOrigins: ["http://localhost:3000"] })(req, {} as Response, next);
  });
}

test("CSRF guard accepts matching cookie, header and allowlisted origin", async () => {
  const error = await runGuard({
    cookie: "azlr_csrf=csrf-test-token",
    header: "csrf-test-token",
    origin: "http://localhost:3000",
  });
  assert.equal(error, null);
});

test("CSRF guard rejects a missing header or unapproved origin", async () => {
  const missingHeader = await runGuard({
    cookie: "azlr_csrf=csrf-test-token",
    origin: "http://localhost:3000",
  });
  assert.equal((missingHeader as { code?: string }).code, "CSRF_TOKEN_REJECTED");

  const badOrigin = await runGuard({
    cookie: "azlr_csrf=csrf-test-token",
    header: "csrf-test-token",
    origin: "https://attacker.example",
  });
  assert.equal((badOrigin as { code?: string }).code, "CSRF_ORIGIN_REJECTED");
});
