import type {
  ApiResult,
  ISODateString,
  Page,
  PageQuery,
  RequestOptions,
} from "../types";

export type ModelStatus = "available" | "limited" | "deprecated" | "unavailable";

export type ModelCategory =
  | "coding"
  | "general"
  | "reasoning"
  | "vision"
  | "audio"
  | "embeddings"
  | "specialist";

export type ModelCapability =
  | "streaming"
  | "tool-calling"
  | "vision"
  | "structured-output"
  | "reasoning"
  | "audio-input"
  | "embeddings";

export type RoutingMode =
  | "auto"
  | "cheapest"
  | "fastest"
  | "lowest-latency"
  | "specific-provider"
  | "provider-priority"
  | "fallback";

export interface ModelDeveloper {
  id: string;
  name: string;
  logoInitials: string;
  verified: boolean;
}

export interface ModelPricing {
  currency: "USD";
  unit: "per_1m_tokens";
  inputPerMillion: number | null;
  outputPerMillion: number | null;
  cachedInputPerMillion: number | null;
  updatedAt: ISODateString;
  snapshotId: string;
}

export interface ModelEndpoint {
  id: string;
  provider: string;
  status: "available" | "limited" | "unavailable";
  latencyMs: number | null;
  throughputTokensPerSecond: number | null;
  supportsStreaming: boolean;
  routingModes: RoutingMode[];
}

export interface ModelSummary {
  /** Canonical model ID. Aliases must not create a second entry. */
  id: string;
  slug: string;
  name: string;
  developer: ModelDeveloper;
  description: string;
  category: ModelCategory;
  capabilities: ModelCapability[];
  status: ModelStatus;
  contextWindow: number | null;
  maxOutputTokens: number | null;
  pricing: ModelPricing;
  isFree: boolean;
  isBudget: boolean;
  isPreview: boolean;
  popularityRank: number;
  updatedAt: ISODateString;
  demo: true;
}

export interface ModelDetail extends ModelSummary {
  useCases: string[];
  modalities: string[];
  tokenizer: string | null;
  endpoints: ModelEndpoint[];
  dataPolicy: string | null;
}

export interface CatalogQuery extends PageQuery {
  search?: string;
  category?: ModelCategory;
  developerId?: string;
  capability?: ModelCapability;
  maxInputPrice?: number;
  maxOutputPrice?: number;
  minContextWindow?: number;
  status?: ModelStatus;
  onlyAvailable?: boolean;
  sort?:
    | "relevance"
    | "name"
    | "input-price"
    | "output-price"
    | "context-window"
    | "popularity";
}

export interface CatalogFacets {
  categories: Array<{ value: ModelCategory; count: number }>;
  developers: Array<{ id: string; name: string; count: number }>;
  capabilities: Array<{ value: ModelCapability; count: number }>;
}

export interface CatalogListResult {
  page: Page<ModelSummary>;
  facets: CatalogFacets;
  totalCatalogSize: number;
  /** The demo fixture never satisfies the PRD's 50 validated-model launch rule. */
  launchReady: false;
}

export interface CatalogSearchResult {
  query: string;
  items: ModelSummary[];
  total: number;
}

export interface CatalogService {
  list(
    query?: CatalogQuery,
    options?: RequestOptions,
  ): Promise<ApiResult<CatalogListResult>>;
  featured(options?: RequestOptions): Promise<ApiResult<ModelSummary[]>>;
  getDetail(
    provider: string,
    model: string,
    options?: RequestOptions,
  ): Promise<ApiResult<ModelDetail>>;
  search(
    term: string,
    options?: RequestOptions,
  ): Promise<ApiResult<CatalogSearchResult>>;
}
