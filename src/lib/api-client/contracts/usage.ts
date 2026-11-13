import type {
  ApiResult,
  DateRangeQuery,
  ISODateString,
  Page,
  PageQuery,
  RequestOptions,
} from "../types";
import type { RoutingMode } from "./catalog";

export type UsageMetric = "cost" | "requests" | "input-tokens" | "output-tokens";

export type UsageSource =
  | "website"
  | "ide"
  | "cli"
  | "api-key"
  | "chat"
  | "playground";

export type BillingStatus =
  | "reserved"
  | "settled"
  | "released"
  | "pending_reconciliation"
  | "refunded"
  | "failed_no_charge";

export interface UsageSummary {
  period: { from: ISODateString; to: ISODateString; timezone: "Asia/Jakarta" };
  totalSpend: number;
  totalRequests: number;
  inputTokens: number;
  cachedInputTokens: number;
  outputTokens: number;
  reasoningTokens: number | null;
  topUpTotal: number;
  availableBalance: number;
  reservedBalance: number;
  topModel: { modelId: string; name: string; colorHex: string } | null;
  bySource: Array<{ source: UsageSource; requests: number; cost: number }>;
  /** Demo aggregates are always provisional, never a settled billing figure. */
  provisional: true;
  simulated: true;
}

export interface UsageSeriesPoint {
  date: ISODateString;
  cost: number;
  requests: number;
  inputTokens: number;
  outputTokens: number;
}

export interface UsageSeries {
  metric: UsageMetric;
  points: UsageSeriesPoint[];
  simulated: true;
}

export interface UsageRequest {
  id: string;
  createdAt: ISODateString;
  modelId: string;
  modelName: string;
  developerName: string;
  endpointProvider: string | null;
  apiKeyLabel: string | null;
  source: UsageSource;
  inputTokens: number;
  cachedTokens: number;
  outputTokens: number;
  reasoningTokens: number | null;
  upstreamCostUsd: number | null;
  fxRateUsdIdr: number | null;
  markupPercent: number | null;
  totalDebitIdr: number | null;
  billingStatus: BillingStatus;
  routingPreference: RoutingMode | null;
  fallbackUsed: boolean | null;
  simulated: true;
}

export interface UsageRequestQuery extends PageQuery, DateRangeQuery {
  modelId?: string;
  source?: UsageSource;
  billingStatus?: BillingStatus;
}

export interface ModelColor {
  modelId: string;
  modelName: string;
  colorHex: string;
  assignedAt: ISODateString;
  source: "auto" | "manual";
  simulated: true;
}

export interface UsageService {
  getSummary(
    query?: DateRangeQuery,
    options?: RequestOptions,
  ): Promise<ApiResult<UsageSummary>>;
  getSeries(
    query: DateRangeQuery & { metric?: UsageMetric },
    options?: RequestOptions,
  ): Promise<ApiResult<UsageSeries>>;
  listRequests(
    query?: UsageRequestQuery,
    options?: RequestOptions,
  ): Promise<ApiResult<Page<UsageRequest>>>;
  listModelColors(options?: RequestOptions): Promise<ApiResult<ModelColor[]>>;
  updateModelColor(
    input: { modelId: string; colorHex: string },
    options?: RequestOptions,
  ): Promise<ApiResult<ModelColor>>;
}
