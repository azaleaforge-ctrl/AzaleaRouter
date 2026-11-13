import { SpanStatusCode, trace } from "@opentelemetry/api";
import type { RequestHandler } from "express";
import { env } from "../config/env.js";
import { logger } from "../lib/logger.js";

const tracer = trace.getTracer("azalea-router-api");

export const requestObservabilityMiddleware: RequestHandler = (req, res, next) => {
  const startedAt = process.hrtime.bigint();

  tracer.startActiveSpan("http.server.request", (span) => {
    span.setAttribute("http.request.method", req.method);
    span.setAttribute("azalea.request.id", req.requestId);

    res.once("finish", () => {
      const durationMs = Number(process.hrtime.bigint() - startedAt) / 1_000_000;
      const statusCode = res.statusCode;
      span.setAttribute("http.response.status_code", statusCode);
      if (statusCode >= 500) span.setStatus({ code: SpanStatusCode.ERROR });
      span.end();

      if (env.NODE_ENV !== "test") {
        logger.info("http.request.completed", {
          requestId: req.requestId,
          method: req.method,
          statusCode,
          durationMs: Math.round(durationMs * 100) / 100,
        });
      }
    });

    next();
  });
};
