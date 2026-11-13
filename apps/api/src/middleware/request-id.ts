import { randomUUID } from "node:crypto";
import type { RequestHandler } from "express";

declare module "express" {
  interface Request {
    requestId: string;
  }
}

export const requestIdMiddleware: RequestHandler = (req, res, next) => {
  const supplied = req.header("x-request-id");
  const requestId = supplied && /^[a-zA-Z0-9._:-]{1,100}$/.test(supplied) ? supplied : randomUUID();
  req.requestId = requestId;
  res.setHeader("x-request-id", requestId);
  next();
};
