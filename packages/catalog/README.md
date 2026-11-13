# AzaleaRouter model catalog package

Source-backed catalog ingestion and validation. The initial adapter uses OpenRouter **metadata GET endpoints only**; it does not call chat completions or spend model credits.

## Source and canonical identity

- Models are requested with text output modality and the OpenAI-compatible chat-completions endpoint filter.
- Canonical identity is the upstream `canonical_slug` (falling back to upstream `id` only when the canonical field is absent). The source+canonical slug unique constraint prevents alias rows from being counted as multiple models.
- Provider-specific endpoint detail is retrieved for each model. Only endpoints whose exact `model_id` matches the selected canonical model and that include valid prompt/completion/request/image pricing are eligible.
- All price values remain decimal strings through parsing and are stored as PostgreSQL Decimal values in immutable USD snapshots. No JS floating-point conversion, FX conversion, markup or IDR price is generated here.
- Sync writes a run record, preserves last-known-good data on partial source failure, and deactivates missing canonical models only after a complete source scan.
- Public-catalog readiness is computed from distinct active canonical models with at least one active OpenAI-compatible chat endpoint and a valid USD snapshot. Readiness threshold is 50; no fake records or seeds are created.

## Feature gate

The worker does not contact the source unless all of these are configured:
- `CATALOG_SYNC_ENABLED=true`
- `CATALOG_SOURCE_APPROVED=true`
- `OPENROUTER_CATALOG_API_KEY` available from runtime secret storage

No key is committed. Approval of metadata access is not approval to resell or proxy paid model traffic. D-05 remains a separate paid-launch gate.

## Checks

```bash
corepack pnpm --filter @azalea-router/catalog lint
corepack pnpm --filter @azalea-router/catalog typecheck
corepack pnpm --filter @azalea-router/catalog build
corepack pnpm --filter @azalea-router/catalog test
```
