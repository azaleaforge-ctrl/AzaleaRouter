import { createServer } from "node:http";
import { createApp } from "./app.js";
import { env } from "./config/env.js";

const server = createServer(createApp());
server.listen(env.API_PORT, env.API_HOST, () => {
  console.info({ event: "api.server.started", host: env.API_HOST, port: env.API_PORT, environment: env.NODE_ENV });
});

const shutdown = (signal: NodeJS.Signals) => {
  console.info({ event: "api.server.shutdown", signal });
  server.close((error) => {
    if (error) {
      console.error({ event: "api.server.shutdown_error", message: error.message });
      process.exitCode = 1;
    }
  });
};
process.once("SIGINT", shutdown);
process.once("SIGTERM", shutdown);
