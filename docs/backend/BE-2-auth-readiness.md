# BE-2 — Authentication, User, Roles, Turnstile, and Consent

**Status:** Implementation in progress; provider adapter is feature-gated and not enabled by default.  
**Implementation branch:** `feat/backend-auth-be2-final`  
**Depends on:** BE-1 PostgreSQL/Prisma schema and migration.  
**External decisions:** D-03 identity/session provider, D-12 mail delivery, D-10 Terms/Privacy and data-retention review.

## Implemented in this increment

- Provider-neutral SessionVerifier interface and validated AuthenticatedPrincipal.
- Supabase Auth REST adapter for signup, password grant, refresh token grant, validated remote user lookup, email token verification, resend, recovery, password update, and logout.
- Supabase service-role credentials are not accepted or used; the adapter uses only a publishable/anon key.
- Database-backed opaque session IDs; only SHA-256 hashes of session and CSRF tokens are persisted.
- Supabase access and refresh tokens are AES-256-GCM encrypted at rest using a dedicated 32-byte key and a version label. The key is never stored in the database or repository.
- Session refresh is serialized using a PostgreSQL row lock. Logout revokes the local session and requests provider logout. Revoked sessions cannot be modified or deleted through ordinary session methods.
- Browser cookies: HttpOnly session cookie, Secure outside development/test when enabled, SameSite=Lax, host-only, plus a separate readable CSRF cookie. Unsafe browser requests require a matching X-CSRF-Token and an exact allowlisted Origin.
- Roles and account statuses are read from AzaleaRouter's PostgreSQL user row, never from user-supplied body fields or provider metadata. Admin and super-admin remain separate.
- Turnstile server-side validation against Cloudflare's fixed Siteverify URL; checks success, hostname, action, challenge timestamp (five-minute validity) and a PostgreSQL unique-token replay record.
- Persistent HMAC-hashed rate-limit buckets using PostgreSQL atomic upsert, so replicas share counters without storing raw IP/email identifiers in the limiter table.
- User registration, login, logout, refresh, email verification/resend, password recovery/reset, profile/preferences and consent endpoints.
- Registration stores explicit current Terms and Privacy version acceptances in append-only consent history. Versions must be supplied in configuration; the code does not invent legal document contents or version approvals.
- Disabled-by-default auth router returns a clear 503 for auth operations until an approved provider/configuration has been enabled.

## Security controls and invariants

1. Authentication and user lookup use provider-validated remote identity; no decoded JWT claims are trusted.
2. Local sessions are opaque and revocable; provider tokens are encrypted at rest and never returned to the browser.
3. Refresh is serialized to reduce refresh-token reuse races.
4. Session and CSRF cookies are separate; unsafe browser requests require CSRF header/cookie equality and an allowlisted Origin.
5. Turnstile token is validated exactly once by AzaleaRouter; the same token must not also be validated by Supabase CAPTCHA protection. Supabase's project CAPTCHA gate must remain disabled when this adapter is used.
6. A single-use token hash is stored after Siteverify success; replay is rejected by a unique DB constraint.
7. Rate-limit keys are HMAC hashes; request body, passwords, tokens, authorization headers and provider payloads are excluded from logs.
8. User role is not accepted from registration or provider user metadata. New accounts are created as `user` with pending verification unless the provider confirms email.
9. Account deletion is not implemented by this increment. It requires a separate retention/privacy/legal policy and tombstone workflow.
10. Email delivery depends on SMTP/mail settings configured at the selected Supabase project. No provider credential, sender domain or SMTP service is included here.

## Decision-gated provider configuration

The adapter is a technical option, not a decision that D-03 has been approved. It remains disabled by default. Activation requires:
- Owner approval of the identity provider, session approach, domain topology and CSRF/cookie design.
- `AUTH_PROVIDER=supabase` and `AUTH_PROVIDER_APPROVED=true`.
- Supabase URL and publishable/anon API key.
- Separate 32-byte base64 AES key, independent HMAC rate-limit key, key-rotation procedure, and secure secret storage.
- Cloudflare Turnstile server secret, allowed hostname, actions and site key in the frontend.
- Verified sending domain/SMTP, templates and redirect allowlist in Supabase (D-12).
- Approved current Terms and Privacy versions and retention/legal basis (D-10).
- HTTPS origin and secure-cookie behavior outside local development.

## Remaining exit criteria

- Current exact-head CI must pass lint, typecheck, build, integration tests, DB migrations, API OpenAPI lint, and relevant Playwright staging E2E.
- Real isolated staging credentials and verified email domain must exercise signup → email verify → login → refresh → logout → password recovery/reset.
- Cloudflare Turnstile test/live keys must verify invalid, expired, reused, hostname-mismatched and action-mismatched challenges.
- Cross-user IDOR tests must cover every protected user-scoped resource as new endpoints are added.
- The frontend must be checked for CSRF cookie/header propagation and auth lifecycle UX; this backend PR does not silently change frontend behavior.
- D-03/D-10/D-12 approvals and live credentials remain external gates. Auth does not become production-ready merely because code or mock contract tests pass.
