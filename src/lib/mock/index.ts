import type { ApiClient } from "@/lib/api-client/contracts";
import { createMockContext, type MockConfig } from "./context";
import { createAdminService } from "./services/admin";
import { createApiKeyService } from "./services/api-keys";
import { createAuthService } from "./services/auth";
import { createCatalogService } from "./services/catalog";
import { createChatService } from "./services/chat";
import { createContentService } from "./services/content";
import { createSettingsService } from "./services/settings";
import { createUsageService } from "./services/usage";
import { createWalletService } from "./services/wallet";

export type { MockConfig } from "./context";

/**
 * Deterministic demo adapter. It never performs network I/O, never issues a
 * usable credential, and never persists a mutation.
 */
export function createMockApiClient(config: MockConfig = {}): ApiClient {
  const ctx = createMockContext(config);

  return {
    auth: createAuthService(ctx),
    catalog: createCatalogService(ctx),
    wallet: createWalletService(ctx),
    usage: createUsageService(ctx),
    apiKeys: createApiKeyService(ctx),
    chat: createChatService(ctx),
    content: createContentService(ctx),
    settings: createSettingsService(ctx),
    admin: createAdminService(ctx),
  };
}
