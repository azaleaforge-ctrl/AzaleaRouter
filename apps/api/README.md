# AzaleaRouter API — BE-1 foundation

Express 5 + TypeScript API skeleton for the AzaleaRouter modular monolith.

## Current scope
- Zod environment validation.
- Express application factory for future integration tests.
- Request correlation ID middleware.
- Safe JSON error envelope.
- Basic `GET /api/v1/health` endpoint.
- Graceful SIGINT/SIGTERM shutdown.

## Local setup
From the repository root:
```bash
corepack pnpm install
corepack pnpm --filter @azalea-router/api dev
```
The API listens on `127.0.0.1:4000` by default.

No database, auth, Redis/BullMQ, payments, upstream provider, wallet, or production secrets are configured in this initial scaffold.
