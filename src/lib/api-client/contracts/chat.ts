import type {
  ApiErrorShape,
  ApiResult,
  ISODateString,
  RequestOptions,
} from "../types";
import type { RoutingMode } from "./catalog";

export type ChatMode = "general" | "coding";

export type ChatRole = "user" | "assistant" | "system";

export type ChatRequestStatus =
  | "queued"
  | "running"
  | "completed"
  | "failed"
  | "cancelled"
  | "interrupted"
  | "pending_reconciliation";

export interface ChatMessage {
  id: string;
  role: ChatRole;
  content: string;
  createdAt: ISODateString;
  status: ChatRequestStatus;
  modelId: string | null;
  inputTokens: number | null;
  outputTokens: number | null;
  estimatedCostIdr: number | null;
  simulated: true;
}

export interface ChatConversationSummary {
  id: string;
  title: string;
  mode: ChatMode;
  modelId: string;
  archived: boolean;
  createdAt: ISODateString;
  updatedAt: ISODateString;
  simulated: true;
}

export interface ChatConversation extends ChatConversationSummary {
  messages: ChatMessage[];
}

export interface SendMessageInput {
  conversationId: string;
  content: string;
  modelId?: string;
  routingMode?: RoutingMode;
}

export type ChatStreamEvent =
  | {
      type: "start";
      requestId: string;
      conversationId: string;
      messageId: string;
    }
  | { type: "delta"; requestId: string; text: string }
  | {
      type: "usage";
      requestId: string;
      inputTokens: number;
      outputTokens: number;
      estimatedCostIdr: number;
      provisional: true;
    }
  | { type: "done"; requestId: string; message: ChatMessage }
  | { type: "cancelled"; requestId: string }
  | {
      type: "interrupted";
      requestId: string;
      retryable: true;
      message: string;
    }
  | { type: "error"; requestId: string; error: ApiErrorShape };

export interface ChatService {
  listConversations(
    options?: RequestOptions,
  ): Promise<ApiResult<ChatConversationSummary[]>>;
  getConversation(
    id: string,
    options?: RequestOptions,
  ): Promise<ApiResult<ChatConversation>>;
  createConversation(
    input: { title?: string; mode: ChatMode; modelId: string },
    options?: RequestOptions,
  ): Promise<ApiResult<ChatConversation>>;
  renameConversation(
    id: string,
    title: string,
    options?: RequestOptions,
  ): Promise<ApiResult<ChatConversationSummary>>;
  archiveConversation(
    id: string,
    archived: boolean,
    options?: RequestOptions,
  ): Promise<ApiResult<ChatConversationSummary>>;
  deleteConversation(
    id: string,
    options?: RequestOptions,
  ): Promise<ApiResult<{ id: string; deleted: true }>>;
  sendMessage(
    input: SendMessageInput,
    options?: RequestOptions,
  ): Promise<ApiResult<ChatMessage>>;
  /**
   * Deterministic local stream. Cancellation uses `options.signal`.
   * Terminal events are `done`, `cancelled`, `interrupted`, or `error`.
   */
  streamMessage(
    input: SendMessageInput,
    options?: RequestOptions,
  ): AsyncIterable<ChatStreamEvent>;
}
