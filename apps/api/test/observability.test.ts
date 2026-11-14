import assert from "node:assert/strict";
import test from "node:test";
import { createServer, type Server } from "node:http";
import { createApp } from "../src/app.js";

async function startServer(): Promise<{ server: Server; baseUrl: string }> {
  const server = createServer(createApp());
  await new Promise<void>((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolve);
  });
  const address = server.address();
  if (!address || typeof address === "string") throw new Error("Test server failed to bind.");
  return { server, baseUrl: `http://127.0.0.1:${address.port}` };
}

test("request observability middleware preserves request correlation header", async () => {
  const { server, baseUrl } = await startServer();
  try {
    const response = await fetch(`${baseUrl}/api/v1/health`, {
      headers: { "x-request-id": "observability-test-123" },
    });
    assert.equal(response.status, 200);
    assert.equal(response.headers.get("x-request-id"), "observability-test-123");
  } finally {
    await new Promise<void>((resolve, reject) => {
      server.close((error) => error ? reject(error) : resolve());
    });
  }
});
