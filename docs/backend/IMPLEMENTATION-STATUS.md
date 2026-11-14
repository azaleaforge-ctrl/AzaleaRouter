# Backend implementation status

**Last verified:** 14 November 2026 (Asia/Jakarta)  
**Authority:** Backend PRD v0.4, live PR metadata, current branch refs/head SHAs, commit comparisons, review threads and GitHub Actions.  
**Completion rule:** A stage is Done only when implementation, contracts, documentation, security/privacy requirements, tests and exact-head CI satisfy its PRD exit criteria.

## Overall status

**BE-0 through BE-9 are not all complete. No PR has been merged.** All open PRs remain Draft. No release, deployment, production personal-data processing, live payment or paid upstream traffic is authorized.

Implementation exists for every stage, but several stages remain partial or externally blocked. Exact-head CI passed for current heads BE-1 through BE-8 and for BE-9's previous dependency head; the latest BE-9 documentation head has a fresh exact-head CI run in progress. The 50-model catalog threshold is unmet: **0 verified active chat-capable models**. BE-8 is still read-only/partial, and BE-9 is a runbook template rather than operational evidence. The branch chain has been reconciled into clean dependency ancestry through BE-9 using non-force merge commits; no PR was merged.

## Stage tracker

| Stage | Status | Current evidence and remaining exit criteria |
|---|---|---|
| **BE-0 — architecture, legal/upstream, privacy and launch decisions** | **In progress; paid launch blocked** | [Decision log](./DECISION-LOG.md). D-01 is a reversible PostgreSQL 16/Prisma 7.10.1 local/test baseline only. D-02 domain/proxy, D-03 identity/session approval, D-04 merchant/payment, D-06 storage/scanner, D-07 FX, D-08 markup, D-09 refunds/disputes, D-10 privacy/retention/legal basis, D-12 email, D-13 hosted observability, D-14 backup/PITR/RPO/RTO, D-15 maker-checker thresholds and D-18 support/incident ownership remain OPEN. D-05 is a hard paid-production blocker: the official [OpenRouter Terms](https://openrouter.ai/terms), last updated 31 Aug 2026, §7(4) prohibits resale of Model API access/competing-service use; §5.1 does not expressly waive that restriction. No signed exception or downstream permission is recorded. |
| **BE-1 — API, worker, database and CI foundation** | **In progress; technical baseline implemented** | Express 5/TypeScript API, BullMQ worker, Redis, Zod config, request IDs, safe structured logs, OpenAPI 3.1 lint, PostgreSQL/Prisma local-test schema/migrations, CI and committed workspace lockfile exist. [Exact-head run #43453323097](https://github.com/azaleaforge-ctrl/AzaleaRouter/actions/runs/43453323097) passed on SHA `2d5f3b4720be31b5db7b762f269c16e0e468dd34`, including frozen install. Remaining: finish the observability/exporter boundary and make frozen-lockfile validation mandatory for every PR run. Production DB host/region/backup credentials remain unselected until approved. |
| **BE-2 — authentication, account lifecycle, roles and consent** | **In progress; implementation and CI pass** | Provider-neutral session verifier, gated Supabase Auth REST adapter, opaque local sessions, encrypted provider tokens, CSRF/Origin checks, Turnstile Siteverify/replay control, persistent HMAC rate limits, profile/preferences/consent endpoints and ownership/RBAC policies exist. [Exact-head run #43456931571](https://github.com/azaleaforge-ctrl/AzaleaRouter/actions/runs/43456931571) passed on SHA `35fc174675f60233f5d7add3ad1fdc8beb5d5fda`. No approved staging identity/email/Turnstile credentials or complete staging signup→verify→login→refresh→logout→recovery E2E evidence exists. D-03/D-10/D-12 remain OPEN; auth is disabled by default. |
| **BE-3 — canonical model catalog and provider metadata** | **In progress; code and CI pass, launch count unmet** | Canonical developer/provider/model/endpoint/pricing snapshot schema, OpenRouter metadata adapter, sync worker, validation and catalog read APIs exist. [Exact-head run #43543279248](https://github.com/azaleaforge-ctrl/AzaleaRouter/actions/runs/43543279248) passed on SHA `0aca81a8f894e9333d601aedba53b53c55dec370`, including frozen install. Approved sync has not run; verified active canonical chat-capable model count is **0**, not 50. Do not seed or fabricate models/prices. Obtain approved metadata source/credential, sync current records, and verify 50 distinct canonical models, active endpoints, chat capability and timestamped pricing before public catalog launch. |
| **BE-4 — wallet, immutable ledger, pricing and payments** | **In progress; exact-head CI passes, commercial policy open** | PostgreSQL double-entry IDR ledger, balance constraints/immutability, Serializable wallet reservation/settlement, signed idempotent local sandbox webhook, FX/policy snapshots and fixed-point calculator exist. [Exact-head run #43555703933](https://github.com/azaleaforge-ctrl/AzaleaRouter/actions/runs/43555703933) passed on SHA `6b9bcebf5073cab19af04d6f17dd2543005f6e24`. D-04/D-07/D-08/D-09/D-15 remain OPEN. Production merchant, FX source, markup, refunds/disputes and maker-checker rules are not selected; sandbox adapter is test-only. Finish competing-reservation/concurrency and reconciliation coverage before real money movement. |
| **BE-5 — AZL keys, OpenAI-compatible gateway, provider adapter and streaming** | **In progress; exact-head CI passes, activation gated** | One-time AZL- plaintext issuance, HMAC hash/pepper version, owner-scoped create/list/rotate/revoke, fixed-base OpenRouter adapter and backpressure/cancellation streaming exist. [Exact-head run #43555737313](https://github.com/azaleaforge-ctrl/AzaleaRouter/actions/runs/43555737313) passed on SHA `de0c07b45b25559a4b9e1522ec25a11c342683a0`. RPM/concurrency/spend caps are not fully enforced in this stage; BE-6 settlement is required. Gateway defaults fail closed and D-05 remains a hard paid-traffic blocker. |
| **BE-6 — usage, settlement, aggregates, model colors and SSE** | **In progress; exact-head CI passes, load/reconnect evidence missing** | Usage records, pre-request reservation, actual-usage settlement, pending reconciliation, aggregates, bounded CSV, model colors and authenticated user-scoped SSE cursor replay exist. [Exact-head PR run #43556397404](https://github.com/azaleaforge-ctrl/AzaleaRouter/actions/runs/43556397404) and [push run #43556394344](https://github.com/azaleaforge-ctrl/AzaleaRouter/actions/runs/43556394344) passed on current SHA `eed42b6168b667c1f7ec891381c4428dbbcc3c8d`. Long-lived SSE reconnect/load tests and external upstream settlement E2E have not run; paid upstream E2E is intentionally blocked by D-05. |
| **BE-7 — conversations, files, notifications, support and content** | **In progress; exact-head CI passes, key integrations incomplete** | Owner-scoped conversation/message persistence, private storage boundary, MIME sniffing/quarantine, scanner interface, notifications, support and published content reads exist. [Exact-head PR run #43556580108](https://github.com/azaleaforge-ctrl/AzaleaRouter/actions/runs/43556580108) and [push run #43556574284](https://github.com/azaleaforge-ctrl/AzaleaRouter/actions/runs/43556574284) passed on current SHA `d7241b89c5bc8c0897237081f04be506e2687c91`. Conversation creation persists user messages, but assistant generation and usage-settlement integration remain outstanding. An unconfigured scanner fails closed, leaving files quarantined; no production storage/scanner or retention policy is selected (D-06/D-10). |
| **BE-8 — admin APIs, audit, reconciliation, monitoring and hardening** | **In progress; partial** | Read-only operations summary, bounded usage reconciliation and safe audit-log search are implemented. [Exact-head PR run #43556588351](https://github.com/azaleaforge-ctrl/AzaleaRouter/actions/runs/43556588351) and [push run #43556583987](https://github.com/azaleaforge-ctrl/AzaleaRouter/actions/runs/43556583987) passed on current SHA `e8baa01ac2113939ca5a726db30b1f2dc3e7721c`. User/role/provider/catalog/pricing/finance mutation APIs, maker-checker, support/CMS administration, queue/dead-letter monitoring, alerting, security/privacy hardening and operational controls remain outstanding. Read-only APIs do not satisfy the full admin stage. |
| **BE-9 — closed-beta readiness and go/no-go** | **In progress; documentation only; NO-GO** | [Readiness runbook](./BE-9-closed-beta-readiness.md) describes backup/PITR, restore, rollback, monitoring, incident/support, privacy/legal and go/no-go evidence. [Exact-head PR run #43556597947](https://github.com/azaleaforge-ctrl/AzaleaRouter/actions/runs/43556597947) and [push run #43556594584](https://github.com/azaleaforge-ctrl/AzaleaRouter/actions/runs/43556594584) passed on dependency-reconciliation SHA `ceb80423cc305a2d4f99fb234ad8ec38bfcc4443`. The latest documentation head at this snapshot is `e5a83d1c075b5e74a7b735e71a036d622f4bda55`; [PR run #43556845210](https://github.com/azaleaforge-ctrl/AzaleaRouter/actions/runs/43556845210) and [push run #43556842823](https://github.com/azaleaforge-ctrl/AzaleaRouter/actions/runs/43556842823) are in progress. No production infrastructure, backup/restore drill, measured RPO/RTO, monitoring provider, on-call owner, incident exercise or approval exists. Recommendation remains **NO-GO**. |

## Pull requests and branch graph

All open PRs remain Draft. No PR has been merged. PR #3 and #4 are closed, unmerged, superseded BE-2 attempts; PR #5 is the current BE-2 implementation. Base SHAs below are the live target-branch refs verified from Git refs and commit comparisons.

| PR | Stage | Head branch / SHA | Base branch / SHA | State |
|---|---|---|---|---|
| [#1](https://github.com/azaleaforge-ctrl/AzaleaRouter/pull/1) | Backend PRD v0.4 | `docs/backend-prd-v0.4-stage1` / `3121373ac3b06bb908994d453a894f1e732a96c0` | `main` / `f3853b9785b8f142e42501033d51d0dbb59ab5f0` | Open / Draft |
| [#2](https://github.com/azaleaforge-ctrl/AzaleaRouter/pull/2) | BE-1 | `feat/backend-foundation-be1` / `2d5f3b4720be31b5db7b762f269c16e0e468dd34` | PR #1 branch / `3121373ac3b06bb908994d453a894f1e732a96c0` | Open / Draft |
| [#3](https://github.com/azaleaforge-ctrl/AzaleaRouter/pull/3) | Superseded BE-2 | `feat/backend-auth-be2` / `b360b90986c07a875608170b44252e9d5142e2e2` | Old BE-1 branch | Closed / not merged |
| [#4](https://github.com/azaleaforge-ctrl/AzaleaRouter/pull/4) | Superseded BE-2 rebase | `feat/backend-auth-be2-rebased` / `924f2177eb9d33ec227a5bfdfd447cf76bb2982f` | Old BE-1 branch | Closed / not merged |
| [#5](https://github.com/azaleaforge-ctrl/AzaleaRouter/pull/5) | BE-2 | `feat/backend-auth-be2-final` / `35fc174675f60233f5d7add3ad1fdc8beb5d5fda` | BE-1 / `2d5f3b4720be31b5db7b762f269c16e0e468dd34` | Open / Draft |
| [#6](https://github.com/azaleaforge-ctrl/AzaleaRouter/pull/6) | BE-3 | `feat/backend-catalog-be3` / `0aca81a8f894e9333d601aedba53b53c55dec370` | BE-2 / `35fc174675f60233f5d7add3ad1fdc8beb5d5fda` | Open / Draft |
| [#7](https://github.com/azaleaforge-ctrl/AzaleaRouter/pull/7) | BE-4 | `feat/backend-wallet-be4` / `6b9bcebf5073cab19af04d6f17dd2543005f6e24` | BE-3 / `0aca81a8f894e9333d601aedba53b53c55dec370` | Open / Draft; base retargeted to BE-3 |
| [#8](https://github.com/azaleaforge-ctrl/AzaleaRouter/pull/8) | BE-5 | `feat/backend-gateway-be5` / `de0c07b45b25559a4b9e1522ec25a11c342683a0` | BE-4 / `6b9bcebf5073cab19af04d6f17dd2543005f6e24` | Open / Draft |
| [#9](https://github.com/azaleaforge-ctrl/AzaleaRouter/pull/9) | BE-6 | `feat/backend-usage-be6-final` / `eed42b6168b667c1f7ec891381c4428dbbcc3c8d` | BE-5 / `de0c07b45b25559a4b9e1522ec25a11c342683a0` | Open / Draft |
| [#10](https://github.com/azaleaforge-ctrl/AzaleaRouter/pull/10) | BE-7 | `feat/backend-content-be7` / `d7241b89c5bc8c0897237081f04be506e2687c91` | BE-6 / `eed42b6168b667c1f7ec891381c4428dbbcc3c8d` | Open / Draft |
| [#11](https://github.com/azaleaforge-ctrl/AzaleaRouter/pull/11) | BE-8 | `feat/backend-admin-be8` / `e8baa01ac2113939ca5a726db30b1f2dc3e7721c` | BE-7 / `d7241b89c5bc8c0897237081f04be506e2687c91` | Open / Draft |
| [#12](https://github.com/azaleaforge-ctrl/AzaleaRouter/pull/12) | BE-9 | `feat/backend-closed-beta-be9` / `e5a83d1c075b5e74a7b735e71a036d622f4bda55` at snapshot; this status commit advances the branch | BE-8 / `e8baa01ac2113939ca5a726db30b1f2dc3e7721c` | Open / Draft |

### Dependency verification

All dependency comparisons below were re-run against live branch refs after reconciliation:

| Dependency | Ahead | Behind | Result |
|---|---:|---:|---|
| BE-2 → BE-3 | 41 | 0 | Clean ancestry |
| BE-3 → BE-4 | 68 | 0 | Clean ancestry |
| BE-4 → BE-5 | 47 | 0 | Clean ancestry |
| BE-5 → BE-6 | 57 | 0 | Clean ancestry; BE-6 now has current BE-5 as first parent |
| BE-6 → BE-7 | 39 | 0 | Clean ancestry; BE-7 includes reconciled BE-6 |
| BE-7 → BE-8 | 28 | 0 | Clean ancestry; BE-8 includes reconciled BE-7 |
| BE-8 → BE-9 | 19 | 0 | Clean ancestry; BE-9 includes reconciled BE-8 and two documentation refresh commits |

The branch history was reconciled using non-force merge commits that retain the previous feature head as a parent and preserve the reviewed feature tree. No PR was merged. PR #7 was also retargeted from BE-2 to BE-3 so its review diff is stage-scoped. All open PRs currently report mergeable; this is not permission to merge before the global BE-0..BE-9 gate.

## CI evidence

| Stage / current head | Workflow | Result |
|---|---|---|
| BE-1 `2d5f3b4` | [#43453323097](https://github.com/azaleaforge-ctrl/AzaleaRouter/actions/runs/43453323097) | Success; workflow-dispatch used frozen install; DB migrations, API, worker and workspace checks passed |
| BE-2 `35fc174` | [#43456931571](https://github.com/azaleaforge-ctrl/AzaleaRouter/actions/runs/43456931571) | Success; workspace lockfile sync passed; PR install was non-frozen |
| BE-3 `0aca81a` | [#43543279248](https://github.com/azaleaforge-ctrl/AzaleaRouter/actions/runs/43543279248) | Success; workflow-dispatch used frozen install; catalog, DB, API and worker checks passed |
| BE-4 `6b9bceb` | [#43555703933](https://github.com/azaleaforge-ctrl/AzaleaRouter/actions/runs/43555703933) | Success; PR install and lockfile sync passed; frozen follow-up skipped because lockfile unchanged |
| BE-5 `de0c07b` | [#43555737313](https://github.com/azaleaforge-ctrl/AzaleaRouter/actions/runs/43555737313) | Success; PR install and lockfile sync passed; frozen follow-up skipped because lockfile unchanged |
| BE-6 `eed42b6` | [#43556397404](https://github.com/azaleaforge-ctrl/AzaleaRouter/actions/runs/43556397404) / [push #43556394344](https://github.com/azaleaforge-ctrl/AzaleaRouter/actions/runs/43556394344) | Both passed; exact-head PR job and push job passed; frozen follow-up skipped because lockfile unchanged |
| BE-7 `d7241b8` | [#43556580108](https://github.com/azaleaforge-ctrl/AzaleaRouter/actions/runs/43556580108) / [push #43556574284](https://github.com/azaleaforge-ctrl/AzaleaRouter/actions/runs/43556574284) | Both passed; exact-head PR job and push job passed; frozen follow-up skipped because lockfile unchanged |
| BE-8 `e8baa01` | [#43556588351](https://github.com/azaleaforge-ctrl/AzaleaRouter/actions/runs/43556588351) / [push #43556583987](https://github.com/azaleaforge-ctrl/AzaleaRouter/actions/runs/43556583987) | Both passed; exact-head PR job and push job passed; frozen follow-up skipped because lockfile unchanged |
| BE-9 `ceb8042` (prior dependency head) | [#43556597947](https://github.com/azaleaforge-ctrl/AzaleaRouter/actions/runs/43556597947) / [push #43556594584](https://github.com/azaleaforge-ctrl/AzaleaRouter/actions/runs/43556594584) | Both passed; frozen follow-up skipped because lockfile unchanged. Latest docs head `e5a83d1` has fresh CI #43556845210/#43556842823 in progress |

The PR-triggered runs #43453337350 (BE-1) and #43543283919 (BE-3) returned `action_required` with zero jobs; their separate workflow-dispatch runs above passed. For BE-2 and BE-4 through BE-9, PR workflows use `--no-frozen-lockfile`; the lockfile-sync job passed, but the frozen validation step was skipped when no lockfile change occurred. Make frozen install mandatory for every PR before final verification. No local clone/build/test was run in this GitHub-connector environment.

## Reviews, blockers and next actions

- Open PRs #1, #2 and #5–#12 remain Draft. No submitted reviews or inline review threads were returned for these open PRs; reviewer approval is not evidenced.
- No merge was performed. PR #3 and #4 remain closed and unmerged.
- Make frozen-lockfile install mandatory for all PR CI and verify the full suite on exact heads.
- Complete BE-6 SSE reconnect/load and settlement reconciliation tests; complete BE-7 assistant-generation/usage integration and production-grade storage/scanning decision boundary.
- Complete BE-8 admin mutation APIs, maker-checker, job/dead-letter monitoring, alerting and security/privacy hardening.
- Execute BE-9 backup/restore, rollback, monitoring and incident drills only after production infrastructure, RPO/RTO and accountable owners are approved.
- Obtain explicit external decisions/credentials for D-02/D-03/D-04/D-05/D-06/D-07/D-08/D-09/D-10/D-12/D-14/D-15/D-18. D-05 written permission and legal review are mandatory before paid production. The catalog must reach 50 verified canonical chat-capable models before public launch.
- Only after all BE-0..BE-9 criteria are evidenced, reviews resolved, exact-head CI green, dependency chain clean and final audit passed may PRs be merged one at a time in dependency order, verifying each merge commit before proceeding. No release, deployment, customer charging or paid upstream traffic is authorized.
