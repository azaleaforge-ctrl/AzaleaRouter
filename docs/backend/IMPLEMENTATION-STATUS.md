# Backend implementation status

**Last verified:** 13 November 2026 (Asia/Jakarta)  
**Source of truth:** Backend PRD v0.4, current PR metadata and branch heads, GitHub Actions runs, and reviewed PR patches.  
**Completion rule:** A stage is Done only after implementation, contracts/docs, security/privacy requirements, relevant tests, and CI evidence meet its PRD exit criteria.

## Overall merge gate

The user authorized all backend workstreams BE-0 through BE-9 to be completed and verified before any merge. Only after the entire roadmap is complete, all reviews/CI are resolved, and the final audit passes may PRs be merged one at a time in dependency order. No early merge, direct commit to `main`, force merge, production release/deployment, or paid traffic is authorized.

## Stage tracker

| Workstream | Status | Evidence / remaining exit criteria |
|---|---|---|
| BE-0 — legal and architecture decisions | In progress; paid production blocked | Decision register: [DECISION-LOG.md](./DECISION-LOG.md). D-01/02/03/04/06/07/08/09/10/12/13/14/15/18 remain open. D-05 is a hard paid-launch blocker: obtain written upstream permission/exception covering downstream gateway, customer API keys, third-party billing and the intended product scope, plus legal review. D-04 merchant/payment onboarding and relevant product/privacy decisions also remain open. |
| BE-1 — backend foundation | In progress | PR #2 contains the Express 5 API skeleton, Zod config, request IDs, safe error envelope, health route, allowlist logger, graceful shutdown, initial OpenAPI contract, API tests, BullMQ worker, Redis connection/queue policy, tests, local Redis Compose and CI. Workspace lockfile is committed and CI uses frozen install. [Run #80](https://github.com/azaleaforge-ctrl/AzaleaRouter/actions/runs/43446718047) passed all configured checks on exact BE-1 head `db9975749c27b520494b906d123d74d51a3c9cf7`. Still incomplete: D-01 decision and PostgreSQL/Prisma schema/migrations/repositories, API/worker operational readiness, OpenAPI validation/generation and agreed observability integration. |
| BE-2 — authentication and RBAC | In progress | PR #4 carries provider-neutral principal/session-verifier contracts, session introspection, role/permission matrix, ownership/assigned-support checks, middleware and authorization tests. [Run #98](https://github.com/azaleaforge-ctrl/AzaleaRouter/actions/runs/43447170807) passed all configured checks on exact PR #4 head `740e231fc67bdd1f39a40950435fd2e546b89d33`. This is not production auth: D-03 identity/session provider, D-12 email provider, persistent storage, Turnstile Siteverify configuration, consent policy/persistence, registration/login/logout/refresh/verification/reset/profile flows and full security/E2E tests remain incomplete. |
| BE-3 — catalog and providers | Not started | Build canonical model/developer/provider/endpoint catalog, source-backed pricing snapshots, capability validation and sync worker. Before public catalog readiness, verify at least 50 distinct active canonical chat models with valid endpoints and current pricing; no aliases or fabricated data. |
| BE-4 — wallet, ledger and payments | Not started | Implement immutable balanced PostgreSQL ledger, integer-IDR and decimal-safe arithmetic, pricing/FX/markup snapshots, payment sandbox/webhooks/refunds/reconciliation, idempotency and concurrency tests. Merchant approval remains a production gate. |
| BE-5 — AZL keys and gateway | Not started | Secure AZL- key issuance/hash/rotation/revocation, OpenAI-compatible gateway, provider adapters, routing/fallback, streaming and reliable usage settlement. Paid upstream use remains blocked by D-05. |
| BE-6 — usage and realtime | Not started | Usage records/aggregates, persisted model colors, authenticated SSE, transactional outbox, replay cursors, expiry and reconnect/snapshot behavior. |
| BE-7 — chat, files and content | Not started | Conversation/message lifecycle, private upload/storage boundary, MIME validation/quarantine/scanner adapter, docs/help/blog/status/changelog, support tickets and notifications. |
| BE-8 — admin and hardening | Not started | Granular admin APIs/RBAC, audit trail, financial reconciliation operations, job monitoring/alerts, privacy/security hardening, abuse/rate limits and operational controls. |
| BE-9 — closed-beta readiness | Not started | Backup/restore drills, rollback, support/incident process, monitoring, privacy/legal recheck, external approvals and evidence-backed go/no-go report. |

## Pull request chain

| PR | Stage | Branch | Base | Status |
|---|---|---|---|---|
| [#1 Backend PRD v0.4](https://github.com/azaleaforge-ctrl/AzaleaRouter/pull/1) | Requirements / BE-0 inputs | `docs/backend-prd-v0.4-stage1` | `main` | Draft / open / not merged |
| [#2 BE-1 foundation](https://github.com/azaleaforge-ctrl/AzaleaRouter/pull/2) | BE-1 | `feat/backend-foundation-be1` | `docs/backend-prd-v0.4-stage1` | Draft / open / not merged |
| [#3 old BE-2 branch](https://github.com/azaleaforge-ctrl/AzaleaRouter/pull/3) | Superseded | `feat/backend-auth-be2` | `feat/backend-foundation-be1` at stale base | Diverged / not mergeable; replaced by PR #4 |
| [#4 rebased BE-2 foundation](https://github.com/azaleaforge-ctrl/AzaleaRouter/pull/4) | BE-2 | `feat/backend-auth-be2-rebased` | `feat/backend-foundation-be1` | Draft / open / not merged; ahead 14, behind 0 at last comparison |

## CI validation snapshot

- **BE-1 / PR #2:** [Run #80](https://github.com/azaleaforge-ctrl/AzaleaRouter/actions/runs/43446718047) — success on exact head `db9975749c27b520494b906d123d74d51a3c9cf7`. Install/frozen lockfile, all-package lint, frontend typecheck/build/unit tests, API lint/typecheck/build/unit+integration tests, worker lint/typecheck/build/Redis integration tests and lockfile consistency all passed.
- **BE-2 / PR #4:** [Run #98](https://github.com/azaleaforge-ctrl/AzaleaRouter/actions/runs/43447170807) — success on exact head `740e231fc67bdd1f39a40950435fd2e546b89d33`. The same configured frontend/API/worker/Redis/lockfile checks all passed.
- **Earlier failures and fixes:** PR #2 run #78 failed API typecheck with TS2742 because declaration emit inferred non-portable Express types; removing declaration emit fixed it. PR #4 run #93 failed all-package lint on Express namespace augmentation and was superseded after adding the targeted lint suppression, restoring the BE-1 API package scripts/test glob, and preserving BE-1 README documentation. Run #98 passed after those fixes.
- CI coverage is only what the workflow currently runs. It does not yet cover database migrations, real provider/auth integrations, payment and ledger scenarios, upstream catalog verification, full gateway streaming/settlement, full product E2E, security scans, backup/restore or closed-beta operations.
- Local clone/build/test were not run in this tool environment. No result is inferred beyond the explicitly linked GitHub Actions evidence.

## Current blockers and next actions

1. Keep PR #1, #2 and #4 unmerged. BE-0 through BE-9 are not complete, and BE-1/BE-2 themselves remain incomplete against the PRD.
2. Close the stale/diverged PR #3 as superseded by PR #4 after recording that replacement in its conversation.
3. Resolve D-01 and complete persistent PostgreSQL/Prisma migrations, repositories and related tests; update OpenAPI validation and observability, then complete BE-1.
4. Complete real BE-2 only after identity/session, email delivery, Turnstile policy/secrets and consent decisions are legitimately available; do not simulate production authentication.
5. Continue BE-3 through BE-9. Keep paid access disabled unless D-05/D-04 and other legal/commercial launch gates are evidenced and approved.
6. Only after every BE-0..BE-9 exit criterion is met, all required review threads are resolved, all exact-head CI is green and the final audit passes, begin sequential merge with PR #1 and verify each merge before proceeding.

