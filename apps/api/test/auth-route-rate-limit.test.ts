import assert from "node:assert/strict";
import { createServer, type Server } from "node:http";
import test from "node:test";
import express from "express";
import { HttpError } from "../src/lib/http-error.js";
import { errorHandler } from "../src/middleware/error-handler.js";
import { requestIdMiddleware } from "../src/middleware/request-id.js";
import { createAuthRouter } from "../src/routes/auth.js";

const allowedOrigin = "https://web.example.test";

const rateLimitedRoutes = [
  {
    path: "/auth/register",
    scope: "signup",
    body: {
      email: "register@example.test",
      password: "test-password-long-enough",
      terms_version: "terms-test-v1",
      privacy_version: "privacy-test-v1",
      turnstile_token: "turnstile-test-token",
    },
  },
  {
    path: "/auth/login",
    scope: "login",
    body: {
      email: "login@example.test",
      password: "test-password",
      turnstile_token: "turnstile-test-token",
    },
  },
  {
    path: "/auth/email/verify",
    scope: "verify-email",
    body: { token_hash: "verification-token-hash" },
  },
  {
    path: "/auth/email/resend",
    scope: "resend-verification",
    body: {
      email: "resend@example.test",
      turnstile_token: "turnstile-test-token",
    },
  },
  {
    path: "/auth/password/forgot",
    scope: "password-reset",
    body: {
      email: "reset@example.test",
      turnstile_token: "turnstile-test-token",
    },
  },
  {
    path: "/auth/password/reset",
    scope: "password-reset-verify",
    body: {
      token_hash: "recovery-token-hash",
      new_password: "new-test-password-long",
    },
  },
] as const;

async function stop(server: Server): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    server.close((error) => (error ? reject(error) : resolve()));
  });
}

test("public auth routes enforce persistent rate limits before Turnstile, provider, or account work", async () => {
  const calls: string[] = [];
  const app = express();
  app.use(requestIdMiddleware);
  app.use(express.json());
  app.use(
    "/api/v1",
    createAuthRouter({
      database: {
        user: new Proxy({}, {
          get: () => async () => {
            calls.push("database");
            throw new Error("Account database access must not run after a rate-limit rejection.");
          },
        }),
      } as never,
      provider: {
        signUp: async () => {
          calls.push("provider");
          throw new Error("Identity-provider work must not run after a rate-limit rejection.");
        },
        signIn: async () => {
          calls.push("provider");
          throw new Error("Identity-provider work must not run after a rate-limit rejection.");
        },
        verifyEmailToken: async () => {
          calls.push("provider");
          throw new Error("Identity-provider work must not run after a rate-limit rejection.");
        },
        resendSignup: async () => {
          calls.push("provider");
          throw new Error("Identity-provider work must not run after a rate-limit rejection.");
        },
        recoverPassword: async () => {
          calls.push("provider");
          throw new Error("Identity-provider work must not run after a rate-limit rejection.");
        },
        updatePassword: async () => {
          calls.push("provider");
          throw new Error("Identity-provider work must not run after a rate-limit rejection.");
        },
      } as never,
      sessions: { csrfCookieName: "azlr_csrf" } as never,
      turnstile: {
        verify: async () => {
          calls.push("turnstile");
          throw new Error("Turnstile must not run after a rate-limit rejection.");
        },
      } as never,
      rateLimiter: {
        consume: async (scope: string) => {
          calls.push(`rate:${scope}`);
          throw new HttpError(429, "AUTH_RATE_LIMITED", "Too many authentication attempts. Try again later.");
        },
      } as never,
      termsVersion: "terms-test-v1",
      privacyVersion: "privacy-test-v1",
      allowedOrigins: [allowedOrigin],
    }),
  );
  app.use(errorHandler);

  const server = createServer(app);
  await new Promise<void>((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolve);
  });
  const address = server.address();
  if (!address || typeof address === "string") throw new Error("Auth test server failed to bind.");

  try {
    for (const route of rateLimitedRoutes) {
      const response = await fetch(`http://127.0.0.1:${address.port}/api/v1${route.path}`, {
        method: "POST",
        headers: {
          origin: allowedOrigin,
          "content-type": "application/json",
        },
        body: JSON.stringify(route.body),
      });

      assert.equal(response.status, 429, route.path);
      const body = (await response.json()) as { error: { code: string } };
      assert.equal(body.error.code, "AUTH_RATE_LIMITED", route.path);
      assert.deepEqual(calls, [`rate:${route.scope}`], route.path);
      calls.length = 0;
    }
  } finally {
    await stop(server);
  }
});
