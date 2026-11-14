import {
  openRouterEndpointResponseSchema,
  openRouterModelsResponseSchema,
  type OpenRouterEndpoint,
  type OpenRouterModel,
} from "./schemas.js";

export class CatalogSourceError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly retryable: boolean,
  ) {
    super(message);
    this.name = "CatalogSourceError";
  }
}

export interface OpenRouterCatalogClientOptions {
  apiKey: string;
  baseUrl?: string;
  timeoutMs?: number;
  fetchImpl?: typeof fetch;
  pageSize?: number;
}

export class OpenRouterCatalogClient {
  private readonly baseUrl: string;
  private readonly fetchImpl: typeof fetch;
  private readonly timeoutMs: number;
  private readonly pageSize: number;

  constructor(private readonly options: OpenRouterCatalogClientOptions) {
    this.baseUrl = (options.baseUrl ?? "https://openrouter.ai/api/v1").replace(/\/+$/, "");
    this.fetchImpl = options.fetchImpl ?? fetch;
    this.timeoutMs = options.timeoutMs ?? 20_000;
    this.pageSize = Math.min(Math.max(options.pageSize ?? 500, 1), 1000);
  }

  private async get(path: string): Promise<unknown> {
    let response: Response;
    try {
      response = await this.fetchImpl(`${this.baseUrl}${path}`, {
        method: "GET",
        headers: {
          authorization: `Bearer ${this.options.apiKey}`,
          accept: "application/json",
        },
        signal: AbortSignal.timeout(this.timeoutMs),
      });
    } catch {
      throw new CatalogSourceError("UPSTREAM_UNAVAILABLE", "Model catalog source is temporarily unavailable.", true);
    }

    if (!response.ok) {
      if (response.status === 401 || response.status === 403) {
        throw new CatalogSourceError("UPSTREAM_AUTH_REJECTED", "Model catalog source rejected the configured credential.", false);
      }
      if (response.status === 429 || response.status >= 500) {
        throw new CatalogSourceError("UPSTREAM_RETRYABLE", "Model catalog source returned a temporary error.", true);
      }
      throw new CatalogSourceError("UPSTREAM_RESPONSE_INVALID", "Model catalog source rejected the request.", false);
    }

    try {
      return await response.json();
    } catch {
      throw new CatalogSourceError("UPSTREAM_RESPONSE_INVALID", "Model catalog source returned invalid JSON.", false);
    }
  }

  async listChatModels(): Promise<OpenRouterModel[]> {
    const models: OpenRouterModel[] = [];
    let offset = 0;

    for (let page = 0; page < 100; page += 1) {
      const query = new URLSearchParams({
        offset: String(offset),
        limit: String(this.pageSize),
        output_modalities: "text",
        endpoints: "/api/v1/chat/completions",
      });
      const parsed = openRouterModelsResponseSchema.safeParse(
        await this.get(`/models?${query.toString()}`),
      );
      if (!parsed.success) {
        throw new CatalogSourceError("UPSTREAM_SCHEMA_INVALID", "Model catalog source schema did not match the expected contract.", false);
      }

      models.push(...parsed.data.data);
      if (parsed.data.data.length < this.pageSize) return models;
      offset += this.pageSize;
    }

    throw new CatalogSourceError("UPSTREAM_PAGINATION_LIMIT", "Model catalog pagination exceeded its safety limit.", false);
  }

  async listModelEndpoints(modelId: string): Promise<OpenRouterEndpoint[]> {
    const parts = modelId.split("/");
    if (parts.length !== 2 || parts.some((part) => !part || part === "." || part === "..")) {
      throw new CatalogSourceError("MODEL_ID_INVALID", "Canonical model identifier is invalid.", false);
    }

    const path = `/models/${encodeURIComponent(parts[0]!)}/${encodeURIComponent(parts[1]!)}/endpoints`;
    const parsed = openRouterEndpointResponseSchema.safeParse(await this.get(path));
    if (!parsed.success) {
      throw new CatalogSourceError("UPSTREAM_SCHEMA_INVALID", "Model endpoint source schema did not match the expected contract.", false);
    }
    return parsed.data.data.endpoints;
  }
}
