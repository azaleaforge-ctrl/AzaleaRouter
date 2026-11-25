# BE-6 — Usage, Realtime Events, and Model Colors

**Status:** Implementation in progress; PR #31 adds PostgreSQL integration coverage and fixes the reservation-linking defect exposed by its first exact-head run. The corrected code/test head passed workspace CI, CodeQL workflow and Gitleaks; CodeQL findings still require manual triage, and a later documentation-only refresh is being revalidated.
**Depends on:** BE-1 PostgreSQL foundation, BE-3 catalog, BE-4 wallet settlement, BE-5 AZL key and gateway.  
**Branch:** `feat/backend-usage-be6-final` (PR #9, open/Draft); SSE regression follow-up is stacked on the current backend chain in PR #28.  
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

## Additional PostgreSQL integration coverage — 25 November 2026

PR #31 adds `packages/billing/test/usage-service.integration.test.ts` with two DATABASE_URL-gated PostgreSQL integration scenarios:

- Full `begin → finalize` settlement using persisted catalog-price, FX and pricing-policy snapshots, wallet reservation, a balanced one-time ledger posting, usage aggregate update and started/settled outbox events.
- Actual customer charge above the reserved amount, verifying `pending_reconciliation`, no ledger debit, preserved wallet hold, released concurrency lease, safe notification event and no successful aggregate.

The success scenario also repeats finalization and asserts that the settled result does not create a second ledger transaction, aggregate increment or outbox event. These new tests are pending exact-head CI; they are not yet counted as passing evidence.\n\nThe first exact-head workspace CI run [#45538960553](https://github.com/azaleaforge-ctrl/AzaleaRouter/actions/runs/45538960553) failed because `UsageService.begin()` created a usage row and then attempted to update its `wallet_reservation_id`; the database trigger correctly rejects changes to immutable usage identity/pricing/reservation references. Commit `c1679e88c2bfc453e386bd3e4aa1213177f30b07` fixes the ordering: allocate the usage ID, create the reservation, then insert the usage row with its reservation reference already set. The corrected code/test head `a87f48f8848cd3a36d2d18248364ac9537d8acdc` passed exact-head workspace CI [#45539316910](https://github.com/azaleaforge-ctrl/AzaleaRouter/actions/runs/45539316910), CodeQL workflow [#45539316908](https://github.com/azaleaforge-ctrl/AzaleaRouter/actions/runs/45539316908) and Gitleaks [#45539316909](https://github.com/azaleaforge-ctrl/AzaleaRouter/actions/runs/45539316909). Billing integration tests passed, including both new scenarios. CodeQL still reports eight backend `js/missing-rate-limiting` sinks in auth/gateway and one frontend `js/identity-replacement` finding; these require manual triage. A later documentation-only refresh creates a new head and is being revalidated.

The first exact-head workspace CI run [#45538960553](https://github.com/azaleaforge-ctrl/AzaleaRouter/actions/runs/45538960553) failed in the new tests because `UsageService.begin()` created a usage row and then attempted to update its `wallet_reservation_id`; the database trigger correctly rejects changes to immutable usage identity/pricing/reservation references. Commit `c1679e88c2bfc453e386bd3e4aa1213177f30b07` fixes the ordering: allocate the usage ID, create the reservation, then insert the usage row with its reservation reference already set. The corrected current head has new exact-head CI pending; the earlier failure is not counted as a passing test.

## Still open / not claimed complete

- Exact-head workspace CI, CodeQL and Gitleaks passed for PR #28 head `f221742b7cb1f329569613601a382d363774fba0` on 24 November 2026. Workspace CI completed frozen install, moderate/high/critical dependency audit, workspace lint, frontend typecheck/build/unit tests, database schema/migrations, catalog/billing/API/OpenAPI and worker checks. This does not complete the entire BE-6 acceptance suite.
- A load/reconnect soak with real long-running SSE clients has not been executed.
- PR #31's first exact-head workspace CI run [#45538960553](https://github.com/azaleaforge-ctrl/AzaleaRouter/actions/runs/45538960553) failed in the new billing integration tests and exposed an immutable-reference update bug in `UsageService.begin()`. Commit `c1679e88c2bfc453e386bd3e4aa1213177f30b07` fixed the ordering by inserting the usage row with its reservation reference set initially; corrected code/test head `a87f48f8848cd3a36d2d18248364ac9537d8acdc` passed exact-head workspace CI [#45539316910](https://github.com/azaleaforge-ctrl/AzaleaRouter/actions/runs/45539316910), CodeQL workflow [#45539316908](https://github.com/azaleaforge-ctrl/AzaleaRouter/actions/runs/45539316908) and Gitleaks [#45539316909](https://github.com/azaleaforge-ctrl/AzaleaRouter/actions/runs/45539316909). CodeQL still reports eight backend `js/missing-rate-limiting` sinks and one frontend `js/identity-replacement` finding; manual triage remains open. The current documentation refresh will have a new exact-head CI run. The wider acceptance matrix still needs zero-cost usage finalization, failure/release and stale-lease cleanup/retention integration coverage. End-to-end settlement against an approved provider remains blocked by D-05.
- D-04/D-07/D-08/D-09 financial approval and D-06/D-10 file/data retention decisions remain open.
- No production database, provider credentials, external payment merchant, paid upstream traffic or deployment is configured.


## Latest exact-head verification — 24 November 2026

- PR #28 current head: `f221742b7cb1f329569613601a382d363774fba0`.
- Workspace CI: [run #45106601568](https://github.com/azaleaforge-ctrl/AzaleaRouter/actions/runs/45106601568) — passed frozen install, moderate/high/critical dependency audit, lint, typecheck, builds, frontend unit tests, PostgreSQL schema/migrations, database/catalog/billing/API/OpenAPI and worker checks.
- CodeQL: [run #45106601565](https://github.com/azaleaforge-ctrl/AzaleaRouter/actions/runs/45106601565) — analysis and SARIF upload completed successfully; this is not a zero-findings or manual security sign-off.
- Gitleaks: [run #45106601599](https://github.com/azaleaforge-ctrl/AzaleaRouter/actions/runs/45106601599) — full reachable-history scan passed.
- Live ancestry comparison from PR #27 head `dde2ad466df882632a8eeacb14e9daa22703e49c` to PR #28 head is ahead 3 / behind 0.
- The three added HTTP tests cover authenticated-user replay scoping, expired-cursor `snapshot.required` recovery, and malformed-cursor rejection before any outbox query. They do not replace long-running reconnect/load soak or full PostgreSQL settlement/outbox integration tests.
