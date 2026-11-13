import type { ApiClient } from "./contracts";
import type { DemoScenario } from "./types";
import { createMockApiClient, type MockConfig } from "@/lib/mock";

export * from "./contracts";
export * from "./errors";
export * from "./types";

export type ApiAdapterKind = "mock";

export interface ApiClientConfig extends MockConfig {
  adapter?: ApiAdapterKind;
}

/**
 * Builds the configured adapter. Only the mock adapter exists in FE-0; a future
 * backend adapter must implement the same `ApiClient` interface.
 */
export function createApiClient(config: ApiClientConfig = {}): ApiClient {
  const adapter = config.adapter ?? "mock";
  if (adapter !== "mock") {
    throw new Error(`Unsupported API adapter: ${adapter}`);
  }
  return createMockApiClient(config);
}

const envAdapter = process.env
  .NEXT_PUBLIC_AZALEA_API_ADAPTER as ApiAdapterKind | undefined;
const envScenario = process.env
  .NEXT_PUBLIC_AZALEA_DEMO_SCENARIO as DemoScenario | undefined;

/**
 * The single import surface for UI code:
 *
 *   import { apiClient } from "@/lib/api-client";
 *   const result = await apiClient.catalog.list({ search: "azalea" });
 */
export const apiClient: ApiClient = createApiClient({
  adapter: envAdapter ?? "mock",
  scenario: envScenario ?? "normal",
});

/**
 * Compatibility alias for the shared UI seam. Both names point at the same
 * configured adapter; new code should prefer `apiClient`.
 */
export const api: ApiClient = apiClient;
