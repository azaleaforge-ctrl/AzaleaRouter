import { Router } from "express";
import type { DatabaseClient } from "@azalea-router/database";
import { requireActiveAccount } from "../middleware/authorization.js";
import "../auth/types.js";

interface EventCursor {
  occurredAt: Date;
  id: string;
}

interface SafeOutboxEvent {
  id: string;
  eventType: string;
  schemaVersion: number;
  occurredAt: Date;
  payloadSafe: unknown;
}

function parseCursor(value: string): EventCursor {
  let decoded: unknown;
  try {
    decoded = JSON.parse(Buffer.from(value, "base64url").toString("utf8"));
  } catch {
    throw new Error("EVENT_CURSOR_INVALID");
  }
  if (!decoded || typeof decoded !== "object") throw new Error("EVENT_CURSOR_INVALID");
  const candidate = decoded as Record<string, unknown>;
  if (
    typeof candidate.occurred_at !== "string" ||
    typeof candidate.id !== "string" ||
    !/^[0-9a-f-]{36}$/i.test(candidate.id)
  ) throw new Error("EVENT_CURSOR_INVALID");
  const occurredAt = new Date(candidate.occurred_at);
  if (!Number.isFinite(occurredAt.getTime())) throw new Error("EVENT_CURSOR_INVALID");
  return { occurredAt, id: candidate.id };
}

function encodeCursor(event: { occurredAt: Date; id: string }): string {
  return Buffer.from(JSON.stringify({
    occurred_at: event.occurredAt.toISOString(),
    id: event.id,
  })).toString("base64url");
}

function safeEventType(value: string): string {
  return /^[a-z0-9._-]{1,128}$/i.test(value) ? value : "notification.created";
}

export interface EventStreamOptions {
  database: DatabaseClient;
  replayWindowSeconds?: number;
  pollIntervalMs?: number;
  heartbeatIntervalMs?: number;
}

export function createEventStreamRouter(options: EventStreamOptions): Router {
  const router = Router();
  const replayWindowMs = (options.replayWindowSeconds ?? 86_400) * 1000;
  const pollIntervalMs = options.pollIntervalMs ?? 1_000;
  const heartbeatIntervalMs = options.heartbeatIntervalMs ?? 15_000;

  router.get("/events", requireActiveAccount(), async (req, res) => {
    const headerCursor = req.header("last-event-id")?.trim();
    let cursor: EventCursor = {
      occurredAt: new Date(Date.now() - replayWindowMs),
      id: "00000000-0000-0000-0000-000000000000",
    };
    if (headerCursor) {
      try {
        cursor = parseCursor(headerCursor);
      } catch {
        res.status(400).json({
          error: {
            code: "EVENT_CURSOR_INVALID",
            message: "Last-Event-ID is not a valid event cursor.",
            request_id: req.requestId,
            retryable: false,
          },
        });
        return;
      }
    }

    const userId = req.auth!.userId;
    res.status(200);
    res.setHeader("content-type", "text/event-stream; charset=utf-8");
    res.setHeader("cache-control", "no-cache, no-transform");
    res.setHeader("connection", "keep-alive");
    res.setHeader("x-accel-buffering", "no");
    res.setHeader("x-request-id", req.requestId);
    res.flushHeaders();

    let closed = false;
    let polling = false;

    const write = async (chunk: string): Promise<void> => {
      if (closed || res.writableEnded) return;
      if (!res.write(chunk)) {
        await new Promise<void>((resolve) => {
          res.once("drain", resolve);
          res.once("close", resolve);
        });
      }
    };

    const send = async (
      event: { id: string; eventType: string; schemaVersion: number; occurredAt: Date; payloadSafe: unknown },
    ) => {
      const cursorId = encodeCursor(event);
      const data = {
        id: event.id,
        type: safeEventType(event.eventType),
        schema_version: event.schemaVersion,
        occurred_at: event.occurredAt.toISOString(),
        request_id: req.requestId,
        payload: event.payloadSafe,
      };
      await write(`id: ${cursorId}\nevent: ${safeEventType(event.eventType)}\ndata: ${JSON.stringify(data)}\n\n`);
      cursor = { occurredAt: event.occurredAt, id: event.id };
    };

    const snapshotRequired = async (reason: string) => {
      const newest = await options.database.outboxEvent.findFirst({
        where: {
          userId,
          publishedAt: { not: null },
          expiresAt: { gt: new Date() },
        },
        orderBy: [{ occurredAt: "desc" }, { id: "desc" }],
        select: { id: true, occurredAt: true },
      });
      const time = newest?.occurredAt ?? new Date();
      const id = newest?.id ?? "00000000-0000-0000-0000-000000000000";
      const eventId = encodeCursor({ occurredAt: time, id });
      await write(`id: ${eventId}\nevent: snapshot.required\ndata: ${JSON.stringify({
        type: "snapshot.required",
        schema_version: 1,
        reason,
        occurred_at: time.toISOString(),
        request_id: req.requestId,
      })}\n\n`);
      cursor = { occurredAt: time, id };
    };

    const poll = async () => {
      if (closed || polling) return;
      polling = true;
      try {
        if (cursor.occurredAt.getTime() < Date.now() - replayWindowMs) {
          await snapshotRequired("cursor_expired");
          return;
        }
        const events = await options.database.outboxEvent.findMany({
          where: {
            AND: [
              { userId },
              {
                OR: [
                  { occurredAt: { gt: cursor.occurredAt } },
                  { occurredAt: cursor.occurredAt, id: { gt: cursor.id } },
                ],
              },
            ],
            publishedAt: { not: null },
            expiresAt: { gt: new Date() },
          },
          orderBy: [{ occurredAt: "asc" }, { id: "asc" }],
          take: 100,
          select: {
            id: true,
            eventType: true,
            schemaVersion: true,
            occurredAt: true,
            payloadSafe: true,
          },
        }) as SafeOutboxEvent[];
        for (const event of events) {
          if (closed) break;
          await send(event);
        }
      } catch {
        await write(": stream temporarily unavailable; reconnect with Last-Event-ID\n\n");
      } finally {
        polling = false;
      }
    };

    const pollTimer = setInterval(() => { void poll(); }, pollIntervalMs);
    const heartbeatTimer = setInterval(() => {
      void write(`: heartbeat ${new Date().toISOString()}\n\n`);
    }, heartbeatIntervalMs);

    // IncomingMessage 'close' fires once the request body has been consumed;
    // use the response socket lifecycle so an empty GET does not end SSE early.
    res.once("close", () => {
      closed = true;
      clearInterval(pollTimer);
      clearInterval(heartbeatTimer);
    });

    await poll();
  });

  return router;
}
