# AzaleaRouter API — backend website API

Express 5 + TypeScript API for the AzaleaRouter modular monolith.

## Local setup

From the repository root:

```powershell
Copy-Item apps/api/.env.example apps/api/.env
corepack pnpm install
docker compose -f infrastructure/compose.dev.yml up -d
corepack pnpm --filter @azalea-router/database db:migrate:deploy
corepack pnpm --filter @azalea-router/api dev
```

The API listens on 127.0.0.1:4000 by default. The database example uses only the isolated local PostgreSQL service.

## Auth adapter status

The API implements a provider adapter for Supabase Auth, but `AUTH_PROVIDER=disabled` is the default. It will not authenticate requests or expose simulated login while disabled. Supabase integration starts only when `AUTH_PROVIDER=supabase`, `AUTH_PROVIDER_APPROVED=true`, all secrets are configured, and the origin, cookie, Turnstile and Terms/Privacy versions are supplied. D-03 remains an owner decision; this implementation does not silently approve a vendor.

The browser receives an opaque HttpOnly session cookie. Supabase access/refresh tokens are AES-256-GCM encrypted in PostgreSQL, session identifiers are SHA-256 hashed, refresh rotates under a database row lock, sessions are revocable, CSRF uses an additional readable cookie/header pair, and state-changing browser requests require an allowlisted Origin. Roles and account status come from the AzaleaRouter database, never JWT metadata or browser request data.

Turnstile Siteverify is performed server-side against Cloudflare's fixed Siteverify endpoint. The backend checks success, hostname, expected action and the five-minute challenge age, then writes a unique token hash to PostgreSQL to reject replay across API replicas. Supabase's own CAPTCHA validation must not also be enabled for the same challenge token: it would cause the token to be validated twice. If using Supabase Auth, keep its optional CAPTCHA gate disabled and use this server-side check as the single validation path.

Supabase confirmation and recovery emails use the mailer configured in the Supabase project. No SMTP sending domain or email delivery provider is configured by this repository; D-12 remains open. Configure and verify SMTP, sender identity, email templates, redirect allowlist and deliverability in the identity provider before testing live email.

## Endpoints

- `POST /api/v1/auth/register`, `login`, `logout`, `refresh`
- `POST /api/v1/auth/email/verify`, `email/resend`
- `POST /api/v1/auth/password/forgot`, `password/reset`
- `GET /api/v1/auth/session`
- `GET /api/v1/me`, `PATCH /api/v1/me/profile`, `PATCH /api/v1/me/preferences`
- `GET /api/v1/me/consents`, `POST /api/v1/me/consents`

Browser mutation requests send the `azlr_csrf` cookie value in `X-CSRF-Token` and a matching allowlisted Origin. Production uses Secure HttpOnly cookies and the `__Host-` session-cookie prefix. The CSRF cookie is intentionally not HttpOnly so the browser can echo its value in the header.

## Quality checks

```bash
corepack pnpm --filter @azalea-router/api openapi:lint
corepack pnpm --filter @azalea-router/api lint
corepack pnpm --filter @azalea-router/api typecheck
corepack pnpm --filter @azalea-router/api build
corepack pnpm --filter @azalea-router/api test
corepack pnpm --filter @azalea-router/database db:validate
corepack pnpm --filter @azalea-router/database db:migrate:deploy
```

## Persistence and deployment

PostgreSQL + Prisma ORM 7.10.1 is the local/test baseline. The database package uses migrations, not `db push`. No hosted database provider, production region, production credentials, backup/PITR policy, payment merchant, upstream gateway approval or live traffic is selected. D-05 is a legal paid-launch blocker; D-04 and D-10 also remain open.


## Model catalog API (BE-3)

- `GET /api/v1/catalog/status` — verified active canonical chat-model count and last sync result.
- `GET /api/v1/models` — cursor-paginated active models with source-backed endpoint USD pricing.
- `GET /api/v1/models/:modelId` — canonical model details and verified endpoints.
- `GET /api/v1/models/:modelId/endpoints` — endpoint/provider choices for a canonical model.
- `GET /api/v1/developers` and `GET /api/v1/providers` — developers and active endpoint providers.

Only source-verified endpoints with a USD price snapshot are returned. Catalog readiness requires 50 distinct active canonical chat-capable models; the API never fills missing entries with demo data. OpenRouter metadata sync is disabled by default. See `packages/catalog/README.md` and `docs/backend/IMPLEMENTATION-STATUS.md`.


## Model catalog API (BE-3)

- GET /api/v1/catalog/status — source-backed readiness and last sync.
- GET /api/v1/models — cursor-paginated canonical chat models with USD price snapshots.
- GET /api/v1/models/:modelId — canonical model details and eligible endpoints.
- GET /api/v1/models/:modelId/endpoints — provider endpoint choices.
- GET /api/v1/developers and GET /api/v1/providers — active catalog dimensions.

Only source-verified endpoints with an immutable USD price snapshot are returned. The public catalog readiness threshold is 50 distinct active canonical chat models; no alias/demo records or guessed prices are inserted. Metadata sync is disabled by default and must be explicitly enabled/approved in the worker environment.
