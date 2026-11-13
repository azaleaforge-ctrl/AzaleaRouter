# BE-2 — Auth, User, Roles, Turnstile, and Consent

**Status:** In progress — provider-neutral authorization foundation only  
**Depends on:** BE-1 database/configuration foundation and decisions D-03, D-12  
**Implementation branch:** `feat/backend-auth-be2`

## Delivered in this increment

- A normalized authenticated-principal contract with account lifecycle states.
- A vendor-neutral session-verifier interface. The selected provider must validate credentials and session revocation; API routes must not decode unverified tokens.
- Optional session-resolution middleware. With no configured verifier it does not authenticate requests.
- Role-to-permission mapping for `user`, `support`, `admin`, and `super_admin`.
- Explicit owner checks and a restricted assigned-support-resource check.
- Guards for authenticated, active-account, and permission requirements.
- Read-only `GET /api/v1/auth/session` introspection.
- Unit tests for the role and resource-access policy.

## Intentionally not enabled yet

This is not a production login implementation. No fake users, hard-coded passwords, in-memory sessions, demo JWTs, or simulated email delivery are introduced.

The following endpoints remain unavailable until an identity provider and persistent storage are selected and integrated:

- Register, login, logout, and refresh.
- Email verification and resend.
- Forgot/reset password.
- Profile and preferences read/write.
- Consent history and consent recording.
- Export and account-deletion requests.
- Turnstile Siteverify enforcement.

## Blocking decisions and prerequisites

| Item | Current state | Required before implementation |
|---|---|---|
| D-01 database / ORM | OPEN in Backend PRD v0.4 | Approve PostgreSQL + Prisma or a different persistent data design; BE-1 must add migrations/repositories |
| D-03 auth provider/session | OPEN; Supabase Auth is only a candidate | Select identity authority; approve cookie vs bearer session, refresh/revocation and CSRF strategy |
| D-12 email delivery | OPEN | Select email provider, verified sending domain, template ownership and delivery policy |
| Turnstile | Not configured | Confirm site key, hostname/action policy and server-side secret management |
| Consent policy | Needs product/legal input | Approve Terms/Privacy versions, required consent types, retention and re-consent rules |

## Security invariants

1. Identity must come from a verified session adapter, never `user_id` in request input.
2. A suspended, deletion-pending, or deleted account must not pass the active-account guard.
3. Support must not receive general cross-user access; assigned-ticket access requires a database-confirmed assignment.
4. Admin and super-admin powers remain distinct. Admin cannot change security policy or assign super-admin privileges.
5. Every protected route must apply authentication, account-state, permission, and resource-ownership checks appropriate to that route.
6. Verification/reset tokens, passwords, session credentials, Turnstile secrets, and provider secrets must never be logged or returned.
7. No production auth route may be marked complete until persistent integration, rate limits, abuse controls, audit coverage, and integration tests pass.

## Exit criteria for BE-2

- Selected identity provider is configured in isolated development/staging environments.
- Register/login/logout/session/refresh and verification/reset flows use real provider sessions.
- Session revocation and expiry are enforced server-side.
- Turnstile Siteverify rejects invalid, expired, reused, hostname-mismatched, or action-mismatched challenges.
- Profile/preferences/consent lifecycle is persisted and user-scoped.
- RBAC and ownership tests cover every protected route, including cross-user IDOR cases.
- OpenAPI, integration tests, and staging E2E flows pass.
