import { Router } from "express";
import { z } from "zod";
import type { DatabaseClient } from "@azalea-router/database";
import { requireActiveAccount } from "../middleware/authorization.js";
import { requireCsrf } from "../middleware/csrf.js";
import { HttpError } from "../lib/http-error.js";
import "../auth/types.js";

const titleSchema = z.string().trim().min(1).max(160);
const createConversationSchema = z.object({
  title: titleSchema.optional(),
  default_model_id: z.string().trim().min(1).max(255).optional(),
}).strict();

const messageSchema = z.object({
  text: z.string().max(100_000).optional(),
  attachment_ids: z.array(z.string().uuid()).max(10).default([]),
}).strict();

const listSchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(25),
  cursor: z.string().uuid().optional(),
  status: z.enum(["active", "archived"]).default("active"),
}).strict();

const safeAttachmentSelect = {
  id: true,
  originalFilename: true,
  mimeType: true,
  fileSize: true,
  status: true,
  scanVerdict: true,
  createdAt: true,
} as const;

function publicMessage(message: {
  id: string;
  role: string;
  status: string;
  content: unknown;
  canonicalModelId: string | null;
  sourceModelId: string | null;
  promptTokens: bigint;
  completionTokens: bigint;
  totalTokens: bigint;
  customerChargeIdr: { toString(): string } | null;
  createdAt: Date;
  completedAt: Date | null;
  attachments?: Array<{
    id: string;
    originalFilename: string;
    mimeType: string;
    fileSize: bigint;
    status: string;
    scanVerdict: string | null;
  }>;
}) {
  return {
    id: message.id,
    role: message.role.toLowerCase(),
    status: message.status.toLowerCase(),
    content: message.content,
    model_id: message.canonicalModelId,
    source_model_id: message.sourceModelId,
    prompt_tokens: message.promptTokens.toString(),
    completion_tokens: message.completionTokens.toString(),
    total_tokens: message.totalTokens.toString(),
    customer_charge_idr: message.customerChargeIdr?.toString() ?? null,
    created_at: message.createdAt.toISOString(),
    completed_at: message.completedAt?.toISOString() ?? null,
    attachments: (message.attachments ?? []).map((file) => ({
      id: file.id,
      filename: file.originalFilename,
      mime_type: file.mimeType,
      size_bytes: file.fileSize.toString(),
      status: file.status.toLowerCase(),
      scan_verdict: file.scanVerdict,
    })),
  };
}

export interface ConversationRouterOptions {
  database: DatabaseClient;
  csrfCookieName: string;
  allowedOrigins: string[];
}

export function createConversationRouter(options: ConversationRouterOptions): Router {
  const router = Router();
  const active = requireActiveAccount();
  const csrf = requireCsrf({
    cookieName: options.csrfCookieName,
    allowedOrigins: options.allowedOrigins,
  });

  router.get("/conversations", active, async (req, res) => {
    const query = listSchema.parse(req.query);
    const rows = await options.database.conversation.findMany({
      where: {
        userId: req.auth!.userId,
        deletedAt: null,
        status: query.status === "active" ? "ACTIVE" : "ARCHIVED",
      },
      orderBy: [{ updatedAt: "desc" }, { id: "desc" }],
      take: query.limit + 1,
      ...(query.cursor ? { cursor: { id: query.cursor }, skip: 1 } : {}),
      select: {
        id: true,
        title: true,
        status: true,
        defaultModelId: true,
        lastMessageAt: true,
        createdAt: true,
        updatedAt: true,
      },
    });
    const hasMore = rows.length > query.limit;
    const page = hasMore ? rows.slice(0, query.limit) : rows;
    res.status(200).json({
      data: page.map((row) => ({
        id: row.id,
        title: row.title,
        status: row.status.toLowerCase(),
        default_model_id: row.defaultModelId,
        last_message_at: row.lastMessageAt?.toISOString() ?? null,
        created_at: row.createdAt.toISOString(),
        updated_at: row.updatedAt.toISOString(),
      })),
      next_cursor: hasMore ? page.at(-1)?.id ?? null : null,
    });
  });

  router.post("/conversations", active, csrf, async (req, res) => {
    const input = createConversationSchema.parse(req.body);
    const conversation = await options.database.conversation.create({
      data: {
        userId: req.auth!.userId,
        title: input.title ?? "New conversation",
        ...(input.default_model_id ? { defaultModelId: input.default_model_id } : {}),
      },
      select: {
        id: true,
        title: true,
        status: true,
        defaultModelId: true,
        createdAt: true,
        updatedAt: true,
      },
    });
    res.status(201).json({
      conversation: {
        id: conversation.id,
        title: conversation.title,
        status: conversation.status.toLowerCase(),
        default_model_id: conversation.defaultModelId,
        created_at: conversation.createdAt.toISOString(),
        updated_at: conversation.updatedAt.toISOString(),
      },
    });
  });

  router.get("/conversations/:id", active, async (req, res) => {
    const id = z.string().uuid().parse(req.params.id);
    const conversation = await options.database.conversation.findFirst({
      where: { id, userId: req.auth!.userId, deletedAt: null },
      include: {
        messages: {
          where: { deletedAt: null },
          orderBy: [{ createdAt: "desc" }, { id: "desc" }],
          take: 50,
          include: { attachments: { select: safeAttachmentSelect } },
        },
      },
    });
    if (!conversation) throw new HttpError(404, "CONVERSATION_NOT_FOUND", "Conversation was not found.");
    const messages = [...conversation.messages].reverse();
    res.status(200).json({
      conversation: {
        id: conversation.id,
        title: conversation.title,
        status: conversation.status.toLowerCase(),
        default_model_id: conversation.defaultModelId,
        last_message_at: conversation.lastMessageAt?.toISOString() ?? null,
        created_at: conversation.createdAt.toISOString(),
        updated_at: conversation.updatedAt.toISOString(),
      },
      messages: messages.map(publicMessage),
    });
  });

  router.patch("/conversations/:id", active, csrf, async (req, res) => {
    const id = z.string().uuid().parse(req.params.id);
    const input = z.object({
      title: titleSchema.optional(),
      status: z.enum(["active", "archived"]).optional(),
      default_model_id: z.string().trim().min(1).max(255).nullable().optional(),
    }).strict().refine((value) => Object.keys(value).length > 0, "At least one field is required").parse(req.body);
    const current = await options.database.conversation.findFirst({
      where: { id, userId: req.auth!.userId, deletedAt: null },
      select: { id: true },
    });
    if (!current) throw new HttpError(404, "CONVERSATION_NOT_FOUND", "Conversation was not found.");
    const now = new Date();
    const updated = await options.database.conversation.update({
      where: { id },
      data: {
        ...(input.title === undefined ? {} : { title: input.title }),
        ...(input.default_model_id === undefined ? {} : { defaultModelId: input.default_model_id }),
        ...(input.status === "archived" ? { status: "ARCHIVED", archivedAt: now } : {}),
        ...(input.status === "active" ? { status: "ACTIVE", archivedAt: null } : {}),
      },
    });
    res.status(200).json({
      conversation: {
        id: updated.id,
        title: updated.title,
        status: updated.status.toLowerCase(),
        default_model_id: updated.defaultModelId,
        updated_at: updated.updatedAt.toISOString(),
      },
    });
  });

  router.delete("/conversations/:id", active, csrf, async (req, res) => {
    const id = z.string().uuid().parse(req.params.id);
    const result = await options.database.conversation.updateMany({
      where: { id, userId: req.auth!.userId, deletedAt: null },
      data: { status: "DELETED", deletedAt: new Date() },
    });
    if (result.count === 0) throw new HttpError(404, "CONVERSATION_NOT_FOUND", "Conversation was not found.");
    res.status(204).end();
  });

  router.get("/conversations/:id/messages", active, async (req, res) => {
    const id = z.string().uuid().parse(req.params.id);
    const query = z.object({
      limit: z.coerce.number().int().min(1).max(100).default(50),
      cursor: z.string().uuid().optional(),
    }).strict().parse(req.query);
    const exists = await options.database.conversation.findFirst({
      where: { id, userId: req.auth!.userId, deletedAt: null },
      select: { id: true },
    });
    if (!exists) throw new HttpError(404, "CONVERSATION_NOT_FOUND", "Conversation was not found.");
    const rows = await options.database.chatMessage.findMany({
      where: { conversationId: id, deletedAt: null },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: query.limit + 1,
      ...(query.cursor ? { cursor: { id: query.cursor }, skip: 1 } : {}),
      include: { attachments: { select: safeAttachmentSelect } },
    });
    const hasMore = rows.length > query.limit;
    const page = hasMore ? rows.slice(0, query.limit) : rows;
    res.status(200).json({
      data: page.map(publicMessage),
      next_cursor: hasMore ? page.at(-1)?.id ?? null : null,
    });
  });

  router.post("/conversations/:id/messages", active, csrf, async (req, res) => {
    const id = z.string().uuid().parse(req.params.id);
    const input = messageSchema.parse(req.body);
    const text = input.text?.trim() ?? "";
    if (!text && input.attachment_ids.length === 0) {
      throw new HttpError(400, "MESSAGE_EMPTY", "A message must contain text or a clean attachment.");
    }
    const headerKey = req.header("idempotency-key")?.trim() ?? req.requestId;
    if (headerKey.length < 8 || headerKey.length > 128) {
      throw new HttpError(400, "IDEMPOTENCY_KEY_INVALID", "Idempotency-Key must contain between 8 and 128 characters.");
    }
    const idempotencyKey = `${req.auth!.userId}:${id}:${headerKey}`;

    const existing = await options.database.chatMessage.findUnique({
      where: { idempotencyKey },
      include: { attachments: { select: safeAttachmentSelect } },
    });
    if (existing) {
      if (existing.conversationId !== id || existing.authorUserId !== req.auth!.userId) {
        throw new HttpError(409, "IDEMPOTENCY_KEY_CONFLICT", "This idempotency key was already used for another message.");
      }
      res.status(200).json({ message: publicMessage(existing), replayed: true });
      return;
    }

    const conversation = await options.database.conversation.findFirst({
      where: { id, userId: req.auth!.userId, status: "ACTIVE", deletedAt: null },
      select: { id: true },
    });
    if (!conversation) throw new HttpError(404, "CONVERSATION_NOT_FOUND", "Conversation was not found.");

    let attachments: Array<{ id: string; fileSize: bigint; status: string; scanVerdict: string | null }> = [];
    if (input.attachment_ids.length) {
      attachments = await options.database.fileAttachment.findMany({
        where: {
          id: { in: input.attachment_ids },
          userId: req.auth!.userId,
          deletedAt: null,
        },
        select: { id: true, fileSize: true, status: true, scanVerdict: true },
      });
      if (attachments.length !== input.attachment_ids.length) {
        throw new HttpError(404, "ATTACHMENT_NOT_FOUND", "One or more attachments were not found.");
      }
      if (attachments.some((item) => item.status !== "CLEAN" || item.scanVerdict !== "clean")) {
        throw new HttpError(423, "ATTACHMENT_QUARANTINED", "Attachments must pass malware scanning before use in a message.");
      }
      const aggregateSize = attachments.reduce((total, item) => total + item.fileSize, 0n);
      if (aggregateSize > 50n * 1024n * 1024n) {
        throw new HttpError(413, "MESSAGE_ATTACHMENTS_TOO_LARGE", "Combined message attachments may not exceed 50 MiB.");
      }
    }

    try {
      const message = await options.database.$transaction(async (tx) => {
        const created = await tx.chatMessage.create({
          data: {
            conversationId: id,
            authorUserId: req.auth!.userId,
            role: "USER",
            status: "COMPLETED",
            idempotencyKey,
            requestId: req.requestId,
            content: {
              text,
              attachment_ids: input.attachment_ids,
            },
            ...(input.attachment_ids.length ? {
              attachments: { connect: input.attachment_ids.map((attachmentId) => ({ id: attachmentId })) },
            } : {}),
            completedAt: new Date(),
          },
          include: { attachments: { select: safeAttachmentSelect } },
        });
        const now = new Date();
        await tx.conversation.update({
          where: { id },
          data: { lastMessageAt: now, updatedAt: now },
        });
        await tx.outboxEvent.create({
          data: {
            userId: req.auth!.userId,
            aggregateType: "conversation",
            aggregateId: id,
            eventType: "chat.message.created",
            schemaVersion: 1,
            idempotencyKey: `chat.message.created:${created.id}`,
            payloadSafe: {
              conversation_id: id,
              message_id: created.id,
              role: "user",
              occurred_at: now.toISOString(),
            },
            occurredAt: now,
            availableAt: now,
            publishedAt: now,
            expiresAt: new Date(now.getTime() + 24 * 60 * 60 * 1000),
          },
        });
        return created;
      }, { isolationLevel: "Serializable", timeout: 15_000 });
      res.status(201).json({ message: publicMessage(message), replayed: false });
    } catch (error) {
      if (error && typeof error === "object" && "code" in error && String((error as {code?:unknown}).code) === "P2002") {
        throw new HttpError(409, "IDEMPOTENCY_KEY_CONFLICT", "This idempotency key was already used.");
      }
      throw error;
    }
  });

  return router;
}
