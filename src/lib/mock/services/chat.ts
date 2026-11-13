import type {
  ChatConversation,
  ChatConversationSummary,
  ChatService,
  ChatStreamEvent,
} from "@/lib/api-client/contracts/chat";
import { estimateTokens } from "@/lib/formatters/tokens";
import { createError } from "@/lib/api-client/errors";
import type { MockContext } from "../context";
import { DEMO_CHAT_REPLIES, DEMO_CONVERSATIONS } from "../fixtures/chat";
import { delay, deterministicId, fail, respond } from "../scenarios";

function toSummary(conversation: ChatConversation): ChatConversationSummary {
  return {
    id: conversation.id,
    title: conversation.title,
    mode: conversation.mode,
    modelId: conversation.modelId,
    archived: conversation.archived,
    createdAt: conversation.createdAt,
    updatedAt: conversation.updatedAt,
    simulated: true,
  };
}

function findConversation(id: string): ChatConversation | undefined {
  return DEMO_CONVERSATIONS.find((conversation) => conversation.id === id);
}

function chunkText(text: string, size: number): string[] {
  const chunks: string[] = [];
  for (let index = 0; index < text.length; index += size) {
    chunks.push(text.slice(index, index + size));
  }
  return chunks;
}

export function createChatService(ctx: MockContext): ChatService {
  return {
    async listConversations(options) {
      return respond(ctx, options, (meta) =>
        meta.scenario === "empty"
          ? []
          : DEMO_CONVERSATIONS.map(toSummary),
      );
    },

    async getConversation(id, options) {
      const scenario = options?.scenario ?? ctx.scenario;
      const conversation = findConversation(id);
      if (scenario === "empty" || !conversation) {
        return fail(ctx, options, "NOT_FOUND");
      }
      return respond(ctx, options, () => conversation);
    },

    async createConversation(input, options) {
      return respond(ctx, options, (meta) => {
        const id = deterministicId(
          "CONV",
          `${input.mode}:${input.modelId}:${input.title ?? ""}:${meta.generatedAt}`,
        );
        return {
          id,
          title: input.title?.trim() || "Percakapan demo baru",
          mode: input.mode,
          modelId: input.modelId,
          archived: false,
          createdAt: meta.generatedAt,
          updatedAt: meta.generatedAt,
          messages: [],
          simulated: true as const,
        };
      });
    },

    async renameConversation(id, title, options) {
      const conversation = findConversation(id);
      if (!conversation) {
        return fail(ctx, options, "NOT_FOUND");
      }
      return respond(ctx, options, (meta) => ({
        ...toSummary(conversation),
        title: title.trim() || conversation.title,
        updatedAt: meta.generatedAt,
      }));
    },

    async archiveConversation(id, archived, options) {
      const conversation = findConversation(id);
      if (!conversation) {
        return fail(ctx, options, "NOT_FOUND");
      }
      return respond(ctx, options, (meta) => ({
        ...toSummary(conversation),
        archived,
        updatedAt: meta.generatedAt,
      }));
    },

    async deleteConversation(id, options) {
      const conversation = findConversation(id);
      if (!conversation) {
        return fail(ctx, options, "NOT_FOUND");
      }
      return respond(ctx, options, () => ({ id, deleted: true as const }));
    },

    async sendMessage(input, options) {
      const conversation = findConversation(input.conversationId);
      if (!conversation) {
        return fail(ctx, options, "NOT_FOUND");
      }

      return respond(ctx, options, (meta) => {
        const reply = DEMO_CHAT_REPLIES[conversation.mode];
        const inputTokens = estimateTokens(input.content);
        const outputTokens = estimateTokens(reply);
        return {
          id: deterministicId(
            "MSG",
            `${input.conversationId}:${input.content}:${meta.generatedAt}`,
          ),
          role: "assistant" as const,
          content: reply,
          createdAt: meta.generatedAt,
          status: "completed" as const,
          modelId: input.modelId ?? conversation.modelId,
          inputTokens,
          outputTokens,
          estimatedCostIdr: Math.max(1, Math.round(outputTokens * 0.5)),
          simulated: true as const,
        };
      });
    },

    async *streamMessage(input, options): AsyncIterable<ChatStreamEvent> {
      const scenario = options?.scenario ?? ctx.scenario;
      const now = ctx.now();
      const requestId = deterministicId(
        "REQ",
        `${input.conversationId}:${input.content}:${now.toISOString()}`,
      );
      const messageId = deterministicId("MSG", requestId);
      const conversation = findConversation(input.conversationId);

      if (scenario === "empty" || !conversation) {
        yield {
          type: "error",
          requestId,
          error: createError("NOT_FOUND", { requestId }),
        };
        return;
      }

      if (scenario === "error") {
        yield {
          type: "error",
          requestId,
          error: createError("UPSTREAM_UNAVAILABLE", { requestId }),
        };
        return;
      }

      if (scenario === "offline") {
        yield {
          type: "error",
          requestId,
          error: createError("OFFLINE", { requestId }),
        };
        return;
      }

      if (options?.signal?.aborted) {
        yield { type: "cancelled", requestId };
        return;
      }

      yield {
        type: "start",
        requestId,
        conversationId: input.conversationId,
        messageId,
      };

      const reply = DEMO_CHAT_REPLIES[conversation.mode];
      const chunks = chunkText(reply, 28);
      const interruptAt =
        scenario === "stream-interrupted" ? 2 : chunks.length;

      for (let index = 0; index < chunks.length; index += 1) {
        if (options?.signal?.aborted) {
          yield { type: "cancelled", requestId };
          return;
        }

        if (index >= interruptAt) {
          yield {
            type: "interrupted",
            requestId,
            retryable: true,
            message:
              "Stream demo terputus. Tidak ada retry otomatis; pengguna dapat mencoba lagi secara manual.",
          };
          return;
        }

        await delay(ctx.streamChunkDelayMs, options?.signal);

        if (options?.signal?.aborted) {
          yield { type: "cancelled", requestId };
          return;
        }

        yield { type: "delta", requestId, text: chunks[index] ?? "" };
      }

      const inputTokens = estimateTokens(input.content);
      const outputTokens = estimateTokens(reply);
      const estimatedCostIdr = Math.max(1, Math.round(outputTokens * 0.5));

      yield {
        type: "usage",
        requestId,
        inputTokens,
        outputTokens,
        estimatedCostIdr,
        provisional: true,
      };

      yield {
        type: "done",
        requestId,
        message: {
          id: messageId,
          role: "assistant",
          content: reply,
          createdAt: now.toISOString(),
          status: "completed",
          modelId: input.modelId ?? conversation.modelId,
          inputTokens,
          outputTokens,
          estimatedCostIdr,
          simulated: true,
        },
      };
    },
  };
}
