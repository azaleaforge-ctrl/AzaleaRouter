# BE-9 — Closed-Beta Readiness, Operations and Go/No-Go

**Status:** Readiness framework drafted on `feat/backend-closed-beta-be9`; operational execution is blocked by unselected production infrastructure and owner/legal decisions.
**Base:** BE-8 branch head `e8baa01ac2113939ca5a726db30b1f2dc3e7721c` (current dependency head at this readiness snapshot).
**Launch state:** **NO-GO** for closed beta with customer data or paid upstream traffic. This document is a runbook template, not evidence that production controls exist.

## 1. Go/no-go gates

A closed beta may not be approved until every applicable gate has an owner, evidence link, test result and explicit approval.

| Gate | Required evidence | Current state |
|---|---|---|
| Upstream/legal (D-05) | Written permission from an authorized upstream representative covering gateway/proxy, downstream AZL customer keys, third-party billing, website/API and future IDE/CLI scope; model/provider flow-down terms; qualified legal review | **BLOCKED — no written permission recorded** |
| Identity/privacy (D-03/D-10/D-12) | Approved identity/session provider, approved Terms/Privacy versions and legal basis, retention/deletion process, verified email domain, staging E2E evidence | OPEN |
| Catalog (BE-3) | At least 50 distinct active canonical chat-capable models, exact current model IDs/endpoints/capabilities, source-timestamped valid prices and provider terms | **NOT MET — verified count is 0** |
| Finance (D-04/D-07/D-08/D-09/D-15) | Merchant onboarding and sandbox certification, FX source/cadence, approved pricing/markup/caps, refund/dispute policy, maker-checker thresholds, reconciliation evidence | OPEN |
| Files (D-06/D-16) | Production private storage/region/encryption, scanner, MIME/quota tests, retention/deletion, clean-file E2E and incident response | OPEN; only local adapter and fail-closed scanner boundary exist |
| Reliability (D-14) | Production DB and Redis topology, backup/PITR, measured RPO/RTO, restore drill, capacity/load tests, rollback evidence | OPEN |
| Operations (D-18) | Named incident commander, on-call/escalation contacts, support hours, severity/SLA, status-page and customer communication procedures | OPEN |
| Application security | Dependency/SAST/secrets scans, threat model, IDOR/CSRF/rate-limit tests, penetration review, admin/audit review, exact-head green CI | INCOMPLETE |
| Stage completion | BE-0..BE-8 acceptance evidence, resolved reviews, clean dependency chain and migration audit | INCOMPLETE |

No owner approval, legal permission, merchant onboarding, production credential, alert threshold or RPO/RTO is inferred by this checklist.

## 2. Backup and restore runbook

### 2.1 Preconditions — currently unavailable

Before production data is accepted, record and approve:

- PostgreSQL provider, region, encryption at rest, TLS, backup/PITR capability and separate backup credentials.
- Backup cadence, retention, immutable/off-account copy, encryption-key custody and access audit.
- RPO and RTO targets, restore priority, escalation owner and maintenance window.
- Redis/BullMQ recovery policy. Redis is coordination/queue state only; PostgreSQL remains financial source of truth.
- Object-storage provider, region, versioning, retention, encryption and restore strategy.
- Secret and key inventory, rotation/escrow/recovery procedure; never store plaintext secrets in backup logs or this repository.
- Legal hold, deletion and retention interaction for user content, uploaded files, support tickets and audit records.

### 2.2 Scheduled backup verification

When a production platform is approved, operations must:

1. Verify the most recent full backup and WAL/PITR continuity from the provider control plane.
2. Verify backup encryption, immutable/off-account copy and least-privilege access.
3. Record backup identifier, UTC completion time, covered database/region, size/checksum, retention expiry and operator.
4. Confirm object-storage inventory/versioning and database-to-object references are recoverable.
5. Alert on missing, stale, failed or inaccessible backups using thresholds approved by operations.

Do not paste backup credentials, connection strings, customer records or signed URLs into CI logs or tickets.

### 2.3 Restore drill — required before beta

1. Obtain an approved isolated restore target; never overwrite the live database during a drill.
2. Restore a recent backup plus WAL to the isolated target using the selected provider's documented procedure.
3. Verify PostgreSQL connectivity, schema/migration state and row-level integrity checks.
4. Run ledger invariants: every posted journal balances, posted entries remain immutable, wallet balances reconcile to ledger, reservations and settlements are idempotent.
5. Reconcile payment intents/webhook inbox, usage records/reservations/settlements, pending reconciliation, outbox cursors and audit continuity.
6. Verify object references, checksums, scanner state and deletion/retention metadata without making quarantined content downloadable.
7. Run API smoke tests and representative read-only admin reports against the isolated restore.
8. Measure actual RPO/RTO; compare to approved targets; document gaps and remediation.
9. Destroy the isolated restore securely after evidence is retained according to the approved policy.

**Evidence required:** operator, approver, restore target, backup/PITR IDs, start/end UTC, measured RPO/RTO, integrity results, failed checks, remediation owner and signed outcome. No restore drill has been run because production infrastructure and targets are not selected.

## 3. Rollback and forward-fix policy

- Deployments must use immutable, versioned artifacts and a documented previous-known-good artifact.
- Database migrations are forward-only unless a reviewed, tested rollback is explicitly safe. Do not run an improvised down migration against financial or user data.
- Feature flags must independently disable paid gateway traffic, customer charging, payment creation, auth, uploads and catalog sync.
- On an application regression, stop new traffic to the affected feature, preserve request IDs and safe logs, and roll back application code only if it is schema-compatible.
- For an incompatible schema/data incident, isolate traffic and use an approved PITR restore to a separate target; validate ledger/usage/payment integrity before any controlled cutover.
- Reconcile every in-flight request, wallet reservation, payment webhook and usage record before re-enabling traffic.
- Never treat a browser redirect, queue completion or cache value as financial truth.
- Record the incident timeline, operator/approver, affected release/SHA, feature flags changed, data-loss assessment, customer impact and post-incident actions.

No production deployment or rollback has been executed.

## 4. Monitoring and alert inventory

The following signals are required. Thresholds and paging routes remain unconfigured until D-13/D-18 and the production topology are approved.

| Domain | Signals |
|---|---|
| API | Request rate, p50/p95/p99 latency, 4xx/5xx rate, timeout rate, saturation, readiness failures |
| Database | Connection pool saturation, query latency, locks/deadlocks, migration failures, replication/PITR health |
| Redis/BullMQ | Queue depth/age, active/waiting/failed jobs, stalled jobs, dead-letter backlog, worker heartbeat |
| Gateway/providers | Upstream availability/latency, timeout/retry/fallback rate, provider/model mismatch, pricing/capability staleness |
| Finance | Ledger imbalance, duplicate/idempotency conflicts, pending/failed payment webhooks, unsettled usage, reservation expiry, reconciliation backlog |
| Events | Outbox age/backlog, SSE reconnect/replay failures, expired cursors and snapshot recovery rate |
| Files | Quarantine age/count, scanner unavailable/failure, rejected MIME, checksum mismatch, object-store errors |
| Security | Login/Turnstile failures, rate-limit hits, API-key abuse/revocation, denied admin access, suspicious ownership failures |
| Product/support | Support ticket backlog/age, notification delivery failure, public status page freshness |

Logs and metrics must not contain API keys, provider credentials, raw prompts/completions by default, payment secrets, signed URLs or unnecessary PII. Every alert needs a severity, owner, runbook link, acknowledgement target and escalation path.

## 5. Incident and support process

### Severity model — proposed, not approved

- **SEV-1:** suspected credential/data compromise, ledger corruption, unauthorized paid traffic, broad outage or customer funds at risk.
- **SEV-2:** major API/gateway/payment failure or material customer impact without evidence of data compromise.
- **SEV-3:** degraded non-critical function, delayed jobs/events, file scanning backlog or limited user impact.
- **SEV-4:** minor defect, documentation issue or low-impact support request.

Operations must approve definitions, response targets, on-call owner, support hours and customer notification obligations before beta. No response-time SLA is assumed here.

### Immediate containment

1. Assign an incident commander and record UTC start time.
2. For suspected upstream/legal/finance issues, disable paid gateway and settlement flags first; do not retry paid requests.
3. For suspected credential compromise, revoke affected AZL keys and rotate impacted secrets using the approved key procedure.
4. For privacy/file incidents, disable uploads/downloads and isolate affected objects; preserve evidence and retention/legal-hold requirements.
5. Preserve request IDs, deployment SHAs, safe logs, webhook event IDs and audit references; do not copy raw secrets or unnecessary user content.
6. Communicate status using an approved channel/template and keep a timeline.
7. Require post-incident reconciliation and an approved re-enable decision.

### Support readiness

Before beta, assign support ticket ownership, support hours, escalation contacts, customer-visible status categories, refund/dispute routing, data-export/deletion handling, and internal-note access controls. Assigned support access must remain least-privilege and ticket-owner scoped.

## 6. Privacy, security and legal recheck

Before go-live, review and sign off:

- Upstream written permission and model/provider terms, downstream flow-down clauses and customer API key/billing scope.
- Terms of Service, Privacy Policy, lawful basis, consent versions, subprocessors, data residency/cross-border transfer and deletion rights.
- Prompt/output retention, usage metadata retention, audit retention, support ticket retention and legal-hold process.
- Auth/session cookie, CSRF, Turnstile, email verification/recovery, account deletion and access-review behavior.
- Admin RBAC, maker-checker, immutable audit evidence, break-glass access and credential rotation.
- Upload allowlist, MIME sniffing, malware scanning, quarantine, private storage, encryption and deletion.
- Dependency/security scans, secrets scan, threat model, abuse/rate-limit review and independent security testing.
- Backup encryption/key custody, restore access, incident evidence and vendor contracts.

## 7. Final go/no-go record

The final decision must be signed by the accountable product/business owner, legal/privacy reviewer, finance owner and operations/security owner. Attach exact commit/PR/workflow links and staging evidence.

| Dimension | Current recommendation | Reason |
|---|---|---|
| Backend code readiness | **NO-GO / incomplete** | BE-6..BE-8 exact-head CI and acceptance suites remain in progress; BE-7 generation/storage/scanner and BE-8 admin controls are incomplete; branch ancestry requires reconciliation |
| Catalog public launch | **NO-GO** | 50 verified active canonical chat models not met; current verified count 0 |
| Authenticated beta with personal data | **NO-GO** | D-03/D-10/D-12 and staging identity/email/privacy evidence are open |
| File upload beta | **NO-GO** | No production storage/scanner/retention decision; scanner currently fails closed |
| Payment/customer charging | **NO-GO** | D-04/D-07/D-08/D-09/D-15 unresolved |
| Paid upstream gateway | **NO-GO — hard blocker** | D-05 written downstream permission and legal review absent |
| Operational resilience | **NO-GO** | No production backup/PITR, measured restore drill, approved RPO/RTO, alerting or incident owner |

### Approval record — intentionally blank

- Product/business owner and date:
- Legal/upstream reviewer and evidence reference:
- Privacy/security reviewer and evidence reference:
- Finance/payment owner and evidence reference:
- Operations/on-call owner and evidence reference:
- Final decision: NO-GO until every applicable gate is evidenced and approved.

**No production deployment, release, customer charging, paid upstream request or closed-beta launch is authorized by this document.**
