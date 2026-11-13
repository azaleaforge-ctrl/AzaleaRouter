# Backend implementation status

**Last verified:** 13 November 2026 (Asia/Jakarta)  
**Source of truth:** Backend PRD v0.4, current PR metadata and branch heads, GitHub Actions runs, and reviewed patches.  
**Completion rule:** A stage is Done only after implementation, contracts/docs, security/privacy requirements, relevant tests and CI evidence meet its PRD exit criteria.

## Overall merge gate

The user authorized completion of BE-0 through BE-9 before any merge. Only after all stages are complete and verified may PRs be merged one at a time in dependency order. No direct commits to main, no force merge, no early merge, no production deployment/release and no paid traffic are authorized.

## Stage tracker

| Workstream | Status | Current evidence / gap |
|---|---|---|
| BE-0 — legal and architecture decisions | In progress / Blocked for paid launch | See DECISION-LOG.md. D-01 has a local/test-only PostgreSQL + Prisma technical baseline; production hosting remains OPEN. D-02/03/04/06/07/08/09/10/12/13/14/15/18 remain OPEN. D-05 is a hard blocker: current OpenRouter Terms §7 item 4 prohibits resale of model API access/competing service absent a specific written clarification/exception; legal review is required. D-04 merchant/payment onboarding and privacy/data retention decisions also remain open. |
| BE-1 — backend foundation | In progress | PR #2 adds Express API, BullMQ worker, Redis, safe structured logging, health/error contracts and initial OpenAPI. New packages/database adds PostgreSQL + Prisma ORM 7.10.1, local/test configuration, initial User/Profile/Preferences/Consent/Audit/Outbox/Idempotency schema, committed initial SQL migration, append-only DB triggers and URL/unit/integration test scaffolds. CI now provisions ephemeral PostgreSQL and Redis and runs Prisma validate/generate/migrate/build/test. Workspace lockfile has to be refreshed and committed; exact-head CI evidence for the database change is not yet available. Observability exporter/trace integration and production hosting/backup decisions remain open. |
| BE-2 — authentication and RBAC | In progress | PR #4 carries provider-neutral principal/session-verifier contracts, session introspection, role/permission matrix, ownership/assigned-support checks, middleware and authorization tests. Previous exact-head run #98 passed its configured tests; rebase/CI must be refreshed after BE-1 database work. Real identity provider/session, email delivery, Turnstile Siteverify, consent persistence, register/login/logout/refresh/verification/reset/profile flows and full security/E2E tests remain outstanding. |
| BE-3 — catalog and providers | Not started | Canonical model/developer/provider/endpoint catalog, current upstream source-backed pricing snapshots, sync worker, capability validation and safe routing metadata. Public catalog needs at least 50 distinct active canonical chat-capable models with valid pricing/endpoints; no aliases or fabricated data. |
| BE-4 — wallet, ledger and payments | Not started | Immutable balanced PostgreSQL ledger, integer-IDR/decimal-safe arithmetic, pricing/FX/markup snapshots, sandbox payment/webhook/refund/reconciliation adapters, idempotency/concurrency tests. Merchant and financial policy decisions remain a paid-launch gate. |
| BE-5 — AZL keys and gateway | Not started | Secure AZL- issuance/hash/rotation/revocation, OpenAI-compatible gateway, provider adapters, routing/fallback, streaming and accurate settlement; production upstream traffic remains blocked by D-05. |
| BE-6 — usage and realtime | Not started | Usage records/aggregates, model color API, authenticated SSE, transactional outbox, replay cursor/expiry and reconnect/snapshot behavior. |
| BE-7 — chat, files and content | Not started | Conversation/message lifecycle, private file upload/storage boundary, MIME validation/quarantine/scanner adapter, docs/help/blog/status/changelog, support tickets and notifications. |
| BE-8 — admin and hardening | Not started | Granular admin APIs/RBAC, audit trail, financial reconciliation, job monitoring/alerts, privacy/security hardening, abuse/rate limits and operational controls. |
| BE-9 — closed-beta readiness | Not started | Backup/restore drills, rollback, support/incident process, monitoring, privacy/legal recheck and evidence-backed go/no-go report. |

## Pull request chain

| PR | Stage | Branch | Base | Status |
|---|---|---|---|---|
| [#1 Backend PRD v0.4](https://github.com/azaleaforge-ctrl/AzaleaRouter/pull/1) | Requirements / BE-0 inputs | docs/backend-prd-v0.4-stage1 | main | Draft / open / not merged |
| [#2 BE-1 foundation](https://github.com/azaleaforge-ctrl/AzaleaRouter/pull/2) | BE-1 | feat/backend-foundation-be1 | docs/backend-prd-v0.4-stage1 | Draft / open / not merged |
| [#3 old BE-2 branch](https://github.com/azaleaforge-ctrl/AzaleaRouter/pull/3) | Superseded | feat/backend-auth-be2 | stale BE-1 base | Closed / not merged; replaced by PR #4 |
| [#4 rebased BE-2 foundation](https://github.com/azaleaforge-ctrl/AzaleaRouter/pull/4) | BE-2 | feat/backend-auth-be2-rebased | feat/backend-foundation-be1 (older head) | Draft / open / not merged; must be refreshed after BE-1 changes |

## CI validation snapshot

- **BE-1 before database addition:** [Run #80](https://github.com/azaleaforge-ctrl/AzaleaRouter/actions/runs/43446718047) passed frontend/API/worker lint, typecheck, build, unit and Redis integration checks on BE-1 head db9975749c27b520494b906d123d74d51a3c9cf7.
- **BE-2 before database addition:** [Run #98](https://github.com/azaleaforge-ctrl/AzaleaRouter/actions/runs/43447170807) passed configured checks on PR #4 head 740e231fc67bdd1f39a40950435fd2e546b89d33.
- **Run #100:** [GitHub Actions](https://github.com/azaleaforge-ctrl/AzaleaRouter/actions/runs/43447407421) passed the workflow on BE-2 documentation head 924f2177eb9d33ec227a5bfdfd447cf76bb2982f; it did not yet include the new database package.
- The new BE-1 head adds Prisma dependency/lockfile changes and a PostgreSQL-backed migration pipeline. Its exact-head CI is pending and is the next validation gate.
- Earlier failures were inspected and corrected: pnpm build-script approval, TypeScript TS2742 declaration emit, ESLint no-namespace, and PR #3's stale/diverged branch. No result is inferred beyond the exact runs linked above.
- Local clone/build/test has not been run through this GitHub-only connector. CI is the available execution environment.

## Current blockers and next actions

1. Keep all PRs unmerged. BE-0 through BE-9 are not complete.
2. Retrieve and commit the workspace lockfile from the new CI run; restore pnpm install --frozen-lockfile and remove the temporary artifact-upload step.
3. Resolve any Prisma schema/generator, migration SQL, database test or lockfile CI failures before declaring BE-1 complete.
4. Integrate database client/repositories into BE-2 only after the persistence contract passes; do not fake provider auth, email or Turnstile.
5. Continue BE-3 through BE-9 with exact source-backed catalog and rigorous financial/security tests.
6. D-05/D-04, hosting region, data retention/legal basis and live-provider credentials remain hard external gates. Build and sandbox work may continue, but no paid launch.
7. After all BE-0..BE-9 acceptance criteria, required reviews and exact-head CI pass, perform final audit and merge one PR at a time in dependency order, verifying each merge before proceeding.
