import express from "express";
import { errorHandler } from "./middleware/error-handler.js";
import { requestIdMiddleware } from "./middleware/request-id.js";
import { healthRouter } from "./routes/health.js";

export function createApp() {
  const app = express();
  app.disable("x-powered-by");
  app.use(requestIdMiddleware);
  app.use(express.json({ limit: "1mb", strict: true }));
  app.use("/api/v1", healthRouter);
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
