# AzaleaRouter API — BE-1 foundation and BE-2 auth boundary

Express 5 + TypeScript API skeleton for the AzaleaRouter modular monolith.

## Local setup

From the repository root:

```powershell
Copy-Item apps/api/.env.example apps/api/.env
corepack pnpm install
docker compose -f infrastructure/compose.dev.yml up -d
corepack pnpm --filter @azalea-router/database db:migrate:deploy
corepack pnpm --filter @azalea-router/api dev
```

The API listens on 127.0.0.1:4000 by default. DATABASE_URL is read by the API and database package from the server environment. The included local example points only to the isolated development database in Compose.

## Current scope
- Zod environment validation, request IDs and standard JSON error envelope.
- Express application factory and liveness endpoint.
- Database-backed readiness endpoint at GET /api/v1/health/ready; it returns 503 when a database is not configured or reachable.
- PostgreSQL client through the shared @azalea-router/database package.
- Structured JSON operational logs with an allowlist of safe fields.
- Graceful SIGINT/SIGTERM shutdown including database disconnection.
- OpenAPI 3.1 initial contract at openapi/openapi.yaml.
- Vendor-neutral session-verifier boundary and optional session-resolution middleware.
- GET /api/v1/auth/session session introspection.
- Role/permission policy and resource-ownership helpers for user, support, admin, and super-admin.

## API checks

```bash
corepack pnpm --filter @azalea-router/api lint
corepack pnpm --filter @azalea-router/api typecheck
corepack pnpm --filter @azalea-router/api build
corepack pnpm --filter @azalea-router/api test
```

## Authentication status

No identity provider is configured. Until D-03 is approved and a verified adapter is injected into createApp, the API does not authenticate users. Registration, login, refresh, logout, email verification, password reset, profile persistence, Turnstile Siteverify and consent persistence are not implemented in this increment. No fake credentials, demo JWTs, or in-memory production sessions are used. See docs/backend/BE-2-auth-readiness.md for blockers and exit criteria.

## Persistence and other integrations

PostgreSQL + Prisma ORM 7.10.1 is the reversible local/test baseline. No hosted database provider, production region, production credentials or backup/PITR policy is selected. Redis/BullMQ runs in the separate apps/worker package. Payments, upstream providers, wallet and production secrets are not configured in this foundation.
