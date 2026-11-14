import express, { Router } from "express";
import { z } from "zod";
import type { FileService } from "../storage/file-service.js";
import { requireActiveAccount } from "../middleware/authorization.js";
import { requireCsrf } from "../middleware/csrf.js";
import { HttpError } from "../lib/http-error.js";
import "../auth/types.js";

function mapFileError(error: unknown): HttpError {
  const code = error instanceof Error ? error.message : "";
  const mapped: Record<string, { status: number; message: string }> = {
    FILE_SIZE_INVALID: { status: 413, message: "File must be between 1 byte and 20 MiB." },
    FILE_TYPE_NOT_ALLOWED: { status: 415, message: "This file type is not allowed." },
    FILE_CONTENT_MISMATCH: { status: 415, message: "File contents do not match the declared MIME type." },
    CONVERSATION_NOT_FOUND: { status: 404, message: "Conversation was not found." },
    FILE_NOT_FOUND: { status: 404, message: "File was not found." },
    FILE_NOT_CLEAN: { status: 423, message: "File is quarantined until malware scanning is complete." },
    FILE_INTEGRITY_FAILURE: { status: 500, message: "Stored file integrity verification failed." },
  };
  const found = mapped[code];
  return found
    ? new HttpError(found.status, code, found.message)
    : new HttpError(503, "FILE_STORAGE_UNAVAILABLE", "Private file storage is temporarily unavailable.");
}

export interface FileRouterOptions {
  files: FileService;
  csrfCookieName: string;
  allowedOrigins: string[];
}

export function createFileRouter(options: FileRouterOptions): Router {
  const router = Router();
  const active = requireActiveAccount();
  const csrf = requireCsrf({
    cookieName: options.csrfCookieName,
    allowedOrigins: options.allowedOrigins,
  });

  router.post(
    "/files",
    active,
    csrf,
    express.raw({ type: () => true, limit: "20mb" }),
    async (req, res) => {
      if (!Buffer.isBuffer(req.body)) {
        throw new HttpError(400, "FILE_BODY_REQUIRED", "Upload the file as a raw binary request body.");
      }
      const filename = req.header("x-file-name") ?? "upload";
      const mimeType = req.header("x-file-mime-type") ?? req.header("content-type") ?? "";
      const conversationId = req.header("x-conversation-id");
      try {
        const file = await options.files.upload({
          userId: req.auth!.userId,
          originalFilename: filename,
          mimeType,
          bytes: req.body,
          ...(conversationId ? { conversationId: z.string().uuid().parse(conversationId) } : {}),
        });
        res.status(file.status === "CLEAN" ? 201 : 202).json({
          file: {
            id: file.id,
            filename: file.originalFilename,
            mime_type: file.mimeType,
            size_bytes: file.fileSize.toString(),
            sha256: file.sha256,
            status: file.status.toLowerCase(),
            scan_verdict: file.scanVerdict,
            created_at: file.createdAt.toISOString(),
          },
        });
      } catch (error) {
        throw mapFileError(error);
      }
    },
  );

  router.get("/files", active, async (req, res) => {
    const query = z.object({
      limit: z.coerce.number().int().min(1).max(100).default(50),
      status: z.enum(["quarantined", "clean", "rejected", "deleted"]).optional(),
    }).strict().parse(req.query);
    const rows = await options.files.list(
      req.auth!.userId,
      query.limit,
      query.status?.toUpperCase() as "QUARANTINED" | "CLEAN" | "REJECTED" | "DELETED" | undefined,
    );
    res.status(200).json({
      data: rows.map((file) => ({
        id: file.id,
        filename: file.originalFilename,
        mime_type: file.mimeType,
        size_bytes: file.fileSize.toString(),
        status: file.status.toLowerCase(),
        scan_verdict: file.scanVerdict,
        created_at: file.createdAt.toISOString(),
      })),
    });
  });

  router.get("/files/:id", active, async (req, res) => {
    const id = z.string().uuid().parse(req.params.id);
    try {
      const { record, bytes } = await options.files.getDownload(req.auth!.userId, id);
      res.status(200);
      res.setHeader("content-type", record.mimeType);
      res.setHeader("content-length", bytes.byteLength.toString());
      res.setHeader("content-disposition", `attachment; filename*=UTF-8''${encodeURIComponent(record.safeFilename)}`);
      res.setHeader("x-content-type-options", "nosniff");
      res.setHeader("cache-control", "private, no-store");
      res.send(bytes);
    } catch (error) {
      throw mapFileError(error);
    }
  });

  router.delete("/files/:id", active, csrf, async (req, res) => {
    const id = z.string().uuid().parse(req.params.id);
    try {
      await options.files.delete(req.auth!.userId, id);
      res.status(204).end();
    } catch (error) {
      throw mapFileError(error);
    }
  });

  return router;
}
