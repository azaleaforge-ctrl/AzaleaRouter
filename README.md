# AzaleaRouter Frontend Demo

Next.js App Router + TypeScript interactive demo for the Phase 1 sitemap. All catalog, pricing, wallet,
usage, API-key, chat, content, and admin data is illustrative mock data. There is
no backend integration, real authentication, payment, ledger, or usable API key.

## Requirements

- Node `^22.12.0 || ^24.0.0 || >=26.0.0` (local `.nvmrc`: `24`; verified on `v24.18.0`)
- pnpm `12.18.0` via Corepack

`corepack enable` may require elevated permissions on Windows. Use
`corepack pnpm ...` if the global `pnpm` shim is unavailable.

## Commands

```bash
corepack pnpm install
corepack pnpm dev
corepack pnpm test
corepack pnpm lint
corepack pnpm typecheck
corepack pnpm build
corepack pnpm test:e2e
```

Playwright starts a local server on port `3100`. If a Next.js dev server is
already running for this project on port `3000`, run E2E against it with
`$env:E2E_BASE_URL="http://localhost:3000"; corepack pnpm test:e2e` in PowerShell.

## API boundary

UI components use the shared seam `@/components/shared/api`, which re-exports
the typed client from `@/lib/api-client`:

```ts
import { api } from "@/components/shared/api";

const result = await api.catalog.list({ search: "azalea" });
```

Service groups: `auth`, `catalog`, `wallet`, `usage`, `apiKeys`, `chat`,
`content`, `settings`, `admin`. Fixtures and simulation controls stay under
`src/lib/mock` and must not be imported by components.

## Demo scenarios

Set `NEXT_PUBLIC_AZALEA_DEMO_SCENARIO` or pass `{ scenario }` per call:

`normal`, `empty`, `delayed`, `error`, `offline`, `stale`,
`stream-interrupted`, `reconnect`.

All financial and action results are explicitly labeled simulated. API-key
secrets use the visibly fake `AZL-DEMO-…-NOT-A-REAL-KEY` form and are never
usable.
