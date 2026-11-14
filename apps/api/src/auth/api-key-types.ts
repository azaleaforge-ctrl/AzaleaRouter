import type { ApiKeyPrincipal } from "./api-key-service.js";

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      apiKey?: ApiKeyPrincipal;
    }
  }
}

export {};
