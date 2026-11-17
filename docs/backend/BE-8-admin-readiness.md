# BE-8 — Admin APIs, Audit Visibility, Reconciliation and Operations

**Status:** Partial implementation on `feat/backend-admin-be8` with a read-only operations follow-up in PR #13; not stage-complete.
**Base:** original PR #11 BE-7 target head `d580c1521f1d34921ddff96e3e5be7f6fc483f33`. The PR #13 operations follow-up is stacked on BE-9 head `1a5ab958c399da9338036d069885865d801a48e4` to preserve dependency ancestry.
**Production state:** all admin APIs remain behind authenticated, permission-specific middleware. No live financial mutation, refund, role assignment, or production operation is enabled by this increment.

## Implemented in this increment

- Read-only `GET /api/v1/admin/operations/summary` for pending usage reconciliation, payment webhooks, outbox delivery and quarantined files.
- PR #13 adds permission-scoped `GET /api/v1/admin/operations/queue` with aggregate BullMQ waiting/active/delayed/completed/failed/paused/waiting-children/prioritized counts. It returns no job payloads or failure text, fails closed when Redis is unavailable, and explicitly states that no dead-letter queue is configured.
- Read-only `GET /api/v1/admin/usage/reconciliation` with bounded cursor pagination and decimal/BigInt-safe response serialization.
- Read-only `GET /api/v1/admin/audit-logs` with actor/action/resource/time filters.
- Audit response deliberately excludes raw before/after JSON; it exposes only presence flags so secrets or PII embedded in snapshots are not returned by default.
- Routes use the existing `operations:read` and `audit:read` permissions; support and regular users are denied.

## Not implemented / exit criteria still open

- User lifecycle and role-management APIs with explicit approval workflows.
- Provider/catalog administration, pricing policy draft/preview/approve/publish and FX management.
- Payment refund, ledger adjustment, maker-checker approval and reconciliation resolution APIs.
- Support assignment/administration and CMS authoring/publish workflows.
- An explicit DLQ, safe retry/replay controls and operational alerting. PR #15 provides metadata-only single-job inspection; it deliberately does not expose payload/error details or mutate/retry jobs.
- Audit-log retention/export, field-level redaction policy, immutable audit DB guard verification and access audit.
- Abuse controls, security/privacy review, dependency scans, penetration/IDOR tests and staging Playwright coverage.
- Production DB/backup/restore and monitoring decisions remain BE-9 prerequisites.

## Validation required

- PR #15 adds unit tests for safe BullMQ job projection and API tests for admin-only access, invalid/missing IDs, unavailable queue inspection, and payload/failure-detail non-disclosure. Implementation head `814bc93565e29a9b80ee2b067c9bd45afd6d7ac6` passed exact-head PR CI [#44011088296](https://github.com/azaleaforge-ctrl/AzaleaRouter/actions/runs/44011088296) and push CI [#44011082836](https://github.com/azaleaforge-ctrl/AzaleaRouter/actions/runs/44011082836); the evidence-documentation head `f33fddc6f17e703bf6da2562a336e5217199bbfb` also passed exact-head PR CI [#44011390213](https://github.com/azaleaforge-ctrl/AzaleaRouter/actions/runs/44011390213) and push CI [#44011384302](https://github.com/azaleaforge-ctrl/AzaleaRouter/actions/runs/44011384302). The latest commit is documentation-only.

- PR #13 implementation commit `aae8863b7671b468cd0dfca0b6458e09040b9a17` passed [exact-head GitHub Actions run #43673508410](https://github.com/azaleaforge-ctrl/AzaleaRouter/actions/runs/43673508410). The subsequent status/legal documentation head `c85109d6c43f56ff16d7c0bdb9c527f51f55bf7f` also passed [exact-head run #43673682455](https://github.com/azaleaforge-ctrl/AzaleaRouter/actions/runs/43673682455), including frozen lockfile install, OpenAPI validation, API lint/typecheck/build/tests and worker checks.

- Exact-head CI for the BE-8 branch, including API lint, typecheck, build, OpenAPI lint and tests.
- PostgreSQL integration tests for reconciliation queries and audit access.
- Cross-role tests: anonymous/user/support denied; admin and super-admin only as permission policy allows.
- Verify all returned values are safe and financial values remain integer-IDR strings.
- No production or paid upstream operation is performed by this stage.

**Merge gate:** no PR is merged until BE-0 through BE-9 are complete, verified and audited.
