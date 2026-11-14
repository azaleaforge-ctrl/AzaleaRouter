# Backend implementation status

**Last updated:** 14 November 2026 (Asia/Jakarta)  
**Authority:** Backend PRD v0.4, live branch heads, pull-request metadata, commit ancestry and GitHub Actions runs.  
**Merge authorization:** Merge only after every BE-0..BE-9 stage is complete and verified. No backend PR has been merged. No release, deployment or paid traffic is authorized.

## Overall status

Implementation now reaches BE-8, but no stage beyond the BE-1 technical foundation is fully closed against every PRD exit criterion. The current branch graph is not yet a clean dependency chain: BE-4 contains overlapping BE-3 changes, BE-6 diverges from the latest BE-5 head, and the newly opened BE-6/7/8 PRs are not currently mergeable according to GitHub metadata. Keep all PRs Draft and unmerged.

## Stage tracker

| Stage | Status | Evidence and remaining exit criteria |
|---|---|---|
| **BE-0 — architecture, legal/upstream, privacy and launch decisions** | **Blocked / In progress** | [Decision log](./DECISION-LOG.md). D-01 is selected only as a reversible PostgreSQL/Prisma local-test baseline. D-05 is a hard paid-launch blocker: OpenRouter public terms prohibit API resale/competing service absent written clarification/exception; no signed downstream permission is recorded. D-02 domain/proxy, D-03 identity provider, D-04 merchant, D-06 storage/scanner, D-07 FX, D-08 markup, D-09 refund/dispute, D-10 retention/legal basis, D-12 email, D-13 observability vendor, D-14 backup/PITR/RPO/RTO, D-15 maker-checker thresholds and D-18 support/incident process remain open. No user/business approval is inferred. |
| **BE-1 — API/worker/database foundation** | **Done — technical scope only** | Express 5 API, BullMQ worker, Redis Compose, PostgreSQL/Prisma local-test schema/migrations, Zod config, safe structured logging, OpenAPI, workspace lockfile and CI. Exact-head workflow [#43453323097](https://github.com/azaleaforge-ctrl/AzaleaRouter/actions/runs/43453323097) succeeded on `2d5f3b4720be31b5db7b762f269c16e0e468dd34`. Production DB host/region, credentials, backup/PITR and hosted observability are not approved. |
| **BE-2 — authentication, account lifecycle and RBAC** | **In progress** | Provider-neutral session boundary, gated Supabase Auth adapter, opaque sessions, CSRF/Origin checks, Turnstile Siteverify/replay control, DB rate limits, profile/preferences/consent and role/ownership policies. Exact-head CI [#43456931571](https://github.com/azaleaforge-ctrl/AzaleaRouter/actions/runs/43456931571) succeeded on `35fc174675f60233f5d7add3ad1fdc8beb5d5fda`. Staging E2E with approved identity/email/Turnstile credentials is not evidenced. D-03/D-10/D-12 remain open; auth is disabled by default. |
| **BE-3 — canonical model catalog and provider metadata** | **In progress** | Canonical catalog schema, OpenRouter metadata-only sync adapter, endpoints/pricing snapshots, read APIs and CI. Exact-head workflow [#43543279248](https://github.com/azaleaforge-ctrl/AzaleaRouter/actions/runs/43543279248) succeeded on `0aca81a8f894e9333d601aedba53b53c55dec370`. Catalog sync has not been run with an approved source credential; actual verified active chat-capable model count is **0**, not 50. Public catalog launch remains blocked until 50 distinct valid models are verified with current pricing/endpoints and terms. |
| **BE-4 — wallet, immutable ledger and payment intents** | **In progress** | IDR double-entry ledger, DB balancing/immutability guards, serializable reservations/settlement, sandbox webhook inbox, FX/policy snapshots and fixed-point calculator. Workflow [#43543657886](https://github.com/azaleaforge-ctrl/AzaleaRouter/actions/runs/43543657886) succeeded on earlier head `c83ddab7712d677a41709c63232cbd977ce5baf2`; current branch head is `d1a0d677faf9bda05f967d63f5f088eed9c4862c` after a lockfile commit, so exact-head CI is still required. D-04/D-07/D-08/D-09/D-15 remain open; sandbox only, no merchant/live payment. |
| **BE-5 — AZL keys, OpenAI gateway, provider adapter and streaming** | **In progress** | Hashed AZL key lifecycle, owner-scoped management, fixed-base OpenRouter adapter and fail-closed gateway. Exact-head workflow [#43543726768](https://github.com/azaleaforge-ctrl/AzaleaRouter/actions/runs/43543726768) succeeded on `d59bd3fc9192a2c3ba886e76f8e3e4495c008af6`. BE-6 settlement/quota enforcement and complete adapter contract coverage are prerequisites; gateway/upstream remain disabled because D-05 is unresolved. |
| **BE-6 — usage, settlement, aggregates, model colors and SSE** | **In progress** | Usage records, pre-request reservations, actual-usage settlement, over-reservation reconciliation, aggregates, bounded CSV export, model colors, user-scoped SSE replay and cleanup worker exist on `feat/backend-usage-be6-final`, head `df177466f73a0e01ee10351d2774e49ce90b9520`. Earlier run [#43543748462](https://github.com/azaleaforge-ctrl/AzaleaRouter/actions/runs/43543748462) was **cancelled** on older head `8c6c25599867dfae7e6e06622f76bbaaa0acde49`; no exact-current-head CI, full PostgreSQL integration suite or long-lived SSE load/reconnect test is evidenced. Branch is 43 commits ahead and 9 behind current BE-5 head; PR #9 is not mergeable. |
| **BE-7 — conversations, files, notifications, support and content** | **In progress** | Conversation/message persistence, ownership/idempotency, private local storage boundary, MIME sniffing, quarantine, notifications, support and published content read APIs exist on `feat/backend-content-be7`, head `8e2c5b1e6669e9fa851af36f348d9c6a092bc18f`. See [BE-7 readiness](./BE-7-content-readiness.md). No exact-head CI or full BE-7 integration/E2E tests are evidenced. Message creation persists user messages only; model generation/usage settlement integration is missing. Unconfigured scanner returns unknown, so files remain quarantined; production storage/scanner and D-06/D-10 are unresolved. |
| **BE-8 — admin APIs, audit, reconciliation, monitoring and hardening** | **In progress — partial** | New branch `feat/backend-admin-be8`, head `499fcad2c4e4079e51ab53d9798e1191d069007d`, adds permission-scoped read-only operations summary, usage reconciliation list and audit metadata search. Raw before/after audit JSON is deliberately not returned. See [BE-8 readiness](./BE-8-admin-readiness.md). Exact-head CI has not run. User/provider/pricing/finance write APIs, maker-checker, job monitoring, alerts, security/privacy hardening and operational controls remain outstanding. |
| **BE-9 — closed-beta readiness and go/no-go** | **Not started** | Backup/restore drill, rollback/forward-fix, monitoring and alert thresholds, incident/support process, staging E2E, retention/deletion validation, privacy/legal recheck, beta controls and evidence-backed go/no-go report remain outstanding. |

## Pull requests and current branch chain

All listed PRs remain Draft/open unless explicitly marked closed. No PR has been merged.

| PR | Stage | Head branch | Base branch | Current state |
|---|---|---|---|---|
| [#1 Backend PRD v0.4](https://github.com/azaleaforge-ctrl/AzaleaRouter/pull/1) | Requirements / BE-0 | `docs/backend-prd-v0.4-stage1` | `main` | Draft / open / mergeable |
| [#2 BE-1 foundation](https://github.com/azaleaforge-ctrl/AzaleaRouter/pull/2) | BE-1 | `feat/backend-foundation-be1` | PRD branch | Draft / open / mergeable |
| [#3 partial BE-2](https://github.com/azaleaforge-ctrl/AzaleaRouter/pull/3) | Superseded | `feat/backend-auth-be2` | BE-1 branch | Closed / not merged / stale |
| [#4 rebased partial BE-2](https://github.com/azaleaforge-ctrl/AzaleaRouter/pull/4) | Superseded | `feat/backend-auth-be2-rebased` | BE-1 branch | Closed / not merged / superseded |
| [#5 BE-2 auth](https://github.com/azaleaforge-ctrl/AzaleaRouter/pull/5) | BE-2 | `feat/backend-auth-be2-final` | BE-1 branch | Draft / open / mergeable |
| [#6 BE-3 catalog](https://github.com/azaleaforge-ctrl/AzaleaRouter/pull/6) | BE-3 | `feat/backend-catalog-be3` | BE-2 branch | Draft / open / mergeable |
| [#7 BE-4 wallet/ledger](https://github.com/azaleaforge-ctrl/AzaleaRouter/pull/7) | BE-4 | `feat/backend-wallet-be4` | BE-2 branch | Draft / open / mergeable; branch also contains overlapping BE-3 work |
| [#8 BE-5 gateway](https://github.com/azaleaforge-ctrl/AzaleaRouter/pull/8) | BE-5 | `feat/backend-gateway-be5` | BE-4 branch | Draft / open / mergeable |
| [#9 BE-6 usage](https://github.com/azaleaforge-ctrl/AzaleaRouter/pull/9) | BE-6 | `feat/backend-usage-be6-final` | BE-5 branch | Draft / open / **not mergeable**; branch diverged from current BE-5 |
| [#10 BE-7 content/chat](https://github.com/azaleaforge-ctrl/AzaleaRouter/pull/10) | BE-7 | `feat/backend-content-be7` | BE-6 branch | Draft / open / mergeability not yet confirmed by GitHub |
| [#11 BE-8 admin](https://github.com/azaleaforge-ctrl/AzaleaRouter/pull/11) | BE-8 | `feat/backend-admin-be8` | BE-7 branch | Draft / open / mergeability not yet confirmed by GitHub |

### Dependency/ancestry issues to resolve before any merge

1. PR #6 and PR #7 both target the BE-2 branch. PR #7 contains overlapping BE-3 catalog work plus BE-4 changes. Merge #6 first only after all stages finish, then re-fetch PR #7 and confirm its diff is clean against the updated BE-2 base.
2. PR #8 is based on the BE-4 branch. After PR #7 is merged into the updated BE-2 branch, retarget/revalidate PR #8 against the branch that now contains BE-3 and BE-4 before merging it.
3. BE-6 branch is not based on the latest BE-5 head: comparison reports 43 commits ahead and 9 behind. Reconcile by a safe rebase/cherry-pick or replacement branch without force-pushing or dropping changes; rerun all checks.
4. BE-7 is a descendant of the current BE-6 head. BE-8 is based on BE-7. Re-fetch PR metadata and ancestry after BE-6 is reconciled.
5. PR #3 and #4 remain closed/unmerged and are not candidates for merge; PR #5 is the current BE-2 implementation.

## CI evidence

| Stage / branch | Exact SHA tested | Run | Result |
|---|---|---|---|
| BE-1 | `2d5f3b4720be31b5db7b762f269c16e0e468dd34` | [#43453323097](https://github.com/azaleaforge-ctrl/AzaleaRouter/actions/runs/43453323097) | Success |
| BE-2 | `35fc174675f60233f5d7add3ad1fdc8beb5d5fda` | [#43456931571](https://github.com/azaleaforge-ctrl/AzaleaRouter/actions/runs/43456931571) | Success |
| BE-3 | `0aca81a8f894e9333d601aedba53b53c55dec370` | [#43543279248](https://github.com/azaleaforge-ctrl/AzaleaRouter/actions/runs/43543279248) | Success |
| BE-4 | `c83ddab7712d677a41709c63232cbd977ce5baf2` | [#43543657886](https://github.com/azaleaforge-ctrl/AzaleaRouter/actions/runs/43543657886) | Success on earlier head; current `d1a0d677...` not tested |
| BE-5 | `d59bd3fc9192a2c3ba886e76f8e3e4495c008af6` | [#43543726768](https://github.com/azaleaforge-ctrl/AzaleaRouter/actions/runs/43543726768) | Success |
| BE-6 | `8c6c25599867dfae7e6e06622f76bbaaa0acde49` | [#43543748462](https://github.com/azaleaforge-ctrl/AzaleaRouter/actions/runs/43543748462) | Cancelled; current `df177466...` untested |
| BE-7 | `8e2c5b1e6669e9fa851af36f348d9c6a092bc18f` | — | Not run |
| BE-8 | `499fcad2c4e4079e51ab53d9798e1191d069007d` | — | Not run |

The PR-triggered runs for #2, #6, #7 and #8 returned `action_required` and exposed no jobs; they do not count as CI passes. The successful workflow_dispatch/push runs above are separate evidence tied to the listed exact SHAs. Local clone/install/build/test was not run in this environment.

## Merge gate and next actions

- Do not merge any PR yet. BE-0 through BE-9 are not all complete; BE-6 ancestry is broken; BE-4 latest-head CI, BE-6/7/8 exact-head CI, and several stage acceptance suites are missing.
- Keep all PRs Draft. Do not bypass workflow approval, branch protection, reviews or checks.
- Next engineering actions: reconcile BE-6 onto the latest BE-5 head; run exact-head CI for BE-4/6/7/8; complete missing BE-7 generation/storage/scanner integration; continue BE-8 admin and operational controls; implement BE-9 evidence.
- External owner decisions remain necessary for D-02/D-03/D-04/D-05/D-06/D-07/D-08/D-09/D-10/D-12/D-14/D-15/D-18. D-05 written upstream permission and legal review are mandatory before paid production. No paid upstream call or customer debit is permitted.
- After every stage is complete, all reviews/threads resolved, all exact-head checks green, ancestry/conflicts reconciled, and the final audit passed, merge one PR at a time in dependency order and verify each merge commit before proceeding.
