# AzaleaRouter Frontend Demo — Implementation Plan

**Date:** 2026-11-13  
**Design:** `docs/superpowers/specs/2026-11-13-azalea-router-frontend-design.md`  
**Scope:** Complete interactive frontend demo at project root; no backend or live service integration.

## Definition of done

- Every PRD public/auth/user/admin route is implemented and usable at desktop and mobile widths.
- All screens use the typed service boundary and clearly marked illustrative fixtures; no fake real-world availability, price, legal, payment, or security claims.
- Light/dark themes, keyboard-accessible controls, meaningful loading/empty/error/offline/stale states, and chart/table alternatives are present.
- Tests pass, production build succeeds, and the app runs using documented commands.
- Remaining backend/legal/catalog launch dependencies are documented, not represented as completed.

## Work sequence

### 1. FE-0 foundation and typed mock boundary

1. Create the Next.js App Router + TypeScript app directly in the project root, with Tailwind/shadcn foundation, formatting/lint/test scripts, and responsive tokens.
2. Define domain types and service interfaces for catalog/pricing, auth, wallet/transactions, usage, API keys, chat/playground, content/status, settings, notifications, and admin demo operations.
3. Implement deterministic mock adapter with normal, empty, delayed, error, offline/stale, streaming interruption, and reconnect scenarios. Keep demo-only data clearly identifiable; use no usable credentials.
4. Add unit tests for formatters, input validation, error mapping, and mock scenario behavior.

### 2. FE-1/2/7 public and auth experience

1. Build public navigation/footer and responsive landing page.
2. Implement marketplace search/filter/sort, model detail/routing presentation, pricing calculator presentation, and demo-data provenance labels.
3. Implement login/register/forgot-password validation and simulated responses.
4. Implement docs, quickstart, IDE/CLI guides, help/search/article, blog/article, status, changelog, and review-needed legal pages.
5. Add page metadata, accessible states, and route/navigation tests.

### 3. FE-3/4/5/6 user application

1. Build user shell/navigation and overview cards.
2. Implement wallet/transactions/top-up simulation, API-key demo creation/masking/revoke/rotate, and API playground examples.
3. Implement general/coding chat simulation with selectable model, streaming/interrupted/error/cancel states, markdown/code presentation, and conversation actions.
4. Implement usage filters, charts and accessible tables, provisional/final demo states, and persistent demo color preference behavior through mock service only.
5. Implement settings, notifications, profile/security/preferences screens.
6. Test primary interaction paths, persisted non-secret preferences, and small-screen layouts.

### 4. FE-8 admin experience

1. Build separate admin shell and demo-only role switch/navigation.
2. Implement overview, users, models, providers, pricing, wallets, payments, usage, upstream, support, content, audit logs, and settings screens using mock services.
3. Label every mutation as simulation; no actual permissions, ledger edits, upstream refreshes, or payment operations.
4. Test route availability, simulated state changes, and non-admin/demo guard presentation.

### 5. FE-9 hardening and acceptance

1. Audit all sitemap routes and states; fix responsive, keyboard, focus, and contrast defects.
2. Run unit/component and Playwright scenarios for public→auth, catalog, chat, API key, wallet, usage, themes, and admin navigation.
3. Run lint/typecheck/build, resolve critical browser console errors, and verify no secrets/false real-service claims in client output.
4. Document setup, mock controls, tests, and known backend/legal/catalog blockers.

## Service boundary contract for parallel work

UI imports types and functions from `src/lib/api-client` only. The client exposes typed methods grouped by `auth`, `catalog`, `wallet`, `usage`, `apiKeys`, `chat`, `content`, `settings`, and `admin`; fixture definitions and simulation controls remain under `src/lib/mock`. Components must not import fixtures directly. If implementation discovers a contract gap, update the service interface first, then its mock implementation and consumers.

## Validation commands

Run `corepack pnpm test`, `corepack pnpm lint`, `corepack pnpm typecheck`, `corepack pnpm build`, and `corepack pnpm test:e2e`. Playwright defaults to port `3100`; when a project dev server already owns the Next.js dev lock on port `3000`, set `E2E_BASE_URL=http://localhost:3000` so Playwright reuses it. Validation owner: orchestrator after writer lanes are reconciled.
