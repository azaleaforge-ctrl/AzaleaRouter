import type { ApiResult, ISODateString, RequestOptions } from "../types";

export type ApiKeyStatus = "active" | "revoked" | "expired";

export interface ApiKey {
  id: string;
  label: string;
  /** Masked representation only. The full secret is never stored in this shape. */
  maskedKey: string;
  status: ApiKeyStatus;
  scopes: string[];
  spendLimitIdr: number | null;
  rateLimitPerMinute: number | null;
  modelAllowlist: string[];
  lastUsedAt: ISODateString | null;
  createdAt: ISODateString;
  revokedAt: ISODateString | null;
  expiresAt: ISODateString | null;
  simulated: true;
}

export interface ApiKeyCreateInput {
  label: string;
  scopes?: string[];
  spendLimitIdr?: number | null;
  rateLimitPerMinute?: number | null;
  modelAllowlist?: string[];
  expiresAt?: string | null;
}

export interface ApiKeySecretReveal {
  key: ApiKey;
  /** Visibly fake token. It cannot authenticate against any real service. */
  secret: string;
  tokenUsable: false;
  tokenKind: "demo-non-usable";
  revealOnce: true;
  warning: string;
}

export interface ApiKeyService {
  list(options?: RequestOptions): Promise<ApiResult<ApiKey[]>>;
  create(
    input: ApiKeyCreateInput,
    options?: RequestOptions,
  ): Promise<ApiResult<ApiKeySecretReveal>>;
  revoke(id: string, options?: RequestOptions): Promise<ApiResult<ApiKey>>;
  rotate(
    id: string,
    options?: RequestOptions,
  ): Promise<ApiResult<ApiKeySecretReveal>>;
}
