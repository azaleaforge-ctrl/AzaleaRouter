# Backend implementation status

**Last verified:** 14 November 2026 (Asia/Jakarta)  
**Authority:** Backend PRD v0.4, live PR metadata, current branch/head SHAs, commit comparisons, review threads and GitHub Actions.  
**Completion rule:** A stage is Done only when implementation, contracts, documentation, security/privacy requirements, tests and exact-head CI satisfy its PRD exit criteria.

## Overall status

**BE-0 through BE-9 are not all complete. No PR has been merged.** All open PRs remain Draft. No release, deployment, production personal-data processing, live payment or paid upstream traffic is authorized.

The repository now contains implementation work for every BE stage, but several stages remain partial or externally blocked. Exact-head CI passed for the current heads of BE-1 through BE-7. BE-8 and BE-9 do not have an executed current-head CI run: their PR-triggered runs returned `action_required` with no jobs. The model catalog has **0 verified active chat-capable models** because no approved catalog sync has been run. BE-9 remains a runbook template, not operational evidence.

## Stage tracker

| Stage | Status | Current evidence and remaining exit criteria |
|---|---|---|
| **BE-0 — architecture, legal/upstream, privacy and launch decisions** | **In progress; paid launch blocked** | [Decision log](./DECISION-LOG.md). D-01 is a reversible PostgreSQL 16/Prisma 7.10.1 local/test baseline only. D-02 domain/proxy, D-03 identity/session approval, D-04 merchant/payment, D-06 storage/scanner, D-07 FX, D-08 markup, D-09 refunds/disputes, D-10 privacy/retention/legal basis, D-12 email, D-13 hosted observability, D-14 backup/PITR/RPO/RTO, D-15 maker-checker thresholds and D-18 support/incident ownership remain OPEN. D-05 is a hard paid-production blocker: the official [OpenRouter Terms](https://openrouter.ai/terms), last updated 31 Aug 2026, §7(4) prohibits resale of Model API access/competing-service use; §5.1 does not expressly waive that restriction. No signed exception or downstream permission is recorded. |
| **BE-1 — API, worker, database and CI foundation** | **In progress; technical baseline implemented** | Express 5/TypeScript API, BullMQ worker, Redis, Zod config, request IDs, safe structured logs, OpenAPI 3.1 lint, PostgreSQL/Prisma local-test schema/migrations, CI and committed workspace lockfile exist. [Exact-head run #43453323097](https://github.com/azaleaforge-ctrl/AzaleaRouter/actions/runs/43453323097) passed the workspace, PostgreSQL migration, API and worker checks on SHA `2d5f3b4720be31b5db7b762f269c16e0e468dd34`; this was a workflow-dispatch run using frozen install. Remaining: finish the observability/exporter boundary, verify CI's frozen-lockfile behavior consistently for PR-triggered runs, and keep production DB host/region/backup credentials unselected until approved. |
| **BE-2 — authentication, account lifecycle, roles and consent** | **In progress; implementation and CI pass** | Provider-neutral session verifier, gated Supabase Auth REST adapter, opaque local sessions, encrypted provider tokens, CSRF/Origin checks, Turnstile Siteverify/replay control, persistent HMAC rate limits, profile/preferences/consent endpoints and ownership/RBAC policies exist. [Exact-head run #43456931571](https://github.com/azaleaforge-ctrl/AzaleaRouter/actions/runs/43456931571) passed on SHA `35fc174675f60233f5d7add3ad1fdc8beb5d5fda`. No approved staging identity/email/Turnstile credentials or complete staging signup→verify→login→refresh→logout→recovery E2E evidence exists. D-03/D-10/D-12 remain OPEN; auth is disabled by default. |
| **BE-3 — canonical model catalog and provider metadata** | **In progress; code and CI pass, launch count unmet** | Canonical developer/provider/model/endpoint/pricing snapshot schema, OpenRouter metadata adapter, sync worker, validation and catalog read APIs exist. [Exact-head run #43543279248](https://github.com/azaleaforge-ctrl/AzaleaRouter/actions/runs/43543279248) passed on SHA `0aca81a8f894e9333d601aedba53b53c55dec370`. The approved sync has not run; verified active canonical chat-capable model count is **0**, not 50. Do not seed or fabricate models/prices. Obtain an approved metadata source/credential, sync current records, and verify 50 distinct canonical models, active endpoints, chat capability and timestamped pricing before public catalog launch. |
| **BE-4 — wallet, immutable ledger, pricing and payments** | **In progress; current-head CI passes, commercial policy open** | PostgreSQL double-entry IDR ledger, balance constraints/immutability, Serializable wallet reservation/settlement, signed idempotent local sandbox webhook, FX/policy snapshots and fixed-point calculator exist. [Exact-head run #43555703933](https://github.com/azaleaforge-ctrl/AzaleaRouter/actions/runs/43555703933) passed on SHA `6b9bcebf5073cab19af04d6f17dd2543005f6e24`. D-04/D-07/D-08/D-09/D-15 remain OPEN. Production merchant, FX source, markup, refunds/disputes and maker-checker rules are not selected; the sandbox adapter is test-only. Finish race/concurrency/reconciliation coverage and external approvals before real money movement. |
| **BE-5 — AZL keys, OpenAI-compatible gateway, provider adapter and streaming** | **In progress; current-head CI passes, activation gated** | One-time AZL- plaintext issuance, HMAC hash/pepper version, owner-scoped create/list/rotate/revoke, fixed-base OpenRouter adapter and backpressure/cancellation streaming exist. [Exact-head run #43555737313](https://github.com/azaleaforge-ctrl/AzaleaRouter/actions/runs/43555737313) passed on SHA `de0c07b45b25559a4b9e1522ec25a11c342683a0`. RPM/concurrency/spend caps are not fully enforced in this stage; BE-6 settlement is required. Gateway defaults fail closed and D-05 remains a hard paid-traffic blocker. |
| **BE-6 — usage, settlement, aggregates, model colors and SSE** | **In progress; current-head CI passes, load/reconnect evidence missing** | Usage records, pre-request reservation, actual-usage settlement, pending reconciliation, aggregates, bounded CSV, model colors and authenticated user-scoped SSE cursor replay exist. [Exact-head run #43555350560](https://github.com/azaleaforge-ctrl/AzaleaRouter/actions/runs/43555350560) passed on SHA `070cbb7c55be0203cc5440d45c89520870e57848`. Long-lived SSE reconnect/load tests and full upstream settlement E2E have not run; paid upstream E2E is intentionally blocked by D-05. Review PostgreSQL concurrency/idempotency and stale-usage recovery before stage completion. |
| **BE-7 — conversations, files, notifications, support and content** | **In progress; current-head CI passes, key integrations incomplete** | Owner-scoped conversation/message persistence, private storage boundary, MIME sniffing/quarantine, scanner interface, notifications, support and published content reads exist. [Exact-head run #43555518195](https://github.com/azaleaforge-ctrl/AzaleaRouter/actions/runs/43555518195) passed on SHA `ae4ea0277b900a486ba063f156c88dd90af45d55`. Conversation creation persists user messages, but assistant generation and usage-settlement integration remain outstanding. An unconfigured scanner fails closed, leaving files quarantined; no production storage/scanner or retention policy is selected (D-06/D-10). |
| **BE-8 — admin APIs, audit, reconciliation, monitoring and hardening** | **In progress; partial** | Read-only operations summary, bounded usage reconciliation and safe audit-log search are implemented. User/role/provider/catalog/pricing/finance mutation APIs, maker-checker, support/CMS administration, queue/dead-letter monitoring, alerting, security/privacy hardening and operational controls remain outstanding. Current PR run [#43555489408](https://github.com/azaleaforge-ctrl/AzaleaRouter/actions/runs/43555489408) returned `action_required` with no jobs; no current-head CI test executed. |
| **BE-9 — closed-beta readiness and go/no-go** | **In progress; documentation only; NO-GO** | [Readiness runbook](./BE-9-closed-beta-readiness.md) describes backup/PITR, restore, rollback, monitoring, incident/support, privacy/legal and go/no-go evidence. No production infrastructure, backup/restore drill, measured RPO/RTO, monitoring provider, on-call owner, incident exercise or approval exists. Current PR run [#43555529054](https://github.com/azaleaforge-ctrl/AzaleaRouter/actions/runs/43555529054) returned `action_required` with no jobs; no current-head CI test executed. |

## Pull requests and branch graph

All open PRs remain Draft. No PR has been merged. PR #3 and #4 are closed, unmerged, superseded BE-2 attempts; PR #5 is the current BE-2 implementation.

| PR | Stage | Head branch / SHA | Base branch / SHA | State |
|---|---|---|---|---|
| [#1](https://github.com/azaleaforge-ctrl/AzaleaRouter/pull/1) | Backend PRD v0.4 | `docs/backend-prd-v0.4-stage1` / `3121373ac3b06bb908994d453a894f1e732a96c0` | `main` / `f3853b9785b8f142e42501033d51d0dbb59ab5f0` | Open / Draft |
| [#2](https://github.com/azaleaforge-ctrl/AzaleaRouter/pull/2) | BE-1 | `feat/backend-foundation-be1` / `2d5f3b4720be31b5db7b762f269c16e0e468dd34` | PR #1 branch / `3121373ac3b06bb908994d453a894f1e732a96c0` | Open / Draft |
| [#3](https://github.com/azaleaforge-ctrl/AzaleaRouter/pull/3) | Superseded BE-2 | `feat/backend-auth-be2` / `b360b90986c07a875608170b44252e9d5142e2e2` | Old BE-1 branch | Closed / not merged |
| [#4](https://github.com/azaleaforge-ctrl/AzaleaRouter/pull/4) | Superseded BE-2 rebase | `feat/backend-auth-be2-rebased` / `924f2177eb9d33ec227a5bfdfd447cf76bb2982f` | Old BE-1 branch | Closed / not merged |
| [#5](https://github.com/azaleaforge-ctrl/AzaleaRouter/pull/5) | BE-2 | `feat/backend-auth-be2-final` / `35fc174675f60233f5d7add3ad1fdc8beb5d5fda` | BE-1 / `2d5f3b4720be31b5db7b762f269c16e0e468dd34` | Open / Draft |
| [#6](https://github.com/azaleaforge-ctrl/AzaleaRouter/pull/6) | BE-3 | `feat/backend-catalog-be3` / `0aca81a8f894e9333d601aedba53b53c55dec370` | BE-2 / `35fc174675f60233f5d7add3ad1fdc8beb5d5fda` | Open / Draft |
| [#7](https://github.com/azaleaforge-ctrl/AzaleaRouter/pull/7) | BE-4 | `feat/backend-wallet-be4` / `6b9bcebf5073cab19af04d6f17dd2543005f6e24` | BE-3 / `0aca81a8f894e9333d601aedba53b53c55dec370` | Open / Draft; base retargeted this run |
| [#8](https://github.com/azaleaforge-ctrl/AzaleaRouter/pull/8) | BE-5 | `feat/backend-gateway-be5` / `de0c07b45b25559a4b9e1522ec25a11c342683a0` | BE-4 / `6b9bcebf5073cab19af04d6f17dd2543005f6e24` | Open / Draft |
| [#9](https://github.com/azaleaforge-ctrl/AzaleaRouter/pull/9) | BE-6 | `feat/backend-usage-be6-final` / `070cbb7c55be0203cc5440d45c89520870e57848` | BE-5 / old base `d59bd3fc9192a2c3ba886e76f8e3e4495c008af6` | Open / Draft; diverged from current BE-5 |
| [#10](https://github.com/azaleaforge-ctrl/AzaleaRouter/pull/10) | BE-7 | `feat/backend-content-be7` / `ae4ea0277b900a486ba063f156c88dd90af45d55` | BE-6 / `070cbb7c55be0203cc5440d45c89520870e57848` | Open / Draft |
| [#11](https://github.com/azaleaforge-ctrl/AzaleaRouter/pull/11) | BE-8 | `feat/backend-admin-be8` / `cb7e17ef48d4afab06863d76e5e98682c801c80f` | BE-7 / old base `e6f5c00c038b66d0505ae9e07b15af51c783e63a` | Open / Draft; diverged from current BE-7 |
| [#12](https://github.com/azaleaforge-ctrl/AzaleaRouter/pull/12) | BE-9 | `feat/backend-closed-beta-be9` / `9db69b0b4f701b53a745f85ff1555b31d3b67b5f` at snapshot; this status/decision-log refresh advances this branch | BE-8 / old base `e6f5c00c038b66d0505ae9e07b15af51c783e63a` | Open / Draft; diverged from current BE-8 |

### Dependency verification

Commit comparisons were run against the current PR head SHAs:

| Dependency | Ahead | Behind | Result |
|---|---:|---:|---|
| BE-2 → BE-3 | 41 | 0 | Clean ancestry |
| BE-3 → BE-4 | 68 | 0 | Clean ancestry; PR #7 now correctly targets the BE-3 branch |
| BE-4 → BE-5 | 47 | 0 | Clean ancestry |
| BE-5 → BE-6 | 56 | 30 | **Diverged**; PR #9 must be reconciled/rebased |
| BE-6 → BE-7 | 38 | 0 | Clean ancestry |
| BE-7 → BE-8 | 26 | 27 | **Diverged**; PR #11 must be reconciled/rebased |
| BE-8 → BE-9 | 13 | 10 | **Diverged**; PR #12 must be reconciled/rebased after BE-8 |

PR #7 was retargeted from BE-2 to BE-3 because its head is a descendant of BE-3; GitHub recalculated it as mergeable. PR #9, #11 and #12 need non-force reconciliation. Do not use a synthetic merge tree that could discard overlapping changes in OpenAPI, gateway, usage, support or migration files. Inspect and preserve each side's changes, then rerun exact-head CI.

## CI evidence

| Stage / PR head | Workflow | Result |
|---|---|---|
| BE-1 `2d5f3b4` | [#43453323097](https://github.com/azaleaforge-ctrl/AzaleaRouter/actions/runs/43453323097) | Success; workflow-dispatch/frozen install; DB migrations, API, worker and workspace checks passed |
| BE-2 `35fc174` | [#43456931571](https://github.com/azaleaforge-ctrl/AzaleaRouter/actions/runs/43456931571) | Success; workspace lockfile sync job passed; PR path used non-frozen install |
| BE-3 `0aca81a` | [#43543279248](https://github.com/azaleaforge-ctrl/AzaleaRouter/actions/runs/43543279248) | Success; workflow-dispatch/frozen install; catalog, DB, API and worker checks passed |
| BE-4 `6b9bceb` | [#43555703933](https://github.com/azaleaforge-ctrl/AzaleaRouter/actions/runs/43555703933) | Success; PR path and lockfile sync passed; no follow-up frozen run because lockfile did not change |
| BE-5 `de0c07b` | [#43555737313](https://github.com/azaleaforge-ctrl/AzaleaRouter/actions/runs/43555737313) | Success; PR path and lockfile sync passed; no follow-up frozen run because lockfile did not change |
| BE-6 `070cbb7` | [#43555350560](https://github.com/azaleaforge-ctrl/AzaleaRouter/actions/runs/43555350560) | Success; PR path and lockfile sync passed; no follow-up frozen run because lockfile did not change |
| BE-7 `ae4ea02` | [#43555518195](https://github.com/azaleaforge-ctrl/AzaleaRouter/actions/runs/43555518195) | Success; PR path and lockfile sync passed; no follow-up frozen run because lockfile did not change |
| BE-8 `cb7e17e` | [#43555489408](https://github.com/azaleaforge-ctrl/AzaleaRouter/actions/runs/43555489408) | `action_required`; zero jobs, no tests executed |
| BE-9 `9db69b0` | [#43555529054](https://github.com/azaleaforge-ctrl/AzaleaRouter/actions/runs/43555529054) | `action_required`; zero jobs, no tests executed |

PR-triggered runs #43453337350 (BE-1) and #43543283919 (BE-3) also returned `action_required` with no jobs; their separate workflow-dispatch runs above passed. A run with `action_required` and zero jobs is not a test pass. The current CI workflow still uses `--no-frozen-lockfile` on PR events and only dispatches a frozen validation when the lockfile changes; make frozen install mandatory before final verification. No local clone/build/test was run in this GitHub-connector environment.

## Reviews, blockers and next actions

- Open PRs #1, #2 and #5–#12 are Draft. No submitted reviews or inline review threads were returned for these open PRs; reviewer approval is not evidenced.
- No merge was performed. PR #3 and #4 remain closed and unmerged.
- Reconcile PR #9 onto the latest BE-5 head without dropping usage/gateway changes; rerun tests.
- Reconcile PR #11 onto the latest BE-7 head without dropping admin, support, gateway, usage or migration fixes; rerun tests.
- Reconcile PR #12 onto the corrected BE-8 head after #11; rerun CI.
- Make frozen-lockfile install mandatory for all PR CI and verify the full suite on exact heads.
- Finish BE-7 assistant-generation/usage integration and production-grade storage/scanning decision boundary; finish BE-8 admin mutation/maker-checker, job monitoring/alerts and hardening; execute BE-9 operational drills only after infrastructure and owners are approved.
- Obtain explicit external decisions/credentials for D-02/D-03/D-04/D-05/D-06/D-07/D-08/D-09/D-10/D-12/D-14/D-15/D-18. D-05 written permission and legal review are mandatory before paid production. No paid upstream call, customer charge, release or deployment is permitted.
- Only after all BE-0..BE-9 criteria are evidenced, reviews resolved, exact-head CI green, dependency chain clean and final audit passed may PRs be merged one at a time in dependency order, verifying each merge commit before proceeding.
