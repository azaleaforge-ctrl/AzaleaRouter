import type { DatabaseClient } from "@azalea-router/database";
import type { BackgroundJobResult } from "../../apps/worker/src/queue.js";
import { CatalogSyncService } from "./sync-service.js";
import { CatalogSourceError, OpenRouterCatalogClient } from "./openrouter-client.js";

export function createOpenRouterCatalogSyncHandler(
  database: DatabaseClient,
  options: { apiKey: string; maximumModels?: number; endpointConcurrency?: number },
): () => Promise<BackgroundJobResult> {
  const client = new OpenRouterCatalogClient({ apiKey: options.apiKey });
  const sync = new CatalogSyncService(database, client, {
    ...(options.maximumModels ? { maximumModels: options.maximumModels } : {}),
    ...(options.endpointConcurrency ? { endpointConcurrency: options.endpointConcurrency } : {}),
  });

  return async () => {
    try {
      const result = await sync.sync();
      return { ...result };
    } catch (error) {
      if (error instanceof CatalogSourceError) {
        // Do not propagate upstream response body, credentials, or model prompt data into worker logs.
        throw new Error(error.code);
      }
      throw new Error("CATALOG_SYNC_FAILED");
    }
  };
}
