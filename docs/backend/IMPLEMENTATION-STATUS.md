# Backend implementation status

**Last updated:** 14 November 2026 (Asia/Jakarta)  
**Authority:** Backend PRD v0.4, live branch refs, pull-request metadata, commit ancestry and GitHub Actions runs.  
**Merge authorization:** Merge only after every BE-0..BE-9 stage is complete and verified. No PR has been merged. No release, deployment or paid traffic is authorized.

## Overall status

All roadmap stages now have implementation branches or a readiness artifact, but BE-0..BE-9 are **not complete**. BE-1 technical foundation has exact-head CI success. BE-2/3 have code and earlier exact-head CI success but external/staging/catalog acceptance remains incomplete. BE-4/6/7 current-head workflows are running after fixes. BE-8 latest head lacks exact-head CI. BE-9 is a runbook template only; no operational drill has been executed.

The branch graph is materially diverged at every stage boundary after BE-2. GitHub currently reports the open PRs as mergeable, but that flag does not establish a clean staged dependency chain. No merge is permitted until ancestry and overlapping diffs are reconciled and all stage exit criteria pass.

## Stage tracker

| Stage | Status | Evidence and remaining exit criteria |
|---|---|---|
| **BE-0 — architecture, legal/upstream, privacy and launch decisions** | **Blocked / In progress** | [Decision log](./DECISION-LOG.md). D-01 is only a reversible PostgreSQL/Prisma local-test baseline. D-05 is a hard paid-launch blocker: public OpenRouter terms create a resale/competing-service issue and no signed downstream permission is recorded. D-02 domain/proxy, D-03 identity provider, D-04 merchant, D-06 storage/scanner, D-07 FX, D-08 markup, D-09 refunds/disputes, D-10 privacy/retention/legal basis, D-12 email, D-13 observability vendor, D-14 backup/PITR/RPO/RTO, D-15 maker-checker thresholds and D-18 support/incident process remain open. No user/business approval is inferred. |
| **BE-1 — API/worker/database foundation** | **Done — technical scope only** | Express 5 API, BullMQ worker, Redis Compose, PostgreSQL/Prisma local-test schema/migrations, Zod config, safe structured logging, OpenAPI, workspace lockfile and CI. Exact-head workflow [#43453323097](https://github.com/azaleaforge-ctrl/AzaleaRouter/actions/runs/43453323097) succeeded on SHA 2d5f3b4720be31b5db7b762f269c16e0e468dd34. Production DB host/region, credentials, backup/PITR and hosted observability are not approved. |
| **BE-2 — authentication, account lifecycle and RBAC** | **In progress** | Provider-neutral session boundary, gated Supabase Auth adapter, opaque sessions, CSRF/Origin checks, Turnstile Siteverify/replay control, DB rate limits, profile/preferences/consent and role/ownership policies. Exact-head CI [#43456931571](https://github.com/azaleaforge-ctrl/AzaleaRouter/actions/runs/43456931571) succeeded on SHA 35fc174675f60233f5d7add3ad1fdc8beb5d5fda. Staging E2E with approved identity/email/Turnstile credentials is not evidenced. D-03/D-10/D-12 remain open; auth is disabled by default. |
| **BE-3 — canonical model catalog and provider metadata** | **In progress** | Canonical catalog schema, metadata sync adapter, endpoints/pricing snapshots, read APIs and CI. Exact-head workflow [#43543279248](https://github.com/azaleaforge-ctrl/AzaleaRouter/actions/runs/43543279248) succeeded on SHA 0aca81a8f894e9333d601aedba53b53c55dec370. Sync has not been run with approved source credentials; verified active chat-capable model count is **0**, not 50. Public catalog launch remains blocked until 50 distinct valid models are verified with current pricing/endpoints and terms. |
| **BE-4 — wallet, immutable ledger and payment intents** | **In progress** | IDR double-entry ledger, DB balancing/immutability guards, serializable reservations/settlement, sandbox webhook inbox, FX/policy snapshots and fixed-point calculator. Earlier workflow [#43543657886](https://github.com/azaleaforge-ctrl/AzaleaRouter/actions/runs/43543657886) passed on SHA c83ddab7712d677a41709c63232cbd977ce5baf2; current branch head is 48ce0183008d2d445569bd24fc96b1c7e8d6a755 after a readiness-doc commit. Exact-head push/PR workflows [#43554355245](https://github.com/azaleaforge-ctrl/AzaleaRouter/actions/runs/43554355245) and [#43554360382](https://github.com/azaleaforge-ctrl/AzaleaRouter/actions/runs/43554360382) are in progress. D-04/D-07/D-08/D-09/D-15 remain open; sandbox only, no merchant/live payment. |
| **BE-5 — AZL keys, OpenAI gateway, provider adapter and streaming** | **In progress** | Hashed AZL key lifecycle, owner-scoped management, OpenRouter adapter and fail-closed gateway. Exact-head workflow [#43543726768](https://github.com/azaleaforge-ctrl/AzaleaRouter/actions/runs/43543726768) succeeded on SHA d59bd3fc9192a2c3ba886e76f8e3e4495c008af6. BE-6 settlement/quota enforcement and complete adapter contract coverage are prerequisites; gateway/upstream remain disabled because D-05 is unresolved. |
| **BE-6 — usage, settlement, aggregates, model colors and SSE** | **In progress** | Usage records, pre-request reservations, actual-usage settlement, pending reconciliation, aggregates, bounded CSV export, model colors, user-scoped SSE replay and cleanup worker exist on feat/backend-usage-be6-final, current head 4af7b08fed22c91fb7a1de6e31215b1663e36ea8. Fixed migration 006 (model-color checks, duplicate outbox constraint) and aligned reconciliation status with the database contract. Exact-head push/PR workflows [#43554313199](https://github.com/azaleaforge-ctrl/AzaleaRouter/actions/runs/43554313199) and [#43554317958](https://github.com/azaleaforge-ctrl/AzaleaRouter/actions/runs/43554317958) are in progress. Earlier run [#43543748462](https://github.com/azaleaforge-ctrl/AzaleaRouter/actions/runs/43543748462) was cancelled on old head 8c6c255. PostgreSQL concurrency, SSE reconnect/load and long-lived tests remain to be reviewed after CI. |
| **BE-7 — conversations, files, notifications, support and content** | **In progress** | Owner-scoped conversation/message persistence, local private storage boundary, MIME sniffing/quarantine, notifications, support and published content reads exist on feat/backend-content-be7, current head 606adf382eedefb6c59916997cf5a9b8a3e6f01f. See [BE-7 readiness](./BE-7-content-readiness.md). Fixed inherited migration 006 and reconciliation-state mismatch. Exact-head push run [#43554316043](https://github.com/azaleaforge-ctrl/AzaleaRouter/actions/runs/43554316043) is pending and PR run [#43554320289](https://github.com/azaleaforge-ctrl/AzaleaRouter/actions/runs/43554320289) is in progress. Earlier runs failed on malformed/duplicated migration SQL; current runs must pass before acceptance. Message creation persists user messages only; model generation/usage settlement integration is missing. Unconfigured scanner returns unknown, so files remain quarantined; production storage/scanner and D-06/D-10 are unresolved. |
| **BE-8 — admin APIs, audit, reconciliation, monitoring and hardening** | **In progress — partial** | Read-only operations summary, cursor-paginated usage reconciliation and safe audit metadata search are on feat/backend-admin-be8, current head e6f5c00c038b66d0505ae9e07b15af51c783e63a. Raw before/after audit JSON is not returned. See [BE-8 readiness](./BE-8-admin-readiness.md). Earlier workflows [#43554319816](https://github.com/azaleaforge-ctrl/AzaleaRouter/actions/runs/43554319816) and [#43554323870](https://github.com/azaleaforge-ctrl/AzaleaRouter/actions/runs/43554323870) are running on previous head 4b4f00ef; no exact-current-head run is recorded yet. User/provider/catalog/pricing/finance mutation APIs, maker-checker, support/CMS administration, job monitoring, alerting, security/privacy hardening and operational controls remain outstanding. |
| **BE-9 — closed-beta readiness and go/no-go** | **In progress — documentation only; NO-GO** | [BE-9 readiness runbook](./BE-9-closed-beta-readiness.md) now documents backup/restore, rollback, monitoring, incident/support, privacy/legal and go/no-go gates. It explicitly records that no production infrastructure, backup/restore drill, RPO/RTO, alerting, on-call owner or approvals exist. No operational drill has run. |

## Pull requests and branch chain

All open PRs remain Draft. No PR has been merged.

| PR | Stage | Head branch | Base branch | Current state |
|---|---|---|---|---|
| [#1 Backend PRD v0.4](https://github.com/azaleaforge-ctrl/AzaleaRouter/pull/1) | Requirements / BE-0 | docs/backend-prd-v0.4-stage1 | main | Draft / open / mergeable |
| [#2 BE-1 foundation](https://github.com/azaleaforge-ctrl/AzaleaRouter/pull/2) | BE-1 | feat/backend-foundation-be1 | PRD branch | Draft / open / mergeable |
| [#3 partial BE-2](https://github.com/azaleaforge-ctrl/AzaleaRouter/pull/3) | Superseded | feat/backend-auth-be2 | BE-1 branch | Closed / not merged / stale |
| [#4 rebased partial BE-2](https://github.com/azaleaforge-ctrl/AzaleaRouter/pull/4) | Superseded | feat/backend-auth-be2-rebased | BE-1 branch | Closed / not merged / superseded |
| [#5 BE-2 auth](https://github.com/azaleaforge-ctrl/AzaleaRouter/pull/5) | BE-2 | feat/backend-auth-be2-final | BE-1 branch | Draft / open / mergeable |
| [#6 BE-3 catalog](https://github.com/azaleaforge-ctrl/AzaleaRouter/pull/6) | BE-3 | feat/backend-catalog-be3 | BE-2 branch | Draft / open / mergeable |
| [#7 BE-4 wallet/ledger](https://github.com/azaleaforge-ctrl/AzaleaRouter/pull/7) | BE-4 | feat/backend-wallet-be4 | BE-2 branch | Draft / open / mergeable; contains overlapping BE-3 work |
| [#8 BE-5 gateway](https://github.com/azaleaforge-ctrl/AzaleaRouter/pull/8) | BE-5 | feat/backend-gateway-be5 | BE-4 branch | Draft / open / mergeable |
| [#9 BE-6 usage](https://github.com/azaleaforge-ctrl/AzaleaRouter/pull/9) | BE-6 | feat/backend-usage-be6-final | BE-5 branch | Draft / open / mergeable; branch ancestry diverged |
| [#10 BE-7 content/chat](https://github.com/azaleaforge-ctrl/AzaleaRouter/pull/10) | BE-7 | feat/backend-content-be7 | BE-6 branch | Draft / open / mergeable; branch ancestry diverged |
| [#11 BE-8 admin](https://github.com/azaleaforge-ctrl/AzaleaRouter/pull/11) | BE-8 | feat/backend-admin-be8 | BE-7 branch | Draft / open / mergeable; branch ancestry diverged |
| [#12 BE-9 operations](https://github.com/azaleaforge-ctrl/AzaleaRouter/pull/12) | BE-9 | feat/backend-closed-beta-be9 | BE-8 branch | Draft / open / mergeability recalculation pending |

### Dependency/ancestry issues

Current compare_commits results show these branch pairs are diverged, not clean fast-forward stacks:

| Compare | Ahead | Behind | Implication |
|---|---:|---:|---|
| BE-3 → BE-4 | 66 | 8 | BE-4 includes overlapping catalog work but does not descend from BE-3 |
| BE-4 → BE-5 | 46 | 10 | BE-5 and latest BE-4 have separate histories |
| BE-5 → BE-6 | 47 | 9 | BE-6 is not based on latest BE-5 |
| BE-6 → BE-7 | 26 | 4 | BE-7 includes BE-6 changes but misses later BE-6 commits |
| BE-7 → BE-8 | 14 | 2 | BE-8 includes BE-7 changes but misses later BE-7 commits |

1. PR #6 and PR #7 both target the BE-2 branch. PR #7 contains overlapping BE-3 catalog work plus BE-4 changes. After all stages finish, merge #6 first, then re-fetch PR #7 and confirm its diff is clean against the updated base.
2. PR #8 is based on the BE-4 branch. After PR #7 is merged into the updated BE-2 branch, retarget/revalidate PR #8 against the branch that now contains BE-3 and BE-4 before merging.
3. Reconcile BE-5/BE-6/BE-7/BE-8 ancestry with non-force, reviewable merge commits or replacement branches. Do not rely on GitHub's mergeable=true alone; inspect actual diffs and preserve every feature change.
4. BE-9 is based on BE-8 head e6f5c00c; revalidate its base after BE-8 changes.
5. PR #3 and #4 remain closed/unmerged; PR #5 is the current BE-2 implementation.

## CI evidence and current checks

| Stage / branch | SHA | Workflow evidence | Current result |
|---|---|---|---|
| BE-1 | 2d5f3b4720be31b5db7b762f269c16e0e468dd34 | [#43453323097](https://github.com/azaleaforge-ctrl/AzaleaRouter/actions/runs/43453323097) | Success |
| BE-2 | 35fc174675f60233f5d7add3ad1fdc8beb5d5fda | [#43456931571](https://github.com/azaleaforge-ctrl/AzaleaRouter/actions/runs/43456931571) | Success |
| BE-3 | 0aca81a8f894e9333d601aedba53b53c55dec370 | [#43543279248](https://github.com/azaleaforge-ctrl/AzaleaRouter/actions/runs/43543279248) | Success |
| BE-4 | 48ce0183008d2d445569bd24fc96b1c7e8d6a755 | [#43554355245](https://github.com/azaleaforge-ctrl/AzaleaRouter/actions/runs/43554355245), [#43554360382](https://github.com/azaleaforge-ctrl/AzaleaRouter/actions/runs/43554360382) | In progress |
| BE-5 | d59bd3fc9192a2c3ba886e76f8e3e4495c008af6 | [#43543726768](https://github.com/azaleaforge-ctrl/AzaleaRouter/actions/runs/43543726768) | Success |
| BE-6 | 4af7b08fed22c91fb7a1de6e31215b1663e36ea8 | [#43554313199](https://github.com/azaleaforge-ctrl/AzaleaRouter/actions/runs/43554313199), [#43554317958](https://github.com/azaleaforge-ctrl/AzaleaRouter/actions/runs/43554317958) | In progress |
| BE-7 | 606adf382eedefb6c59916997cf5a9b8a3e6f01f | [#43554316043](https://github.com/azaleaforge-ctrl/AzaleaRouter/actions/runs/43554316043), [#43554320289](https://github.com/azaleaforge-ctrl/AzaleaRouter/actions/runs/43554320289) | Pending / in progress |
| BE-8 | e6f5c00c038b66d0505ae9e07b15af51c783e63a | Earlier [#43554319816](https://github.com/azaleaforge-ctrl/AzaleaRouter/actions/runs/43554319816) and [#43554323870](https://github.com/azaleaforge-ctrl/AzaleaRouter/actions/runs/43554323870) were on previous head 4b4f00ef | Exact-current-head run not recorded |
| BE-9 | ce63f7a033fea3f31a9db9da7b945c84bf3e1b45 | — | Not run |

The earlier BE-7 workflow failed first on malformed migration 006 SQL (syntax error near legacy) and then on a duplicate outbox_events_attempts_nonnegative constraint already created by BE-1. Both issues have been corrected in the current BE-6/7/8 branches; current exact-head workflows must prove the fix. The current local environment has not run a clone/install/build/test.

PR-triggered runs that return action_required with no jobs are not CI passes. Workflow-dispatch/push success is only evidence for its exact tested SHA.

## Merge gate and next actions

- Do not merge any PR. BE-0..BE-9 are not all complete; branch ancestry is diverged; current CI for BE-4/6/7 is in progress; BE-8 current-head CI and BE-9 operational evidence are missing.
- Keep all PRs Draft. Do not bypass workflow approval, branch protection, reviews or checks.
- After current CI completes, inspect logs and fix all failures. Then finish BE-7 generation/storage/scanner integration, complete BE-8 admin mutation workflows with maker-checker and job/alert controls, and turn BE-9 runbook templates into tested operational evidence when infrastructure/owners are approved.
- External owner decisions remain necessary for D-02/D-03/D-04/D-05/D-06/D-07/D-08/D-09/D-10/D-12/D-14/D-15/D-18. D-05 written upstream permission and legal review are mandatory before paid production. No paid upstream call or customer debit is permitted.
- Only after all stages are evidence-backed, all reviews/threads resolved, exact-head checks green, ancestry/conflicts reconciled and final audit passed may PRs be merged one at a time in dependency order, verifying each merge commit before proceeding.
