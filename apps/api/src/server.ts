import { createServer } from "node:http";
import { createDatabaseClient } from "@azalea-router/database";
import { createApp } from "./app.js";
import { env } from "./config/env.js";
import { logger } from "./lib/logger.js";

async function start(): Promise<void> {
  const database = env.DATABASE_URL
    ? createDatabaseClient(env.DATABASE_URL)
    : undefined;

  if (database) {
    await database.$connect();
  }

  const server = createServer(createApp({ database }));
  server.listen(env.API_PORT, env.API_HOST, () => {
    logger.info("api.server.started", {
      host: env.API_HOST,
      port: env.API_PORT,
      environment: env.NODE_ENV,
    });
  });

  const shutdown = (signal: NodeJS.Signals) => {
    logger.info("api.server.shutdown", { signal });
    server.close((error) => {
      if (error) {
        logger.error("api.server.shutdown.error");
        process.exitCode = 1;
      }
      void database?.$disconnect().catch(() => {
        logger.error("api.server.database_disconnect.error");
        process.exitCode = 1;
      });
    });
  };

  process.once("SIGINT", shutdown);
  process.once("SIGTERM", shutdown);
}

void start().catch(() => {
  logger.error("api.server.startup.failed", { code: "STARTUP_FAILED" });
  process.exitCode = 1;
});
