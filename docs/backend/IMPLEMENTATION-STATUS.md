# Backend implementation status

**Last updated:** 14 November 2026 (Asia/Jakarta)  
**Authority:** Backend PRD v0.4, current branch heads, PR metadata and exact GitHub Actions runs.  
**Merge authorization:** The user authorized merge only after every BE-0..BE-9 stage is complete and verified. All backend PRs remain unmerged. No release, deployment or paid traffic is authorized.

## Overall status

The backend has advanced beyond the initial BE-1/BE-2 scaffolds. BE-1 through BE-3 have exact-head successful CI evidence. BE-4 and BE-5 have corrective commits in flight. BE-6 implementation is on a feature branch; exact-head CI is pending. BE-7..BE-9 remain to be implemented.

## Stage tracker

| Stage | Status | Verified evidence / remaining gaps |
|---|---|---|
| BE-0 — legal and architecture decisions | **In progress; paid launch blocked** | See [DECISION-LOG.md](./DECISION-LOG.md). D-01 PostgreSQL + Prisma is a reversible local/test baseline only. D-03 identity provider and D-04 payment provider remain open. D-05 OpenRouter written downstream permission is a hard blocker. D-06 object storage, D-07 FX source, D-08 markup, D-09 refunds/expiry/disputes, D-10 privacy/retention/legal basis, D-12 email delivery, D-14 backup/PITR/RPO/RTO and D-15 maker-checker thresholds remain open. |
| BE-1 — backend foundation | **Code complete; CI passed** | Express API, worker/Redis/BullMQ, PostgreSQL/Prisma 7.10.1, initial identity/profile/preferences/consent/audit/outbox/idempotency migration, health/readiness, request IDs, safe structured logging, initial OpenAPI and CI. Run [#43453323097](https://github.com/azaleaforge-ctrl/AzaleaRouter/actions/runs/43453323097) passed on exact BE-1 head `2d5f3b4720be31b5db7b762f269c16e0e468dd34`; includes frozen lockfile validation. |
| BE-2 — authentication and RBAC | **Code complete; CI passed; provider gated** | Provider-neutral verifier, opt-in Supabase Auth REST adapter, opaque session cookies, encrypted provider tokens, CSRF/Origin validation, Turnstile Siteverify/replay protection, DB-backed rate limits, register/login/verification/recovery/profile/preferences/consent routes, role/ownership policy. Run [#43456931571](https://github.com/azaleaforge-ctrl/AzaleaRouter/actions/runs/43456931571) passed on exact BE-2 head `35fc174675f60233f5d7add3ad1fdc8beb5d5fda`. Auth remains disabled by default pending D-03/D-10/D-12 and staging E2E credentials. |
| BE-3 — model catalog and providers | **Code complete; CI passed** | OpenRouter catalog sync adapter, canonical models/developers/providers/endpoints, validated USD price snapshots and catalog read APIs; sync handler is typed and exported from package entrypoint. Run [#43543279248](https://github.com/azaleaforge-ctrl/AzaleaRouter/actions/runs/43543279248) passed on exact BE-3 head `0aca81a8f894e9333d601aedba53b53c55dec370`. Catalog sync is still feature/credential gated; no synthetic or guessed models/prices are inserted. |
| BE-4 — wallet, ledger and payments | **In progress; corrective CI pending** | IDR wallet, immutable double-entry ledger, reservation/settlement/release, FX and pricing policy snapshots, payment intent/webhook inbox, idempotency and transaction-level protection. The migration dollar-quote and catalog package entrypoint issues have been patched. Current head `c83ddab7712d677a41709c63232cbd977ce5baf2`; exact-head CI run [#43543657886](https://github.com/azaleaforge-ctrl/AzaleaRouter/actions/runs/43543657886) is still running. Provider is local sandbox only; D-04/D-07/D-08/D-09/D-15 remain approval gates. |
| BE-5 — AZL keys and gateway | **In progress; corrective CI pending** | Hashed AZL keys, key lifecycle/scopes/allowlists, OpenAI-compatible chat completion route, provider adapter boundary, routing metadata and usage settlement gate. Catalog export and type-safety fixes are on the latest head `d59bd3fc9192a2c3ba886e76f8e3e4495c008af6`; workflow-dispatch run [#43543726768](https://github.com/azaleaforge-ctrl/AzaleaRouter/actions/runs/43543726768) is running. Gateway/upstream flags remain disabled until D-05 is cleared. |
| BE-6 — usage, realtime and model colors | **Implemented on feature branch; exact-head CI pending** | Actual-use wallet settlement, holds/reconciliation, usage records/aggregates, model-color API, bounded CSV export, user-scoped SSE replay, stale-lease/retention cleanup job. See [BE-6-usage-readiness.md](./BE-6-usage-readiness.md). Current branch head `8c6c25599867dfae7e6e06622f76bbaaa0acde49`; exact-head run [#43543748462](https://github.com/azaleaforge-ctrl/AzaleaRouter/actions/runs/43543748462) is running. Integration/reconnect/load tests remain outstanding. |
| BE-7 — conversation, files and content | Not started | Conversation/message lifecycle and history, private uploads/storage adapter, MIME/size/quarantine/scanner/retention, docs/help/blog/status/changelog, support ticket and notification APIs. |
| BE-8 — admin and hardening | Not started | Granular admin RBAC APIs, audit controls, payment/usage reconciliation console, job monitoring/alerts, abuse controls, security/privacy hardening and operational procedures. |
| BE-9 — closed-beta readiness | Not started | Backup/restore drill, rollback, monitoring/incident/support process, privacy/legal recheck, staging E2E and evidence-backed go/no-go assessment. |

## Open pull requests

| PR | Stage | Branch | Base | Current state |
|---|---|---|---|---|
| [#1 Backend PRD v0.4](https://github.com/azaleaforge-ctrl/AzaleaRouter/pull/1) | Requirements / BE-0 inputs | `docs/backend-prd-v0.4-stage1` | `main` | Draft / open / not merged |
| [#2 BE-1 foundation](https://github.com/azaleaforge-ctrl/AzaleaRouter/pull/2) | BE-1 | `feat/backend-foundation-be1` | PRD branch | Draft / open / not merged |
| [#5 BE-2 auth/RBAC](https://github.com/azaleaforge-ctrl/AzaleaRouter/pull/5) | BE-2 | `feat/backend-auth-be2-final` | BE-1 branch | Draft / open / not merged |
| [#6 BE-3 model catalog](https://github.com/azaleaforge-ctrl/AzaleaRouter/pull/6) | BE-3 | `feat/backend-catalog-be3` | BE-2 branch | Draft / open / not merged |
| [#7 BE-4 wallet/ledger/payment intents](https://github.com/azaleaforge-ctrl/AzaleaRouter/pull/7) | BE-4 | `feat/backend-wallet-be4` | BE-2 branch (catalog work is represented in its changes) | Draft / open / not merged |
| [#8 BE-5 AZL key and gateway](https://github.com/azaleaforge-ctrl/AzaleaRouter/pull/8) | BE-5 | `feat/backend-gateway-be5` | BE-4 branch | Draft / open / not merged |
| BE-6 | Usage/realtime | `feat/backend-usage-be6-final` | BE-5 branch | Feature branch; PR not opened yet |

## Merge order and gates

1. Do not merge yet. First complete BE-6 exact-head CI and tests, then BE-7, BE-8 and BE-9.
2. Resolve PR branch ancestry and overlap so PR dependencies are a clean, verifiable chain. PR #7 was retargeted to the BE-2 branch because its feature head already descends from BE-2; it contains the catalog changes too. Before merge, verify that PR #6 can merge first and PR #7 remains clean against the updated base.
3. Before final merge, require green exact-head CI, clean mergeability, reviewed migration ordering, no exposed secrets, security/privacy checks and acceptance evidence for all stages.
4. Merge one PR at a time in dependency order and verify the merge commit before proceeding.
5. Even after BE-0..BE-9 code completion, paid gateway launch remains blocked until written D-05 authorization and finance/legal/security decisions are supplied. No production deployment/release has been made.

## Validation limitations

- GitHub Actions is the available execution environment; a local developer clone has not been built/tested in this session.
- CI may use isolated test PostgreSQL/Redis and sandbox fakes. This does not verify a real merchant, production identity provider/email deliverability, production database region/backup, or paid upstream authorization.
- A green unit/integration workflow is not a production go-live approval.
