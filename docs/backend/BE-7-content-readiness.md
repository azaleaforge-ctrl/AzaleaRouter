# BE-7 — Conversations, Files, Notifications, Support and Content

**Status:** Partial implementation on `feat/backend-content-be7` with a transaction-safe attachment-linking follow-up in PR #17; not stage-complete.
**Original BE-7 branch head:** `8e2c5b1e6669e9fa851af36f348d9c6a092bc18f`.
**Production state:** no production object-storage provider, region, malware scanner, or retention/legal policy is configured.

## Implemented in this increment

- Owner-scoped conversation create/list/read/update/archive/soft-delete endpoints.
- User message persistence with idempotency keys, attachment ownership checks, stable cursor pagination, and safe outbox metadata.
- PR #17 moves attachment validation into the message transaction, locks owned rows in deterministic ID order, rejects files already linked to a message or another conversation, assigns unbound files to the current conversation, and rejects duplicate attachment IDs. Clean-scan and 50 MiB aggregate checks remain inside the same transaction.
- Private local filesystem object-storage adapter with random object keys, restrictive directory/file modes, path validation, checksum and size verification.
- MIME allowlist and content sniffing for PDF, DOCX, TXT, Markdown, CSV, JSON, JPEG, PNG and WEBP.
- Quarantine-first file state; `UnavailableFileScanner` returns an unknown verdict and therefore leaves files quarantined. Non-clean files cannot be downloaded or attached to messages.
- User-scoped file list/download/delete endpoints.
- User-scoped notification list/read/read-all endpoints.
- Support ticket create/list/detail/reply and assigned-support access with public/internal message visibility.
- Public published-content read endpoints for docs, help, blog, status and changelog.
- OpenAPI contracts and migration `202611140008_chat_files_support_content`.

## Not implemented / exit criteria still open

- Conversation message submission does not yet run model generation or connect to the gateway/usage settlement lifecycle; it persists user messages only.
- No production object storage, storage region, encryption/key management, signed upload/download URL workflow, or approved deletion/retention policy.
- No configured malware scanning engine; unknown verdicts correctly remain quarantined, so no file is currently eligible for model forwarding.
- No complete E2E or PostgreSQL integration test suite for conversation, attachment, support, notification and CMS ownership/lifecycle flows.
- No content admin draft/revision/publish/withdraw APIs or help-article feedback workflow.
- Support notification delivery and operational escalation are not verified.
- D-06 storage/scanner and D-10 privacy/retention/legal basis remain open.

## Validation required

- Exact-head CI for the current branch, including migration deployment on an empty PostgreSQL database and fixture database.
- PR #17 code/test head `a97771a3e4f9d0e03df9caa82f7887e048573487` passed exact-head GitHub Actions [#44234796976](https://github.com/azaleaforge-ctrl/AzaleaRouter/actions/runs/44234796976), including frozen installation, workspace lint/typecheck/build, migrations, API tests and worker checks.
- Cross-user IDOR tests for conversations, messages, files, notifications, tickets and assigned support.
- Upload tests for MIME spoofing, size/quota, path traversal, quarantine, scanner clean/malicious/unknown outcomes, checksum mismatch and deletion failure.
- Staging E2E for conversation lifecycle, attachments, support and published content.
- Confirm message-generation and billing integration before claiming the full chat workflow.

**Merge gate:** no PR is merged until BE-0 through BE-9 are complete, verified and audited.
