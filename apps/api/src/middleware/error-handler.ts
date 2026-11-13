import type { ErrorRequestHandler } from "express";
import { env } from "../config/env.js";
import { HttpError } from "../lib/http-error.js";
import { logger } from "../lib/logger.js";

export const errorHandler: ErrorRequestHandler = (error, req, res, next) => {
  // Express requires the four-argument error middleware signature.
  void next;

  const known = error instanceof HttpError;
  const statusCode = known ? error.statusCode : 500;
  const code = known ? error.code : "INTERNAL_ERROR";
  const message = known && statusCode < 500 ? error.message : "An unexpected error occurred.";

  if (env.NODE_ENV !== "test") {
    logger[statusCode >= 500 ? "error" : "warn"]("http.request.error", {
      requestId: req.requestId,
      statusCode,
      code,
    });
  }

  res.status(statusCode).json({
    error: { code, message, request_id: req.requestId, retryable: statusCode >= 500 },
  });
};
