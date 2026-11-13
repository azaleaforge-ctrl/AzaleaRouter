# AzaleaRouter API — BE-1 foundation

Express 5 + TypeScript API skeleton for the AzaleaRouter modular monolith.

## Current scope
- Zod environment validation.
- Express application factory with injectable dependencies.
- Request correlation ID middleware and standard JSON error envelope.
- Basic `GET /api/v1/health` endpoint.
- Structured JSON operational logs with an allowlist of safe fields.
- Graceful SIGINT/SIGTERM shutdown.
- OpenAPI 3.1 initial contract at `openapi/openapi.yaml`.
- API unit/integration tests using Node's built-in test runner.

## Local setup

From the repository root:

```bash
corepack pnpm install
corepack pnpm --filter @azalea-router/api dev
```

The API listens on `127.0.0.1:4000` by default.

Run API checks:

```bash
corepack pnpm --filter @azalea-router/api lint
corepack pnpm --filter @azalea-router/api typecheck
corepack pnpm --filter @azalea-router/api build
corepack pnpm --filter @azalea-router/api test
```

## Persistence and integrations

Database/Prisma is not wired while D-01 remains open in Backend PRD v0.4. Redis/BullMQ runs in the separate `apps/worker` package. Authentication, payments, provider routing, wallet, and production secrets are not configured in this foundation.
