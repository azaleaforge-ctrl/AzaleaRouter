import { Router } from "express";
import { randomBytes } from "node:crypto";
import { z } from "zod";
import type { DatabaseClient } from "@azalea-router/database";
import { requireActiveAccount, requirePermission } from "../middleware/authorization.js";
import { requireCsrf } from "../middleware/csrf.js";
import { HttpError } from "../lib/http-error.js";
import "../auth/types.js";

const ticketCreateSchema = z.object({
  subject: z.string().trim().min(5).max(160),
  category: z.enum(["account", "billing", "technical", "model", "other"]),
  body: z.string().trim().min(2).max(20_000),
}).strict();

const ticketReplySchema = z.object({
  body: z.string().trim().min(2).max(20_000),
  visibility: z.enum(["public", "internal"]).default("public"),
}).strict();

function ticketNumber(): string {
  const day = new Date().toISOString().slice(0, 10).replaceAll("-", "");
  return `AZL-${day}-${randomBytes(3).toString("hex").toUpperCase()}`;
}

function mapTicket(ticket: {
  id: string;
  ticketNumber: string;
  subject: string;
  category: string;
  status: string;
  priority: string;
  lastMessageAt: Date;
  createdAt: Date;
  updatedAt: Date;
  messages?: Array<{
    id: string;
    authorUserId: string;
    visibility: string;
    body: string;
    createdAt: Date;
  }>;
}, includeInternal = false) {
  return {
    id: ticket.id,
    ticket_number: ticket.ticketNumber,
    subject: ticket.subject,
    category: ticket.category,
    status: ticket.status.toLowerCase(),
    priority: ticket.priority.toLowerCase(),
    last_message_at: ticket.lastMessageAt.toISOString(),
    created_at: ticket.createdAt.toISOString(),
    updated_at: ticket.updatedAt.toISOString(),
    ...(ticket.messages ? {
      messages: ticket.messages
        .filter((message) => includeInternal || message.visibility === "PUBLIC")
        .map((message) => ({
          id: message.id,
          author_user_id: message.authorUserId,
          body: message.body,
          created_at: message.createdAt.toISOString(),
        })),
    } : {}),
  };
}

export interface SupportRouterOptions {
  database: DatabaseClient;
  csrfCookieName: string;
  allowedOrigins: string[];
}

export function createSupportRouter(options: SupportRouterOptions): Router {
  const router = Router();
  const active = requireActiveAccount();
  const csrf = requireCsrf({
    cookieName: options.csrfCookieName,
    allowedOrigins: options.allowedOrigins,
  });

  router.post("/support/tickets", active, csrf, async (req, res) => {
    const input = ticketCreateSchema.parse(req.body);
    const ticket = await options.database.$transaction(async (tx) => {
      const created = await tx.supportTicket.create({
        data: {
          ticketNumber: ticketNumber(),
          ownerUserId: req.auth!.userId,
          subject: input.subject,
          category: input.category,
          status: "OPEN",
          priority: "NORMAL",
          messages: {
            create: {
              authorUserId: req.auth!.userId,
              visibility: "PUBLIC",
              body: input.body,
            },
          },
        },
        include: { messages: true },
      });
      await tx.outboxEvent.create({
        data: {
          userId: req.auth!.userId,
          aggregateType: "support_ticket",
          aggregateId: created.id,
          eventType: "notification.created",
          schemaVersion: 1,
          idempotencyKey: `support-ticket.created:${created.id}`,
          payloadSafe: {
            ticket_id: created.id,
            ticket_number: created.ticketNumber,
            status: "open",
          },
          occurredAt: new Date(),
          availableAt: new Date(),
          publishedAt: new Date(),
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        },
      });
      return created;
    }, { isolationLevel: "Serializable", timeout: 15_000 });
    res.status(201).json({ ticket: mapTicket(ticket) });
  });

  router.get("/support/tickets", active, async (req, res) => {
    const query = z.object({
      limit: z.coerce.number().int().min(1).max(100).default(25),
      cursor: z.string().uuid().optional(),
      status: z.enum(["open", "in_progress", "waiting", "resolved", "closed"]).optional(),
    }).strict().parse(req.query);
    const tickets = await options.database.supportTicket.findMany({
      where: {
        ownerUserId: req.auth!.userId,
        ...(query.status ? { status: query.status.toUpperCase() as never } : {}),
      },
      orderBy: [{ updatedAt: "desc" }, { id: "desc" }],
      take: query.limit + 1,
      ...(query.cursor ? { cursor: { id: query.cursor }, skip: 1 } : {}),
    });
    const more = tickets.length > query.limit;
    const page = more ? tickets.slice(0, query.limit) : tickets;
    res.status(200).json({
      data: page.map((ticket) => mapTicket(ticket)),
      next_cursor: more ? page.at(-1)?.id ?? null : null,
    });
  });

  router.get("/support/tickets/:id", active, async (req, res) => {
    const id = z.string().uuid().parse(req.params.id);
    const ticket = await options.database.supportTicket.findFirst({
      where: { id, ownerUserId: req.auth!.userId },
      include: { messages: { orderBy: { createdAt: "asc" } } },
    });
    if (!ticket) throw new HttpError(404, "SUPPORT_TICKET_NOT_FOUND", "Support ticket was not found.");
    res.status(200).json({ ticket: mapTicket(ticket) });
  });

  router.post("/support/tickets/:id/replies", active, csrf, async (req, res) => {
    const id = z.string().uuid().parse(req.params.id);
    const input = ticketReplySchema.parse(req.body);
    if (input.visibility === "internal") {
      throw new HttpError(403, "SUPPORT_INTERNAL_NOTE_FORBIDDEN", "Customers cannot create internal ticket notes.");
    }
    const ticket = await options.database.supportTicket.findFirst({
      where: { id, ownerUserId: req.auth!.userId, status: { notIn: ["CLOSED", "RESOLVED"] } },
      select: { id: true },
    });
    if (!ticket) throw new HttpError(404, "SUPPORT_TICKET_NOT_FOUND", "An active support ticket was not found.");
    const created = await options.database.$transaction(async (tx) => {
      const message = await tx.supportTicketMessage.create({
        data: { ticketId: id, authorUserId: req.auth!.userId, visibility: "PUBLIC", body: input.body },
      });
      await tx.supportTicket.update({
        where: { id },
        data: { status: "OPEN", lastMessageAt: new Date() },
      });
      return message;
    });
    res.status(201).json({
      message: {
        id: created.id,
        body: created.body,
        visibility: "public",
        created_at: created.createdAt.toISOString(),
      },
    });
  });

  // Support agents see only tickets explicitly assigned to their authenticated user.
  router.get("/support/assigned", requirePermission("support:tickets:read:assigned"), async (req, res) => {
    const tickets = await options.database.supportTicket.findMany({
      where: {
        assignedSupportId: req.auth!.userId,
        status: { notIn: ["CLOSED", "RESOLVED"] },
      },
      orderBy: [{ priority: "desc" }, { lastMessageAt: "asc" }],
      take: 100,
    });
    res.status(200).json({ data: tickets.map((ticket) => mapTicket(ticket)) });
  });

  router.get("/support/assigned/:id", requirePermission("support:tickets:read:assigned"), async (req, res) => {
    const id = z.string().uuid().parse(req.params.id);
    const ticket = await options.database.supportTicket.findFirst({
      where: { id, assignedSupportId: req.auth!.userId },
      include: { messages: { orderBy: { createdAt: "asc" } } },
    });
    if (!ticket) throw new HttpError(404, "SUPPORT_TICKET_NOT_FOUND", "Assigned ticket was not found.");
    res.status(200).json({ ticket: mapTicket(ticket, true) });
  });

  router.post("/support/assigned/:id/replies", requirePermission("support:tickets:reply:assigned"), csrf, async (req, res) => {
    const id = z.string().uuid().parse(req.params.id);
    const input = ticketReplySchema.parse(req.body);
    const ticket = await options.database.supportTicket.findFirst({
      where: { id, assignedSupportId: req.auth!.userId, status: { not: "CLOSED" } },
      select: { id: true, ownerUserId: true },
    });
    if (!ticket) throw new HttpError(404, "SUPPORT_TICKET_NOT_FOUND", "Assigned ticket was not found.");
    const created = await options.database.$transaction(async (tx) => {
      const message = await tx.supportTicketMessage.create({
        data: {
          ticketId: id,
          authorUserId: req.auth!.userId,
          visibility: input.visibility === "internal" ? "INTERNAL" : "PUBLIC",
          body: input.body,
        },
      });
      await tx.supportTicket.update({
        where: { id },
        data: {
          ...(input.visibility === "internal" ? {} : { status: "WAITING" as const }),
          lastMessageAt: new Date(),
        },
      });
      if (input.visibility === "public") {
        await tx.outboxEvent.create({
          data: {
            userId: ticket.ownerUserId,
            aggregateType: "support_ticket",
            aggregateId: ticket.id,
            eventType: "notification.created",
            schemaVersion: 1,
            idempotencyKey: `support-ticket.reply:${createdTicketMessageId(message.id)}`,
            payloadSafe: { ticket_id: id, message_id: message.id, status: "waiting" },
            occurredAt: new Date(),
            availableAt: new Date(),
            publishedAt: new Date(),
            expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
          },
        });
      }
      return message;
    }, { isolationLevel: "Serializable", timeout: 15_000 });
    res.status(201).json({
      message: {
        id: created.id,
        visibility: created.visibility.toLowerCase(),
        body: created.body,
        created_at: created.createdAt.toISOString(),
      },
    });
  });

  return router;
}

function createdTicketMessageId(id: string): string {
  return id;
}
