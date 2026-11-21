import assert from "node:assert/strict";
import { createHash, randomUUID } from "node:crypto";
import { createServer, type Server } from "node:http";
import test from "node:test";
import { createApp } from "../src/app.js";
import { createAuthRouter } from "../src/routes/auth.js";

async function startAuthServer(): Promise<{ server: Server; url: string }> {
  const csrfToken = "csrf-test-token";
  const calls: string[] = [];
  const router = createAuthRouter({
    database: {} as never,
    provider: {} as never,
    sessions: {
      csrfCookieName: "azlr_csrf",
      revokeCurrent: async () => { calls.push("revoke"); },
    } as never,
    turnstile: {} as never,
    rateLimiter: {
      consume: async (scope: string) => { calls.push(scope); },
    } as never,
    termsVersion: "terms-test-v1",
    privacyVersion: "privacy-test-v1",
    allowedOrigins: ["https://web.example.test"],
  });
  const server = createServer(createApp({
    authRouter: router,
    sessionVerifier: {
      resolvePrincipal: async () => ({
        userId: randomUUID(),
        email: "user@example.test",
        role: "user",
        status: "active",
        sessionId: randomUUID(),
        csrfTokenHash: createHash("sha256").update(csrfToken).digest("hex"),
      }),
    } as never,
  }));
  await new Promise<void>((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolve);
  });
  const address = server.address();
  if (!address || typeof address === "string") throw new Error("Auth test server failed to bind.");
  return { server, url: `http://127.0.0.1:${address.port}/api/v1/auth/logout` };
}

async function stop(server: Server): Promise<void> {
  await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
}

test("logout applies the persistent rate limiter before revoking the session", async () => {
  const csrfToken = "csrf-test-token";
  const calls: string[] = [];
  const router = createAuthRouter({
    database: {} as never,
    provider: {} as never,
    sessions: {
      csrfCookieName: "azlr_csrf",
      revokeCurrent: async () => { calls.push("revoke"); },
    } as never,
    turnstile: {} as never,
    rateLimiter: {
      consume: async (scope: string) => { calls.push(scope); },
    } as never,
    termsVersion: "terms-test-v1",
    privacyVersion: "privacy-test-v1",
    allowedOrigins: ["https://web.example.test"],
  });
  const server = createServer(createApp({
    authRouter: router,
    sessionVerifier: {
      resolvePrincipal: async () => ({
        userId: randomUUID(),
        email: "user@example.test",
        role: "user",
        status: "active",
        sessionId: randomUUID(),
        csrfTokenHash: createHash("sha256").update(csrfToken).digest("hex"),
      }),
    } as never,
  }));
  await new Promise<void>((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolve);
  });
  const address = server.address();
  if (!address || typeof address === "string") throw new Error("Auth test server failed to bind.");

  try {
    const response = await fetch(`http://127.0.0.1:${address.port}/api/v1/auth/logout`, {
      method: "POST",
      headers: {
        origin: "https://web.example.test",
        cookie: `azlr_csrf=${csrfToken}`,
        "x-csrf-token": csrfToken,
      },
    });
    assert.equal(response.status, 204);
    assert.deepEqual(calls, ["logout", "revoke"]);
  } finally {
    await stop(server);
  }
});
