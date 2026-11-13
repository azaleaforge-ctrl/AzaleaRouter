# Backend implementation status

**Last verified:** 13 November 2026 (Asia/Jakarta)  
**Source of truth:** Backend PRD v0.4, current GitHub PR metadata, CI runs and linked implementation branches.  
**Rule:** Do not mark a stage Done merely because its PR exists. Completion requires implementation, contracts/docs, security/privacy requirements, relevant tests and CI evidence.

## Overall merge gate

The user authorized completion of BE-0 through BE-9 before any merge. Only after all stages are complete and verified may PRs be merged one at a time in dependency order. No direct commits to `main`, no force merge, no early merge, no production deployment/release, and no paid traffic are authorized.

## Stage tracker

| Workstream | Status | Current evidence / gap |
|---|---|---|
| BE-0 — legal and architecture decisions | In progress / Blocked for paid launch | Decision register is in [DECISION-LOG.md](./DECISION-LOG.md). D-01/02/03/04/06/07/08/09/10/12/13/14/15/18 remain OPEN. Current OpenRouter public Terms of Service §7 item 4 (last updated 31 Aug 2026) expressly prohibits reselling API access to Models / developing a competing service; §5.1's incorporated-product customer language is subject to model terms and does not itself clearly approve a downstream reseller gateway. D-05 therefore remains a BLOCKER pending a signed written clarification/exception and legal review. No paid gateway access is authorized or inferred. |
| BE-1 — backend foundation | In progress | PR #2 now includes Express 5 + TypeScript API skeleton, Zod config, request ID, safe error envelope, health endpoint, structured allowlist logger, graceful shutdown, API tests, OpenAPI 3.1 health contract, BullMQ worker package, Redis URL parser, retry/retention policies, worker tests, local Redis Compose service and expanded CI workflow. Remaining: generated pnpm lockfile importer/commit; CI validation; PostgreSQL/Prisma after D-01 approval; finish observability and API/worker operational verification. |
| BE-2 — authentication and RBAC | In progress | PR #3 adds provider-neutral SessionVerifier boundary, runtime principal schema, role/permission matrix, ownership helpers, guards, session introspection and policy tests. Real provider, persistence, register/login/logout/verification/reset, email, Turnstile, profile and consent remain incomplete. |
| BE-3 — catalog and providers | Not started | Need canonical model/developer/provider/endpoint catalog, current source-backed pricing snapshots, sync worker and capability checks. Public catalog requires at least 50 distinct active canonical chat models with valid endpoints and pricing. |
| BE-4 — wallet, ledger and payments | Not started | Need immutable balanced ledger, IDR-safe decimal arithmetic, pricing/FX/markup snapshots, sandbox payment adapter/webhooks/refunds/reconciliation and concurrency/idempotency tests. |
| BE-5 — AZL keys and gateway | Not started | Need cryptographically secure AZL- key issuance/hash/rotation/revocation, OpenAI-compatible gateway, provider adapter, routing/fallback, streaming and settlement. |
| BE-6 — usage and realtime | Not started | Need request usage schema/aggregates, per-model color API and authenticated SSE with outbox, replay cursor and reconnect/snapshot behavior. |
| BE-7 — chat, files and content | Not started | Need conversation/message persistence, secure private file upload/quarantine/scanning adapter, docs/help/blog/status/changelog, support and notifications. |
| BE-8 — admin and hardening | Not started | Need granular admin APIs/RBAC, audit, reconciliation operations, observability/alerts, privacy and security hardening. |
| BE-9 — closed-beta readiness | Not started | Need backup/restore drills, rollback, support/incident process, privacy/legal recheck, monitoring and documented go/no-go. |

## Pull request chain

| PR | Branch | Base | Status |
|---|---|---|---|
| [#1 Backend PRD v0.4](https://github.com/azaleaforge-ctrl/AzaleaRouter/pull/1) | `docs/backend-prd-v0.4-stage1` | `main` | Draft / open / not merged |
| [#2 BE-1 foundation](https://github.com/azaleaforge-ctrl/AzaleaRouter/pull/2) | `feat/backend-foundation-be1` | `docs/backend-prd-v0.4-stage1` | Draft / open / not merged |
| [#3 BE-2 auth foundation](https://github.com/azaleaforge-ctrl/AzaleaRouter/pull/3) | `feat/backend-auth-be2` | `feat/backend-foundation-be1` | Draft / open / not merged |

## Validation snapshot

- An earlier PR #2 CI run failed during dependency installation with `ERR_PNPM_IGNORED_BUILDS` for `esbuild@0.28.2`. The workspace policy now explicitly allows only the `esbuild` build script; it does not enable all dependency scripts.
- The latest CI run for PR #2 head `9c5b129bef4ab94faf7dcc456917f89cc430ab14` was still pending at the last inspection; see [run #58](https://github.com/azaleaforge-ctrl/AzaleaRouter/actions/runs/43441661815). No build/test result is claimed.
- The workflow currently installs with `--no-frozen-lockfile` and uploads the generated `pnpm-lock.yaml` as a short-retention artifact. The workspace lockfile still needs to be committed, after which CI should switch to frozen install and remove the temporary artifact step.
- Local clone/build/typecheck/lint/test were not run because this execution environment could not resolve `github.com`. CI is the available execution environment, but current checks are not yet green.
- No stage is marked Done until the PRD exit criteria and evidence are satisfied.

## Open decisions / blockers

The authoritative register is [DECISION-LOG.md](./DECISION-LOG.md), derived from [Backend PRD v0.4 Section 16](https://github.com/azaleaforge-ctrl/AzaleaRouter/blob/docs/backend-prd-v0.4-stage1/AzaleaRouter-PRD-Backend-v0.4.md#dependencies-dan-open-decisions). Keep paid access disabled until D-05 is backed by a signed written upstream clarification/exception and D-04 merchant/payment onboarding is approved. The reviewed public terms are linked in DECISION-LOG.md. Do not invent credentials, provider approvals, retention policy or legal basis.

## Next actions

1. Complete the running GitHub Actions workflow and inspect actual failing/passing steps.
2. Retrieve the generated lockfile artifact from CI, commit it to the BE-1 branch and switch install to `--frozen-lockfile`.
3. Resolve D-01 before selecting/implementing the persistent database and migration engine. Until then, proceed with reversible infrastructure and contracts.
4. Complete BE-1 CI/worker/API quality gates and documentation.
5. Complete BE-2 with a real auth provider only after D-03/D-12 and persistence decisions are approved.
6. Continue BE-3 through BE-9 sequentially. Do not merge any PR until all stages are complete, reviewed and verified.
