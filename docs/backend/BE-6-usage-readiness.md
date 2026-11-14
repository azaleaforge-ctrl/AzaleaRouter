# BE-6 — Usage, Realtime Events, and Model Colors

**Status:** Implementation in progress; exact-head CI and downstream integration checks pending.  
**Depends on:** BE-1 PostgreSQL foundation, BE-3 catalog, BE-4 wallet settlement, BE-5 AZL key and gateway.  
**Branch:** `feat/backend-usage-be6-final` (PR #9 not opened yet).  
**Currency:** IDR for wallet settlement and customer-facing usage totals.

## Delivered in this increment

### Usage persistence and settlement
- Usage records include request/key/user/model/endpoint/provider references, source, status, prompt/completion/cached/reasoning/total token counts, provider cost, customer charge, reserved IDR amount, pricing/FX/policy snapshot references, provider request ID, latency and reconciliation state.
- Gateway requests reserve an estimated maximum charge before upstream dispatch.
- Final settlement uses the actual upstream token counts and the immutable price, FX and pricing-policy snapshots referenced by the usage record.
- Actual charge below the reserved amount releases the unused hold; actual charge above the hold moves the record into `pending_reconciliation` without silently charging more than authorized.
- Zero-cost requests release the hold without a zero-value ledger entry.
- Usage state changes, ledger changes, daily aggregate updates, concurrency lease release and outbox event creation are placed in database transactions.
- Provider transport failure, client disconnect, missing/invalid usage trailers and settlement failure are retained for reconciliation rather than issuing an unsafe automatic refund when upstream cost is unknown.

### Usage API and dashboard data
- `GET /api/v1/usage/summary` — user-scoped request/token/cost totals over a bounded date range.
- `GET /api/v1/usage/requests` and `GET /api/v1/usage/requests/:requestId` — cursor-paginated usage history and single-request detail.
- `POST /api/v1/usage/exports` and `GET /api/v1/usage/exports/:id` — CSV exports, scoped to the owner, maximum 5,000 rows and 5 MiB, with expiry and cache suppression.
- `GET /api/v1/usage/model-colors` and `PUT /api/v1/usage/model-colors/:modelId` — persistent per-user chart colors, distinguishing deterministic auto colors from manual overrides.
- CSV cells are quoted and spreadsheet formula starters are prefixed to prevent formula injection.

### Realtime
- `GET /api/v1/events` — authenticated SSE stream.
- Event cursors use an opaque base64url cursor containing occurrence time and event ID; replay is ordered by both fields.
- Replay defaults to 24 hours; expired cursors receive a `snapshot.required` event.
- Response disconnect cleanup closes timers. Events are now scoped to the authenticated user; global/null-user outbox messages are deliberately excluded until an explicit safe global-event allowlist exists.
- Outbox payloads are restricted to safe request/model/status/cost metadata; prompts, credentials and provider raw payloads are not added.

### Worker maintenance
- A recurring cleanup job identifies expired active usage leases, moves unresolved requests into reconciliation, releases concurrency leases, and removes expired rate windows, leases, CSV exports and outbox events.
- Cleanup uses bounded batches and transactional per-usage updates.

## Security and financial boundaries

- Gateway, upstream-provider access, wallet settlement and payment provider flags default to disabled.
- The configured upstream is still subject to D-05 written commercial approval; no paid upstream request is authorized by this branch.
- A successful provider response must include verifiable token usage to settle automatically. Missing usage is not estimated after the fact.
- Outbox replay currently only returns user-owned events. Do not add global/system events without a reviewed allowlist and explicit payload schema.
- CSV exports are temporary and capped. A production export/download policy and secure object-storage solution remain D-06/D-10 decisions.
- Wallet over-reservation/actual-cost mismatch remains held for reconciliation; this stage does not choose a refund, negative-balance or chargeback policy.

## Verification requirements

BE-6 is complete only after:
1. Exact-head CI passes for frontend, database schema/migrations, API lint/OpenAPI/typecheck/build/tests, billing and worker lint/typecheck/build/tests.
2. PostgreSQL integration tests exercise reservation → successful settlement, partial settlement, zero-cost settlement, over-reservation reconciliation, aggregate update and outbox replay.
3. API tests exercise user scoping, IDOR denial, CSV formula handling/size caps, cursor replay, expired cursor behavior, disconnect handling and SSE event isolation.
4. Worker tests exercise stale lease reconciliation and retention cleanup without deleting unexpired events or ledger/audit evidence.
5. BE-5 gateway tests confirm no paid traffic occurs when upstream/legal/settlement gates are false, and unknown upstream outcomes do not automatically release a potentially chargeable hold.

## Still open / not claimed complete

- BE-6 code is implemented on the feature branch, but exact-head CI and the complete integration suite remain pending.
- A load/reconnect test with real long-running SSE clients has not been executed.
- End-to-end settlement against an approved provider has not been executed and is intentionally blocked by D-05.
- D-04/D-07/D-08/D-09 financial approval and D-06/D-10 file/data retention decisions remain open.
- No production database, provider credentials, external payment merchant, paid upstream traffic or deployment is configured.
