/**
 * Transport-level contract shared by every feature service.
 *
 * The demo adapter never throws for expected failures. It returns an
 * `ApiResult` union so UI code must handle loading, empty, error, offline,
 * stale, and success states explicitly.
 */

export const DEMO_DATA_NOTICE =
  "Data demo ilustratif — bukan katalog, harga, saldo, status, atau penawaran nyata." as const;

export type DemoScenario =
  | "normal"
  | "empty"
  | "delayed"
  | "error"
  | "offline"
  | "stale"
  | "stream-interrupted"
  | "reconnect";

export type ApiErrorCode =
  | "VALIDATION_ERROR"
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "CONFLICT"
  | "RATE_LIMITED"
  | "OFFLINE"
  | "UPSTREAM_UNAVAILABLE"
  | "STREAM_INTERRUPTED"
  | "CANCELLED"
  | "UNKNOWN";

export interface ApiErrorShape {
  code: ApiErrorCode;
  /** Safe, user-facing Indonesian message. Never contains a stack trace or secret. */
  message: string;
  requestId: string;
  retryable: boolean;
  fieldErrors?: Record<string, string>;
}

export interface ApiMeta {
  demo: true;
  source: "mock";
  scenario: DemoScenario;
  generatedAt: string;
  stale: boolean;
  connection: "live" | "reconnecting" | "offline";
  notice: typeof DEMO_DATA_NOTICE;
}

export interface ApiSuccess<T> {
  ok: true;
  data: T;
  meta: ApiMeta;
}

export interface ApiFailure {
  ok: false;
  error: ApiErrorShape;
  meta: ApiMeta;
}

export type ApiResult<T> = ApiSuccess<T> | ApiFailure;

export interface RequestOptions {
  signal?: AbortSignal;
  /** Per-call scenario override. Useful for demo controls and tests. */
  scenario?: DemoScenario;
}

export interface PageQuery {
  page?: number;
  pageSize?: number;
}

export interface Page<T> {
  items: T[];
  page: number;
  pageSize: number;
  total: number;
  hasMore: boolean;
}

export interface DateRangeQuery {
  /** Inclusive ISO date or timestamp. */
  from?: string;
  /** Inclusive ISO date or timestamp. */
  to?: string;
}

export type ISODateString = string;
