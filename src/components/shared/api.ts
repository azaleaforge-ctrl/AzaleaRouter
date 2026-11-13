/**
 * Single import seam for the typed API client (owned by `src/lib/api-client`).
 *
 * UI code must never import fixtures or mock internals — only this client.
 *
 * INTEGRATION NOTE: the client currently publishes its service contracts
 * (`ApiClient` interface, per-domain services, `ApiResult`, formatters).
 * The runtime instance is expected to be exported as `api` from
 * `@/lib/api-client`. If the instance export is named differently, change
 * ONLY this file — every component imports `api` from here.
 */
import { api } from "@/lib/api-client";

export { api };
export type { ApiClient } from "@/lib/api-client";
