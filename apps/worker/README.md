# AzaleaRouter background worker

Node.js + TypeScript worker foundation using BullMQ 5 and Redis.

## Local setup

1. Start a Redis-compatible service (Redis, Valkey or another compatible server).
2. Copy `.env.example` to your local environment file and set `REDIS_URL`.
3. From the repository root:

```bash
corepack pnpm install
corepack pnpm --filter @azalea-router/worker dev
```

The worker consumes the `azalea-router-background` queue by default. Its initial registered job is `system.health-check`; domain jobs are registered by later backend stages.

## Reliability and safety

- Redis credentials are parsed from `REDIS_URL` and are never written to logs.
- Worker concurrency is bounded by validated configuration.
- Jobs receive three attempts with exponential backoff by default.
- Completed/failed job retention is bounded.
- Unknown job names fail explicitly; payloads are never logged.
- SIGINT/SIGTERM close the worker gracefully.
- Integration tests run against a real Redis service when `REDIS_URL` is set.
- Redis is infrastructure/queue support only; it is not the source of truth for accounts, balances, payments or ledger entries.

The queue is internal. It is not exposed as an arbitrary public job-submission endpoint.
