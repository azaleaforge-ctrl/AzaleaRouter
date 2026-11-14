import express, { type Router } from "express";
import type { DatabaseClient } from "@azalea-router/database";
import type { SessionVerifier } from "./auth/session-verifier.js";
import { env } from "./config/env.js";
import { logger } from "./lib/logger.js";
import { errorHandler } from "./middleware/error-handler.js";
import { requestIdMiddleware } from "./middleware/request-id.js";
import { requestObservabilityMiddleware } from "./middleware/request-observability.js";
import { createSessionResolver } from "./middleware/session-resolver.js";
import { createCorsMiddleware } from "./middleware/cors.js";
import { authUnavailableRouter } from "./routes/auth-unavailable.js";
import { createCatalogRouter } from "./routes/catalog.js";
import type { FileRouterOptions } from "./routes/files.js";
import { createFileRouter } from "./routes/files.js";
import { createConversationRouter } from "./routes/conversations.js";
import { createNotificationRouter } from "./routes/notifications.js";
import { createSupportRouter } from "./routes/support.js";
import { createContentRouter } from "./routes/content.js";
import { healthRouter } from "./routes/health.js";

export interface AppDependencies {
  database?: DatabaseClient;
  authRouter?: Router;
  sessionVerifier?: SessionVerifier;
  billingRouter?: Router;
  apiKeyRouter?: Router;
  gatewayRouter?: Router;
  usageRouter?: Router;
  eventsRouter?: Router;
  conversationRouter?: Router;
  fileRouter?: Router;
  notificationRouter?: Router;
  supportRouter?: Router;
  contentRouter?: Router;
  adminRouter?: Router;
}

export function createApp(dependencies: AppDependencies = {}) {
  const app = express();
  app.disable("x-powered-by");
  app.use(requestIdMiddleware);
  app.use(createCorsMiddleware(env.WEB_ORIGIN ? { allowedOrigin: env.WEB_ORIGIN } : {}));
  app.use(requestObservabilityMiddleware);
  app.use(express.json({
    limit: "1mb",
    strict: true,
    verify: (request, _response, buffer) => {
      (request as typeof request & { rawBody?: Buffer }).rawBody = Buffer.from(buffer);
    },
  }));
  app.use("/api/v1", createSessionResolver(dependencies.sessionVerifier));
  app.use("/api/v1", dependencies.authRouter ?? authUnavailableRouter);

  if (dependencies.apiKeyRouter) {
    app.use("/api/v1", dependencies.apiKeyRouter);
  }
  if (dependencies.gatewayRouter) {
    app.use("/v1", dependencies.gatewayRouter);
  }

  if (dependencies.database) {
    app.use("/api/v1", createCatalogRouter(dependencies.database));
  }
  if (dependencies.billingRouter) {
    app.use("/api/v1", dependencies.billingRouter);
  }
  if (dependencies.usageRouter) {
    app.use("/api/v1", dependencies.usageRouter);
  }
  if (dependencies.eventsRouter) {
    app.use("/api/v1", dependencies.eventsRouter);
  }
  if (dependencies.conversationRouter) {
    app.use("/api/v1", dependencies.conversationRouter);
  }
  if (dependencies.fileRouter) {
    app.use("/api/v1", dependencies.fileRouter);
  }
  if (dependencies.notificationRouter) {
    app.use("/api/v1", dependencies.notificationRouter);
  }
  if (dependencies.supportRouter) {
    app.use("/api/v1", dependencies.supportRouter);
  }
  if (dependencies.contentRouter) {
    app.use("/api/v1", dependencies.contentRouter);
  }
  if (dependencies.adminRouter) {
    app.use("/api/v1", dependencies.adminRouter);
  }

  app.use("/api/v1", healthRouter);

  app.get("/api/v1/health/ready", async (req, res) => {
    if (!dependencies.database) {
      res.status(503).json({
        status: "not_ready",
        dependencies: { database: "not_configured" },
        request_id: req.requestId,
      });
      return;
    }

    try {
      await dependencies.database.$queryRaw`SELECT 1`;
      res.status(200).json({
        status: "ready",
        dependencies: { database: "ok" },
        request_id: req.requestId,
      });
    } catch {
      logger.warn("api.readiness.database_unavailable", {
        requestId: req.requestId,
        code: "DATABASE_UNAVAILABLE",
        statusCode: 503,
      });
      res.status(503).json({
        status: "not_ready",
        dependencies: { database: "unavailable" },
        request_id: req.requestId,
      });
    }
  });

  app.use((_req, res) => {
    res.status(404).json({
      error: {
        code: "NOT_FOUND", message: "The requested resource was not found.",
        request_id: res.getHeader("x-request-id"), retryable: false,
      },
    });
  });
  app.use(errorHandler);
  return app;
}
