# BE-5 — AZL API Keys, OpenAI-Compatible Gateway, Provider Adapters and Streaming

**Status:** In progress — API-key lifecycle and a fail-closed gateway adapter path are implemented; usage metering/settlement, quotas and legal permission remain gates.  
**Implementation branch:** `feat/backend-gateway-be5`  
**Base:** BE-4 branch `feat/backend-wallet-be4`.

## Implemented in this increment

- AZL key format: `AZL-` plus 32 cryptographically random bytes encoded base64url.
- Plaintext key is returned once on create/rotate only. PostgreSQL persists HMAC-SHA256 hash, visible prefix and pepper version; key list never returns plaintext.
- Server-side API key authentication checks token syntax/hash/status/expiry and active account, updates last-used time without exposing secrets.
- API key owner-scoped list/create/rotate/revoke endpoints, CSRF protection and active-account checks.
- Key scope currently `chat:completions`; optional canonical model allowlist, integer-IDR spend limit, requests-per-minute and concurrency configuration.
- Maximum 20 active keys per account. Expiry worker automatically transitions active expired keys to expired/revoked state.
- OpenAI-compatible `POST /v1/chat/completions` validates request shape, key scope, canonical model eligibility, selected endpoint and endpoint completion limits.
- OpenRouter adapter uses a fixed upstream API base URL, no caller-controlled URL, one selected provider endpoint with fallback disabled, streaming and non-streaming methods, bounded timeout and sanitized upstream error response.
- Streaming response body is relayed with downstream abort propagation and backpressure.
- **Fail-closed activation gate:** route never calls upstream unless the gateway, upstream written approval and BE-6 usage settlement flags are all active. Per-key spend limit also fails closed until BE-6 enforcement is wired.
- No paid upstream traffic was made or enabled.

## Key security invariants

1. No upstream key is returned to browsers or included in logs.
2. AZL plaintext cannot be retrieved after the create/rotate response.
3. Key hashes use HMAC-SHA256 with a separate server-only pepper. Pepper version is stored for controlled migration.
4. API key status is checked on every request; revoked, rotated, expired keys and inactive accounts fail closed.
5. Key lifecycle records cannot be deleted; immutable hash/prefix/user identity; rotations are one-way.
6. API key scopes and canonical model allowlists are enforced server-side.
7. Provider selection is constrained to the stored source catalog; no arbitrary URL, no client-supplied upstream provider credentials.
8. Gateway remains disabled when legal approval or usage settlement is missing.
9. Text-only input is accepted in this first increment; unsupported multimodal payloads are rejected rather than forwarded without verified capability.
10. Upstream response errors are sanitized and upstream raw bodies are not logged or echoed.

## External decisions and remaining work

- D-05 signed upstream approval remains a hard paid-launch blocker.
- D-02 domain/network topology and gateway public URL still need approval.
- No real upstream credential is present in the repository.
- BE-6 must add usage persistence, accurate token/cost reconciliation, pre-request reservation, settlement/release for complete/failed/cancelled streams, per-key RPM/concurrency enforcement and enforceable spend caps before the gateway can be enabled.
- API key configuration includes RPM/concurrency values, but those limits are not yet enforced in this stage; all gateway traffic remains disabled until BE-6.
- Full Playwright/E2E tests and upstream adapter contract tests with a safe local mock server remain exit criteria.
- Streaming usage trailer and partial/disconnect reconciliation will be completed with BE-6.

## Exit criteria not yet met

- Current exact-head CI green for API key, gateway, adapter and database integration tests.
- Cross-user API key IDOR tests for create/list/rotate/revoke.
- RPM, concurrency and spend-limit enforcement with concurrency tests.
- OpenAI compatibility contract tests for non-streaming, streaming, cancellation, timeout, provider error, unknown model and wrong endpoint.
- Accurate usage/cost settlement and ledger reconciliation through BE-6.
- Written D-05 upstream permission and BE-6 settlement must both be verified before any paid gateway traffic.
