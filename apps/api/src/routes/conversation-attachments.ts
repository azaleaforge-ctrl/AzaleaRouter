import type { DatabaseClient } from "@azalea-router/database";
import { HttpError } from "../lib/http-error.js";

type AttachmentTransaction = Pick<DatabaseClient, "$queryRaw" | "fileAttachment">;

/**
 * Lock attachment rows in deterministic order, then validate that every file is
 * owned by this user, belongs to this conversation (or is not yet assigned),
 * has not already been attached to a message, and passed malware scanning.
 *
 * The row locks prevent two concurrent message requests from reassigning the
 * same one-to-one FileAttachment.messageId relation.
 */
export async function lockAndValidateMessageAttachments(
  tx: AttachmentTransaction,
  input: {
    userId: string;
    conversationId: string;
    attachmentIds: string[];
  },
) {
  const ids = [...input.attachmentIds].sort();

  for (const attachmentId of ids) {
    await tx.$queryRaw<Array<{ id: string }>>`
      SELECT "id"
      FROM "file_attachments"
      WHERE "id" = ${attachmentId}::uuid
        AND "user_id" = ${input.userId}::uuid
      FOR UPDATE
    `;
  }

  const attachments = await tx.fileAttachment.findMany({
    where: {
      id: { in: ids },
      userId: input.userId,
      deletedAt: null,
      messageId: null,
      OR: [{ conversationId: null }, { conversationId: input.conversationId }],
    },
    select: {
      id: true,
      conversationId: true,
      fileSize: true,
      status: true,
      scanVerdict: true,
    },
  });

  if (attachments.length !== ids.length) {
    // Deliberately do not distinguish missing, foreign-owned, already-attached,
    // or cross-conversation files; that would create an ownership oracle.
    throw new HttpError(404, "ATTACHMENT_NOT_FOUND", "One or more attachments were not found.");
  }

  if (attachments.some((item) => item.status !== "CLEAN" || item.scanVerdict !== "clean")) {
    throw new HttpError(423, "ATTACHMENT_QUARANTINED", "Attachments must pass malware scanning before use in a message.");
  }

  const aggregateSize = attachments.reduce((total, item) => total + item.fileSize, 0n);
  if (aggregateSize > 50n * 1024n * 1024n) {
    throw new HttpError(413, "MESSAGE_ATTACHMENTS_TOO_LARGE", "Combined message attachments may not exceed 50 MiB.");
  }

  const unassignedIds = attachments.filter((item) => item.conversationId === null).map((item) => item.id);
  if (unassignedIds.length > 0) {
    const updated = await tx.fileAttachment.updateMany({
      where: {
        id: { in: unassignedIds },
        userId: input.userId,
        deletedAt: null,
        messageId: null,
        conversationId: null,
      },
      data: { conversationId: input.conversationId },
    });
    if (updated.count !== unassignedIds.length) {
      throw new HttpError(409, "ATTACHMENT_CONFLICT", "One or more attachments are no longer available.");
    }
  }

  return attachments;
}
