# BE-4 — Wallet, Ledger, Pricing, and Payments

**Status:** In progress — core IDR wallet ledger and local sandbox webhook path implemented; commercial payment/FX/markup decisions remain blocked.  
**Implementation branch:** `feat/backend-wallet-be4`  
**Base:** current BE-3 catalog branch.  
**Production state:** no merchant, payment gateway, FX source, or live payment credentials configured.

## Implemented in this increment

- PostgreSQL wallet account linked one-to-one to a credit-normal IDR liability ledger account.
- Double-entry journal transaction and ledger entries; every posted transaction must have at least two entries with equal total debit and credit.
- DB guard rejects updates/deletes to posted transactions and all ledger entries. Posting transition is pending → posted/void only.
- Integer IDR amounts represented as PostgreSQL `DECIMAL(38,0)` and application decimal strings.
- Wallet balance is derived from posted customer-wallet ledger credits minus debits; active, unexpired reservations reduce available balance.
- Wallet reservation create/settle/release uses Serializable PostgreSQL transactions and wallet-row locks; idempotency keys prevent duplicate reservation/settlement.
- Expired wallet reservations and pending payment intents are cleaned by bounded worker jobs.
- Payment intent and signed webhook inbox schema; webhook event IDs are unique per provider; signature verification happens before any financial write.
- Local HMAC sandbox adapter with no checkout URL and no external payment network call. Sandbox webhook event can credit the test wallet only after exact body signature, reference, currency and amount are verified.
- Duplicate webhook event is idempotent; wallet top-up uses a balanced debit-to-clearing / credit-to-wallet journal entry.
- FX and pricing-policy snapshot schema; snapshots are append-only.
- BigInt fixed-point usage-cost calculation takes explicit USD model prices and explicit USD/IDR FX snapshot values, supports markup basis points and fixed IDR fee, avoids JS floating point, and rounds customer charge up to whole Rupiah.
- OpenAPI and API routes for balance read, payment intent create and signed payment webhook.

## Security and accounting invariants

1. PostgreSQL ledger is financial source of truth; Redis, browser state and API response cache are never balance authority.
2. A posted journal cannot be changed/deleted. A posted journal must balance in IDR at transaction commit.
3. Reservation and payment intent amounts/currency/identity are immutable after creation.
4. Payment is credited only after a trusted provider adapter verifies the signature on the exact raw request body and a unique provider event ID is persisted.
5. Payment webhook receipt, journal credit and payment-intent state update are one database transaction.
6. Browser redirects are not proof of payment. No redirect route can credit wallet.
7. No unknown or stale model cost/FX is converted into a guessed final charge.
8. Provider/FX/markup/policy prices are snapshots. New policy cannot rewrite old transactions.
9. All IDR values are integer Rupiah; no floating-point arithmetic in the pricing path.
10. The local sandbox adapter is explicitly forbidden in production. No production payment provider is selected.

## External decisions still open

| Decision | State | Consequence |
|---|---|---|
| D-04 payment merchant/provider/channels/fees | OPEN | No real hosted checkout or production top-up |
| D-05 upstream written permission | BLOCKER | No paid downstream model traffic or customer charging |
| D-07 USD/IDR FX source/cadence/override | OPEN | No production IDR pricing policy |
| D-08 markup/floor/ceiling | OPEN | No final production customer quote |
| D-09 expiry/refund/chargeback/negative balance | OPEN | No production refund or dispute operations |
| D-15 two-person financial approval thresholds | OPEN | No live admin financial adjustment/refund workflow |

The local sandbox adapter is for integration tests only. It is not a selected payment merchant and is not a path to production money movement.

## Exit criteria not yet met

- Select and onboard a real Indonesian payment merchant; verify production webhook signing and refund support.
- Define and approve FX source, refresh cadence, stale-rate blocking, rounding and overrides.
- Approve markup formula, floors/ceilings, minimum usage charges and charge caps.
- Approve refund, expiry, chargeback, dispute and negative-balance rules.
- Complete production payment inquiry/webhook races, duplicate webhook, replay, refund and reconciliation cases against the chosen merchant sandbox.
- Complete concurrency tests that run competing reservations against the same wallet and prove no double spend.
- Complete backup/restore and reconciliation drill before handling real money.
- Obtain legal and commercial clearance D-05 before any paid upstream access.

A green CI run can verify code paths and ephemeral PostgreSQL integrity; it cannot approve a merchant agreement, FX source, legal policy or production money movement.
