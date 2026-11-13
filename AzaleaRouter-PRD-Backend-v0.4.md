# AzaleaRouter — Backend Product Requirements Document

**Dokumen:** Backend PRD — Website Phase 1  
**Versi:** 0.4  
**Tanggal:** 13 November 2026  
**Status:** Draft teknis untuk review  
**Aplikasi:** apps/api (Express.js 5 + TypeScript), apps/worker (Node.js + BullMQ)

## Ringkasan perubahan v0.4

Versi ini menyelesaikan spesifikasi backend yang pada v0.3 masih bersifat konseptual. Fokus revisi:
- Inventory API lengkap untuk auth, profil, model, provider, pricing, API keys, wallet, payment, usage, chat, file, support, content, notification, dan admin.
- Lifecycle auth/session, RBAC, conversation/message, upload file, payment adapter, provider adapter, routing, SSE, dan streaming.
- Logical database schema, relasi, index, idempotency, ledger invariants, retention, dan migration acceptance.
- Test matrix dan release blockers yang dapat dipakai sebagai quality gate.

Dokumen ini adalah requirement/desain, bukan bukti bahwa backend sudah tersedia. Mock frontend tetap sah selama backend belum dibangun. Integrasi baru dianggap selesai jika endpoint nyata tersedia, OpenAPI sesuai, dan E2E staging lulus.

---

## 1. Scope dan tanggung jawab

### 1.1 Tanggung jawab backend
- Menyediakan website API dan OpenAI-compatible API.
- Menangani autentikasi, session, role, permission, consent, dan account lifecycle.
- Mengelola katalog canonical model, developer, provider, endpoint, capability, pricing snapshot, dan status.
- Menerbitkan, memvalidasi, merotasi, serta mencabut API key berawalan AZL-.
- Menangani routing upstream melalui provider adapter dan mengelola stream.
- Mengelola saldo IDR, immutable ledger, reservation, settlement, payment, refund, dan reconciliation.
- Menyediakan percakapan, message history, file attachment, notification, support ticket, content, dan status API.
- Menyediakan admin API, audit log, background worker, realtime event, observability, backup, dan data lifecycle.

### 1.2 Bukan tanggung jawab backend
- Layout, chart rendering, animasi, dan state visual browser.
- Keputusan debit final atau markup yang dihitung oleh frontend.
- Penyimpanan API key pelanggan dalam plaintext.
- Koneksi frontend langsung ke upstream model provider.
- Menganggap Redis/cache sebagai sumber kebenaran saldo, ledger, payment final, atau otorisasi.
- Menampilkan model/endpoint/capability yang belum diverifikasi dari sumber aktual.

### 1.3 Batas peluncuran komersial
AzaleaRouter direncanakan sebagai prepaid AI API gateway untuk pengguna Indonesia. OpenRouter merupakan upstream awal yang pernah direncanakan, bukan ketergantungan permanen.

**Legal launch gate:** sebelum menjual akses downstream, wajib ada konfirmasi tertulis dari upstream/provider yang secara eksplisit mengizinkan model bisnis yang diterapkan: gateway, API key pelanggan, billing pihak ketiga, penggunaan website/API, IDE/CLI, serta model/provider yang ditawarkan. Syarat layanan dan perjanjian harus ditinjau ulang oleh tenaga hukum sebelum launch. Jika izin tidak didapat, provider tersebut tidak boleh digunakan untuk paid downstream access. Provider adapter harus memungkinkan penggantian upstream.

---

## 2. Tujuan, non-goals, dan acceptance

### 2.1 Tujuan Phase 1
- Website publik dan dashboard akun.
- Register, login, email verification, password reset, dan antibot.
- Marketplace model dengan minimal 50 canonical model yang benar-benar aktif dan lolos validasi sebelum public launch.
- Detail model, harga, capability, developer, provider, dan endpoint yang aktual.
- Pilihan routing sesuai kemampuan upstream.
- API key AzaleaRouter berawalan AZL-.
- OpenAI-compatible chat completion API dan streaming.
- AI Chat general dan coding, termasuk riwayat conversation.
- Upload file/gambar hanya untuk format dan model yang benar-benar didukung.
- Wallet IDR, top-up, payment webhook, usage, ledger, analytics, dan export.
- Notifications, documentation, Help Center, blog, changelog, status page, dan admin panel.

### 2.2 Non-goals Phase 1
- Melatih foundation model sendiri.
- Membangun IDE atau CLI mandiri.
- Menjamin seluruh model memiliki semua modality/capability.
- Mengaktifkan transaksi sebelum upstream/provider dan payment merchant memenuhi persyaratan legal.
- Menjanjikan SLA provider eksternal yang tidak dapat dikendalikan AzaleaRouter.
- Menyimpan seluruh prompt/output secara default untuk analytics.
- Memungkinkan pengguna memasukkan arbitrary upstream URL melalui website.

### 2.3 Acceptance tingkat produk
- Katalog launch menampilkan minimal 50 canonical model aktif, bukan alias/SKU/provider listing ganda.
- Harga dan endpoint memiliki source serta timestamp/snapshot.
- API key customer selalu AZL- dan tidak pernah menjadi upstream credential.
- Tidak ada debit ganda, kredit payment ganda, atau balance yang tidak bisa direkonsiliasi.
- User hanya dapat mengakses resource miliknya sendiri.
- Streaming dapat selesai, gagal, dan dibatalkan tanpa membuat state billing palsu.
- Semua operasi admin sensitif dapat ditelusuri di audit log.
- Tidak ada paid launch jika legal permission upstream/payment onboarding belum lolos.

---

## 3. Arsitektur dan stack

Stack default yang diusulkan:

| Lapisan | Teknologi | Status |
|---|---|---|
| Web | Next.js App Router + TypeScript | Sudah digunakan frontend |
| API | Express.js 5 + TypeScript | Usulan backend |
| Database | Supabase PostgreSQL | Usulan |
| ORM/migration | Prisma stable | Usulan |
| Auth | Supabase Auth melalui façade AzaleaRouter | Belum final |
| Validation | Zod | Usulan |
| Cache | Redis | Usulan |
| Queue | BullMQ | Usulan |
| Worker | Node.js + TypeScript | Usulan |
| Test | Vitest + integration tests + Playwright | Usulan |
| Deploy | Docker | Usulan |
| Observability | Sentry + OpenTelemetry | Usulan |

### 3.1 Monorepo target

- apps/web — Next.js frontend.
- apps/api — Express API, auth façade, website API, AI gateway.
- apps/worker — catalog sync, payment webhook processing, usage reconciliation, notification, export, deletion, dan aggregation.
- packages/database — Prisma schema, migrations, repositories.
- packages/shared — types, contracts, constants, Zod schemas.
- packages/auth — session verification dan authorization.
- packages/billing — wallet, ledger, pricing, FX, settlement.
- packages/gateway — request lifecycle, routing, streaming.
- packages/providers — provider adapter.
- packages/model-catalog — canonical model catalog.
- packages/config — environment/config validation.
- infrastructure — docker, deployment, monitoring.
- docs — PRD, OpenAPI, architecture decision records.

### 3.2 Architectural rules
- Modular monolith terlebih dahulu; jangan pecah microservices tanpa alasan beban/ownership yang terukur.
- API dan worker boleh mempunyai deployable process berbeda tetapi menggunakan domain package dan database contract yang sama.
- Database PostgreSQL adalah source of truth untuk financial/account state.
- Redis hanya cache, coordination, rate limit, atau queue support; bukan financial ledger.
- Semua external provider dipanggil dari server-side adapter.
- Semua environment variable divalidasi saat startup; production gagal startup jika mandatory secret/config hilang.
- Development, staging, production memiliki credentials dan database terpisah.

---

## 4. Authentication, user, dan authorization

### 4.1 Auth contract

Backend menyediakan façade autentikasi AzaleaRouter agar frontend tidak terikat endpoint vendor auth.

| Method | Endpoint | Tujuan |
|---|---|---|
| POST | /api/v1/auth/register | Registrasi dan memulai email verification |
| POST | /api/v1/auth/login | Membuat session |
| POST | /api/v1/auth/logout | Mengakhiri session |
| POST | /api/v1/auth/refresh | Refresh session bila mekanisme auth memerlukannya |
| GET | /api/v1/auth/session | Status session dan role efektif |
| POST | /api/v1/auth/email/verify | Verifikasi email dengan token sekali pakai |
| POST | /api/v1/auth/email/resend | Kirim ulang email verification |
| POST | /api/v1/auth/password/forgot | Memulai password reset |
| POST | /api/v1/auth/password/reset | Menetapkan password baru |
| GET | /api/v1/me | Profil pengguna |
| PATCH | /api/v1/me | Memperbarui profil yang diizinkan |
| GET | /api/v1/me/preferences | Preferensi |
| PATCH | /api/v1/me/preferences | Memperbarui preferensi |
| GET | /api/v1/me/consents | Consent yang tercatat |
| POST | /api/v1/me/export-requests | Meminta ekspor data |
| POST | /api/v1/me/deletion-requests | Meminta penghapusan akun/data |

### 4.2 Authentication rules
- Supabase Auth adalah kandidat; keputusan final dicatat pada Section 16.
- Backend memverifikasi token/session untuk setiap protected endpoint.
- Web session: rekomendasi cookie HttpOnly, Secure, SameSite dengan CSRF strategy yang sesuai deployment topology. Jika bearer flow dipilih, access token tidak boleh disimpan di localStorage; refresh token wajib memiliki rotation/reuse detection.
- Register/login response tidak membocorkan apakah email sudah terdaftar.
- Email verification dan password reset memakai token sekali pakai dengan expiry.
- Logout menginvalidasi session/refresh credential pada authority auth; hanya menghapus cookie di browser tidak cukup.
- Status user minimum: pending_verification, active, suspended, deletion_pending, deleted/tombstone.
- User suspended/deletion_pending tidak dapat membuat gateway request baru.
- Turnstile Siteverify dilakukan backend; token invalid, expired, reused, hostname/action mismatch ditolak.
- Secret Turnstile dan auth provider hanya di secret manager/environment server-side.
- Session user dan API key AZL- adalah dua mekanisme autentikasi terpisah.
- Tidak ada endpoint yang mempercayai user_id dari body/query sebagai identitas caller.

### 4.3 Roles dan permission

Role minimum: user, support, admin, super_admin. Permission harus granular, bukan hanya pemeriksaan string role.

| Aksi | user | support | admin | super_admin |
|---|---|---|---|---|
| Data milik sendiri | Ya | Ya | Ya | Ya |
| Tiket yang ditugaskan | Tidak | Ya | Ya | Ya |
| Data lintas user | Tidak | Terbatas pada tiket/penugasan | Ya dengan audit | Ya dengan audit |
| Catalog/provider/pricing | Tidak | Tidak | Sesuai permission | Ya |
| Refund/ledger adjustment | Tidak | Tidak | Permission khusus + approval | Permission khusus + approval |
| Assign admin role/security policy | Tidak | Tidak | Tidak | Ya |
| Audit log | Tidak | Scope terbatas | Ya | Ya |

Perubahan role, suspension, refund, adjustment, markup, FX, model publication, provider, dan security settings wajib menyimpan actor, role, reason, timestamp, request ID, target resource, serta before/after yang telah disanitasi. High-risk financial action harus menggunakan maker-checker/two-person approval setelah threshold ditetapkan.

### 4.4 Consent dan account lifecycle
- Simpan document version Terms/Privacy, user, timestamp, source, dan bukti consent yang relevan.
- Consent version baru harus dapat diminta kembali bila perubahan material memerlukannya.
- Sediakan export dan deletion request sesuai kebijakan dan hukum yang berlaku.
- Hapus/anonimkan data sesuai retention policy; financial/audit record yang wajib dipertahankan tidak dihapus diam-diam.
- Password, token verification, auth token, serta secret tidak masuk log.

---

## 5. Model catalog, developer, provider, dan routing

### 5.1 Catalog source of truth
- Provider adapter menormalisasi source catalog menjadi canonical model, developer, provider, endpoint, pricing snapshot, modality, capability, dan status.
- Exact model ID, slug, harga, context window, max output, modality, capability, endpoint, provider status, dan expiry diambil dari sumber aktual saat sync.
- Nama display bukan primary key dan tidak boleh dipakai untuk menebak exact model ID.
- Model yang dihapus/deprecated/expired tetap disimpan untuk histori usage; status request baru diblokir.
- Sync gagal tidak boleh mengosongkan katalog; pertahankan last-known-good snapshot dan beri tanda stale.

### 5.2 Minimum 50 model
- Public launch target minimal 50 canonical model berbeda yang aktif, memiliki pricing valid, endpoint aktif, dan capability cocok dengan kategori UI.
- Alias, varian batch, provider listing ganda, free/paid SKU dari base model yang sama tidak dihitung sebagai model terpisah.
- Model spesialis (embedding, rerank, translation, moderation, extraction, audio, image, video) tidak boleh ditampilkan sebagai chat model jika endpoint tidak mendukung chat completion.
- Kandidat 50 model pada Backend PRD v0.3 Appendix A adalah seed list untuk verifikasi, bukan daftar final dan bukan jaminan availability/harga.
- Model gratis hanya dilabeli Free ketika free SKU masih aktif; kuota, rate limit, expiry, dan batasan ditampilkan.
- Model Preview/Experimental diberi label dan dapat dinonaktifkan admin tanpa menghapus usage history.

### 5.3 Detail model dan endpoint
Model detail minimum: developer, canonical ID, exact source model ID, deskripsi, harga per komponen, context/max output, modality, capability matrix, endpoint/provider aktual, source timestamp, status, data policy yang dapat diverifikasi, serta contoh API bila kompatibel.

ModelDeveloper mempunyai slug, name, logo asset/reference, source URL, attribution/license notes, dan verification status. Jika logo belum terverifikasi, gunakan fallback netral.

### 5.4 Provider adapter
Setiap upstream adapter wajib menyediakan operasi konseptual:
- listModels / getModel
- listEndpoints / getPricing
- createCompletion / streamCompletion
- normalizeUsage
- normalizeError
- healthCheck
- capabilityDeclaration

Adapter harus menormalkan request, response, error, usage, endpoint identity, dan routing parameters. Provider-specific option di-allowlist. Jangan meneruskan arbitrary URL/header ke upstream. API key pelanggan AZL- tidak pernah diteruskan sebagai credential upstream. Provider baru wajib lulus adapter contract test.

Capability yang perlu dapat dinyatakan per model/endpoint: chat, streaming, tool calling, structured output/JSON, vision, audio, video, embedding, rerank, usage reporting, cancellation, dan provider routing. Jangan mengiklankan capability yang tidak tersedia.

### 5.5 Sync schedule dan stale policy
Cadence awal configurable:
- Model metadata: setiap 6 jam.
- Endpoint availability: setiap 15 menit.
- Pricing: setiap 5–15 menit sesuai rate limit upstream.
- Full reconciliation: minimal setiap 24 jam.
- Admin manual sync memerlukan audit log dan rate limit.

Sync:
- Idempotent berdasarkan source + canonical model ID + endpoint identity + source version/effective time.
- Menggunakan timeout, exponential backoff, jitter, dan bounded retries.
- Menerbitkan snapshot baru secara atomik setelah batch lolos validasi.
- Mencatat SyncRun, record counts, anomaly, error summary, dan snapshot version.
- Menjaga last-known-good jika upstream gagal.
- Rekomendasi stale threshold awal: metadata 24 jam, endpoint 60 menit, pricing 60 menit.
- Request berbayar diblokir jika pricing snapshot melebihi maximum age yang dikonfigurasi.
- Model baru perlu validasi harga, capability, endpoint, terms, attribution/logo, dan test request sebelum public.

### 5.6 Routing modes dan fallback
Mode: auto, cheapest, fastest/throughput, lowest_latency, specific_provider, provider_priority, fallback on/off. Hanya mode yang benar-benar didukung upstream/adapter boleh aktif.

Urutan:
1. Auth/API key, account status, model availability, capability, pricing freshness, spend limit, dan balance.
2. Resolve canonical model dan eligible endpoints.
3. Apply routing preference sesuai adapter.
4. Catat requested provider, actual provider, selected endpoint, attempts, fallback reason, latency, dan result.
5. Jika tidak ada endpoint eligible, hentikan sebelum forward request.

Fallback:
- Tidak boleh diam-diam mengganti canonical model.
- Endpoint alternatif harus memenuhi capability request.
- Specific provider, allowlist API key, data residency, serta routing policy wajib dipertahankan.
- Retry setelah upstream mungkin menerima request harus mengikuti idempotency/usage reconciliation policy.
- Jika cheapest/fastest/lowest_latency tidak didukung data memadai, mode tersebut ditandai unavailable, bukan dipalsukan.

---

## 6. API Key AzaleaRouter (AZL-)

### 6.1 Token format
- Prefix fixed: AZL-.
- Secret component: 32 bytes cryptographically secure random data, Base64URL tanpa padding (43 karakter).
- Total token: AZL- + secret component.
- Transport: Authorization: Bearer AZL-... melalui HTTPS.
- Full secret ditampilkan satu kali saat pembuatan. Setelah modal/halaman create ditutup, secret tidak bisa direveal kembali.

### 6.2 Storage dan validation
- Simpan HMAC/hash key, bukan plaintext.
- Pepper disimpan terpisah di server-side secret manager.
- Simpan prefix/index yang aman untuk lookup, lalu verifikasi constant-time.
- API key check meliputi status active/revoked/expired, account status, scopes, model allowlist, spend limit, rate limit, concurrency, dan policy.
- Key pelanggan tidak pernah diteruskan ke upstream.
- Secret tidak boleh muncul pada URL, log, analytics, traces, error response, atau event payload.

### 6.3 Fields dan user operations
Field minimum: id, user_id, label, key_prefix, key_hash, key_version, scopes, model_allowlist, spend_limit_idr, rate_limit_policy_id, expires_at, last_used_at, revoked_at, created_at.

User dapat:
- Membuat key dengan label.
- Melihat daftar key dalam masked form.
- Mengubah label dan limit yang diizinkan.
- Rotate key (buat key baru lalu revoke key lama secara atomik/terkontrol).
- Revoke key.
- Melihat last-used, status, created, expiry, dan spend limit.

Revoke harus langsung berlaku pada gateway. Rotate/revoke idempotent. Key lama tidak boleh aktif tanpa batas saat rotate.

---

## 7. Wallet, pricing, payment, dan ledger

### 7.1 Financial source of truth
- PostgreSQL adalah sumber kebenaran saldo, payment state, reservation, settlement, dan ledger.
- Redis/cache bukan sumber saldo final.
- Semua perubahan saldo dicatat append-only; transaksi historis tidak diedit/dihapus.
- Wallet balance adalah projection yang dapat dibangun ulang dari ledger dan reservation aktif.
- Setiap operasi finansial memiliki idempotency key, actor/source, reference, timestamp, currency, dan reason.
- Monetary arithmetic tidak boleh menggunakan JavaScript floating point. IDR integer Rupiah; USD/FX decimal-safe dan dikirim sebagai string decimal.

### 7.2 Pricing dan FX snapshot
- Simpan harga upstream per model/endpoint/component sesuai source.
- Simpan FX snapshot, markup policy snapshot, rounding rule, endpoint, serta calculation version pada setiap request.
- Formula konsep:
  upstream_cost_usd = sum(component_usage × component_price_snapshot)
  customer_charge_idr = rounding_policy((upstream_cost_usd × fx_rate_snapshot) × (1 + markup_percent) + fixed_fee_idr)
- Nilai markup, sumber kurs, jadwal FX, serta rounding final belum diputuskan dan tidak boleh di-hard-code sebelum persetujuan.
- Rekomendasi IDR: round up ke Rupiah penuh; perlu disetujui sebelum BE-4.
- Input, cached input, output, reasoning, image, audio, video, search, dan biaya khusus dipisahkan bila provider melaporkannya.
- Perubahan harga/FX/markup tidak mengubah transaksi historis.

### 7.3 Ledger
- Wallet IDR untuk prepaid Phase 1.
- Ledger memakai transaction header dan posting entries; debit/kredit harus seimbang per currency untuk setiap transaksi.
- Event minimum: topup_credit, request_reservation, request_settlement, reservation_release, refund_credit, admin_adjustment_credit, admin_adjustment_debit, payment_reversal, chargeback_debit.
- Koreksi dilakukan dengan reversal/adjustment entry baru; jangan mengedit entry lama.
- Unique idempotency scope dan reference mencegah posting ganda.
- Balance projection harus direkonsiliasi terhadap ledger.

### 7.4 Reservation dan settlement
Sebelum request berbayar:
1. Pastikan model/endpoint aktif dan pricing snapshot fresh.
2. Hitung maximum charge yang dapat diperkirakan berdasarkan input, max output, parameter, dan pricing.
3. Reserve saldo secara atomik jika saldo tersedia cukup.
4. Buat usage request dan referensi ledger sebelum forward ke upstream.

Setelah request:
- Usage final menghasilkan settlement idempotent dan pelepasan sisa reserve.
- Gagal sebelum diterima upstream dapat release reserve setelah bukti tersedia.
- Jika upstream mungkin memproses request tetapi cost/usage belum diketahui, status pending_reconciliation; jangan otomatis release reserve hanya karena browser timeout/disconnect.
- Jika biaya final melebihi reserve karena provider anomaly, jangan mendebit di atas batas otorisasi secara diam-diam. Buat reconciliation case/platform exposure dan eskalasi.
- Request state minimum: created, reserved, forwarding, streaming, completed, settled, released, pending_reconciliation, failed, cancelled, refunded.

### 7.5 Payment gateway adapter
Payment gateway belum dipilih. Adapter minimum:
- createPaymentIntent
- getPaymentStatus
- verifyWebhookSignature
- normalizeWebhookEvent
- requestRefund (jika didukung)
- getSettlement/reconciliationData (jika tersedia)

Channel target: QRIS, virtual account, transfer bank, dan e-wallet. Provider dipilih dengan mempertimbangkan legal merchant Indonesia, channel, biaya, settlement, signature/retry webhook, idempotency, refund, fraud tools, test environment, dan dukungan operasional.

Alur:
1. Backend membuat PaymentIntent dan reference unik.
2. Frontend menerima instruksi pembayaran yang telah disanitasi.
3. Browser redirect bukan bukti payment success.
4. Webhook diverifikasi signature, timestamp/replay window, merchant/provider account, amount, currency, dan reference.
5. Jika tersedia, backend lakukan server-to-server payment inquiry.
6. Webhook masuk inbox dan diproses idempotent dalam DB transaction dengan ledger credit.
7. Failure masuk retry/dead-letter queue; replay harus aman.
8. Notification/payment event dikirim setelah ledger commit.

Tidak menyimpan kartu penuh, CVV, e-wallet credential, atau payment secret. Payment pending/failed/expired tidak menambah saldo.

### 7.6 Refund, reversal, expiry, dispute
Refund top-up dan refund biaya AI adalah event yang berbeda. Refund/reversal/chargeback membuat posting baru yang merujuk transaksi asal. Kebijakan refund, saldo negatif, expiry, partial refund, chargeback, dispute, dan approval harus diputuskan sebelum paid beta. Admin adjustment wajib reason, actor, reference, audit, dan maker-checker untuk high-risk action.

### 7.7 Wallet API behavior
- Minimum top-up rencana awal Rp50.000.
- Batas nominal, harian/bulanan, channel, dan biaya payment diatur server-side.
- Jika balance projection mismatch dengan ledger, tandai reconciliation required dan blokir debit baru sampai aman.
- Frontend tidak melakukan optimistic update sebagai saldo final.
- Available balance dan reserved balance wajib ditampilkan terpisah.

---

## 8. Internal API inventory dan public API

Semua website endpoint memakai prefix /api/v1. Inventory ini harus masuk OpenAPI dengan request/response schema, auth policy, permission, error code, pagination, rate limit, dan acceptance test.

### 8.1 Public/account

| Method | Path | Keterangan |
|---|---|---|
| GET | /api/v1/health | Health check aman |
| GET | /api/v1/public/status | Public status snapshot |
| POST | /api/v1/auth/register | Registrasi |
| POST | /api/v1/auth/login | Login |
| POST | /api/v1/auth/logout | Logout |
| POST | /api/v1/auth/refresh | Refresh |
| GET | /api/v1/auth/session | Session |
| POST | /api/v1/auth/email/verify | Verifikasi email |
| POST | /api/v1/auth/email/resend | Kirim ulang email |
| POST | /api/v1/auth/password/forgot | Forgot password |
| POST | /api/v1/auth/password/reset | Reset password |
| GET/PATCH | /api/v1/me | Read/update profile |
| GET/PATCH | /api/v1/me/preferences | Read/update preference |
| GET | /api/v1/me/consents | Consent history |
| POST | /api/v1/me/export-requests | Export request |
| POST | /api/v1/me/deletion-requests | Deletion request |

### 8.2 Catalog/pricing

| Method | Path | Keterangan |
|---|---|---|
| GET | /api/v1/models | Search, filter, sort, pagination |
| GET | /api/v1/models/:modelId | Model detail |
| GET | /api/v1/models/:modelId/endpoints | Endpoint aktual |
| GET | /api/v1/developers | Developer list |
| GET | /api/v1/providers | Public active providers |
| GET | /api/v1/pricing | Pricing snapshots |
| GET | /api/v1/pricing/:modelId | Model pricing breakdown |

### 8.3 API key

| Method | Path | Keterangan |
|---|---|---|
| POST | /api/v1/api-keys | Create; full secret once |
| GET | /api/v1/api-keys | Masked list |
| GET | /api/v1/api-keys/:id | Metadata milik user |
| PATCH | /api/v1/api-keys/:id | Update allowed label/limits |
| POST | /api/v1/api-keys/:id/rotate | Rotate |
| DELETE | /api/v1/api-keys/:id | Revoke |

### 8.4 Wallet/payment/transaction

| Method | Path | Keterangan |
|---|---|---|
| GET | /api/v1/wallet | Available/reserved balance |
| GET | /api/v1/wallet/ledger | Ledger user |
| GET | /api/v1/payment-methods | Active channels |
| POST | /api/v1/payments/intents | Create intent |
| GET | /api/v1/payments/intents | List intents |
| GET | /api/v1/payments/intents/:id | Payment status |
| POST | /api/v1/payments/intents/:id/cancel | Cancel bila provider mendukung |
| GET | /api/v1/transactions | Combined history |
| GET | /api/v1/transactions/:id | Transaction detail |

### 8.5 Usage/realtime

| Method | Path | Keterangan |
|---|---|---|
| GET | /api/v1/usage/summary | Aggregate |
| GET | /api/v1/usage/requests | Request list/filter |
| GET | /api/v1/usage/requests/:requestId | Request detail |
| POST | /api/v1/usage/exports | Create CSV export |
| GET | /api/v1/usage/exports/:id | Export status/download |
| GET | /api/v1/events | Authenticated SSE |

### 8.6 Chat/files

| Method | Path | Keterangan |
|---|---|---|
| GET | /api/v1/chat/conversations | Conversation list |
| POST | /api/v1/chat/conversations | Create |
| GET | /api/v1/chat/conversations/:id | Get conversation |
| PATCH | /api/v1/chat/conversations/:id | Rename/archive/update metadata |
| DELETE | /api/v1/chat/conversations/:id | Soft delete |
| GET | /api/v1/chat/conversations/:id/messages | Paginated history |
| POST | /api/v1/chat/conversations/:id/messages | Submit message/generation |
| POST | /api/v1/chat/completions | Stateless Playground completion |
| POST | /api/v1/files/uploads | Create upload intent |
| POST | /api/v1/files/uploads/:id/complete | Finalize upload |
| GET | /api/v1/files/:id | File metadata |
| GET | /api/v1/files/:id/download | Authorized signed download |
| DELETE | /api/v1/files/:id | Delete request |

### 8.7 Notification/support/content

| Method | Path | Keterangan |
|---|---|---|
| GET | /api/v1/notifications | Notification list |
| GET | /api/v1/notifications/unread-count | Unread count |
| PATCH | /api/v1/notifications/:id/read | Mark read |
| POST | /api/v1/notifications/read-all | Mark all read |
| GET/POST | /api/v1/support/tickets | List/create ticket |
| GET | /api/v1/support/tickets/:id | Ticket detail |
| POST | /api/v1/support/tickets/:id/messages | User reply |
| GET | /api/v1/docs | Docs list |
| GET | /api/v1/docs/:slug | Docs detail |
| GET | /api/v1/help/articles | Help search/list |
| GET | /api/v1/help/articles/:slug | Help detail |
| POST | /api/v1/help/articles/:id/feedback | Article feedback |
| GET | /api/v1/blog/posts | Blog list |
| GET | /api/v1/blog/posts/:slug | Blog detail |
| GET | /api/v1/changelog | Changelog |
| GET | /api/v1/status | Status page |

### 8.8 Webhook, admin, OpenAI-compatible API

Payment webhook route pattern: /api/v1/webhooks/payments/:provider. Route ini bukan user-session route dan wajib signature verification.

Admin prefix: /api/v1/admin. Inventory:
- Users: list/search/detail/status/roles/suspend/unsuspend/deletion workflow.
- Catalog: sync/validate/publish/unpublish/deprecate/model detail/endpoint refresh.
- Providers: list/create/update/health check/enable/disable.
- Pricing: policy list/draft/preview/approve/schedule/activate/rollback/FX rate.
- Finance: payment list/detail/refund, webhook inbox, ledger inspection, adjustment, reconciliation cases.
- Usage: usage aggregate/request detail and operational metrics.
- Support: ticket assignment/status/reply/internal note.
- CMS: docs/help/blog/changelog/status CRUD, preview, publish, withdraw, revision history.
- Operations: job status, failed/dead-letter jobs, safe retry, health summary.
- Audit: audit-log search/detail.

Permission harus granular. Admin route tidak otomatis boleh diakses semua admin account.

OpenAI-compatible public API Phase 1:
- GET /v1/models
- POST /v1/chat/completions

Responses API, embeddings, image generation, audio, dan endpoint lain bukan Phase 1 sampai request/response, capability, pricing, usage, dan test contract-nya didefinisikan.

### 8.9 Global HTTP contract
- JSON untuk request/response normal; stream, signed upload, dan file download mempunyai content type khusus.
- Semua timestamp ISO-8601 UTC; UI mengonversi ke Asia/Jakarta.
- Cursor pagination default 25, maksimum 100; cursor stabil dan user-scoped.
- Filter/sort menggunakan allowlist, bukan raw query/SQL fields.
- Mutasi sensitif/retriable menerima Idempotency-Key dengan scope user + operation.
- HTTP response tidak boleh menyertakan secret, key hash, internal provider response, atau PII tidak relevan.
- Nested resource ownership diperiksa pada setiap read/write.
- Success/error schema dipublikasikan melalui OpenAPI dan Zod validation.

### 8.10 Standard error envelope
Error minimum:
- code: stable machine-readable code.
- message: safe actionable message.
- request_id: correlation ID.
- details: optional validation details yang tidak sensitif.
- retryable: boolean/retry guidance yang terdokumentasi.

Error code minimum: AUTH_REQUIRED, AUTH_INVALID, FORBIDDEN, NOT_FOUND, VALIDATION_ERROR, RATE_LIMITED, INSUFFICIENT_BALANCE, MODEL_UNAVAILABLE, ENDPOINT_UNAVAILABLE, PRICING_STALE, CAPABILITY_UNSUPPORTED, PAYMENT_PENDING, IDEMPOTENCY_CONFLICT, UPSTREAM_TIMEOUT, UPSTREAM_ERROR, USAGE_PENDING_RECONCILIATION, INTERNAL_ERROR.

Jangan mengembalikan stack trace, SQL, secret, raw provider response, atau fraud/security rule internal.

---

## 9. Conversation, message, file upload, dan support

### 9.1 Conversation/message model
Conversation fields minimum: id, user_id, title, mode (general/coding), model_id, routing_preference, status, archived_at, deleted_at, created_at, updated_at, last_message_at.

Message fields minimum: id, conversation_id, sequence, role (system/user/assistant/tool), content parts, status, model_id, usage_request_id, created_at, updated_at, completed_at.

Rules:
- Conversation selalu owner-scoped.
- Rename tidak mengubah message; archive tidak menghapus; delete dimulai dengan soft delete.
- Message history memakai sequence/cursor, bukan offset yang tidak stabil.
- User message dapat memiliki attachment references.
- Assistant message status: streaming, completed, failed, cancelled, interrupted.
- Hidden reasoning/internal chain-of-thought bukan konten yang disimpan/ditampilkan sebagai jawaban.
- Tool call/result disimpan terstruktur dan disanitasi bila fitur tersebut diaktifkan.

Generation lifecycle:
1. Validasi owner, model, capability, routing, input, attachments, quota, dan consent.
2. Buat UsageRequest dan user message secara idempotent.
3. Reserve saldo jika request berbayar.
4. Buat assistant message status streaming.
5. Kirim request ke adapter; simpan partial output sesuai kebijakan.
6. Pada completion, simpan final output, usage, actual provider, dan settlement state.
7. Pada cancel/error/disconnect, simpan partial/interrupted state; billing mengikuti bukti usage provider.
8. Retry menghasilkan request baru kecuali idempotency contract membuktikan request lama belum diterima.

### 9.2 File upload/storage
Format baseline setelah security review: PDF, DOCX, TXT, MD, CSV, JSON, JPEG, PNG, WEBP.

Batas configurable awal:
- Maksimum 20 MB per file.
- Maksimum 10 file per message.
- Maksimum agregat 50 MB per message.
- Model/provider dapat menetapkan limit lebih rendah.
- Executable, script, archive, HTML, SVG, macro-enabled office document, dan MIME tidak dikenal ditolak default.

Alur:
1. Authenticated user meminta upload intent; backend validasi filename, declared MIME, size, quota, extension, dan model capability.
2. Backend membuat FileAsset pending_upload dan signed upload URL singkat atau upload proxy.
3. File diunggah ke private object storage; tidak ada public bucket URL.
4. Complete endpoint memverifikasi owner, object exists, actual size, checksum, dan MIME sniffing/magic bytes.
5. File berstatus quarantined sampai malware scan dan content validation lulus.
6. Hanya file available yang boleh di-attach/forward.
7. Download selalu owner-authorized dengan signed URL singkat (rekomendasi lima menit) atau proxy.
8. Delete langsung mencabut akses dan menjalankan object deletion sesuai retention/legal hold.

FileAsset minimum: id, user_id, storage_provider, bucket, object_key, original_filename, mime_type_declared, mime_type_detected, size_bytes, checksum_sha256, scan_status, status, retention_until, deleted_at, created_at. File binary tidak disimpan di PostgreSQL. MessageAttachment menghubungkan message_id, file_id, position.

Security:
- Private bucket, encryption at rest/in transit, short-lived signed URL, ownership check, MIME sniffing, malware scan, quota, rate limit, filename/path sanitization.
- File scan unknown/failed tidak dapat diteruskan ke upstream.
- File tidak dikirim ke provider sebelum user submit chat dan mendapat disclosure bahwa konten dapat diteruskan.
- Storage provider, region, malware scanner, dan retention adalah keputusan terbuka. Upload production dinonaktifkan sebelum keputusan dan security tests selesai.

### 9.3 Notification dan support
- Notification selalu user-scoped; read state tidak mengubah event sumber.
- Support ticket status: open, waiting_user, waiting_support, resolved, closed.
- Internal note terpisah dari reply yang terlihat user.
- Ticket attachment memakai FileAsset policy dan tidak otomatis diteruskan ke model.
- User hanya membaca tiket miliknya; support membaca tiket yang ditugaskan/diizinkan.

### 9.4 Content/CMS
- Content memiliki slug, locale, title, body, content type, publication status, author, version, SEO fields, published_at, dan revision history.
- Draft/preview tidak tersedia untuk publik/search index.
- Changelog API/billing mempunyai impact label dan effective date.
- Status page hanya menampilkan detail yang aman; diagnostic/internal secrets tetap private.

---

## 10. Usage, streaming, SSE, cache, dan consistency

### 10.1 Usage per request
Simpan minimum:
- Request ID, timestamp, user ID, API key ID/label, source (WEB_CHAT, PLAYGROUND, API, CLI future, IDE future).
- Canonical model ID, display-name snapshot, developer, requested provider, actual provider, endpoint.
- Input/cached/output/reasoning token bila tersedia.
- Component cost, currency, FX snapshot, markup snapshot, final debit IDR.
- Routing preference, provider attempts/fallback, latency, status, billing state.
- Prompt/output tidak otomatis disimpan hanya demi analytics; content retention dipisah dari usage metadata.

### 10.2 Chat streaming
- POST /v1/chat/completions menggunakan SSE framing bila stream=true.
- Content-Type text/event-stream, Cache-Control no-cache/no-transform, proxy buffering dinonaktifkan sesuai infra.
- Chunk mengikuti OpenAI-compatible contract yang didukung; sukses berakhir dengan data: [DONE].
- Final usage disertakan bila provider mendukung dan tetap dicatat internal.
- Error sebelum stream start memakai HTTP error envelope; error setelah stream start dikirim sebagai final stream error yang terdokumentasi lalu close.
- Request ID dikirim pada response header.
- Browser cancel/abort diteruskan sebagai AbortSignal bila upstream mendukung.
- Browser disconnect bukan bukti usage/cost nol.
- Resume generation dari token yang sudah lewat tidak dijanjikan untuk Phase 1. UI menampilkan interrupted/partial dan dashboard mengambil snapshot.
- Partial assistant content tidak boleh diberi status completed tanpa final terminator.
- Retry setelah stream dimulai dilarang kecuali request terbukti belum diterima atau provider idempotency contract menjamin aman.

### 10.3 Dashboard SSE
GET /api/v1/events:
- Authenticated session; jangan meletakkan auth token di query string.
- User-scoped; admin stream mempunyai permission terpisah.
- Mendukung Last-Event-ID dan replay window default awal 24 jam (configurable).
- Heartbeat menjaga koneksi.
- Cursor kadaluarsa mengirim snapshot.required atau instruksi fetch snapshot.
- Event mempunyai event ID/cursor, event type, schema_version, occurred_at, request_id.
- Client deduplicate event ID; event delivery bukan source of truth billing.

Minimum events:
- wallet.balance.updated
- wallet.reservation.created
- wallet.reservation.released
- payment.confirmed
- usage.request.started
- usage.request.settled
- usage.request.failed
- model.catalog.updated
- notification.created
- snapshot.required

Payload hanya memuat data minimum: amount, currency, request/payment/model reference, status, timestamp. Dilarang mengirim API key, prompt lengkap, file permanent URL, payment secret, auth token, dan raw provider response.

### 10.4 Transactional outbox dan replay
Financial/usage event memakai transactional outbox atau mekanisme ekuivalen: DB change + outbox record dalam satu transaksi, lalu worker publish dan tandai delivered. Retry publish idempotent. Event diterbitkan setelah commit, tidak untuk transaksi rollback.

Jika replay cursor tidak tersedia:
1. Beri snapshot.required.
2. Frontend mengambil ulang wallet/usage/notification snapshot.
3. Tandai kembali live setelah snapshot berhasil.
4. Jangan menampilkan saldo stale sebagai saldo live.

### 10.5 Cache
Cache boleh untuk catalog, endpoint list, logo, public pricing snapshot, CMS, dan aggregate usage yang dapat dihitung ulang. Cache tidak boleh menjadi source of truth wallet, ledger, payment final, API key validity/revocation, settlement, authorization, dan file ownership. Cache version/TTL/invalidation harus terdokumentasi.

### 10.6 Model color preference
- Assignment warna dibuat server-side pertama kali untuk pasangan user + canonical model dan dipersistenkan atomik.
- Unique constraint mencegah duplikat pada concurrent request.
- User dapat mengganti warna manual; berlaku konsisten lintas device, chart, tabel, export, dan periode.
- Warna tidak mengikuti brand provider dan tidak dipilih ulang per render.
- Endpoint: GET /api/v1/usage/model-colors dan PUT /api/v1/usage/model-colors/:modelId.
- Warna bukan satu-satunya penanda; label model tetap terlihat.

---

## 11. Database model, relasi, dan constraints

Ini logical schema baseline. Field/column type, migration, index, dan constraint final harus direview ketika membuat Prisma schema. Requirement integrity di bawah tidak boleh dihilangkan.

| Entity | Field minimum dan invariants |
|---|---|
| User | id, auth_subject_id, email_normalized, email_verified_at, status, created_at, updated_at, deleted_at; auth_subject_id unique |
| UserProfile | user_id, display_name, avatar_ref, locale, timezone; one-to-one User |
| UserPreference | user_id, theme, default_model_id, default_routing, notification_preferences; one-to-one User |
| UserConsent | id, user_id, consent_type, document_version, accepted_at, source; append-only |
| ApiKey | id, user_id, label, key_prefix, key_hash, key_version, scopes, model_allowlist, spend_limit_idr, rate_limit_policy_id, expires_at, last_used_at, revoked_at |
| Wallet | id, user_id, currency, status; unique user + currency |
| WalletBalance | wallet_id, available_balance_idr, reserved_balance_idr, projection_version, reconciled_at; projection only |
| LedgerTransaction | id, wallet_id, event_type, reference_type, reference_id, idempotency_scope, idempotency_key, actor_type, actor_id, reason, created_at; immutable |
| LedgerEntry | id, transaction_id, account_code, direction, amount, currency, created_at; append-only and balanced per currency |
| Reservation | id, wallet_id, usage_request_id, amount_idr, status, expires_at, released_at; one active per request |
| PaymentIntent | id, user_id, provider_id, external_reference, amount_idr, currency, status, expires_at, paid_at; amount immutable |
| PaymentAttempt | id, payment_intent_id, provider_transaction_id, status, channel, initiated_at, completed_at |
| PaymentWebhookEvent | id, provider_id, provider_event_id, signature_verified_at, received_at, processing_status, payload_hash, safe_payload, processed_at; unique provider + event ID |
| PaymentRefund | id, payment_intent_id, provider_refund_id, amount_idr, reason, status, created_by, approved_by, created_at |
| Model | id, canonical_model_id, display_name, description, developer_id, modality, capability_summary, status, first_seen_at, last_seen_at, deprecated_at; canonical ID unique |
| ModelAlias | id, model_id, source, source_model_id, alias_type; unique source + source model |
| ModelDeveloper | id, slug, name, logo_asset_ref, source_url, attribution, verification_status |
| Provider | id, slug, name, adapter_key, status, credential_reference, terms_review_status; secret only in secret manager |
| ModelEndpoint | id, model_id, provider_id, source_endpoint_id, status, capability_snapshot_id, last_verified_at |
| ModelCapability | id, model_id, endpoint_id, capability_key, supported, metadata, source_version |
| ModelPriceSnapshot | id, model_id, endpoint_id, component, unit, price_value, currency, effective_at, fetched_at, expires_at, source_version; immutable |
| CatalogSyncRun | id, provider_id, job_type, status, started_at, completed_at, counts, error_summary, snapshot_version |
| PricingPolicy | id, name, markup_percent, fixed_fee_idr, rounding_rule, effective_from, effective_until, status, created_by; versioned |
| FxRateSnapshot | id, base_currency, quote_currency, rate_decimal, source, observed_at, effective_at; immutable |
| PricingPolicySnapshot | id, usage_request_id, price_snapshot_refs, fx_rate_snapshot_id, policy_id, calculation_version, component_breakdown, total_idr; immutable |
| UsageRequest | id, user_id, api_key_id, conversation_id, message_id, source, model_id, requested_provider_id, actual_provider_id, endpoint_id, request_status, billing_status, request_id, idempotency_key, started_at, completed_at, latency_ms, safe_error_code |
| UsageComponent | id, usage_request_id, component, quantity, unit, upstream_cost_decimal, currency, customer_charge_idr |
| ProviderAttempt | id, usage_request_id, provider_id, endpoint_id, attempt_no, status, started_at, ended_at, latency_ms, safe_error_code, usage_reference |
| UsageReconciliationCase | id, usage_request_id, expected_cost, observed_cost, status, reason, assigned_to, resolved_at |
| Conversation | id, user_id, title, mode, model_id, routing_preference, archived_at, deleted_at, created_at, updated_at, last_message_at |
| Message | id, conversation_id, sequence, role, content_json, status, usage_request_id, created_at, completed_at; unique conversation + sequence |
| FileAsset | id, user_id, storage_provider, bucket, object_key, original_filename, MIME declared/detected, size_bytes, checksum_sha256, scan_status, status, retention_until, deleted_at |
| MessageAttachment | id, message_id, file_id, position, created_at; unique message + file |
| Notification | id, user_id, type, title, safe_body, data_json, read_at, created_at |
| SupportTicket | id, user_id, subject, category, priority, status, assignee_id, created_at, updated_at, resolved_at |
| SupportTicketMessage | id, ticket_id, author_id, author_type, body, visibility, created_at; internal note is private |
| ContentDocument | id, content_type, slug, locale, title, body, status, version, published_at, author_id, seo_json |
| ContentRevision | id, document_id, revision_no, body_snapshot, changed_by, reason, created_at; append-only |
| UserModelColor | id, user_id, canonical_model_id, color_hex, assignment_method, created_at, updated_at; unique user + canonical model |
| AuditLog | id, actor_id, actor_role, action, resource_type, resource_id, reason, request_id, before_json, after_json, created_at; append-only/redacted |
| OutboxEvent | id, aggregate_type, aggregate_id, event_type, schema_version, payload_safe, created_at, published_at, attempts |
| IdempotencyRecord | id, scope, idempotency_key, request_hash, response_reference, status, expires_at, created_at; unique scope + key |

### 11.1 Database relationships
- User → profile, preferences, consent, API keys, wallet, conversations, files, notifications, tickets, usage, model colors.
- Conversation → Message; Message → MessageAttachment; MessageAttachment → FileAsset.
- UsageRequest → ProviderAttempt, UsageComponent, PricingPolicySnapshot, Reservation, ledger references, optional Message.
- PaymentIntent → PaymentAttempt, PaymentWebhookEvent references, PaymentRefund.
- Model → Developer, Alias, Endpoint, Capability, PriceSnapshot, UsageRequest, UserModelColor.
- Admin-managed resource → AuditLog.

### 11.2 Index dan constraint minimum
- Unique auth subject, normalized email per auth policy, wallet(user,currency), canonical model ID, source model alias, provider webhook event ID, user/model color, conversation/message sequence, and idempotency scope/key.
- Usage indexes: user + started_at; user + model + started_at; API key + started_at; request/billing status + started_at.
- Ledger indexes: wallet + created_at; reference type + reference ID.
- Reservation indexes: wallet + status + expiry.
- Catalog indexes: status + canonical model; endpoint model + status; price model + endpoint + effective_at.
- Semua monetary amount mempunyai currency dan unit eksplisit; IDR integer; USD decimal-safe.
- Timestamp disimpan UTC.
- Financial, payment, usage, audit, webhook, dan reconciliation history tidak cascade-delete.
- Nested user resources harus mempunyai ownership check.

### 11.3 Retention dan deletion
- Retention prompt/output, file, usage metadata, ledger, audit, auth, dan support ditentukan terpisah.
- Penghapusan conversation/file segera revoke access lalu async deletion job menghapus object/derivative sesuai policy.
- Financial/legal records yang wajib dipertahankan tidak dihapus; pseudonymization dilakukan bila sesuai hukum.
- Account deletion mencabut access/session dan menjalankan data deletion/anonymization workflow.
- Backup retention dan restore harus memiliki kebijakan terpisah dari application deletion.

### 11.4 Migration acceptance
- Prisma migrations dapat diterapkan pada database kosong dan database fixture.
- Migration diuji di staging; rollback/forward-fix plan tersedia.
- Constraint/index critical diuji integration.
- Tidak ada default cascade yang menghapus financial/audit history.
- Seed data hanya roles/config/test fixtures, tidak ada fake production payment/pricing.

---

## 12. Security, privacy, dan compliance

### 12.1 Secrets
Secrets untuk upstream, payment, Turnstile, email, HMAC pepper, signing key, dan storage hanya berada di secret manager/environment server-side. Pisahkan dev/staging/production. Rotasi dan incident response harus terdokumentasi. Tidak ada secret pada frontend bundle atau log.

### 12.2 Network/application security
- TLS production.
- CORS allowlist sesuai domain.
- CSP dan security headers.
- CSRF protection untuk cookie-based session.
- Validation Zod di API boundary.
- Rate limiting login, register, password reset, API key creation, chat, upload, dan expensive endpoints.
- Spend/concurrency limits per user/API key.
- Request size limits dan safe timeout.
- Egress allowlist untuk adapter bila sesuai infrastruktur; jangan menerima arbitrary upstream URL.

### 12.3 Data/privacy
- Prompt/file dapat diteruskan ke upstream provider; jelaskan sebelum penggunaan dan pada privacy documentation.
- Jangan klaim no-training/zero-retention tanpa sumber resmi terverifikasi.
- Pisahkan prompt/output dari financial metadata dan analytics.
- Data sensitif tidak masuk event/analytics.
- Sediakan export/deletion workflow.
- Retention dan legal hold jelas untuk chat, files, logs, ledger, audit, support, dan backup.

### 12.4 Authorization/abuse
- Server-side RBAC/permission check.
- Ownership filter untuk seluruh user-scoped data.
- API key scope/model allowlist/spend/rate/concurrency limit.
- Abuse control untuk credential stuffing, scraping, payment fraud, dan anomalous spend.
- Admin action wajib audit actor/reason/before-after.
- File private storage, MIME sniff, quarantine, malware scan, signed URL short TTL.

### 12.5 Legal checklist
- Upstream written permission for downstream use case.
- Provider/model terms and data processing terms.
- AzaleaRouter Terms of Service and Privacy Policy.
- Payment merchant agreement, refund/chargeback rules.
- Indonesian privacy/consumer/payment requirements review.
- Third-party logo/trademark and attribution requirements.
- Cross-border storage/provider data disclosure.
Dokumen ini bukan nasihat hukum; final terms/policies ditinjau tenaga hukum yang kompeten.

---

## 13. Non-functional requirements

| Area | Requirement |
|---|---|
| Reliability | timeout, bounded retry, circuit breaker, graceful degradation |
| Performance | pagination, aggregation, bounded query size, queue heavy jobs |
| Data integrity | ACID transactions, constraints, immutable ledger, idempotency |
| Security | TLS, CSRF/CORS/CSP, secret management, RBAC, file scan |
| Observability | structured redacted logs, traces, metrics, request IDs |
| Scalability | worker queue; horizontal API scale when measured need exists |
| Maintainability | modular monolith, OpenAPI, shared Zod contracts, migration review |
| Localization | Indonesian priority, IDR formatting, Asia/Jakarta display, UTC storage |
| Accessibility | API error/status semantics support WCAG-compliant frontend |
| Backup | backup/PITR policy, restore drill, RPO/RTO decision |
| Privacy | minimization, retention, export/delete, audit |

---

## 14. Testing, quality gates, dan release blockers

### 14.1 Unit tests
Auth/session, role/permission, Turnstile, AZL key format/entropy/hash/revoke/rotate, canonical mapping, capability, pricing stale policy, FX/markup/rounding, ledger balancing, projection, reservation lifecycle, provider adapter, conversation ownership, message order, upload MIME/quota, SSE cursor, model color persistence, audit redaction, maker-checker.

### 14.2 Integration tests
Database migrations; concurrent wallet requests; duplicate webhook; invalid signature/replay; payment inquiry/webhook race; duplicate settlement/release/refund; provider timeout before/after acceptance; partial stream/cancel/disconnect/late usage; stale pricing; failed catalog sync; file quarantine/malware/signed URL/owner checks; cross-user IDOR; SSE replay/cursor expiry/outbox delivery.

### 14.3 E2E tests
- Register → verify email → login → logout.
- Invalid/expired/reused Turnstile token is rejected.
- User A cannot read/mutate User B profile, key, wallet, payment, usage, chat, message, file, or ticket.
- Browse model → inspect price → select eligible endpoint.
- Create AZL key → one-time reveal → masked list → valid request → revoke → reject.
- Top-up pending → verified webhook → one ledger credit → wallet event.
- Chat create → send → attach file → stream → complete/cancel → usage detail → correct balance.
- Rename/archive/delete conversation.
- Usage filters/export match database aggregate.
- Model color persists after refresh/relogin.
- Support ticket/notification lifecycle.
- Admin update catalog/pricing/content creates audit.
- Financial adjustment requires reason/approval.
- SSE reconnect refreshes snapshot without showing stale balance as live.

### 14.4 Financial invariants
- Posting entries balance per currency.
- Wallet projection matches ledger/reservation accounting.
- Available balance cannot go negative unless explicitly approved policy exists.
- Reservation created once and settled/released at most once.
- Payment only credited after server verification.
- Unknown cost is not fabricated as final charge.
- Historical charge unchanged after future pricing/FX/markup updates.
- Settlement cannot silently exceed user-authorized maximum.
- Reconciliation mismatch opens case and blocks unsafe debit if required.

### 14.5 Release blockers
- Duplicate debit/credit or unbalanced ledger.
- API key/auth/payment/upstream secret leakage.
- Cross-user exposure or privilege escalation.
- Invalid/missing payment signature accepted.
- Billing cannot be reconciled or pricing snapshot is stale/invalid.
- Unknown cost treated as final charge.
- Unscanned/unsupported file forwarded upstream.
- Upstream legal permission/payment merchant requirements unresolved for paid launch.
- Backup/restore and retention/deletion procedures untested before production financial data.

---

## 15. Backend implementation roadmap

| Tahap | Workstream | Exit criteria |
|---|---|---|
| BE-0 | Legal/upstream review, architecture decisions, provider/payment/storage selection | Decision log and launch constraints approved |
| BE-1 | Express foundation, DB/Prisma, Redis/BullMQ, config, logging, OpenAPI, CI | API/worker start; migration and CI pass |
| BE-2 | Auth, users, roles, Turnstile, consent | Register/login/session/verification/reset pass |
| BE-3 | Catalog, developer/provider/endpoints, pricing snapshots, sync jobs | 50 canonical model candidates validated |
| BE-4 | Wallet, ledger, pricing/FX, payment intents/webhooks | Financial concurrency/idempotency tests pass |
| BE-5 | AZL keys, gateway, adapter, routing, streaming, usage settlement | End-to-end request + accurate settlement in staging |
| BE-6 | Usage aggregates, model color API, SSE | Cursor recovery and target p95 2s in normal test environment |
| BE-7 | Conversation/file, docs/help/blog/status/changelog, support | Frontend workflows pass contract/E2E |
| BE-8 | Admin API, RBAC, audit, reconciliation, monitoring, hardening | Operational controls pass |
| BE-9 | Closed beta, monitoring, support, rollback, legal recheck | Go/no-go report approved |

BE-0 is a blocking decision phase; BE-1 may use mock/test provider and payment adapters, but production paid transactions cannot bypass legal/provider/payment gates.

---

## 16. Dependencies dan open decisions

OPEN means belum diputuskan; PROPOSED adalah default desain yang masih perlu disetujui.

| ID | Decision | Status awal | Gate |
|---|---|---|---|
| D-01 | Final stack Express 5, Supabase PostgreSQL, Prisma | OPEN | BE-1 |
| D-02 | Domain, API base URL, same-origin/proxy/CORS topology | OPEN | BE-1 |
| D-03 | Auth provider dan session model | OPEN; Supabase Auth kandidat | BE-1 |
| D-04 | Payment gateway, merchant onboarding, channel/refund | OPEN; vendor belum dipilih | BE-4/paid beta |
| D-05 | Upstream written permission for downstream gateway | BLOCKER | Paid access |
| D-06 | Storage provider, region, encryption, malware scanner | OPEN | File upload production |
| D-07 | USD/IDR source, refresh cadence, override, rounding | OPEN | BE-4 |
| D-08 | Markup percent/fixed, floor/ceiling, per-model policy | OPEN | BE-4 |
| D-09 | Refund, expiry, chargeback, negative balance, dispute | OPEN | Paid beta |
| D-10 | Retention prompt/output/file/chat/log/usage/financial/audit | OPEN; legal/privacy review | Production data |
| D-11 | Google/OAuth login | OPTIONAL; not MVP blocker | OAuth feature |
| D-12 | Email delivery provider/domain/deliverability | OPEN | BE-2 |
| D-13 | Observability provider and redaction limits | OPEN | BE-1 |
| D-14 | Backup/PITR, RPO/RTO, backup region, restore drill | OPEN | Financial production |
| D-15 | Two-person approval thresholds | OPEN | BE-4/BE-8 |
| D-16 | Upload final max size/quota/MIME/scanner | PROPOSED in Section 9.2 | Upload production |
| D-17 | SSE replay retention | PROPOSED 24 hours | BE-6 |
| D-18 | Support hours and incident severity | OPEN | Closed beta |

Setiap keputusan dicatat dalam decision log: ID, opsi, keputusan, alasan, owner, tanggal, impact, dan revisi. Keputusan auth, payment, storage, provider, database, atau privacy harus melalui architecture/security review. Jika belum diputuskan, implementasi harus menahan fitur terkait, bukan menebak pilihan.

---

## 17. Risks dan mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| Upstream tidak mengizinkan downstream gateway | Paid product tidak dapat launch | Written approval, provider adapter, alternatif upstream |
| Harga upstream berubah | Billing/margin salah | Price snapshot, sync, stale gate, alert |
| Usage tidak lengkap | Settlement salah | Pending reconciliation; tidak mengarang biaya |
| Concurrent requests | Double spend | DB transaction, lock, idempotency |
| Duplicate/fake webhook | Saldo tidak sah | Signature, replay control, idempotency, inbox |
| Provider outage | Request gagal | Timeout, circuit breaker, safe fallback, status |
| File berbahaya | Malware/data leakage | Private bucket, MIME sniff, quarantine, scanner |
| Conversation/file IDOR | Data user bocor | Ownership check + cross-user tests |
| SSE event hilang | Dashboard stale | Transactional outbox, replay cursor, snapshot |
| Pricing stale | Debit/margin salah | Max-age gate dan blok paid requests |
| Admin overprivilege | Perubahan tanpa izin | Permission granular, audit, maker-checker |
| Payment provider belum siap | Risiko dana customer | Legal onboarding, sandbox, webhook/refund tests |

---

## 18. Definition of Done

Suatu workstream hanya selesai jika:
- Requirements dan acceptance criteria workstream terpenuhi.
- OpenAPI dan Zod contracts diperbarui.
- Unit/integration/E2E tests relevan lulus.
- Error/loading/empty/offline/permission states dapat disajikan frontend.
- Migration, backup/restore, dan rollback/forward-fix plan tersedia sesuai scope.
- Tidak ada secret di client/log/event.
- Audit dan observability tersedia untuk jalur kritis.
- Tidak ada blocker security, privacy, legal, atau financial integrity.
- Hasil direview sebelum fase berikutnya dimulai.

---

## 19. Future phases

### Phase 2 — CLI
CLI menggunakan account, API key, wallet, model catalog, routing, dan usage source CLI. CLI tidak boleh membuka akses upstream langsung.

### Phase 3 — IDE AzaleaRouter
IDE mandiri menggunakan account, wallet, model catalog, API gateway, dan backend yang sama. Editor/agent workflow dibangun sebagai pengalaman produk tersendiri.

---

## 20. Referensi dan dokumen terkait

- Backend PRD v0.3 Appendix A tetap menjadi seed shortlist 50 kandidat model untuk verifikasi; bukan katalog aktif atau harga final.
- Backend PRD v0.3 Appendix B memuat spesifikasi AZL key yang dipertahankan dan dirapikan dalam Section 6 dokumen ini.
- Frontend PRD v0.3 mendefinisikan kebutuhan layar/UX yang harus dipetakan ke endpoint di Section 8.
- OpenRouter catalog, endpoint API, pricing, terms, Cloudflare Turnstile, Supabase Auth/PostgreSQL, Prisma, Express, Redis/BullMQ, dan W3C WCAG harus diperiksa ulang pada saat implementasi karena API/terms dapat berubah.
- Legal dan compliance content bukan nasihat hukum; perlu review profesional sebelum launch.

---

## 21. Change log

| Version | Date | Changes |
|---|---|---|
| 0.3 | 13 Nov 2026 | Backend PRD awal: catalog, routing, AZL key, wallet/ledger, billing, usage, realtime, data model konseptual, security, roadmap. |
| 0.4 | 13 Nov 2026 | Melengkapi API inventory, auth/session, RBAC, conversation/message, file upload/storage, payment/provider adapters, ledger rules, logical DB schema, SSE/streaming/reconnect, admin/CMS/support, open decisions, dan test/release gates. Mengonsolidasikan duplikasi spesifikasi sebelumnya. |
