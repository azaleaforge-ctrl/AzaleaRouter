import assert from "node:assert/strict";
import { createServer, type Server } from "node:http";
import test from "node:test";
import express from "express";
import { createEventStreamRouter } from "../src/routes/events.js";
import { requestIdMiddleware } from "../src/middleware/request-id.js";

const userId = "7a0d9f5b-6b2e-4b1c-8e63-9e3d5e7a1001";
const eventId = "8b1e0a6c-7c3f-4d2a-9f74-ae4e6f8b2002";
const previousEventId = "9c2f1b7d-8d4a-4e3b-a085-bf5f7a9c3003";

function encodeCursor(occurredAt: Date, id: string): string {
  return Buffer.from(JSON.stringify({
    occurred_at: occurredAt.toISOString(),
    id,
  })).toString("base64url");
}

async function startEventServer(
  database: unknown,
  options: { replayWindowSeconds?: number } = {},
): Promise<{ server: Server; url: string }> {
  const app = express();
  app.use(requestIdMiddleware);
  app.use((req, _res, next) => {
    Object.assign(req, {
      auth: {
        userId,
        email: "user-a@example.test",
        role: "user",
        status: "active",
      },
    });
    next();
  });
  app.use("/api/v1", createEventStreamRouter({
    database: database as never,
    pollIntervalMs: 60_000,
    heartbeatIntervalMs: 60_000,
    ...options,
  }));

  const server = createServer(app);
  await new Promise<void>((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolve);
  });
  const address = server.address();
  if (!address || typeof address === "string") {
    throw new Error("SSE test server failed to bind.");
  }
  return { server, url: `http://127.0.0.1:${address.port}/api/v1/events` };
}

async function stop(server: Server): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    server.close((error) => error ? reject(error) : resolve());
  });
}

async function readFirstChunk(response: Response): Promise<string> {
  assert.ok(response.body, "SSE response must have a body");
  const reader = response.body.getReader();
  const first = await reader.read();
  assert.equal(first.done, false, "SSE response should emit an initial event");
  const chunk = new TextDecoder().decode(first.value);
  await reader.cancel().catch(() => {});
  return chunk;
}

test("SSE resumes after Last-Event-ID and scopes replay to the authenticated user", async () => {
  const previousAt = new Date(Date.now() - 2_000);
  const occurredAt = new Date(Date.now() - 1_000);
  const queryArgs: unknown[] = [];
  const event = {
    id: eventId,
    eventType: "wallet.balance.updated",
    schemaVersion: 1,
    occurredAt,
    payloadSafe: { amount_idr: "125000", currency: "IDR" },
  };
  const database = {
    outboxEvent: {
      findMany: async (args: unknown) => {
        queryArgs.push(args);
        return [event];
      },
      findFirst: async () => null,
    },
  };
  const { server, url } = await startEventServer(database);
  const controller = new AbortController();

  try {
    const response = await fetch(url, {
      headers: { "last-event-id": encodeCursor(previousAt, previousEventId) },
      signal: controller.signal,
    });
    assert.equal(response.status, 200);
    assert.match(response.headers.get("content-type") ?? "", /^text\/event-stream/);

    const chunk = await readFirstChunk(response);
    assert.match(chunk, /event: wallet\.balance\.updated/);
    const dataLine = chunk.split("\n").find((line) => line.startsWith("data: "));
    assert.ok(dataLine, "SSE event must include a data frame");
    const data = JSON.parse(dataLine.slice(6)) as {
      id: string;
      type: string;
      request_id: string;
      payload: { amount_idr: string; currency: string };
    };
    assert.equal(data.id, eventId);
    assert.equal(data.type, "wallet.balance.updated");
    assert.equal(data.request_id, response.headers.get("x-request-id"));
    assert.deepEqual(data.payload, { amount_idr: "125000", currency: "IDR" });

    const query = queryArgs[0] as {
      where: {
        AND: Array<{
          userId?: string;
          OR?: Array<{ occurredAt?: { gt?: Date }; id?: { gt?: string } }>;
        }>;
      };
    };
    assert.equal(query.where.AND[0]?.userId, userId);
    assert.equal(query.where.AND[1]?.OR?.[0]?.occurredAt?.gt?.toISOString(), previousAt.toISOString());
    assert.equal(query.where.AND[1]?.OR?.[1]?.id?.gt, previousEventId);
  } finally {
    controller.abort();
    await stop(server);
  }
});

test("SSE requests a fresh snapshot when the replay cursor has expired", async () => {
  const expiredAt = new Date(Date.now() - 60_000);
  const newestAt = new Date(Date.now() - 500);
  const findFirstArgs: unknown[] = [];
  let findManyCalls = 0;
  const database = {
    outboxEvent: {
      findFirst: async (args: unknown) => {
        findFirstArgs.push(args);
        return { id: eventId, occurredAt: newestAt };
      },
      findMany: async () => {
        findManyCalls += 1;
        return [];
      },
    },
  };
  const { server, url } = await startEventServer(database, { replayWindowSeconds: 10 });
  const controller = new AbortController();

  try {
    const response = await fetch(url, {
      headers: { "last-event-id": encodeCursor(expiredAt, previousEventId) },
      signal: controller.signal,
    });
    assert.equal(response.status, 200);
    const chunk = await readFirstChunk(response);
    assert.match(chunk, /event: snapshot\.required/);
    const dataLine = chunk.split("\n").find((line) => line.startsWith("data: "));
    assert.ok(dataLine, "snapshot recovery must include a data frame");
    const data = JSON.parse(dataLine.slice(6)) as {
      type: string;
      reason: string;
      request_id: string;
      occurred_at: string;
    };
    assert.equal(data.type, "snapshot.required");
    assert.equal(data.reason, "cursor_expired");
    assert.equal(data.request_id, response.headers.get("x-request-id"));
    assert.equal(data.occurred_at, newestAt.toISOString());
    assert.equal(findManyCalls, 0);

    const query = findFirstArgs[0] as { where: { userId: string } };
    assert.equal(query.where.userId, userId);
  } finally {
    controller.abort();
    await stop(server);
  }
});

test("SSE rejects malformed Last-Event-ID before querying the outbox", async () => {
  let databaseReads = 0;
  const database = {
    outboxEvent: {
      findFirst: async () => {
        databaseReads += 1;
        return null;
      },
      findMany: async () => {
        databaseReads += 1;
        return [];
      },
    },
  };
  const { server, url } = await startEventServer(database);

  try {
    const response = await fetch(url, {
      headers: { "last-event-id": "not-a-valid-cursor" },
    });
    assert.equal(response.status, 400);
    const body = await response.json() as { error: { code: string } };
    assert.equal(body.error.code, "EVENT_CURSOR_INVALID");
    assert.equal(databaseReads, 0);
  } finally {
    await stop(server);
  }
});
