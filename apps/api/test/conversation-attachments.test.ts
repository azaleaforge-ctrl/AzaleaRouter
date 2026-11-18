import assert from "node:assert/strict";
import test from "node:test";
import type { DatabaseClient } from "@azalea-router/database";
import { HttpError } from "../src/lib/http-error.js";
import { lockAndValidateMessageAttachments } from "../src/routes/conversation-attachments.js";

const userId = "00000000-0000-4000-8000-000000000001";
const conversationId = "00000000-0000-4000-8000-000000000002";
const attachmentA = "00000000-0000-4000-8000-00000000000a";
const attachmentB = "00000000-0000-4000-8000-00000000000b";

function fakeTransaction(attachments: Array<{
  id: string;
  conversationId: string | null;
  fileSize: bigint;
  status: string;
  scanVerdict: string | null;
}>) {
  const lockedIds: string[] = [];
  const findArgs: unknown[] = [];
  const updateArgs: unknown[] = [];
  const tx = {
    $queryRaw: async <T = unknown>(_strings: TemplateStringsArray, ...values: unknown[]) => {
      lockedIds.push(String(values[0]));
      return [] as unknown as T;
    },
    fileAttachment: {
      findMany: async (args: unknown) => {
        findArgs.push(args);
        return attachments;
      },
      updateMany: async (args: unknown) => {
        updateArgs.push(args);
        const where = args as { where?: { id?: { in?: string[] } } };
        return { count: where.where?.id?.in?.length ?? 0 };
      },
    },
  } as unknown as Pick<DatabaseClient, "$queryRaw" | "fileAttachment">;

  return { tx, lockedIds, findArgs, updateArgs };
}

test("attachment validation locks rows in stable order and assigns unbound files to the conversation", async () => {
  const fake = fakeTransaction([
    { id: attachmentB, conversationId: null, fileSize: 2n, status: "CLEAN", scanVerdict: "clean" },
    { id: attachmentA, conversationId, fileSize: 3n, status: "CLEAN", scanVerdict: "clean" },
  ]);

  const rows = await lockAndValidateMessageAttachments(fake.tx, {
    userId,
    conversationId,
    attachmentIds: [attachmentB, attachmentA],
  });

  assert.equal(rows.length, 2);
  assert.deepEqual(fake.lockedIds, [attachmentA, attachmentB]);
  assert.equal(fake.findArgs.length, 1);
  assert.equal(fake.updateArgs.length, 1);
  assert.deepEqual(fake.updateArgs[0], {
    where: {
      id: { in: [attachmentB] },
      userId,
      deletedAt: null,
      messageId: null,
      conversationId: null,
    },
    data: { conversationId },
  });
});

test("attachment validation rejects files that are already linked or outside the owner scope", async () => {
  const fake = fakeTransaction([]);
  await assert.rejects(
    lockAndValidateMessageAttachments(fake.tx, {
      userId,
      conversationId,
      attachmentIds: [attachmentA],
    }),
    (error: unknown) => error instanceof HttpError && error.statusCode === 404 && error.code === "ATTACHMENT_NOT_FOUND",
  );
  assert.equal(fake.updateArgs.length, 0);
});

test("attachment validation keeps quarantined files unavailable", async () => {
  const fake = fakeTransaction([
    { id: attachmentA, conversationId: null, fileSize: 1n, status: "QUARANTINED", scanVerdict: null },
  ]);
  await assert.rejects(
    lockAndValidateMessageAttachments(fake.tx, {
      userId,
      conversationId,
      attachmentIds: [attachmentA],
    }),
    (error: unknown) => error instanceof HttpError && error.statusCode === 423 && error.code === "ATTACHMENT_QUARANTINED",
  );
  assert.equal(fake.updateArgs.length, 0);
});

test("attachment validation enforces the 50 MiB aggregate limit", async () => {
  const fake = fakeTransaction([
    { id: attachmentA, conversationId: null, fileSize: 50n * 1024n * 1024n + 1n, status: "CLEAN", scanVerdict: "clean" },
  ]);
  await assert.rejects(
    lockAndValidateMessageAttachments(fake.tx, {
      userId,
      conversationId,
      attachmentIds: [attachmentA],
    }),
    (error: unknown) => error instanceof HttpError && error.statusCode === 413 && error.code === "MESSAGE_ATTACHMENTS_TOO_LARGE",
  );
  assert.equal(fake.updateArgs.length, 0);
});
