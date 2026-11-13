import type { GatewayCompletionInput, GatewayProviderAdapter } from "./provider-adapter.js";

export class OpenRouterProviderAdapter implements GatewayProviderAdapter {
  constructor(
    private readonly apiKey: string,
    private readonly options: {
      fetchImpl?: typeof fetch;
      timeoutMs?: number;
      baseUrl?: string;
    } = {},
  ) {
    if (!apiKey.trim()) throw new Error("UPSTREAM_CREDENTIAL_MISSING");
  }

  private async send(input: GatewayCompletionInput, stream: boolean, signal?: AbortSignal): Promise<Response> {
    const fetchImpl = this.options.fetchImpl ?? fetch;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.options.timeoutMs ?? 120_000);
    const abortFromCaller = () => controller.abort();
    signal?.addEventListener("abort", abortFromCaller, { once: true });

    try {
      const response = await fetchImpl(
        `${(this.options.baseUrl ?? "https://openrouter.ai/api/v1").replace(/\/+$/, "")}/chat/completions`,
        {
          method: "POST",
          headers: {
            authorization: `Bearer ${this.apiKey}`,
            "content-type": "application/json",
            accept: stream ? "text/event-stream" : "application/json",
          },
          body: JSON.stringify({
            model: input.model,
            messages: input.messages,
            ...(input.max_tokens === undefined ? {} : { max_tokens: input.max_tokens }),
            ...(input.temperature === undefined ? {} : { temperature: input.temperature }),
            ...(input.top_p === undefined ? {} : { top_p: input.top_p }),
            ...(input.stop === undefined ? {} : { stop: input.stop }),
            stream,
            ...(stream ? { stream_options: { include_usage: true } } : {}),
            provider: {
              order: [input.providerSlug],
              allow_fallbacks: false,
            },
          }),
          signal: controller.signal,
        },
      );
      if (!response.ok) {
        // Never return/log the upstream body because it may contain sensitive information.
        return new Response(
          JSON.stringify({
            error: {
              message: "Upstream model provider rejected the request.",
              type: "upstream_error",
              code: "UPSTREAM_REQUEST_FAILED",
            },
          }),
          {
            status: response.status === 429 ? 503 : 502,
            headers: { "content-type": "application/json" },
          },
        );
      }
      return response;
    } catch {
      return new Response(
        JSON.stringify({
          error: {
            message: "Upstream model provider is temporarily unavailable.",
            type: "upstream_error",
            code: "UPSTREAM_UNAVAILABLE",
          },
        }),
        {
          status: 503,
          headers: { "content-type": "application/json" },
        },
      );
    } finally {
      clearTimeout(timeout);
      signal?.removeEventListener("abort", abortFromCaller);
    }
  }

  complete(input: GatewayCompletionInput, signal?: AbortSignal): Promise<Response> {
    return this.send(input, false, signal);
  }

  stream(input: GatewayCompletionInput, signal?: AbortSignal): Promise<Response> {
    return this.send(input, true, signal);
  }
}
