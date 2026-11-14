import type { RequestHandler } from "express";

export interface CorsOptions {
  allowedOrigin?: string;
}

export function createCorsMiddleware(options: CorsOptions = {}): RequestHandler {
  return (req, res, next) => {
    const origin = req.header("origin");
    if (!origin) {
      if (req.method === "OPTIONS") {
        res.status(204).end();
        return;
      }
      next();
      return;
    }

    if (!options.allowedOrigin || origin !== options.allowedOrigin) {
      res.status(403).json({
        error: {
          code: "CORS_ORIGIN_REJECTED",
          message: "Request origin is not allowed.",
          request_id: req.requestId,
          retryable: false,
        },
      });
      return;
    }

    res.setHeader("Access-Control-Allow-Origin", options.allowedOrigin);
    res.setHeader("Access-Control-Allow-Credentials", "true");
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, PATCH, DELETE, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, X-Request-Id, X-CSRF-Token");
    res.setHeader("Access-Control-Max-Age", "600");
    res.vary("Origin");

    if (req.method === "OPTIONS") {
      res.status(204).end();
      return;
    }
    next();
  };
}
