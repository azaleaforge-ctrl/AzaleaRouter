# AzaleaRouter Frontend Demo — Design

**Status:** Draft for user review  
**Date:** 2026-11-13  
**Source:** `AzaleaRouter-PRD-Frontend-v0.3.md` and user-approved decisions

## 1. Goal and scope

Build the complete Phase 1 frontend sitemap as a responsive, interactive demo directly in the project root (`C:\\AzaleaRouter`). The current workspace has the frontend/backend PRDs and two brand reference images, but no application or backend. Therefore the frontend must be usable with mock services while keeping the API boundary replaceable by a future AzaleaRouter backend.

Included: public marketing/catalog/content pages, auth screens, user dashboard and feature screens, admin screens, shared layout/design system, typed API client, explicit demo fixtures/states, and frontend tests.

Excluded: backend, production authentication/RBAC, OpenRouter integration, real model catalog/pricing, payments, wallet/ledger mutations, actual API-key issuance, durable chat, legal approval, and production launch readiness. Mock behavior must never imply those services are live.

## 2. Product and safety constraints

- All UI copy is Indonesian, retaining common technical/API terms in English.
- Mock catalog, prices, usage, balances, transactions, status, and chat responses are clearly marked as illustrative demo data. They are not claims of availability, price, provider permission, or product performance.
- UI accommodates a catalog of 50+ validated canonical models, but mock fixtures do not satisfy the PRD launch requirement for 50 real validated models.
- Terms and Privacy screens are review-needed placeholders, not final legal documents.
- Auth, role switching, API-key reveal, chat, top-up, wallet, and admin actions are simulations. No payment, charge, or upstream request is performed.
- Never put credentials/secrets in fixtures, browser storage, URLs, telemetry, or logs. Demo role switching is not a security boundary.
- Do not compute or present a final real debit in the browser. Do not contact OpenRouter directly.

## 3. Recommended architecture

- Project root: Next.js App Router + TypeScript, Tailwind CSS and shadcn/ui. Keep application files directly in the root; do not add an `apps/web` wrapper.
- Route groups separate marketing, auth, authenticated user screens, and admin screens. Shared components live under `src/components`; domain interfaces and services live under `src/features`; API transport and demo implementations live under `src/lib`.
- Server Components render static/public content where appropriate. Client Components handle forms, charts, local interactions, chat simulation, and realtime simulation.
- Feature components depend on typed service interfaces, not fixture imports. A runtime configuration selects the mock adapter now; a future backend adapter can implement the same interfaces without changing UI components.
- Keep financial display formatters separate from financial calculation. In demo mode, amounts are fixture values only and are labeled as demo.
- No backend, shared monorepo packages, or infrastructure are added in this frontend-only effort.

### Data flow

`route/component → typed feature service → configured API adapter → mock fixture/scenario`

The adapter contract models safe request/response data, loading, errors, and pagination. The mock adapter supports deterministic normal, empty, delayed, failed, stale/offline, interrupted-stream, and reconnect scenarios. It does not pretend to verify payments, identities, permissions, or model availability.

## 4. Information architecture

Implement all routes in the frontend PRD:

- Public: `/`, `/models`, `/models/[provider]/[model]`, `/pricing`, `/docs`, `/docs/quickstart`, `/docs/ide/[slug]`, `/docs/cli/[slug]`, `/help`, `/help/[slug]`, `/blog`, `/blog/[slug]`, `/status`, `/changelog`, `/terms`, `/privacy`.
- Auth: `/login`, `/register`, `/forgot-password`.
- User: `/app/overview`, `/app/chat`, `/app/models`, `/app/usage`, `/app/transactions`, `/app/wallet`, `/app/api-keys`, `/app/playground`, `/app/settings/profile`, `/app/settings/security`, `/app/settings/preferences`, `/app/notifications`.
- Admin: `/admin/overview`, `/admin/users`, `/admin/models`, `/admin/providers`, `/admin/pricing`, `/admin/wallets`, `/admin/payments`, `/admin/usage`, `/admin/upstream`, `/admin/support`, `/admin/content`, `/admin/audit-logs`, `/admin/settings`.

Shared public navigation/footer, user application shell, and admin shell provide consistent wayfinding. Unknown routes render a designed not-found state. Deep links remain valid on refresh.

## 5. UX and visual direction

- Premium, minimal, calm, developer-friendly, following the PRD rather than copying the intense neon/glow treatment of the reference images.
- Light mode is the default; dark mode is supported. Use the supplied AzaleaRouter mark and purple as a restrained brand accent; reserve gradients/illustration for hero and selected brand moments. Teal supports status/success, not arbitrary decoration.
- Geist or Inter typography, consistent spacing, 12–16px component radii, stable skeleton dimensions, permanent form labels, clear hover/focus/disabled/loading/error states.
- Responsive desktop/tablet/mobile layouts; dashboard navigation collapses appropriately, complex tables scroll safely, and charts have readable list/table alternatives.
- Meet WCAG 2.2 AA as a target: keyboard access, visible focus, labeled controls/errors, semantic status text, sufficient contrast, and no color-only meaning.
- Every major feature defines loading, empty, success, validation/API error, offline/reconnecting, disabled/permission, and stale states where applicable.

## 6. Feature behavior in demo mode

- Landing, pricing, marketplace, and model detail use adapter-fed demo fixtures and show their illustrative status. Model selection reflects fixture capabilities; unknown details are omitted rather than invented.
- Login/register/reset forms perform client-side validation and demonstrate simulated outcomes; Turnstile is not represented as server-verified.
- Chat/playground simulate request lifecycle and streaming, cancellation/interruption, and safe retry messaging. No upstream request is sent.
- API-key create can show a visibly fake, non-usable demo token once, then only a masked representation. Do not use a value that could authenticate against any real service.
- Wallet/top-up, transactions, charts, and SSE show sample/provisional states. Top-up remains simulated and never claims a real payment was confirmed. Reconnect refreshes the mock snapshot.
- Admin actions alter only local/demo state and are clearly marked simulated. Demo role selection exists only to navigate screens.
- Documentation, Help Center, blog, changelog, and status content use clearly labeled demo content; no unverified compatibility, uptime, legal, or upstream claims.

## 7. Testing and acceptance

- Unit/component tests cover currency/date/token formatters, form validation, error mapping, theme states, masking/demo token behavior, filters, chart legends/table alternatives, and loading/empty/error/offline UI.
- Playwright covers landing CTA to registration, auth validation, catalog filter/detail, mock chat stream/cancel/error, API-key one-time demo reveal/masking, simulated wallet status, usage filtering, theme/responsive navigation, and admin demo navigation.
- Validate all routes render, direct navigation/refresh works, keyboard paths are usable, and no critical browser console errors occur.
- A successful demo build is not evidence of backend integration, legal approval, 50 valid models, payment correctness, real RBAC, or production readiness; document these as blockers for a later integration/release phase.

## 8. Delivery sequence

Use the PRD's FE phases as one frontend project split into reviewable increments:

1. FE-0: app foundation, tokens, shared primitives/layout, responsive baseline, mock/API boundary.
2. FE-1: marketing landing, auth, terms/privacy placeholders.
3. FE-2 and FE-7: model marketplace/detail/pricing and public docs/help/blog/changelog/status.
4. FE-3 and FE-4: user dashboard, wallet/transactions, API-key demo, playground.
5. FE-5 and FE-6: chat, analytics, chart preferences and SSE simulation.
6. FE-8: admin screens and demo role navigation.
7. FE-9: accessibility, performance, route/E2E coverage, responsive and visual polish.

The final frontend acceptance point is a complete, testable demo against mock services. Real integration remains explicitly pending until stable backend contracts and services exist.

## 9. Assumptions and open integration dependencies

- The user approved a complete interactive frontend demo using mock APIs and Indonesian UI with English technical terms.
- The user approved the PRD's restrained minimal visual direction, using supplied images as brand/hero accents.
- The backend PRD remains a draft. API shapes, auth/session, Turnstile site key, SSE events, model catalog, real pricing, payment provider, and legal content must be confirmed before replacing mocks or claiming launch readiness.
- No real catalog/pricing or legal text is inferred from the candidate list or reference images.
