# AzaleaRouter backend decision log

**Status:** Working register; not a substitute for owner approval, legal advice, contracts, or provider credentials.  
**Source:** Backend PRD v0.4, Sections 15–18.  
**Last updated:** 15 November 2026 (Asia/Jakarta).

## Decision principles

- No OPEN decision is treated as approved by implementation work.
- Prefer reversible, standards-based boundaries and local/test configurations while external decisions remain open.
- Record decision owner, evidence, rationale, impact, and effective date before changing an owner-controlled OPEN item to APPROVED.
- Paid upstream traffic, customer charging, live payment merchant use, and production personal-data processing remain disabled until their respective gates pass.

## Decision register

| ID | Decision | Current status | Reversible recommendation / evidence needed | Owner / gate |
|---|---|---|---|---|
| D-01 | Database and ORM | **Technical baseline selected for local/test only; production host/region OPEN** | PostgreSQL 16-compatible SQL + Prisma ORM 7.10.1 (client, CLI and PostgreSQL adapter pinned together). Generic DATABASE_URL; no Supabase-specific DB API in domain code. The implementation includes local Compose, schema and migrations. This is a reversible engineering baseline, not approval of any hosted provider, data residency, production credentials, backup/PITR or production migration ownership. | Engineering baseline for BE-1; user/operations approval still required for production hosting and region |
| D-02 | Domain, API base URL, proxy/CORS | OPEN | Prefer same-origin reverse proxy from web origin to /api/v1; use explicit allowlisted origins only when separate origins are required. Final domains and TLS topology must be supplied/approved. | User approval; BE-1 deployment topology |
| D-03 | Authentication/session | OPEN; Supabase Auth is a PRD candidate | Keep the SessionVerifier façade vendor-neutral. Cookie session with HttpOnly/Secure/SameSite and CSRF protection is the preferred browser pattern, subject to domain topology and provider capabilities. | User approval; BE-2 |
| D-04 | Payment provider/merchant/channel/refund | OPEN | Define an adapter and sandbox contract first. Select an Indonesian merchant provider only after business entity, KYC/merchant eligibility, fees, settlement, webhook, refund and dispute requirements are reviewed. | User/legal/payment merchant; BE-4 / paid beta |
| D-05 | Upstream written permission | **BLOCKER — no executed agreement covering AzaleaRouter's downstream gateway and billing model** | Rechecked 15 Nov 2026. The public [OpenRouter Terms](https://openrouter.ai/terms), last updated 31 Aug 2026, §7(4) prohibits reselling Model API access or developing a competing service. §§5.1–5.2 contemplate customers accessing Models through a customer's products/services subject to Model Terms and flow-down, but do not expressly waive §7(4). The official [Enterprise Access Agreement](https://openrouter.ai/terms-of-service-enterprise), last updated 22 Jun 2026, §2.1 permits an enterprise customer to make the Service available to its End Customers, but grants a non-transferable, non-sublicensable licence; §2.3.7 prohibits renting/reselling or otherwise allowing third-party access. It requires a mutually executed Order Form and incorporates a DPA. This public template is not a signed approval for AzaleaRouter's gateway/proxy, downstream AZL keys, prepaid wallet/third-party billing, website/API or future IDE/CLI. No executed Order Form, DPA or written scope clarification is recorded. Require an OpenRouter-signed agreement/Order Form and qualified legal review explicitly covering the intended customer/API-key/billing flow, model/provider scope and flow-down, data processing/retention, fees/minimum spend and geography before any paid call or customer charging. | OpenRouter + qualified legal review; hard paid-launch blocker |
| D-06 | Object storage/region/encryption/scanner | OPEN | Keep files private and behind a storage adapter. Choose region, encryption, malware scanner and deletion/retention policy before production uploads. | User/security review; production file upload |
| D-07 | USD/IDR FX source/cadence/rounding | OPEN | Keep FX provider behind an adapter and persist immutable FX snapshots per request. Approve source, refresh interval, operator override, fallback and rounding after finance review. | User/finance; BE-4 |
| D-08 | Markup/fixed fee/floor/ceiling | OPEN | Store versioned pricing policy and snapshot it per charge; do not hard-code a business margin in code. | User/finance; BE-4 |
| D-09 | Refund/expiry/chargeback/negative balance/dispute | OPEN | Model reversals as append-only ledger entries. Configure limits, expiry and dispute policy only after payment provider and legal review. | User/legal/finance; BE-4 |
| D-10 | Data retention/privacy/legal basis | OPEN | Separate prompt/output from usage metadata; minimize logging; define retention and deletion workflows with privacy review before production data. | User/legal/privacy; production |
| D-11 | Google/OAuth login | OPTIONAL | Keep out of MVP unless requested; core email/password/session flows must work independently. | Product; optional BE-2 |
| D-12 | Email provider/domain/deliverability | OPEN | Define an email adapter and test sink. Do not send live verification/reset messages until a provider, verified sending domain, templates and anti-abuse policies are approved. | User; BE-2 |
| D-13 | Observability provider/redaction | OPEN | Start with safe structured JSON logs, correlation IDs and OpenTelemetry-compatible interfaces. Select hosted vendor and retention/PII limits separately. | User/security; BE-1 |
| D-14 | Backup/PITR/RPO/RTO/restore | OPEN | Define DB backup, retention, restore drill, RPO/RTO and separate backup credentials before financial production. | User/operations; BE-9 |
| D-15 | Two-person approval thresholds | OPEN | Require immutable audit and maker-checker hooks for sensitive finance/security operations; approve monetary thresholds and approver roles before enabling them. | User/finance; BE-4 / BE-8 |
| D-16 | Upload max size/quota/MIME/scanner | PROPOSED by PRD | PRD baseline: 20 MB per file, 10 files and 50 MB aggregate per message, with model/provider limits allowed to be lower. Keep upload disabled until storage/scanning security gate passes. | Review; production file upload |
| D-17 | SSE replay retention | PROPOSED by PRD | 24-hour replay window, configurable, with cursor-expiry snapshot recovery. Validate storage/load and privacy impacts in BE-6. | Review; BE-6 |
| D-18 | Support hours/incident severity | OPEN | Draft severity levels, escalation owner, support windows and customer communication templates before closed beta. | User/operations; BE-9 |

## Current technical implementation boundaries

- API and worker are separate deployable packages in one modular monorepo.
- Redis/BullMQ is for background processing and coordination only, never the financial source of truth.
- PostgreSQL/Prisma is implemented as a local/test foundation; database host, region, backup/PITR and production credentials remain unselected.
- API session verification is a gated provider integration, not an approved production identity-provider decision.
- OpenRouter/provider adapters must remain swappable. No written downstream permission is assumed.
- CI and local development may use test services only; never production payment credentials or paid upstream calls.

## Change history

| Date | Change |
|---|---|
| 13 Nov 2026 | Initialized from the OPEN/PROPOSED/BLOCKER states in Backend PRD v0.4. No user/business decision is marked approved. |
| 13 Nov 2026 | Recorded PostgreSQL + Prisma 7.10.1 as a reversible local/test baseline. Production hosting, residency, backups and credentials remain OPEN. |
| 13 Nov 2026 | Recorded BE-4 sandbox ledger/payment implementation; D-04/D-07/D-08/D-09/D-15 remain OPEN and D-05 remains a hard blocker. |
| 14 Nov 2026 | Rechecked the official OpenRouter Terms. §7(4) resale/competing-service prohibition remains in effect; no signed exception or downstream authorization is recorded. |
| 15 Nov 2026 | Rechecked the public Terms and Enterprise Access Agreement template. The enterprise template contemplates end-customer use but remains non-sublicensable and prohibits resale/third-party access; no executed Order Form, DPA or AzaleaRouter-specific written scope approval is recorded. D-05 remains blocked. |
