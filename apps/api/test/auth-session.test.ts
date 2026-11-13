import assert from "node:assert/strict";
import { createServer, type Server } from "node:http";
import test from "node:test";
import { createApp } from "../src/app.js";

async function startServer(sessionVerifier?: { resolvePrincipal(request: import("express").Request): Promise<unknown | null> }): Promise<{ server: Server; baseUrl: string }> {
  const server = createServer(createApp(sessionVerifier ? { sessionVerifier } : {}));
  await new Promise<void>((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolve);
  });
  const address = server.address();
  if (!address || typeof address === "string") throw new Error("Test API failed to bind.");
  return { server, baseUrl: `http://127.0.0.1:${address.port}` };
}

async function stopServer(server: Server): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    server.close((error) => error ? reject(error) : resolve());
  });
}

test("auth remains explicitly unavailable when the provider adapter is disabled", async () => {
  const { server, baseUrl } = await startServer();
  try {
    const session = await fetch(`${baseUrl}/api/v1/auth/session`);
    assert.equal(session.status, 200);
    assert.deepEqual(await session.json(), { authenticated: false, user: null });

    const login = await fetch(`${baseUrl}/api/v1/auth/login`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email: "user@example.test", password: "not-a-real-password", turnstile_token: "x" }),
    });
    assert.equal(login.status, 503);
    const body = await login.json() as { error: { code: string } };
    assert.equal(body.error.code, "AUTH_PROVIDER_NOT_CONFIGURED");
  } finally {
    await stopServer(server);
  }
});

test("only a provider-verified principal may be reflected by session introspection", async () => {
  const { server, baseUrl } = await startServer({
    resolvePrincipal: async () => ({
      userId: "9b944d73-23f4-4cb8-98df-2ea7d11d5674",
      email: "user@example.test",
      role: "user",
      status: "active",
    }),
  });

  try {
    const response = await fetch(`${baseUrl}/api/v1/auth/session`);
    assert.equal(response.status, 200);
    const body = await response.json() as { authenticated: boolean; user: { id: string; email: string; role: string } };
    assert.equal(body.authenticated, true);
    assert.equal(body.user.id, "9b944d73-23f4-4cb8-98df-2ea7d11d5674");
    assert.equal(body.user.role, "user");
  } finally {
    await stopServer(server);
  }
});

test("malformed provider principal fails closed", async () => {
  const { server, baseUrl } = await startServer({
    resolvePrincipal: async () => ({ userId: "spoofed", role: "super_admin", status: "active" }),
  });

  try {
    const response = await fetch(`${baseUrl}/api/v1/auth/session`);
    assert.equal(response.status, 401);
    const body = await response.json() as { error: { code: string } };
    assert.equal(body.error.code, "AUTH_INVALID");
  } finally {
    await stopServer(server);
  }
});
