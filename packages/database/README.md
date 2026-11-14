# AzaleaRouter database package

PostgreSQL persistence boundary for the API and worker. Prisma ORM 7.10.1 is pinned deliberately because Prisma 8 is currently a major-release transition; keep the CLI, client and PostgreSQL adapter on the same 7.10.1 line until an explicit upgrade is planned.

## Technical baseline

- PostgreSQL is the source of truth for user/account and future financial state.
- Prisma ORM 7 with the ESM `prisma-client` generator and `@prisma/adapter-pg`.
- `DATABASE_URL` is supplied only through environment/secret configuration; no database host or credential is committed.
- Local/test PostgreSQL is supported by `infrastructure/compose.dev.yml` and CI.
- No hosted database vendor, production region, backup/PITR vendor or production credential is selected by this package.

## Local development

1. Start local infrastructure from the repository root: `docker compose -f infrastructure/compose.dev.yml up -d`.
2. Set `DATABASE_URL` in the shell or in the package's ignored local `.env` file. Use a dedicated development database, never production credentials.
3. Generate and validate the client/schema:

```bash
corepack pnpm --filter @azalea-router/database db:generate
corepack pnpm --filter @azalea-router/database db:validate
corepack pnpm --filter @azalea-router/database db:migrate:deploy
corepack pnpm --filter @azalea-router/database typecheck
corepack pnpm --filter @azalea-router/database test
```

## Migration policy

- Commit every migration in `prisma/migrations`.
- Production/staging deployment uses `prisma migrate deploy`, never `db push`.
- Review generated SQL before merge; migrations must work against an empty PostgreSQL database.
- Account, consent, audit, financial and usage history must not be cascade-deleted.
- Consent and audit records are append-only at the database layer.
- Seed data is limited to deterministic test fixtures; no fake production users, pricing, providers or balances.

## Current schema scope

The initial migration creates users, profile/preferences, append-only consent, audit log, outbox and idempotency records. Domain-specific catalog, financial, gateway, usage, chat, upload and support tables will be added with their respective backend workstreams and tested migrations.
