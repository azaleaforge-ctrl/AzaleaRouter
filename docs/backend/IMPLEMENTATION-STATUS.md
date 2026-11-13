# Backend implementation status

Last verified: 2026-11-13 (Asia/Jakarta)  
Source of truth: Backend PRD v0.4 and linked GitHub pull requests. Update this file whenever a stage, decision, or validation status changes.

## Overall rule

All backend stages BE-0 through BE-9 must be complete and evidence-backed before any pull request is merged. After the full roadmap is complete, merge PRs one at a time in dependency order, rechecking review, CI, mergeability, and downstream bases after each merge. No direct commits to `main`, no force merge, and no production release/deployment is included in this authorization.

## Stage tracker

| Workstream | Status | Current evidence / gap |
|---|---|---|
| BE-0 — legal and architecture decisions | In progress | Backend PRD v0.4 contains decision log D-01–D-18. Upstream written permission for downstream gateway/customer API keys/third-party billing remains a paid-production blocker. Decision record and legal scope review still required. |
| BE-1 — backend foundation | In progress | PR #2 adds Express 5 + TypeScript API skeleton, Zod config, request ID, error envelope, health route, graceful shutdown, and workspace declaration. CI workflow added on `feat/backend-foundation-be1`. Lockfile still needs workspace importer regeneration; database/Prisma, worker, Redis/BullMQ, OpenAPI and CI evidence remain incomplete. |
| BE-2 — authentication and RBAC | In progress | PR #3 adds vendor-neutral session-verifier contract, validated principal schema, role/permission mapping, ownership helpers, guards, session introspection and policy tests. Real auth provider, persistent account/session/consent flows, email delivery and Turnstile remain incomplete. |
| BE-3 — catalog and providers | Not started | Need verified canonical catalog, providers/endpoints, pricing snapshots, sync and capability validation. Minimum 50 distinct active chat models required before public catalog launch. |
| BE-4 — wallet, ledger and payments | Not started | Need immutable balanced ledger, IDR-safe pricing, payment adapter/webhooks, idempotency, concurrency and reconciliation tests. |
| BE-5 — AZL keys and gateway | Not started | Need secure key lifecycle, OpenAI-compatible endpoints, provider adapters, routing/fallback, streaming and settlement. |
| BE-6 — usage and realtime | Not started | Need usage records/aggregates, model color API and authenticated SSE outbox/replay/reconnect. |
| BE-7 — chat, files and content | Not started | Need conversation/message persistence, secure file-storage pipeline, docs/help/CMS/status, support and notifications. |
| BE-8 — admin and hardening | Not started | Need admin APIs/RBAC, audit, reconciliation operations, monitoring, privacy/security hardening. |
| BE-9 — closed-beta readiness | Not started | Need backup/restore, rollback, incident/support process, legal/privacy recheck and documented go/no-go. |

## Pull request chain

| PR | Branch | Base | Status |
|---|---|---|---|
| [#1 Backend PRD v0.4](https://github.com/azaleaforge-ctrl/AzaleaRouter/pull/1) | `docs/backend-prd-v0.4-stage1` | `main` | Draft / open / not merged |
| [#2 BE-1 foundation](https://github.com/azaleaforge-ctrl/AzaleaRouter/pull/2) | `feat/backend-foundation-be1` | `docs/backend-prd-v0.4-stage1` | Draft / open / not merged |
| [#3 BE-2 auth foundation](https://github.com/azaleaforge-ctrl/AzaleaRouter/pull/3) | `feat/backend-auth-be2` | `feat/backend-foundation-be1` | Draft / open / not merged |

## Validation snapshot

- No GitHub status checks or workflow runs were reported for the inspected PR head commits at the time of this update.
- Local clone/build/typecheck/lint/test were not run because this execution environment could not resolve `github.com`.
- The new CI workflow must run on PR synchronization. Its final lockfile-drift check is expected to expose the missing pnpm workspace importer until the generated `pnpm-lock.yaml` is committed.
- No stage is marked Done until implementation, security/privacy requirements, contracts/docs, and relevant CI/test evidence meet the PRD exit criteria.

## Open decisions / blockers

Review the authoritative decision table in [Backend PRD v0.4](https://github.com/azaleaforge-ctrl/AzaleaRouter/blob/docs/backend-prd-v0.4-stage1/AzaleaRouter-PRD-Backend-v0.4.md#dependencies-dan-open-decisions). Do not invent provider approvals, merchant onboarding, credentials, retention/legal basis, or operational policies. Keep production paid access disabled until upstream permission and payment merchant/legal gates are verified.

## Next actions

1. Regenerate and commit `pnpm-lock.yaml` for the workspace, then verify the CI workflow actually runs and fix any lint/typecheck/build/test failures.
2. Complete the rest of BE-1: database/Prisma after D-01 decision, Redis/BullMQ worker, structured redacted logging, OpenAPI and CI quality gates.
3. Complete real provider-backed BE-2 after the persistent foundation and the required D-03/D-12/Turnstile decisions are resolved.
4. Continue sequentially through BE-3 to BE-9; do not merge until every stage is complete and the final pre-merge audit passes.
