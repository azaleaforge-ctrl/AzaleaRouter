# AzaleaRouter API — BE-1 foundation and BE-2 auth boundary

Express 5 + TypeScript API skeleton for the AzaleaRouter modular monolith.

## Local setup

From the repository root:

```powershell
Copy-Item apps/api/.env.example apps/api/.env
corepack pnpm install
corepack pnpm --filter @azalea-router/api dev
```

The API listens on `127.0.0.1:4000` by default. The Node.js dev command loads `apps/api/.env` when present and restarts on source changes.

## Current scope
- Zod environment validation.
- Express application factory with injectable dependencies.
- Request correlation ID middleware and standard JSON error envelope.
- Basic `GET /api/v1/health` endpoint.
- Structured JSON operational logs with an allowlist of safe fields.
- Graceful SIGINT/SIGTERM shutdown.
- OpenAPI 3.1 initial contract at `openapi/openapi.yaml`.
- API unit/integration tests using Node's built-in test runner.
- Vendor-neutral session-verifier boundary and optional session-resolution middleware.
- `GET /api/v1/auth/session` session introspection.
- Role/permission policy and resource-ownership helpers for user, support, admin, and super-admin.
- Unit tests for the authorization policy.

## API checks

```bash
corepack pnpm --filter @azalea-router/api lint
corepack pnpm --filter @azalea-router/api typecheck
corepack pnpm --filter @azalea-router/api build
corepack pnpm --filter @azalea-router/api test
```

## Authentication status

No identity provider is configured. Until the auth provider/session decision (D-03) is approved and a verified adapter is injected into `createApp({ sessionVerifier })`, the API does not authenticate users. The adapter must verify credentials, expiry and revocation server-side.

Registration, login, refresh, logout, email verification, password reset, profile persistence, Turnstile Siteverify and consent persistence are not implemented in this increment. No fake credentials, demo JWTs, or in-memory production sessions are used. See `docs/backend/BE-2-auth-readiness.md` for blockers and exit criteria.

## Persistence and other integrations

Database/Prisma is not wired while D-01 remains open in Backend PRD v0.4. Redis/BullMQ runs in the separate `apps/worker` package. Payments, upstream providers, wallet and production secrets are not configured in this foundation.
