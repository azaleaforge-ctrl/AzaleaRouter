# AzaleaRouter billing package

This package provides exact IDR integer arithmetic and wallet ledger services. No JS floating-point arithmetic is used for balance, usage cost or settlement values.

## Financial invariants

- IDR values are persisted as PostgreSQL `DECIMAL(38,0)` and passed to the application as integer decimal strings.
- Debit and credit ledger entries must balance for each posted journal transaction.
- Posted ledger transactions, entries, reservations, verified payment webhook receipts, FX snapshots and pricing policy snapshots are immutable; only explicit one-way processing/status transitions are allowed where the lifecycle requires it.
- Payment credit happens only after a payment adapter verifies the exact raw webhook signature and the inbox event is persisted idempotently.
- Available balance = posted wallet liability credits − posted wallet liability debits − active unexpired reservations.
- Wallet reserve/settle/release operations use PostgreSQL row locks and idempotency keys.
- Upstream USD prices and FX quotes are snapshots with source timestamp and content hash. Missing, stale or invalid pricing/FX is a hard failure, never guessed.
- Browser redirects are not payment-success evidence.
- Payment merchant, actual FX source, markup policy, refund/expiry/chargeback policies and two-person thresholds remain explicit decisions.

## Exact usage charging

`calculateUsageCostIdr` accepts decimal strings from source price/FX snapshots and token/request/image counts. It uses BigInt fixed-point math, rounds provider cost and customer charge upward to integer rupiah, and returns explicit provider cost and customer charge values. It cannot fetch or invent a missing price/rate.
