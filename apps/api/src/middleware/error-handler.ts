import type { ErrorRequestHandler } from "express";
import { env } from "../config/env.js";
import { HttpError } from "../lib/http-error.js";

export const errorHandler: ErrorRequestHandler = (error, req, res, _next) => {
  const known = error instanceof HttpError;
  const statusCode = known ? error.statusCode : 500;
  const code = known ? error.code : "INTERNAL_ERROR";
  const message = known && statusCode < 500 ? error.message : "An unexpected error occurred.";

  if (env.NODE_ENV !== "test") {
    console[statusCode >= 500 ? "error" : "warn"]({
      event: "http.request.error", requestId: req.requestId, statusCode, code,
    });
  }

  res.status(statusCode).json({
    error: { code, message, request_id: req.requestId, retryable: statusCode >= 500 },
  });
};
