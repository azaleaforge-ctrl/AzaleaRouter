export interface GatewayMessage {
  role: "system" | "developer" | "user" | "assistant" | "tool";
  content: string | Array<{ type: string; [key: string]: unknown }>;
  name?: string;
  tool_call_id?: string;
}

export interface GatewayCompletionInput {
  model: string;
  messages: GatewayMessage[];
  max_tokens?: number;
  temperature?: number;
  top_p?: number;
  stop?: string | string[];
  stream: boolean;
  providerSlug: string;
}

export interface GatewayProviderAdapter {
  complete(input: GatewayCompletionInput, signal?: AbortSignal): Promise<Response>;
  stream(input: GatewayCompletionInput, signal?: AbortSignal): Promise<Response>;
}
