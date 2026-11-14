# BE-8 — Admin APIs, Audit Visibility, Reconciliation and Operations

**Status:** Partial implementation on `feat/backend-admin-be8`; not stage-complete.
**Base:** BE-7 branch head `8e2c5b1e6669e9fa851af36f348d9c6a092bc18f`.
**Production state:** all admin APIs remain behind authenticated, permission-specific middleware. No live financial mutation, refund, role assignment, or production operation is enabled by this increment.

## Implemented in this increment

- Read-only `GET /api/v1/admin/operations/summary` for pending usage reconciliation, payment webhooks, outbox delivery and quarantined files.
- Read-only `GET /api/v1/admin/usage/reconciliation` with bounded cursor pagination and decimal/BigInt-safe response serialization.
- Read-only `GET /api/v1/admin/audit-logs` with actor/action/resource/time filters.
- Audit response deliberately excludes raw before/after JSON; it exposes only presence flags so secrets or PII embedded in snapshots are not returned by default.
- Routes use the existing `operations:read` and `audit:read` permissions; support and regular users are denied.

## Not implemented / exit criteria still open

- User lifecycle and role-management APIs with explicit approval workflows.
- Provider/catalog administration, pricing policy draft/preview/approve/publish and FX management.
- Payment refund, ledger adjustment, maker-checker approval and reconciliation resolution APIs.
- Support assignment/administration and CMS authoring/publish workflows.
- BullMQ/Redis job queue metrics, dead-letter inspection, safe retry controls and operational alerting.
- Audit-log retention/export, field-level redaction policy, immutable audit DB guard verification and access audit.
- Abuse controls, security/privacy review, dependency scans, penetration/IDOR tests and staging Playwright coverage.
- Production DB/backup/restore and monitoring decisions remain BE-9 prerequisites.

## Validation required

- Exact-head CI for the BE-8 branch, including API lint, typecheck, build, OpenAPI lint and tests.
- PostgreSQL integration tests for reconciliation queries and audit access.
- Cross-role tests: anonymous/user/support denied; admin and super-admin only as permission policy allows.
- Verify all returned values are safe and financial values remain integer-IDR strings.
- No production or paid upstream operation is performed by this stage.

**Merge gate:** no PR is merged until BE-0 through BE-9 are complete, verified and audited.
