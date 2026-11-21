import assert from "node:assert/strict";
import { createHash, randomUUID } from "node:crypto";
import { createServer, type Server } from "node:http";
import test from "node:test";
import express from "express";
import { createSessionResolver } from "../src/middleware/session-resolver.js";
import { requestIdMiddleware } from "../src/middleware/request-id.js";
import { errorHandler } from "../src/middleware/error-handler.js";
import { createAuthRouter } from "../src/routes/auth.js";

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
  const app = express();
  app.use(requestIdMiddleware);
  app.use(express.json());
  app.use("/api/v1", createSessionResolver({
    resolvePrincipal: async () => ({
        userId: randomUUID(),
        email: "user@example.test",
        role: "user",
        status: "active",
        sessionId: randomUUID(),
        csrfTokenHash: createHash("sha256").update(csrfToken).digest("hex"),
      }),
  } as never));
  app.use("/api/v1", router);
  app.use(errorHandler);
  const server = createServer(app);
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
