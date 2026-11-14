import { createHash, randomUUID } from "node:crypto";
import type { DatabaseClient } from "@azalea-router/database";
import type { PrivateObjectStorage } from "./private-object-storage.js";
import type { FileScanner } from "./file-scanner.js";

export const MAX_FILE_BYTES = 20 * 1024 * 1024;

const allowedMimeTypes = new Set([
  "application/pdf",
  "application/json",
  "text/plain",
  "text/markdown",
  "text/csv",
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
]);

function detectMime(bytes: Buffer, declared: string): boolean {
  switch (declared) {
    case "application/pdf":
      return bytes.subarray(0, 5).toString("ascii") === "%PDF-";
    case "image/png":
      return bytes.subarray(0, 8).equals(Buffer.from([137,80,78,71,13,10,26,10]));
    case "image/jpeg":
      return bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
    case "image/webp":
      return bytes.subarray(0, 4).toString("ascii") === "RIFF" &&
        bytes.subarray(8, 12).toString("ascii") === "WEBP";
    case "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
      return bytes.subarray(0, 4).equals(Buffer.from([0x50,0x4b,0x03,0x04]));
    case "application/json":
    case "text/plain":
    case "text/markdown":
    case "text/csv":
      if (bytes.includes(0)) return false;
      try {
        new TextDecoder("utf-8", { fatal: true }).decode(bytes);
        if (declared === "application/json") JSON.parse(bytes.toString("utf8"));
        return true;
      } catch {
        return false;
      }
    default:
      return false;
  }
}

export function sanitizeOriginalFilename(value: string): string {
  const last = value.replaceAll("\\", "/").split("/").at(-1) ?? "upload";
  const normalized = last.normalize("NFKC")
    .replace(/[\u0000-\u001f\u007f]/g, "")
    .replace(/[^\p{L}\p{N}._ -]/gu, "_")
    .trim()
    .slice(0, 255);
  return normalized || "upload";
}

export interface FileUploadInput {
  userId: string;
  originalFilename: string;
  mimeType: string;
  bytes: Buffer;
  conversationId?: string;
}

export class FileService {
  constructor(
    private readonly database: DatabaseClient,
    private readonly storage: PrivateObjectStorage,
    private readonly scanner: FileScanner,
  ) {}

  async upload(input: FileUploadInput) {
    if (!input.bytes.length || input.bytes.length > MAX_FILE_BYTES) throw new Error("FILE_SIZE_INVALID");
    const mimeType = input.mimeType.toLowerCase().split(";")[0]!.trim();
    if (!allowedMimeTypes.has(mimeType)) throw new Error("FILE_TYPE_NOT_ALLOWED");
    if (!detectMime(input.bytes, mimeType)) throw new Error("FILE_CONTENT_MISMATCH");

    if (input.conversationId) {
      const conversation = await this.database.conversation.findFirst({
        where: { id: input.conversationId, userId: input.userId, deletedAt: null, status: "ACTIVE" },
        select: { id: true },
      });
      if (!conversation) throw new Error("CONVERSATION_NOT_FOUND");
    }

    const digest = createHash("sha256").update(input.bytes).digest("hex");
    const stored = await this.storage.put(input.bytes);
    const scanned = await this.scanner.scan({
      bytes: input.bytes,
      mimeType,
      sha256: digest,
    });
    const status = scanned.verdict === "clean"
      ? "CLEAN"
      : scanned.verdict === "malicious"
        ? "REJECTED"
        : "QUARANTINED";

    try {
      const row = await this.database.fileAttachment.create({
        data: {
          id: randomUUID(),
          userId: input.userId,
          ...(input.conversationId ? { conversationId: input.conversationId } : {}),
          originalFilename: sanitizeOriginalFilename(input.originalFilename),
          safeFilename: `${randomUUID()}.${mimeType === "application/pdf" ? "pdf" :
            mimeType === "image/png" ? "png" : mimeType === "image/jpeg" ? "jpg" :
            mimeType === "image/webp" ? "webp" :
            mimeType === "application/json" ? "json" :
            mimeType === "text/markdown" ? "md" :
            mimeType === "text/csv" ? "csv" :
            mimeType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ? "docx" : "txt"}`,
          mimeType,
          fileSize: BigInt(stored.size),
          sha256: digest,
          storageKey: stored.key,
          status,
          scanEngine: scanned.engine,
          scanVerdict: scanned.verdict,
          ...(scanned.verdict === "unknown" ? {} : { scanCompletedAt: new Date() }),
        },
        select: {
          id: true,
          originalFilename: true,
          mimeType: true,
          fileSize: true,
          sha256: true,
          status: true,
          scanEngine: true,
          scanVerdict: true,
          createdAt: true,
        },
      });
      return row;
    } catch (error) {
      await this.storage.delete(stored.key).catch(() => undefined);
      throw error;
    }
  }

  async list(userId: string, limit: number, status?: "QUARANTINED" | "CLEAN" | "REJECTED" | "DELETED") {
    return this.database.fileAttachment.findMany({
      where: {
        userId,
        deletedAt: null,
        ...(status ? { status } : {}),
      },
      orderBy: { createdAt: "desc" },
      take: limit,
      select: {
        id: true,
        originalFilename: true,
        mimeType: true,
        fileSize: true,
        status: true,
        scanVerdict: true,
        createdAt: true,
      },
    });
  }

  async getDownload(userId: string, attachmentId: string) {
    const record = await this.database.fileAttachment.findFirst({
      where: { id: attachmentId, userId, deletedAt: null },
    });
    if (!record) throw new Error("FILE_NOT_FOUND");
    if (record.status !== "CLEAN" || record.scanVerdict !== "clean") throw new Error("FILE_NOT_CLEAN");
    const bytes = await this.storage.get(record.storageKey);
    if (bytes.byteLength !== Number(record.fileSize)) throw new Error("FILE_INTEGRITY_FAILURE");
    const digest = createHash("sha256").update(bytes).digest("hex");
    if (digest !== record.sha256) throw new Error("FILE_INTEGRITY_FAILURE");
    return { record, bytes };
  }

  async delete(userId: string, attachmentId: string) {
    const record = await this.database.fileAttachment.findFirst({
      where: { id: attachmentId, userId, deletedAt: null },
    });
    if (!record) throw new Error("FILE_NOT_FOUND");
    await this.database.fileAttachment.update({
      where: { id: record.id },
      data: { status: "DELETED", deletedAt: new Date() },
    });
    await this.storage.delete(record.storageKey);
  }
}
