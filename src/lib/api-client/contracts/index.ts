import type { AdminService } from "./admin";
import type { ApiKeyService } from "./api-keys";
import type { AuthService } from "./auth";
import type { CatalogService } from "./catalog";
import type { ChatService } from "./chat";
import type { ContentService } from "./content";
import type { SettingsService } from "./settings";
import type { UsageService } from "./usage";
import type { WalletService } from "./wallet";

export * from "./admin";
export * from "./api-keys";
export * from "./auth";
export * from "./catalog";
export * from "./chat";
export * from "./content";
export * from "./settings";
export * from "./usage";
export * from "./wallet";

/**
 * The only surface UI code may import. Fixtures and simulation controls stay
 * behind this boundary under `src/lib/mock`.
 */
export interface ApiClient {
  auth: AuthService;
  catalog: CatalogService;
  wallet: WalletService;
  usage: UsageService;
  apiKeys: ApiKeyService;
  chat: ChatService;
  content: ContentService;
  settings: SettingsService;
  admin: AdminService;
}
