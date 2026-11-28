**Status:** Implementation in progress. PR #35 adds zero-cost settlement coverage and bounded P2034 retry to finalization. PR #36 adds failure/release idempotency coverage and applies the same P2034-only bounded retry policy to `UsageService.begin()`, `markPendingReconciliation()` and `fail()`. PR #37 fixes bounded stale-lease cleanup/retention, corrects the reconciliation state to the database-supported `pending`, and adds PostgreSQL integration coverage for 501 expired leases across two runs. Exact-head workspace CI [#46102215901](https://github.com/azaleaforge-ctrl/AzaleaRouter/actions/runs/46102215901), CodeQL [#46102215989](https://github.com/azaleaforge-ctrl/AzaleaRouter/actions/runs/46102215989) and Gitleaks [#46102216073](https://github.com/azaleaforge-ctrl/AzaleaRouter/actions/runs/46102216073) passed on PR #37 code/test head `07d45a966a0524ae96b1dcebf5eeec0ff09aa70c`. The worker suite reported 15 passed, 0 failed and 0 skipped. SSE soak and manual CodeQL triage remain open.
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

## Additional PostgreSQL integration coverage — 25–26 November 2026

PR #31 adds `packages/billing/test/usage-service.integration.test.ts` with two DATABASE_URL-gated PostgreSQL integration scenarios:

- Full `begin → finalize` settlement using persisted catalog-price, FX and pricing-policy snapshots, a wallet reservation, one balanced ledger posting, usage aggregate update and started/settled outbox events.
- Actual customer charge above the reserved amount, verifying `pending_reconciliation`, no ledger debit, preserved wallet hold, released concurrency lease, a safe notification event and no successful aggregate.

The successful scenario repeats finalization and verifies that no second ledger transaction, aggregate increment or outbox event is created.

PR #35 adds a third DATABASE_URL-gated PostgreSQL integration scenario for a zero-token/zero-cost completion. It verifies that the initial IDR reservation is marked settled at `0`, the full hold is released, no zero-value ledger transaction is posted, the wallet returns to its pre-request available balance, the successful usage aggregate and safe started/settled outbox events are recorded, and a repeated finalization creates no duplicate aggregate or event. The test is committed on branch `test/zero-cost-usage-settlement-be6`; billing integration test output confirms 12 passed, 0 failed and 0 skipped, including the new zero-cost scenario. Exact-head workspace CI [#45749125237](https://github.com/azaleaforge-ctrl/AzaleaRouter/actions/runs/45749125237), CodeQL [#45749125348](https://github.com/azaleaforge-ctrl/AzaleaRouter/actions/runs/45749125348) and Gitleaks [#45749125262](https://github.com/azaleaforge-ctrl/AzaleaRouter/actions/runs/45749125262) passed on code/test head `2113bc37cbc768f730b7dc16851c137c1cf5adf4`. A subsequent status-documentation-only commit is now the PR head and requires its own exact-head workflow verification.

A later exact-head workspace run [#45749729761](https://github.com/azaleaforge-ctrl/AzaleaRouter/actions/runs/45749729761) exposed a PostgreSQL `P2034` serialization conflict during `UsageService.finalize()` in the zero-cost integration scenario. PR #35 now wraps finalization in the existing bounded serializable retry policy. The callback contains database work only; retries are limited to Prisma `P2034`, while unique-constraint and other failures are not retried. `packages/billing/test/serializable-retry.test.ts` verifies retry success, non-retry of `P2002`, and the three-attempt ceiling. The exact follow-up head `559993efcf6dd211336933ba6a7b7eef5281cf33` passed workspace CI [#45936425921](https://github.com/azaleaforge-ctrl/AzaleaRouter/actions/runs/45936425921), CodeQL [#45936425705](https://github.com/azaleaforge-ctrl/AzaleaRouter/actions/runs/45936425705) and Gitleaks [#45936425661](https://github.com/azaleaforge-ctrl/AzaleaRouter/actions/runs/45936425661).

The first exact-head workspace CI [#45538960553](https://github.com/azaleaforge-ctrl/AzaleaRouter/actions/runs/45538960553) exposed a production defect: `UsageService.begin()` inserted the usage record and then attempted to update its immutable `wallet_reservation_id`. Commit `c1679e88c2bfc453e386bd3e4aa1213177f30b07` fixes this by allocating the usage ID, creating the reservation first, and inserting the usage record with the reservation reference set initially.

Corrected code/test head `a87f48f8848cd3a36d2d18248364ac9537d8acdc` passed exact-head workspace CI [#45539316910](https://github.com/azaleaforge-ctrl/AzaleaRouter/actions/runs/45539316910), CodeQL workflow [#45539316908](https://github.com/azaleaforge-ctrl/AzaleaRouter/actions/runs/45539316908) and Gitleaks [#45539316909](https://github.com/azaleaforge-ctrl/AzaleaRouter/actions/runs/45539316909). Billing integration tests passed, including both new scenarios. CodeQL still reports eight backend `js/missing-rate-limiting` sinks and one frontend `js/identity-replacement` finding; these require manual triage.

PR #31 current head `7c2a84968785e709543d14379f5596d8aebca25b` passed exact-head workspace CI [#45539612479](https://github.com/azaleaforge-ctrl/AzaleaRouter/actions/runs/45539612479), CodeQL workflow [#45539612570](https://github.com/azaleaforge-ctrl/AzaleaRouter/actions/runs/45539612570) and Gitleaks [#45539612484](https://github.com/azaleaforge-ctrl/AzaleaRouter/actions/runs/45539612484). CodeQL still reports eight backend `js/missing-rate-limiting` sinks and one frontend `js/identity-replacement` finding; manual triage remains open. PR #34 head `52fca2b557c28dcabc39154544f1fc9b75015339` passed exact-head workspace CI [#45539969647](https://github.com/azaleaforge-ctrl/AzaleaRouter/actions/runs/45539969647), CodeQL workflow [#45539969613](https://github.com/azaleaforge-ctrl/AzaleaRouter/actions/runs/45539969613) and Gitleaks [#45539969740](https://github.com/azaleaforge-ctrl/AzaleaRouter/actions/runs/45539969740). CodeQL workflow success is not a zero-findings sign-off; the same 8 backend rate-limit sinks and 1 frontend identity-replacement finding remain for manual triage. This evidence refresh is documentation-only and requires its own exact-head run. No stage completion is inferred.


PR #36 adds a fourth DATABASE_URL-gated PostgreSQL integration scenario for upstream failure/release. It starts a request with an IDR reservation, invokes `UsageService.fail()` twice, and verifies terminal `failed` state, released reservation and concurrency lease, restored available balance, zero settlement ledger entries, and exactly one `usage.request.failed` outbox event. The implementation treats `failed` as terminal and wraps the database-only `begin()`, `markPendingReconciliation()` and `fail()` serializable transactions in the bounded P2034 retry helper already used by finalization. Exact-head workspace CI [#45936985183](https://github.com/azaleaforge-ctrl/AzaleaRouter/actions/runs/45936985183), CodeQL [#45936985206](https://github.com/azaleaforge-ctrl/AzaleaRouter/actions/runs/45936985206) and Gitleaks [#45936985177](https://github.com/azaleaforge-ctrl/AzaleaRouter/actions/runs/45936985177) passed on code/test head `8de61b303fcbaf03e09c897618bc794a48202f8b`. The branch is stacked on PR #35 and compares ahead 2 / behind 0.
## Still open / not claimed complete

- Exact-head workspace CI, CodeQL and Gitleaks passed for PR #28 head `f221742b7cb1f329569613601a382d363774fba0` on 24 November 2026. Workspace CI completed frozen install, moderate/high/critical dependency audit, workspace lint, frontend typecheck/build/unit tests, database schema/migrations, catalog/billing/API/OpenAPI and worker checks. This does not complete the entire BE-6 acceptance suite.
- A load/reconnect soak with real long-running SSE clients has not been executed.
- PR #31's initial CI exposed the immutable reservation-reference defect; the fix is described above. The corrected code/test head `a87f48f8848cd3a36d2d18248364ac9537d8acdc` passed exact-head workspace CI, CodeQL workflow and Gitleaks, and PR #31 current head `7c2a84968785e709543d14379f5596d8aebca25b` also passed all three exact-head checks. Eight backend CodeQL rate-limit sinks and one frontend identity-replacement finding remain for manual triage. PR #34's BE-0 documentation correction and this readiness update are under exact-head CI. Stale-lease cleanup/retention integration coverage, long-running SSE reconnect/load soak and approved-provider E2E remain outstanding; provider E2E is blocked by D-05.
- D-04/D-07/D-08/D-09 financial approval and D-06/D-10 file/data retention decisions remain open.
- No production database, provider credentials, external payment merchant, paid upstream traffic or deployment is configured.


## Latest exact-head verification — 24 November 2026

- PR #28 current head: `f221742b7cb1f329569613601a382d363774fba0`.
- Workspace CI: [run #45106601568](https://github.com/azaleaforge-ctrl/AzaleaRouter/actions/runs/45106601568) — passed frozen install, moderate/high/critical dependency audit, lint, typecheck, builds, frontend unit tests, PostgreSQL schema/migrations, database/catalog/billing/API/OpenAPI and worker checks.
- CodeQL: [run #45106601565](https://github.com/azaleaforge-ctrl/AzaleaRouter/actions/runs/45106601565) — analysis and SARIF upload completed successfully; this is not a zero-findings or manual security sign-off.
- Gitleaks: [run #45106601599](https://github.com/azaleaforge-ctrl/AzaleaRouter/actions/runs/45106601599) — full reachable-history scan passed.
- Live ancestry comparison from PR #27 head `dde2ad466df882632a8eeacb14e9daa22703e49c` to PR #28 head is ahead 3 / behind 0.
- The three added HTTP tests cover authenticated-user replay scoping, expired-cursor `snapshot.required` recovery, and malformed-cursor rejection before any outbox query. They do not replace long-running reconnect/load soak or full PostgreSQL settlement/outbox integration tests.


## Latest exact-head verification — 27 November 2026

- PR #35 code head: `559993efcf6dd211336933ba6a7b7eef5281cf33`; base PR #34 head `d39a4c279df39acffc222f59891b91aaa7e57b5b`; comparison is ahead 9 / behind 0.
- Workspace CI [#45936425921](https://github.com/azaleaforge-ctrl/AzaleaRouter/actions/runs/45936425921) passed frozen install, moderate/high/critical dependency audit, workspace lint, frontend typecheck/build/unit tests, PostgreSQL schema validation and migrations, database/catalog/billing/API/OpenAPI/worker lint, typecheck, builds and tests. The zero-cost PostgreSQL integration scenario and three serializable-retry unit tests passed. API lint still emits six pre-existing unused-import warnings in `apps/api/src/app.ts` (zero errors).
- CodeQL [#45936425705](https://github.com/azaleaforge-ctrl/AzaleaRouter/actions/runs/45936425705) completed successfully; this does not close the eight custom-rate-limit sinks or the separate frontend identity-replacement finding. Manual triage remains open.
- Gitleaks [#45936425661](https://github.com/azaleaforge-ctrl/AzaleaRouter/actions/runs/45936425661) passed.
- No provider E2E, live upstream call, payment, production deployment or customer charging was performed.


### PR #36 exact-head verification — 27 November 2026

- Code/test head: `8de61b303fcbaf03e09c897618bc794a48202f8b`; base PR #35 head `8abddcf9a04b364af151f99b2ca09e2d786d1968`; comparison ahead 2 / behind 0.
- Workspace CI [#45936985183](https://github.com/azaleaforge-ctrl/AzaleaRouter/actions/runs/45936985183) passed frozen install, moderate/high/critical dependency audit, workspace lint, frontend/database/catalog/billing/API/OpenAPI/worker typecheck/build/tests and PostgreSQL schema/migration checks. The new failure/release integration scenario passed.
- CodeQL [#45936985206](https://github.com/azaleaforge-ctrl/AzaleaRouter/actions/runs/45936985206) completed successfully; manual review of existing alerts remains required.
- Gitleaks [#45936985177](https://github.com/azaleaforge-ctrl/AzaleaRouter/actions/runs/45936985177) passed.
- No production provider call, customer charge, release or deployment occurred.


## PostgreSQL worker cleanup and retention integration coverage — 28 November 2026

PR #37 adds a DATABASE_URL-gated worker integration scenario using the ephemeral PostgreSQL CI service and synthetic fixtures. It creates 501 expired streaming usage leases and verifies that the 500-row batch limit does not cause unprocessed leases to be deleted. The first run moves 500 requests into `pending_reconciliation`, releases their concurrency leases, and leaves one expired lease for the next run; the second run reconciles the remaining request. Newly released leases remain queryable during the 24-hour retention window and are pruned only after their `releasedAt` passes the cutoff. The same scenario verifies that expired rate windows, usage exports and outbox events are removed while unexpired records remain.

The integration test exposed and fixes two concrete issues in the cleanup handler: the post-processing deletion query previously included every expired lease, including rows beyond the 500-row batch, and the handler wrote `reconciliationStatus: "required"` even though the PostgreSQL constraint accepts `pending` rather than `required`. The handler now orders expired leases oldest-first, preserves newly released rows until retention expires, and writes `pending`.

Exact-head workspace CI [#46102215901](https://github.com/azaleaforge-ctrl/AzaleaRouter/actions/runs/46102215901), CodeQL [#46102215989](https://github.com/azaleaforge-ctrl/AzaleaRouter/actions/runs/46102215989) and Gitleaks [#46102216073](https://github.com/azaleaforge-ctrl/AzaleaRouter/actions/runs/46102216073) passed on code/test head `07d45a966a0524ae96b1dcebf5eeec0ff09aa70c`. The worker suite reported 15 passed, 0 failed and 0 skipped. CodeQL workflow success is not a zero-findings sign-off; the existing custom-rate-limit and frontend identity-replacement alerts still require manual triage.