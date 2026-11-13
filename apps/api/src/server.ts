import { createServer } from "node:http";
import { createApp } from "./app.js";
import { env } from "./config/env.js";
import { logger } from "./lib/logger.js";

const server = createServer(createApp());
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
  });
};
process.once("SIGINT", shutdown);
process.once("SIGTERM", shutdown);
