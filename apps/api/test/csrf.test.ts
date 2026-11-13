import assert from "node:assert/strict";
import { createServer, type Server } from "node:http";
import test from "node:test";
import { Router } from "express";
import { createApp } from "../src/app.js";
import { requireCsrf } from "../src/middleware/csrf.js";

async function startServer(): Promise<{ server: Server; baseUrl: string }> {
  const router = Router();
  router.post("/csrf-check", requireCsrf({ cookieName: "azlr_csrf", allowedOrigins: ["http://localhost:3000"] }), (_req, res) => {
    res.status(204).end();
  });
  const app = createApp();
  app.use("/api/v1/test", router);
  const server = createServer(app);
  await new Promise<void>((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolve);
  });
  const address = server.address();
  if (!address || typeof address === "string") throw new Error("Test API failed to bind.");
  return { server, baseUrl: `http://127.0.0.1:${address.port}` };
}

test("CSRF guard rejects missing token and missing Origin", async () => {
  const { server, baseUrl } = await startServer();
  try {
    const response = await fetch(`${baseUrl}/api/v1/test/csrf-check`, { method: "POST" });
    assert.equal(response.status, 401);
  } finally {
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }
});
