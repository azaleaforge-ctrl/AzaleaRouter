# AzaleaRouter API — BE-1 foundation and BE-2 auth boundary

Express 5 + TypeScript API skeleton for the AzaleaRouter modular monolith.

## Current scope
- Zod environment validation.
- Express application factory with injectable dependencies.
- Request correlation ID middleware and safe JSON error envelope.
- Basic `GET /api/v1/health` endpoint.
- Graceful SIGINT/SIGTERM shutdown.
- Vendor-neutral session-verifier boundary and optional session-resolution middleware.
- `GET /api/v1/auth/session` session introspection.
- Role/permission policy and resource-ownership helpers for user, support, admin, and super-admin.
- Unit tests for the authorization policy.

## Local setup
From the repository root:
```bash
corepack pnpm install
corepack pnpm --filter @azalea-router/api dev
```
The API listens on `127.0.0.1:4000` by default.

## Important implementation state
No identity provider is configured. Until the auth provider/session decision (D-03) is approved and an adapter is injected into `createApp({ sessionVerifier })`, the API does not authenticate users. Registration, login, refresh, logout, email verification, password reset, profile persistence, Turnstile, and consent persistence are not implemented in this increment. No fake credentials or in-memory production sessions are used.

Database/Prisma, Redis/BullMQ, payments, upstream providers, wallet, and production secrets remain outside this scaffold. See `docs/backend/BE-2-auth-readiness.md` for blockers and exit criteria.
