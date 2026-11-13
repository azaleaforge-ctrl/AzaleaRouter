# AzaleaRouter — Backend Product Requirements Document

**Dokumen:** PRD Backend Website Phase 1  
**Versi:** 0.3  
**Tanggal:** 13 November 2026  
**Status:** Draft untuk review  
**Aplikasi:** `apps/api` — Express.js 5 + TypeScript; `apps/worker` — Node.js/BullMQ

Dokumen ini khusus mengatur sumber kebenaran data, autentikasi server-side, API gateway, model/provider catalog, endpoint routing, API key, wallet, ledger, pembayaran, pricing, usage, event real-time, keamanan, dan background jobs. Frontend tidak melakukan keputusan finansial atau mengakses upstream secara langsung.

## Scope dan Batas Tanggung Jawab Backend

### Tanggung jawab backend
- Menyediakan API website dan OpenAI-compatible API.
- Memverifikasi session/JWT, API key, dan otorisasi setiap user/role.
- Mengelola katalog model, developer, pricing snapshot, endpoint, capability, dan status.
- Menerbitkan/mencabut API key `AZL-` dan memvalidasi request gateway.
- Melakukan routing upstream melalui provider adapter dan meneruskan streaming.
- Mengelola saldo, ledger, pricing, reserve, settlement, release, refund, dan rekonsiliasi.
- Memverifikasi webhook pembayaran dengan signature dan idempotency.
- Menyediakan usage analytics dan event stream berbasis database.
- Menyimpan konfigurasi warna model per user secara persisten.
- Menjalankan background jobs, audit, observability, backup, dan data lifecycle.

### Bukan tanggung jawab backend
- Mengatur layout, chart rendering, animasi, atau state visual browser.
- Memilih warna chart pada setiap render browser.
- Menyimpan API key pelanggan dalam plaintext.
- Menganggap cache sebagai sumber kebenaran saldo/ledger.
- Menyediakan endpoint/provider yang tidak diberikan atau tidak diverifikasi oleh upstream adapter.

---

## 1. Ringkasan Produk

AzaleaRouter adalah platform AI API Gateway yang ditujukan untuk pengguna Indonesia, developer, dan pengguna umum. Platform menyediakan akses ke berbagai model AI melalui satu akun, satu dashboard, dan satu API key AzaleaRouter. Pengguna dapat memakai model dari berbagai pengembang untuk coding, chat umum, reasoning, dan kebutuhan lainnya.

Model bisnis yang direncanakan adalah **prepaid / pay-as-you-go** menggunakan Rupiah. Pengguna mengisi saldo terlebih dahulu, lalu biaya penggunaan model dipotong berdasarkan pemakaian aktual. Harga input dan output ditampilkan secara terpisah dan transparan.

AzaleaRouter direncanakan terintegrasi dengan OpenRouter sebagai upstream awal. Backend AzaleaRouter bertindak sebagai gateway: API key pelanggan diterbitkan dan dikelola oleh AzaleaRouter; kredensial upstream tidak pernah diberikan kepada pelanggan.

> **Legal launch gate:** penggunaan OpenRouter untuk menjual akses API downstream tidak boleh diasumsikan otomatis diizinkan. Syarat publik OpenRouter yang diperiksa pada 13 November 2026 melarang penggunaan layanan untuk resale akses API model atau pengembangan layanan pesaing. Enterprise Access Agreement memiliki klausul penggunaan untuk end customers, tetapi juga memuat pembatasan penyewaan/penjualan kembali atau pemberian akses pihak ketiga. Sebelum transaksi pelanggan diaktifkan, AzaleaRouter wajib memperoleh penjelasan dan persetujuan tertulis yang secara eksplisit mencakup gateway, API key pelanggan, billing pihak ketiga, penggunaan IDE/CLI, dan model/provider yang akan ditawarkan. Desain sistem harus memakai adapter upstream agar provider dapat diganti apabila skema ini tidak disetujui.

### 1.1 Visi

Membuat akses ke berbagai model AI menjadi lebih mudah, transparan, dan terukur bagi pengguna di Indonesia.

### 1.2 Proposisi nilai

- Satu akun untuk mengelola penggunaan AI.
- Satu API key AzaleaRouter untuk aplikasi yang kompatibel.
- Pilihan model dari berbagai pengembang.
- Harga per token yang mudah dibandingkan.
- Saldo prepaid dalam Rupiah.
- Rincian biaya dan perubahan saldo yang transparan.
- Panduan integrasi untuk website, IDE, dan CLI.

### 1.3 Prinsip produk

1. **Transparansi biaya:** pengguna dapat menelusuri dari request sampai jumlah saldo yang didebit.
2. **Tidak ada saldo fiktif:** saldo dan ledger bersumber dari transaksi database, bukan angka cache.
3. **Model-first UX:** identitas pengembang, kemampuan, harga, dan endpoint model mudah dibandingkan.
4. **Provider-neutral architecture:** implementasi tidak boleh mengunci seluruh domain bisnis pada satu upstream.
5. **Low-friction UX:** pengguna baru bisa memahami cara kerja tanpa harus membaca dokumentasi panjang.
6. **Security by default:** API key, data pengguna, pembayaran, dan prompt diperlakukan sebagai data sensitif.

---

## 2. Tujuan, Non-goals, dan Ukuran Keberhasilan

### 2.1 Tujuan Phase 1

- Meluncurkan website publik AzaleaRouter.
- Menyediakan registrasi, login, verifikasi email, dan perlindungan antibot.
- Menyediakan katalog model dengan logo pengembang, spesifikasi, harga, dan endpoint yang tersedia.
- Menyediakan detail routing agar pengguna dapat memilih automatic routing atau provider tertentu jika didukung upstream.
- Menyediakan dashboard penggunaan dan wallet dengan pembaruan near-real-time.
- Menyediakan AI Chat umum dan coding chat.
- Menyediakan API key AzaleaRouter dan OpenAI-compatible API.
- Menerima top-up dalam Rupiah dengan minimum awal Rp50.000.
- Menyediakan dokumentasi, Help Center, blog, changelog, dan status layanan.
- Menyediakan admin panel untuk mengelola model, harga jual, markup, pengguna, pembayaran, dan audit.

### 2.2 Non-goals Phase 1

- Membangun atau melatih foundation model sendiri.
- Membangun CLI mandiri pada fase ini.
- Membangun IDE mandiri pada fase ini.
- Menjamin semua model mendukung semua modalitas atau fitur.
- Menjanjikan SLA provider yang tidak dapat dikendalikan AzaleaRouter.
- Menyimpan prompt dan seluruh output secara default tanpa kebutuhan dan persetujuan yang jelas.
- Menampilkan provider/endpoint yang tidak benar-benar tersedia untuk model tersebut.
- Mengaktifkan penjualan komersial sebelum izin upstream dan persyaratan payment gateway terpenuhi.

### 2.3 KPI awal

Target angka berikut adalah **target produk awal**, bukan klaim performa yang sudah tercapai. Nilainya perlu ditinjau setelah closed beta.

| Area | KPI awal | Definisi |
|---|---|---|
| Onboarding | Registration completion rate | Persentase pendaftar yang menyelesaikan verifikasi email |
| Activation | First successful request | Pengguna yang berhasil mengirim request AI pertama |
| Reliability | Successful request rate | Request yang menghasilkan respons valid dibagi seluruh request yang layak dihitung |
| Billing | Settlement accuracy | Selisih biaya internal dengan biaya upstream yang berhasil direkonsiliasi |
| Real-time | Dashboard event latency | Waktu dari commit transaksi sampai dashboard menerima event |
| Support | Ticket resolution time | Lama penyelesaian tiket dukungan |
| Product | Active users | Pengguna aktif harian/mingguan/bulanan |

KPI keuangan dan penggunaan harus dapat difilter per hari, minggu, bulan, model, provider, API key, dan sumber penggunaan.

---

## 3. Target Pengguna dan Persona

### 3.1 Developer individu

Membutuhkan API yang kompatibel dengan tool yang sudah digunakan, dapat mengganti model, melihat harga, dan mengatur API key.

### 3.2 Pengguna AI umum

Membutuhkan AI Chat untuk menulis, menganalisis, merangkum, bertanya, dan bekerja dengan dokumen tanpa perlu memahami detail API.

### 3.3 Pengguna coding assistant

Menggunakan model melalui IDE atau CLI. Membutuhkan instruksi konfigurasi Base URL, API key, model ID, serta cara memilih endpoint jika tersedia.

### 3.4 Administrator AzaleaRouter

Mengelola katalog model, logo, endpoint, markup, kurs, pembayaran, saldo, pengguna, gangguan upstream, serta audit aktivitas.

---

## 4. Arsitektur Backend dan Stack

Stack ini adalah default desain berdasarkan diskusi sebelumnya. Pilihan masih dapat ditinjau sebelum repository dibuat.

| Lapisan | Teknologi usulan | Catatan |
|---|---|---|
| Frontend | Next.js App Router | Website publik dan authenticated app |
| Language | TypeScript | End-to-end type discipline |
| UI | Tailwind CSS + shadcn/ui | Design system dan komponen |
| Backend | Express.js 5 | Modular monolith API |
| Database | Supabase PostgreSQL | Managed PostgreSQL; data tetap portable |
| ORM | Prisma stable | Schema/migration dan query |
| Auth | Supabase Auth | Session dan verifikasi email |
| API credentials | Custom AzaleaRouter API keys | Terpisah dari session login |
| Cache | Redis | Cache dan koordinasi |
| Queue | BullMQ | Background jobs |
| Worker | Node.js + TypeScript | Sync, webhook, reconciliation |
| Validation | Zod | Request/response validation |
| Testing | Vitest + Playwright | Unit/integration/E2E |
| Deployment | Docker | Reproducible services |
| Package manager | pnpm | Monorepo |
| Monitoring | Sentry + OpenTelemetry | Error, tracing, metrics |

### 4.1 Struktur monorepo

```text
azalea-router/
  apps/
    web/                 # Next.js public site + user app
    api/                 # Express backend / API gateway
    worker/              # Queue workers, sync, webhook, reconciliation
  packages/
    database/            # Prisma schema, migrations, repositories
    shared/              # Types, schemas, shared constants
    auth/                # Auth helpers and authorization
    billing/             # Wallet, ledger, pricing, settlement
    gateway/             # Request lifecycle and streaming
    providers/           # Upstream adapters (OpenRouter first)
    model-catalog/       # Model metadata, endpoint and logo mapping
    ui/                  # Shared UI/design tokens if useful
    config/              # Environment/config validation
  infrastructure/
    docker/
    deployment/
    monitoring/
  docs/
    PRD/
    architecture/
  pnpm-workspace.yaml
  docker-compose.yml
  README.md
```

### 4.2 Modul backend

- Auth & Users.
- Wallet & Ledger.
- Payments & Webhooks.
- API Keys.
- Model Catalog.
- Provider/Endpoint Catalog.
- Pricing & FX.
- AI Gateway.
- Usage & Settlement.
- Notifications.
- Help Center & CMS.
- Admin & Audit.

### 4.3 Background jobs

- Model catalog synchronization.
- Endpoint list refresh.
- Pricing refresh and validation.
- Payment webhook processing.
- Usage settlement/reconciliation.
- Expire stale reservations.
- Notifications.
- Aggregate usage analytics.
- Data retention and deletion jobs.

---


## 5. Authentication, User, dan Anti-bot Backend

### 5.1 Authentication
- Supabase Auth menjadi opsi awal sesuai stack yang dibahas; keputusan final tetap open decision hingga dikonfirmasi.
- Backend memvalidasi access token/session pada setiap endpoint user.
- API key gateway terpisah dari kredensial login website.
- Role minimum: `user`, `support`, `admin`, `super_admin`.
- Authorization dilakukan di backend; menyembunyikan menu frontend tidak cukup.
- Semua query user-scoped harus memfilter `user_id` secara tegas.

### 5.2 Cloudflare Turnstile
- Frontend mengirim Turnstile token ke endpoint register/login/reset yang memerlukan antibot.
- Backend memverifikasi token ke Cloudflare Siteverify.
- Token expired, reused, invalid, atau tidak cocok dengan konfigurasi hostname/action ditolak.
- Secret Turnstile hanya berada di server-side secret manager/environment.
- Rate limit terpisah untuk register, login, reset password, dan email verification.

### 5.3 Consent dan audit akun
- Simpan versi Terms/Privacy, timestamp, user, dan bukti persetujuan yang relevan.
- Password dan token verifikasi tidak masuk log.
- Audit perubahan role, suspension, dan security-sensitive actions.

## 6. Model Catalog, Developer Identity, dan Endpoint Routing

### 6.1 Catalog source of truth
- OpenRouter merupakan upstream awal yang direncanakan, tergantung persetujuan tertulis untuk model bisnis downstream.
- Provider adapter menormalkan respons upstream menjadi canonical model, developer, endpoint/provider, price snapshots, capability, modality, dan status.
- Model ID exact, canonical slug, price, context, output limit, modality, capability, endpoint, provider status, dan expiry diambil dari data aktual saat sinkronisasi; jangan menebak dari display name.
- Simpan timestamp sync, source, version/snapshot, dan riwayat perubahan harga/metadata.
- Model yang hilang/deprecated/expired tidak dihapus jika masih direferensikan usage history; ubah status dan blokir request baru.
- Jika sync gagal, pertahankan snapshot valid terakhir dan tandai stale di admin.

### 6.2 Target katalog minimal 50 model
- Target launch: minimal 50 canonical model aktif yang lolos validasi harga, ketersediaan, endpoint, dan capability.
- Jangan menghitung alias, varian batch, atau provider listing berbeda sebagai model berbeda.
- Kandidat Appendix A adalah shortlist pemeriksaan, bukan jaminan availability atau harga final.
- Jika shortlist gagal memenuhi syarat, ganti dengan model aktual yang lolos; jangan mengarang model demi target jumlah.
- Kategori `Budget`: harga pelanggan maksimal USD 1/1M text input dan USD 1/1M text output setelah markup.
- Harga image/audio/video/cache-write/search dan biaya khusus ditampilkan terpisah bila berlaku.
- Harga berbeda antar endpoint/tier dievaluasi berdasarkan routing policy yang aktif.
- Model spesialis hanya ditawarkan pada endpoint/API yang mendukungnya.
- SKU gratis hanya berlabel `Free` bila masih aktif; catat kuota, rate limit, dan expiry bila ada.

### 6.3 Logo developer
- `ModelDeveloper` memuat nama, slug, logo asset/reference, URL sumber, attribution/license notes bila relevan, dan status verifikasi.
- Model menampilkan identitas pengembang, bukan inference provider.
- Fallback netral digunakan bila logo tidak tersedia atau hak penggunaan belum jelas.
- Logo tidak digunakan sebagai dasar warna chart usage.

### 6.4 Price dan endpoint sync
- Katalog harga disimpan sebagai snapshot bertimestamp dan tidak di-hard-code pada frontend.
- Endpoint list disimpan per canonical model.
- Admin dapat melihat diff harga, capability, endpoint, expiry, dan status.
- Cache catalog boleh digunakan, tetapi response menyertakan `synced_at`/version bila relevan.

### 6.5 Routing modes
1. `auto`: routing default upstream.
2. `cheapest`: prioritas harga terendah jika adapter/upstream mendukung.
3. `fastest`/throughput: prioritas throughput bila sinyal tersedia.
4. `lowest_latency`: prioritas latency bila sinyal tersedia.
5. `specific_provider`: hanya provider yang benar-benar tercantum untuk model tersebut.
6. `provider_priority`: daftar prioritas provider yang telah diverifikasi.
7. `fallback`: fallback diizinkan/tidak diizinkan sesuai capability upstream.

Backend memvalidasi kombinasi model + endpoint + preference. Jika parameter tidak didukung upstream, kembalikan error jelas atau mapping fallback yang terdokumentasi; jangan mengklaim routing berhasil bila adapter tidak dapat menerapkannya.

## 7. API Key AzaleaRouter (`AZL-`)

- Prefix wajib: `AZL-`.
- Secret component: 32 byte CSPRNG, Base64URL tanpa padding (43 karakter).
- Format: `AZL-` + secret component.
- Transport: `Authorization: Bearer AZL-<secret>` melalui HTTPS.
- Full secret ditampilkan hanya sekali saat pembuatan.
- Simpan HMAC/hash, bukan plaintext; pepper disimpan terpisah dari database.
- Lookup memakai prefix/index yang aman kemudian verifikasi secara constant-time.
- Periksa status active/revoked/expired, scopes, model allowlist, spend limit, rate limit, concurrency, dan user status.
- Key customer tidak pernah diteruskan ke upstream.
- Setiap key dapat memiliki label aplikasi seperti Website, OpenCode, VS Code, atau label custom.
- Revoke dan rotate harus idempotent dan segera berlaku pada gateway.

Field minimum: `id`, `user_id`, `label`, `key_prefix`, `key_hash`, `key_version`, `scopes`, `model_allowlist`, `spend_limit_idr`, `rate_limit_policy_id`, `expires_at`, `last_used_at`, `revoked_at`, `created_at`.

---

## 8. Billing, Pricing, dan Ledger

### 8.1 Prinsip finansial

- PostgreSQL adalah sumber kebenaran saldo.
- Wallet tidak boleh hanya berupa angka mutable pada tabel user.
- Semua perubahan saldo dicatat sebagai ledger entry immutable.
- Gunakan transaksi database dan locking/atomic update agar request bersamaan tidak menghabiskan saldo yang sama dua kali.
- Redis tidak digunakan sebagai ledger atau sumber saldo.
- Semua request billing memiliki idempotency key/request ID unik.

### 8.2 Skema perhitungan

Biaya upstream dicatat dalam USD berdasarkan penggunaan aktual dan tarif snapshot.

Contoh formula konseptual:

`customer_charge_idr = round_up((upstream_cost_usd × fx_rate_snapshot) + platform_markup_idr)`

Markup dapat berupa persentase dan/atau komponen tetap sesuai kebijakan admin. Rincian biaya harus menyimpan policy snapshot agar transaksi lama tidak berubah ketika harga atau markup diubah.

Jika model mempunyai komponen harga khusus (cache, image, audio, reasoning, atau komponen lain), komponen tersebut dicatat terpisah berdasarkan data yang tersedia. Jangan menyamakan cached tokens dengan normal input tokens bila tarifnya berbeda.

### 8.3 Reservasi dan settlement

Contoh: saldo tersedia Rp50.000, perkiraan request Rp5.000.

1. Backend memeriksa saldo dan membuat reservasi Rp5.000 secara atomik.
2. Saldo tersedia menjadi Rp45.000; saldo tertahan Rp5.000.
3. Request dikirim ke upstream.
4. Biaya aktual final misalnya Rp3.800.
5. Ledger menyelesaikan debit Rp3.800 dan melepas reservasi sisa Rp1.200.
6. Saldo final tersedia Rp46.200.

Jika request gagal, release reservasi berdasarkan bukti kegagalan dan kebijakan charge upstream. Jika biaya upstream tidak diketahui, tandai pending reconciliation dan jalankan proses rekonsiliasi.

### 8.4 Ledger event types

Minimal:

- `topup_credit`
- `request_reservation`
- `request_settlement`
- `reservation_release`
- `refund_credit`
- `admin_adjustment_credit`
- `admin_adjustment_debit`
- `payment_reversal`
- `chargeback_debit`

Setiap entry menyimpan user, amount, currency, direction, status, reference, idempotency key, created_at, actor/source, dan metadata yang dibutuhkan.

### 8.5 Currency and FX

- Tampilan pelanggan utama IDR.
- Biaya upstream dapat dicatat dalam USD dan IDR.
- FX rate snapshot disimpan per transaksi.
- Sumber kurs, metode pembulatan, dan jadwal pembaruan kurs perlu diputuskan sebelum beta.
- Admin dapat melakukan override hanya dengan alasan dan audit log.
- Transaksi lama tidak dihitung ulang saat kurs berubah.

### 8.6 Batas saldo

- Jika saldo tersedia tidak cukup, request baru ditolak sebelum dikirim ke upstream.
- Request yang sudah berjalan tidak boleh diam-diam ditagih melebihi reserve tanpa aturan settlement dan limit yang eksplisit.
- Terapkan batas maksimum concurrency dan spend limit per akun/API key.
- Minimum top-up awal Rp50.000; nominal lain dapat diatur admin.

---


#### 8.1 Pricing calculation dan snapshot
- Upstream cost disimpan dalam USD berdasarkan usage final dan price snapshot saat request.
- Komponen input/output/cache/image/audio/video/reasoning dicatat terpisah bila data tersedia.
- Simpan kurs snapshot, markup policy snapshot, aturan pembulatan, dan total debit IDR.
- Update harga/markup/kurs tidak mengubah transaksi historis.
- Harga customer dihitung backend. Frontend hanya menampilkan hasil.

#### 8.2 Reservasi dan settlement
- Cek saldo dan reserve dilakukan atomik di database sebelum upstream request dikirim.
- Simpan request state seperti `created`, `reserved`, `forwarding`, `streaming`, `settled`, `released`, `pending_reconciliation`, `failed`, `refunded`.
- Settlement idempotent berdasarkan request ID/idempotency key.
- Lepaskan selisih reserve setelah biaya final diketahui.
- Jika usage/cost tidak final, gunakan `pending_reconciliation`; jangan menebak biaya.
- Request concurrent tidak boleh menggunakan saldo yang sama dua kali.

#### 8.3 Payment gateway
- Minimum top-up awal Rp50.000.
- Channel rencana: QRIS, VA, transfer bank, dan e-wallet.
- Backend membuat payment intent unik dan idempotency key.
- Verifikasi signature webhook dan status transaksi melalui mekanisme resmi payment provider.
- Browser redirect bukan bukti sukses pembayaran.
- Webhook duplicate/replay tidak boleh mengkredit saldo lebih dari satu kali.
- Refund/reversal menambah ledger entry baru; transaksi lama tidak dihapus.

#### 8.4 Ledger types minimum
- `topup_credit`
- `request_reservation`
- `request_settlement`
- `reservation_release`
- `refund_credit`
- `admin_adjustment_credit`
- `admin_adjustment_debit`
- `payment_reversal`
- `chargeback_debit`

## 9. AI Gateway, Usage, Streaming, dan OpenAI Compatibility

### 9.1 OpenAI-compatible API
- Endpoint utama: `POST /v1/chat/completions`.
- API key wajib `AZL-` dan dikirim melalui Authorization header.
- Gateway memetakan model dan parameter ke provider adapter.
- Stream/non-stream mengikuti capability model/endpoint.
- Terapkan request ID stabil, timeout, cancellation handling, retry policy yang mencegah double billing, dan circuit breaker.
- Provider errors dinormalisasi tanpa membocorkan upstream detail.

### 9.2 Internal website API — rancangan awal
- `GET /api/v1/models`
- `GET /api/v1/models/:modelId`
- `GET /api/v1/models/:modelId/endpoints`
- `GET /api/v1/pricing`
- `POST /api/v1/api-keys`
- `GET /api/v1/api-keys`
- `DELETE /api/v1/api-keys/:id`
- `POST /api/v1/api-keys/:id/rotate`
- `GET /api/v1/wallet`
- `POST /api/v1/payments/intents`
- `GET /api/v1/transactions`
- `GET /api/v1/usage/summary`
- `GET /api/v1/usage/requests`
- `GET /api/v1/events` (SSE)
- `POST /api/v1/chat/completions`

Final contract harus versioned, didokumentasikan di OpenAPI, divalidasi Zod, memiliki pagination/filter semantics, dan error envelope konsisten.

### 9.3 Usage detail per request
Simpan minimal:
- Request ID, timestamp, user, API key ID/label.
- Canonical model ID, display name snapshot, developer, provider/endpoint aktual.
- Source: `WEB_CHAT`, `PLAYGROUND`, `API`, `CLI`, `IDE` (future-ready).
- Input, cached input, output, reasoning tokens jika tersedia.
- Biaya upstream per komponen dan currency.
- FX snapshot, markup policy snapshot, total debit IDR.
- Routing preference, provider fallback, latency, status.
- Billing state: reserved, settled, released, pending reconciliation, refunded, failed/no-charge.

Prompt/output tidak otomatis disimpan hanya demi analytics. Retensi konten dipisah dari metadata usage.

### 9.4 Error envelope
- Error code stabil, pesan aman/actionable, HTTP status, request ID, dan detail validasi non-sensitif.
- Jangan mengirim stack trace, provider secret, upstream key, atau data internal.

---

## 10. Real-time, Cache, dan Konsistensi Data

### 10.1 Data yang boleh di-cache

- Model catalog metadata.
- Model endpoint list.
- Logo dan deskripsi model.
- Public pricing snapshot.
- Blog/Help Center content.
- Dashboard aggregate yang dapat dihitung ulang dari ledger/usage records.

### 10.2 Data yang tidak boleh menjadikan cache sebagai sumber kebenaran

- Saldo tersedia.
- Saldo tertahan.
- Ledger entry.
- Status payment final.
- API key validity/revocation state.
- Billing settlement state.

### 10.3 Cache invalidation

- Model catalog memiliki timestamp sync.
- Harga memiliki version/effective date.
- Admin update model/pricing memicu invalidation terkait.
- Event real-time hanya diterbitkan setelah DB commit.
- Dashboard dapat mengambil snapshot terbaru jika event terlewat.

### 10.4 Event channel

Gunakan SSE sebagai pilihan awal untuk update server-to-browser yang dominan satu arah. WebSocket hanya jika kelak dibutuhkan interaksi dua arah yang intensif.

Event minimum:
- `wallet.balance.updated`
- `wallet.reservation.created`
- `wallet.reservation.released`
- `usage.request.started`
- `usage.request.settled`
- `usage.request.failed`
- `payment.confirmed`
- `model.catalog.updated`
- `notification.created`

Setiap event memiliki event ID, timestamp, user scope, schema version, dan payload minimum. Jangan kirim API key, upstream credentials, prompt, atau data sensitif yang tidak diperlukan.

---


### 10.1 Realtime event publication
- Event diterbitkan hanya setelah transaksi terkait berhasil commit.
- Event minimum meliputi wallet balance/reservation, usage started/settled/failed, payment confirmed, model catalog updated, dan notification created.
- Setiap event memuat event ID, schema version, timestamp, dan user scope.
- Jangan memasukkan API key, upstream secret, prompt, atau payload sensitif.
- SSE endpoint harus authenticated dan mengisolasi event per user.

### 10.2 Model color assignment service
- Backend membuat assignment random dan mempersistenkannya per `(user_id, canonical_model_id)`.
- Unique constraint mencegah dua assignment untuk kombinasi yang sama.
- Assignment pertama dibuat atomik.
- Warna tidak mengikuti identitas brand/provider.
- User dapat mengubah warna melalui endpoint preference; catat `assignment_method=manual`.
- Warna dipakai konsisten lintas perangkat, periode, chart, dan export.
- Pilih warna yang berbeda dari warna model lain sejauh palet memungkinkan, tanpa mengorbankan kontras.

### 10.3 Cache policy
Cache boleh untuk catalog, endpoints, logo, public pricing snapshots, CMS, dan agregat usage yang dapat dibangun ulang. Cache bukan sumber kebenaran wallet, ledger, payment final, API key validity/revocation, atau settlement.

---

## 11. Data Model Awal

Ini entitas konseptual; detail kolom dan relasi akan dibuat pada tahap database design.

| Entity | Fungsi |
|---|---|
| `User` | Identitas pengguna |
| `UserProfile` | Nama, preferensi, timezone, tema |
| `UserConsent` | Versi Terms/Privacy dan timestamp persetujuan |
| `ApiKey` | Hash/HMAC, prefix tetap `AZL-`, key lookup prefix, label, status, scope, limit, expiry, last-used, revoked-at |
| `Wallet` | Ringkasan saldo tersedia/tertahan (hasil ledger) |
| `LedgerEntry` | Catatan saldo immutable |
| `PaymentIntent` | Permintaan top-up |
| `PaymentWebhookEvent` | Event pembayaran idempotent |
| `Model` | Canonical model metadata |
| `ModelDeveloper` | Identitas pengembang dan logo |
| `ModelEndpoint` | Endpoint/provider untuk sebuah model |
| `ModelPriceSnapshot` | Harga upstream dan customer per versi/waktu |
| `ModelCapability` | Capability metadata |
| `UserModelColor` | Warna chart per user dan canonical model ID |
| `Provider` | Identitas inference provider |
| `ProviderRoutingPreference` | Preferensi routing user/model/API key |
| `UsageRequest` | Satu request AI dan statusnya |
| `UsageComponent` | Rincian token/biaya per komponen |
| `PricingPolicySnapshot` | Markup/kurs/aturan pembulatan yang digunakan |
| `Conversation` | Metadata percakapan |
| `Message` | Pesan chat jika retention diaktifkan |
| `Notification` | Notifikasi pengguna |
| `SupportTicket` | Permintaan bantuan |
| `BlogPost` | Artikel publik |
| `AuditLog` | Jejak perubahan admin/security |

### 11.1 User model color preference

`UserModelColor` minimal menyimpan:
- `user_id`
- `canonical_model_id`
- `color_hex`
- `assignment_method` (`auto_random` atau `manual`)
- `created_at`
- `updated_at`

Unique constraint: `(user_id, canonical_model_id)`.

Jika belum ada record, backend/service memilih warna secara random dari palette analitik yang dapat berisi warna biru, hijau, merah, kuning, oranye, ungu, teal, dan warna lain yang lolos uji kontras; simpan hasilnya secara atomik. Warna tidak harus mengikuti warna logo atau merek pengembang model. Jangan memilih ulang warna saat render, refresh, ganti tanggal/periode, atau berpindah perangkat.

- Warna default random ditetapkan per user dan canonical model; user dapat mengubahnya secara manual.
- Setelah disimpan, warna harus konsisten pada seluruh grafik, legend, tabel, halaman usage, ekspor CSV yang menyertakan warna, dan rentang tanggal berbeda.
- Algoritma assignment harus menghindari warna yang terlalu mirip untuk model yang sering muncul bersamaan dalam satu grafik; bila palette utama habis, gunakan warna tambahan yang tetap lolos kontras.
- Sertakan nama model, ikon/label, atau pola sebagai pembeda; jangan mengandalkan warna saja.
- `assignment_method` tetap mencatat `auto_random` atau `manual`.

---


## 12. Security, Privacy, dan Compliance

#### 12.1 Authentication & authorization

- Gunakan Supabase Auth untuk session login bila stack ini disetujui.
- API key gateway merupakan kredensial berbeda.
- Role minimum: `user`, `support`, `admin`, `super_admin`.
- Terapkan authorization check di backend; jangan hanya menyembunyikan menu frontend.
- Data setiap user harus terisolasi melalui user_id/tenant scope.

#### 12.2 Secret management

- OpenRouter key dan payment secret hanya berada di server-side secret manager.
- Jangan pernah mengirim secret upstream ke frontend atau log.
- Pisahkan environment development/staging/production.
- Rotasi secret dan sediakan prosedur incident response.

#### 12.3 Rate limiting dan abuse prevention

- Rate limit login, register, password reset, API key creation, chat, dan endpoint mahal.
- Spend limit per user dan API key.
- Concurrency limit.
- Deteksi pola abuse, scraping, credential stuffing, dan top-up fraud.

#### 12.4 Privacy

- Jelaskan bahwa prompt/file dapat diteruskan ke upstream model provider.
- Tampilkan informasi data handling yang tersedia per model/provider; jangan membuat klaim `no training` atau `zero retention` tanpa bukti.
- Pisahkan metadata billing dari isi prompt/output.
- Tentukan retensi chat, file, logs, dan usage metadata.
- Sediakan proses export dan deletion sesuai kewajiban hukum dan kebijakan layanan.
- Data sensitif tidak boleh masuk ke analytics events.

#### 12.5 Audit

Semua perubahan pada pricing, markup, model visibility, provider routing policy, user suspension, wallet adjustment, dan payment status manual wajib memiliki actor, timestamp, reason, dan before/after snapshot.

#### 12.6 Legal checklist

- Persetujuan tertulis upstream untuk model bisnis downstream.
- Persyaratan dan ketentuan tiap model/provider.
- Terms of Service AzaleaRouter.
- Privacy Policy AzaleaRouter.
- Kebijakan refund, expired payment, chargeback, dan saldo.
- Kesesuaian pemrosesan data dan aturan yang berlaku di Indonesia.
- Ketentuan merek/logo pihak ketiga.
- Perjanjian dengan payment gateway.

Dokumen ini bukan nasihat hukum; teks legal final perlu ditinjau tenaga hukum yang memahami layanan digital dan data lintas negara.

---


#### 12.1 Aturan keamanan tambahan
- OpenRouter key, payment secret, Turnstile secret, HMAC pepper, dan signing secrets hanya di server-side secret manager/environment.
- Pisahkan dev/staging/production credentials.
- TLS wajib untuk production.
- CORS allowlist, CSP, secure cookies, CSRF strategy, validation, rate limits, spend/concurrency limits.
- Structured logs harus redacted; jangan log API key, password, prompt sensitif, payment credential, atau auth token.
- Admin-sensitive actions memerlukan audit actor/reason/before-after.
- Data antaruser harus terisolasi dan diuji.

---

## 13. Non-functional Requirements

| Area | Requirement |
|---|---|
| Reliability | Error handling, retry, circuit breaker, timeout, dan graceful degradation |
| Performance | Landing page dan dashboard tidak memuat seluruh data sekaligus; gunakan pagination dan aggregation |
| Accessibility | Target WCAG 2.2 AA untuk warna, keyboard, focus, label, dan screen reader |
| Security | TLS, secure cookies, CSRF strategy, CORS allowlist, CSP, validation, secret management |
| Data integrity | DB transactions, unique constraints, idempotency, immutable ledger |
| Observability | Structured logs, traces, metrics, request IDs, error tracking |
| Scalability | Worker queue untuk tugas async; horizontal scaling API jika dibutuhkan |
| Maintainability | Modular monolith, typed contracts, migration review, automated tests |
| Localization | Bahasa Indonesia sebagai prioritas UI awal; format angka IDR dan waktu WIB |
| Compatibility | Browser modern desktop dan mobile |
| Backup | Backup database, restore test, dan kebijakan retention |

---


---

## 14. Testing dan Quality Gates

### 14.1 Unit tests

- Pricing calculation.
- FX snapshot and rounding.
- Markup policies.
- API key generation format `AZL-`, entropy, hashing/HMAC, verification, masking, rotation, and revocation.
- Model color assignment/persistence.
- Ledger arithmetic.
- Reservation/settlement/release transitions.
- Provider routing mapping.
- Webhook signature and idempotency.

### 14.2 Integration tests

- Database transaction concurrency.
- Duplicate payment webhook.
- Upstream timeout and retry.
- Streaming completion and client disconnect.
- Usage missing/late reconciliation.
- Model unavailable and provider fallback.
- Turnstile Siteverify invalid/expired token.
- SSE reconnect and snapshot recovery.

### 14.3 End-to-end tests

- Register → verify email → login.
- Login blocked when Turnstile validation fails.
- Browse model → inspect details → choose routing preference.
- Create `AZL-` API key → copy secret once → verify masked listing → rotate/revoke.
- Top-up → webhook verified → wallet credited once.
- Chat request → reserve → stream → settle → balance update.
- Open Usage Analytics → filter period → open request detail.
- Change model color → refresh/relogin → color remains the same.
- Export CSV.
- Admin modifies markup → audit record appears.

### 14.4 Financial acceptance tests

- Two concurrent requests cannot spend the same available balance.
- Duplicate settlement cannot debit twice.
- Duplicate webhook cannot credit twice.
- Reservation release cannot occur twice.
- Final balance reconciles to ledger sum.
- A missing upstream cost does not become an invented final charge.
- Historical charge remains unchanged after FX/markup updates.

### 14.5 Release blockers

- Any unresolved duplicate debit/credit.
- API key or upstream credential leakage.
- Cross-user data exposure.
- Incorrect Turnstile validation.
- Billing amount cannot be reconciled.
- Missing provider/legal permission for paid downstream access.
- No tested backup/restore path before production financial data.

---


### 14.1 Backend unit tests
- API key `AZL-`, entropy, HMAC, verification, revoke/rotate.
- Pricing calculation, FX, rounding, markup snapshots.
- Ledger arithmetic, reservations, settlement, release, refund.
- Model canonicalization, budget eligibility, price snapshot validation.
- Provider routing translation and capability validation.
- User model color assignment race-condition safety.
- Turnstile Siteverify logic.
- Payment webhook signature/idempotency.

### 14.2 Backend integration tests
- Concurrent requests and wallet locks.
- Duplicate webhook delivery.
- Upstream timeout, partial stream, client disconnect.
- Missing/late usage data and pending reconciliation.
- Provider fallback and unavailable model.
- SSE auth isolation and event replay/reconnect.
- DB migration and backup/restore path.

### 14.3 Financial acceptance tests
- Dua request bersamaan tidak memakai saldo yang sama.
- Duplicate settlement tidak double debit.
- Duplicate webhook tidak double credit.
- Reservation release tidak terjadi dua kali.
- Saldo akhir cocok dengan immutable ledger.
- Missing upstream cost tidak menjadi debit final rekaan.
- Historical transaction tidak berubah setelah update FX/markup.

### 14.4 Backend release blockers
- Duplicate debit/credit.
- API key/upstream secret leak.
- Cross-user data exposure.
- Turnstile token tidak diverifikasi server-side.
- Billing tidak bisa direkonsiliasi.
- Tidak ada permission upstream yang sesuai skema downstream berbayar.
- Backup/restore belum diuji sebelum menerima uang pelanggan.

## 15. Tahapan Implementasi Backend

| Tahap | Pekerjaan backend | Deliverable / exit criteria |
|---|---|---|
| BE-0 | Legal/upstream review, provider adapter boundary, payment provider selection | Keputusan tertulis dan batas penggunaan |
| BE-1 | Express foundation, DB/Prisma, Redis/BullMQ, config, logging, OpenAPI, CI | API/worker berjalan, migration dan CI lulus |
| BE-2 | Auth verification, users, roles, Turnstile Siteverify, consent | Register/login antibot diverifikasi server |
| BE-3 | Model/developer/endpoint catalog, pricing snapshots, sync jobs | Minimal 50 model canonical lolos validasi sebelum launch |
| BE-4 | Wallet, immutable ledger, pricing/FX, payment intents/webhooks | Saldo dan payment lulus concurrency/idempotency tests |
| BE-5 | `AZL-` keys, gateway, provider adapter, routing, streaming, usage settlement | Request end-to-end dan billing akurat di staging |
| BE-6 | Usage aggregates, model color preference API, SSE events | Event p95 target 2 detik dan snapshot recovery |
| BE-7 | Docs/help/blog/status/changelog APIs | Konten dikelola admin dan disajikan frontend |
| BE-8 | Admin APIs, RBAC, audit, monitoring, reconciliation, hardening | Operational controls lulus |
| BE-9 | Closed beta, support, monitoring, rollback, legal recheck | Go/no-go readiness report |

## 16. Dependencies dan Open Decisions

Keputusan berikut belum dianggap final dan harus dikonfirmasi sebelum fase implementasi terkait:

1. Apakah Express.js 5, Supabase PostgreSQL, dan Prisma menjadi stack final.
2. Domain dan nama Base URL AzaleaRouter.
3. Upstream yang secara tertulis mengizinkan skema downstream gateway.
4. Payment gateway dan legal merchant onboarding.
5. Sumber kurs USD/IDR dan metode pembulatan.
6. Besaran markup: persentase, fixed per token unit, atau kombinasi.
7. Apakah batas USD 1 per 1M berlaku sebagai hard ceiling harga pelanggan untuk semua model atau hanya kategori Budget. Draft ini menganggapnya sebagai batas harga jual kategori Budget.
8. Retensi prompt, output, file, chat, dan usage data.
9. Apakah Google login diperlukan pada MVP.
10. Bahasa UI awal: rekomendasi Bahasa Indonesia dengan dukungan label teknis/API dalam bahasa Inggris.
11. Kebijakan refund saldo, saldo kedaluwarsa (jika ada), dan chargeback.
12. SLA/support hours untuk beta.

---


## 17. Risiko dan Mitigasi

| Risiko | Dampak | Mitigasi |
|---|---|---|
| Upstream tidak mengizinkan resale/downstream gateway | Produk tidak dapat diluncurkan dengan upstream tersebut | Written approval; provider adapter; alternatif upstream |
| Harga upstream berubah | Margin negatif atau tagihan salah | Snapshot harga, sync, budget cap, alert, disable model |
| Usage data tidak lengkap | Settlement tidak akurat | Pending reconciliation; tidak mengarang biaya |
| Request bersamaan | Double spending | DB transaction, locking, idempotency, concurrency tests |
| Webhook duplikat/palsu | Saldo bertambah tidak sah | Signature verification dan idempotency |
| Provider outage | Request gagal | Timeout, fallback sesuai kebijakan, circuit breaker, status page |
| Model/provider terms berubah | Risiko legal/privacy | Sync/review model terms, disable model, user disclosure |
| Prompt sensitif terkirim ke provider | Risiko privasi | Data minimization, disclosure, provider-level policy info |
| Cache stale | Informasi harga/endpoint salah | TTL, timestamp, invalidation, source-of-truth rules |
| Warna chart berubah-ubah | Analitik sulit dibaca | Simpan UserModelColor di database |

---


## 18. Definition of Done

Sebuah fase hanya dinyatakan selesai jika:

- Semua requirement fase terkait sudah diimplementasikan.
- Acceptance criteria lulus.
- Unit/integration/E2E tests yang relevan lulus.
- Error/loading/empty/mobile states tersedia.
- Dokumentasi teknis diperbarui.
- Tidak ada secret yang bocor ke client/log.
- Database migrations dapat diterapkan dan diuji rollback/restore sesuai prosedur.
- Telemetry dan audit tersedia untuk jalur kritis.
- Tidak ada blocker keamanan atau integritas keuangan yang terbuka.
- Hasil fase direview sebelum fase berikutnya dimulai.

---


## 19. Future Phases (Di luar Phase 1)

### Phase 2 — CLI

- CLI berbasis engine OpenCode.
- Login menggunakan akun AzaleaRouter.
- Penggunaan API key dan wallet terpadu.
- Pemilihan model dan endpoint routing.
- Usage tercatat dengan source `CLI`.

### Phase 3 — IDE AzaleaRouter

- IDE mandiri dengan pengalaman coding agent.
- Editor, file explorer, terminal, agent panel, diff, approvals, inline edits.
- Menggunakan akun, wallet, model catalog, dan API gateway yang sama.
- Bukan sekadar GUI wrapper CLI; pengalaman IDE harus memiliki workflow dan state sendiri.
- Usage tercatat dengan source `IDE`.

---


## 20. Referensi Teknis

Referensi diperiksa pada **13 November 2026**. API, harga, kebijakan, dan dokumentasi dapat berubah; implementasi harus memeriksa dokumentasi terbaru kembali.

1. OpenRouter — List all endpoints for a model: https://openrouter.ai/docs/api/api-reference/endpoints/list-all-endpoints-for-a-model
2. OpenRouter — Provider routing improvements and routing behavior: https://openrouter.ai/blog/announcements/how-we-rebuilt-provider-routing/
3. OpenRouter — Terms of Service (last updated August 31, 2026): https://openrouter.ai/terms/
4. OpenRouter — Enterprise Access Agreement (last updated June 22, 2026): https://openrouter.ai/terms-of-service-enterprise
5. Cloudflare — Turnstile server-side token validation: https://developers.cloudflare.com/turnstile/get-started/server-side-validation/
6. Cloudflare — Turnstile getting started: https://developers.cloudflare.com/turnstile/get-started/
7. W3C — WCAG 2.2: https://www.w3.org/TR/WCAG22/
8. OpenRouter — Current model catalog API (`GET /api/v1/models`): https://openrouter.ai/api/v1/models
9. OpenRouter — Browse models and compare pricing: https://openrouter.ai/models
10. OpenRouter — GPT-6 Luna model/pricing reference: https://openrouter.ai/openai/gpt-6-luna
11. OpenRouter — DeepSeek V4.1 Flash listing: https://openrouter.ai/models?input_modalities=text
12. OpenRouter — Qwen 3.8 Flash model/pricing reference: https://openrouter.ai/qwen/qwen3.8-flash-20260826

---


## Appendix A — Shortlist Awal 50 Kandidat Model AI

**Tanggal referensi katalog:** 13 November 2026.  
**Sumber metadata utama:** OpenRouter model catalog API (`GET https://openrouter.ai/api/v1/models`) dan halaman katalog OpenRouter.  
**Status:** seed shortlist untuk sinkronisasi dan validasi; bukan daftar harga permanen dan bukan pernyataan bahwa seluruh item sudah tersedia pada semua provider.

Daftar ini menetapkan target minimum 50 model yang beragam. Model ID/slug final tidak boleh ditebak atau ditulis manual dari nama display. Saat implementasi, sistem harus mengambil exact model ID dari katalog API dan memverifikasi canonical slug, tanggal dibuat/expiry, endpoint, harga, capability, modality, pengembang, dan provider. Kandidat yang tidak ditemukan, deprecated/expired, tidak sesuai fitur, atau melampaui batas harga harus diganti dengan model baru yang memenuhi kriteria.

### A.1 General, coding, reasoning, dan agentic

| No. | Kandidat model | Pengembang | Kegunaan awal |
|---:|---|---|---|
| 1 | GPT-6 Luna | OpenAI | General, coding, reasoning, tools |
| 2 | DeepSeek V4.1 Flash | DeepSeek | Coding, reasoning, agent |
| 3 | Qwen 3.8 Flash | Qwen / Alibaba | Coding, multimodal, agent |
| 4 | GLM-5.3 Flash | Z.ai | Coding, reasoning, multimodal |
| 5 | MiniMax M3.1 Flash | MiniMax | Coding, agentic workflow |
| 6 | Nex-N2.6 | Nex AGI | Computer use, coding, agent |
| 7 | Muse Ember | Meta | Reasoning, tools, agent |
| 8 | LFM3-1.7B | Liquid AI | Lightweight agent, structured output |
| 9 | Mi:dm K3.0 Pro | KT | General, reasoning |
| 10 | Particle-1 | Particle AI | Agentic workflow |
| 11 | Beam 1.0 | Reflection | Reasoning, coding |
| 12 | Ternary Bonsai 2 9B | Prism ML | Chat, coding ringan, reasoning |
| 13 | Ternary Bonsai 2 27B | Prism ML | Coding, math, reasoning |
| 14 | LFM2.5-24B-A2B | Liquid AI | Reasoning, agent |
| 15 | Ling 3.1 Flash | inclusionAI | Reasoning, coding, tools |
| 16 | Solar Mini 4 | Upstage | General, coding ringan |
| 17 | Solar Pro 4 | Upstage | Coding, dokumen, reasoning |
| 18 | MiMo V2.6 Flash | Xiaomi | Multimodal, general |
| 19 | MiMo V2.6 Pro | Xiaomi | Reasoning, multimodal |
| 20 | Granite 4.2 8B | IBM | General, coding, tools |
| 21 | Muse Spark 1.3 Contributor | Meta | Reasoning, coding, agent |
| 22 | Muse Spark 1.2 Contributor | Meta | Reasoning, general |
| 23 | Inkling 2 Small | Thinking Machines Lab | Agentic coding, research, RAG |
| 24 | Qwen 3.8 Omni Flash | Qwen / Alibaba | Audio/video/multimodal |
| 25 | Nemotron 3.5 Lightning | NVIDIA | High-throughput agent |
| 26 | Ling 3.0 Flash | inclusionAI | General, coding, reasoning |
| 27 | Ling 3.0 Tiny | inclusionAI | Lightweight agent, chat |
| 28 | HY3 | Tencent | Reasoning, agent |
| 29 | Qwen 3.7 Flash | Qwen / Alibaba | Coding, multimodal |
| 30 | Qwen 3.5 9B | Qwen / Alibaba | General, coding ringan, vision |
| 31 | DeepSeek V4 Flash 0731 | DeepSeek | Coding, reasoning, agent |
| 32 | GLM-5.3 FlashX | Z.ai | Coding dan inference cepat |
| 33 | gpt-oss-120b | OpenAI | Reasoning, coding, tools |
| 34 | Claude Haiku 5.5 | Anthropic | General, coding, tools |

### A.2 Kandidat gratis

| No. | Kandidat model | Pengembang | Kegunaan awal |
|---:|---|---|---|
| 35 | ERNIE 5.5 Flash Preview (Free SKU) | Baidu | Coding, agent, research |
| 36 | Nemotron 3 Ultra (Free SKU) | NVIDIA | Reasoning, orchestration |
| 37 | Nemotron 3 Nano Omni Reasoning (Free SKU) | NVIDIA | Multimodal reasoning |
| 38 | Dots 3 Note Preview (Free SKU) | Dots | Chat, reasoning, multimodal |

### A.3 Kandidat spesialis dan multimodal

| No. | Kandidat model | Pengembang | Kegunaan awal |
|---:|---|---|---|
| 39 | Nemotron 3.5 Super VL | NVIDIA | Vision, dokumen, video |
| 40 | Ling 3.0 Flash VL | inclusionAI | Vision dan visual agent |
| 41 | Ling 3.0 Flash Fin | inclusionAI | Analisis keuangan (fitur khusus) |
| 42 | Ling 3.0 Flash Sante | inclusionAI | Informasi kesehatan (fitur khusus) |
| 43 | Nemotron 3.5 Content Safety | NVIDIA | Moderasi dan keamanan konten |
| 44 | Schematron V2 Turbo | Inference Net | Ekstraksi dan output terstruktur |
| 45 | Schematron V2 Small | Inference Net | Ekstraksi data terstruktur |
| 46 | ScaleDown Summarize | ScaleDown | Ringkasan teks |
| 47 | ScaleDown Extract | ScaleDown | Ekstraksi informasi |
| 48 | HY-MT2 1.8B | Tencent | Penerjemahan |
| 49 | HY-MT2 7B | Tencent | Penerjemahan |
| 50 | HY-MT2 30B A3B | Tencent | Penerjemahan |

### A.4 Aturan publikasi dan penggantian kandidat

1. Kandidat di atas harus divalidasi ulang dari katalog OpenRouter saat sinkronisasi. Katalog dapat berubah dan nama display bukan pengganti model ID.
2. `StepFun Step 3.5 Flash` sengaja tidak dimasukkan ke baseline launch karena snapshot API yang diperiksa mencantumkan expiry pada 15 November 2026. Model dengan expiry dekat tidak boleh menjadi bagian minimum katalog tanpa pengecekan ulang dan keputusan admin.
3. Model khusus seperti Fin, Sante, Content Safety, Schematron, ScaleDown, dan HY-MT2 bukan otomatis model chat. UI harus menempatkannya sesuai endpoint sebenarnya.
4. Harga diambil dari upstream API, termasuk seluruh override dan tier. Tarif tidak dibekukan di Appendix ini agar tidak menjadi sumber harga yang kedaluwarsa.
5. Daftar ini adalah target awal untuk evaluasi, bukan rekomendasi bahwa seluruh kandidat harus diaktifkan. Admin wajib menguji endpoint, latency, failure rate, tool calling, format response, dan ketepatan usage sebelum dipublikasikan.
6. Untuk menghitung target 50, hanya canonical model aktif, lolos harga, memiliki endpoint yang kompatibel dengan kategorinya, dan tidak expired yang boleh dihitung. Free SKU tidak dihitung sebagai model berbeda bila hanya merupakan varian harga dari canonical model yang sama.

---


## Appendix B — Spesifikasi Format API Key `AZL-`

### B.1 Format

- Fixed prefix: `AZL-`.
- Secret component: 32 byte CSPRNG, encoded as Base64URL tanpa padding (43 karakter).
- Total format: `AZL-` + secret component.
- Transport: `Authorization: Bearer AZL-<secret>` over HTTPS.
- Full secret ditampilkan sekali saat pembuatan; halaman API Keys sesudahnya hanya menampilkan masking.

### B.2 Data minimum

| Field | Fungsi |
|---|---|
| `id` | ID internal record |
| `user_id` | Pemilik key |
| `label` | Nama yang dibuat user |
| `key_prefix` | `AZL-` + sebagian karakter acak untuk identifikasi/lookup |
| `key_hash` | HMAC-SHA-256 dari key lengkap |
| `key_version` | Versi format/algoritma |
| `scopes` | Cakupan izin |
| `model_allowlist` | Opsional pembatasan model |
| `spend_limit_idr` | Batas pengeluaran opsional |
| `rate_limit_policy_id` | Kebijakan rate limit |
| `expires_at` | Waktu kedaluwarsa opsional |
| `last_used_at` | Pemakaian terakhir |
| `revoked_at` | Waktu pencabutan |
| `created_at` | Waktu pembuatan |

### B.3 Aturan keamanan dan UX

- Jangan simpan atau log full key.
- Hash/HMAC dibuat pada backend dengan pepper yang tidak disimpan di database yang sama.
- Jangan pernah mengirim secret ke analytics, error monitoring, event realtime, atau URL.
- Setelah modal pembuatan key ditutup, tombol `Reveal` tidak tersedia. Jika hilang, user harus membuat key baru dan mencabut key lama.
- Sediakan warning sebelum revoke, lalu blokir key pada gateway segera setelah transaksi revoke berhasil.
- Daftar key menampilkan label, masked prefix, status, tanggal dibuat, last used, expiry, dan spend limit.
- Dokumentasi quickstart menggunakan placeholder `AZL-<secret>`, bukan token contoh yang tampak valid.

---


## 21. Catatan Perubahan Dokumen

| Versi | Tanggal | Perubahan |
|---|---|---|
| 0.3 | 13 Nov 2026 | PRD dipisahkan menjadi spesifikasi backend. Dokumen ini menjadi sumber kebenaran untuk API, katalog model, routing, API key AZL-, wallet/ledger, billing, usage, cache, realtime, database, keamanan, worker, dan backend release gates. |
