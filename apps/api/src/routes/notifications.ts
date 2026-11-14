import { Router } from "express";
import { z } from "zod";
import type { DatabaseClient } from "@azalea-router/database";
import { requireActiveAccount } from "../middleware/authorization.js";
import { requireCsrf } from "../middleware/csrf.js";
import { HttpError } from "../lib/http-error.js";
import "../auth/types.js";

export interface NotificationRouterOptions {
  database: DatabaseClient;
  csrfCookieName: string;
  allowedOrigins: string[];
}

export function createNotificationRouter(options: NotificationRouterOptions): Router {
  const router = Router();
  const active = requireActiveAccount();
  const csrf = requireCsrf({
    cookieName: options.csrfCookieName,
    allowedOrigins: options.allowedOrigins,
  });

  router.get("/notifications", active, async (req, res) => {
    const query = z.object({
      limit: z.coerce.number().int().min(1).max(100).default(50),
      cursor: z.string().uuid().optional(),
      unread_only: z.enum(["true", "false"]).default("false"),
    }).strict().parse(req.query);
    const rows = await options.database.notification.findMany({
      where: {
        userId: req.auth!.userId,
        ...(query.unread_only === "true" ? { readAt: null } : {}),
        OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
      },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: query.limit + 1,
      ...(query.cursor ? { cursor: { id: query.cursor }, skip: 1 } : {}),
      select: {
        id: true, type: true, title: true, body: true,
        payloadSafe: true, readAt: true, createdAt: true,
      },
    });
    const hasMore = rows.length > query.limit;
    const page = hasMore ? rows.slice(0, query.limit) : rows;
    res.status(200).json({
      data: page.map((item) => ({
        id: item.id,
        type: item.type,
        title: item.title,
        body: item.body,
        payload: item.payloadSafe,
        read_at: item.readAt?.toISOString() ?? null,
        created_at: item.createdAt.toISOString(),
      })),
      next_cursor: hasMore ? page.at(-1)?.id ?? null : null,
    });
  });

  router.patch("/notifications/:id/read", active, csrf, async (req, res) => {
    const id = z.string().uuid().parse(req.params.id);
    const result = await options.database.notification.updateMany({
      where: { id, userId: req.auth!.userId, readAt: null },
      data: { readAt: new Date() },
    });
    if (result.count === 0) {
      const exists = await options.database.notification.findFirst({
        where: { id, userId: req.auth!.userId },
        select: { id: true, readAt: true },
      });
      if (!exists) throw new HttpError(404, "NOTIFICATION_NOT_FOUND", "Notification was not found.");
    }
    res.status(204).end();
  });

  router.post("/notifications/read-all", active, csrf, async (req, res) => {
    const result = await options.database.notification.updateMany({
      where: {
        userId: req.auth!.userId,
        readAt: null,
        OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
      },
      data: { readAt: new Date() },
    });
    res.status(200).json({ updated_count: result.count });
  });

  return router;
}
