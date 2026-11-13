import assert from "node:assert/strict";
import { createServer, type Server } from "node:http";
import test from "node:test";
import { createApp } from "../src/app.js";

async function startTestServer(): Promise<{ server: Server; baseUrl: string }> {
  const server = createServer(createApp());

  await new Promise<void>((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => resolve());
  });

  const address = server.address();
  if (!address || typeof address === "string") {
    server.close();
    throw new Error("Test server did not bind to a TCP address.");
  }

  return { server, baseUrl: `http://127.0.0.1:${address.port}` };
}

async function closeTestServer(server: Server): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    server.close((error) => (error ? reject(error) : resolve()));
  });
}

test("health endpoint returns service status and a request ID", async () => {
  const { server, baseUrl } = await startTestServer();

  try {
    const response = await fetch(`${baseUrl}/api/v1/health`);
    const body = (await response.json()) as {
      status: string;
      service: string;
      timestamp: string;
    };

    assert.equal(response.status, 200);
    assert.match(response.headers.get("x-request-id") ?? "", /^[0-9a-f-]{36}$/i);
    assert.equal(body.status, "ok");
    assert.equal(body.service, "azalea-router-api");
    assert.ok(Number.isFinite(Date.parse(body.timestamp)));
  } finally {
    await closeTestServer(server);
  }
});

test("safe caller request IDs are preserved", async () => {
  const { server, baseUrl } = await startTestServer();

  try {
    const response = await fetch(`${baseUrl}/api/v1/health`, {
      headers: { "x-request-id": "test-request:123" },
    });

    assert.equal(response.status, 200);
    assert.equal(response.headers.get("x-request-id"), "test-request:123");
  } finally {
    await closeTestServer(server);
  }
});

test("unsafe caller request IDs are replaced", async () => {
  const { server, baseUrl } = await startTestServer();

  try {
    const response = await fetch(`${baseUrl}/api/v1/health`, {
      headers: { "x-request-id": "bad request\nwith newline" },
    });

    const requestId = response.headers.get("x-request-id") ?? "";
    assert.equal(response.status, 200);
    assert.notEqual(requestId, "bad request\nwith newline");
    assert.match(requestId, /^[0-9a-f-]{36}$/i);
  } finally {
    await closeTestServer(server);
  }
});

test("unknown API routes use the standard request-correlated error envelope", async () => {
  const { server, baseUrl } = await startTestServer();

  try {
    const response = await fetch(`${baseUrl}/api/v1/does-not-exist`);
    const body = (await response.json()) as {
      error: {
        code: string;
        message: string;
        request_id: string;
        retryable: boolean;
      };
    };

    assert.equal(response.status, 404);
    assert.equal(body.error.code, "NOT_FOUND");
    assert.equal(body.error.retryable, false);
    assert.equal(body.error.request_id, response.headers.get("x-request-id"));
  } finally {
    await closeTestServer(server);
  }
});
