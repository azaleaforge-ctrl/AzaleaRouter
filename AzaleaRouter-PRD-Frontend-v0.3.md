# AzaleaRouter — Frontend Product Requirements Document

**Dokumen:** PRD Frontend Website Phase 1  
**Versi:** 0.3  
**Tanggal:** 13 November 2026  
**Status:** Draft untuk review  
**Aplikasi:** `apps/web` — Next.js App Router + TypeScript

Dokumen ini khusus mengatur pengalaman pengguna dan implementasi sisi frontend. Seluruh autentikasi yang perlu verifikasi, akses database, katalog resmi, harga final, saldo, perhitungan biaya, API key validation, routing upstream, pembayaran, dan settlement tetap menjadi tanggung jawab backend.

## Scope dan Batas Tanggung Jawab Frontend

### Tanggung jawab frontend
- Menampilkan halaman publik, autentikasi, aplikasi pengguna, dan antarmuka admin sesuai role.
- Menyediakan form dan interaksi pengguna dengan validasi UX awal.
- Mengonsumsi API AzaleaRouter melalui typed client; tidak mengakses OpenRouter langsung.
- Menampilkan harga, saldo, usage, dan status transaksi dari data backend.
- Menampilkan update real-time dan mengelola reconnect/snapshot recovery di browser.
- Menangani accessibility, responsive behavior, theme, loading, empty, error, offline, dan permission states.

### Bukan tanggung jawab frontend
- Menyimpan OpenRouter API key, payment secret, Turnstile secret, atau HMAC pepper.
- Menghitung debit final, mengubah saldo, mengonfirmasi top-up, atau melakukan settlement.
- Menentukan harga jual secara lokal atau mengubah markup.
- Memvalidasi API key `AZL-` untuk gateway.
- Mengarang daftar provider/endpoint.
- Mengakses tabel database finansial secara langsung.

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

## 4. Brand, Visual Design, dan Design System

### 4.1 Arah visual

**Premium minimalis, modern, tenang, dan developer-friendly.** Website harus terasa profesional dan mudah dibaca saat dipakai lama. Hindari neon berlebihan, gradient di setiap komponen, glow yang mengganggu, atau dekorasi yang mengalahkan informasi.

### 4.2 Palet warna awal

| Token | Light mode | Dark mode | Penggunaan |
|---|---|---|---|
| `background` | `#F7F8FC` | `#111420` | Latar utama |
| `surface` | `#FFFFFF` | `#191E2D` | Card dan panel |
| `surface-secondary` | `#F0F2F8` | `#252B3A` | Area sekunder |
| `primary` | `#6558D3` | `#A7A0FF` | Tombol utama, link, fokus |
| `accent-teal` | `#55A89B` | `#71CFC0` | Aksen status/keberhasilan |
| `text-primary` | `#202436` | `#ECEFF6` | Judul dan teks utama |
| `text-secondary` | `#667085` | `#AAB1C1` | Deskripsi dan metadata |
| `border` | `#E5E8F0` | `#2A3040` | Garis pemisah |
| `danger` | Sesuai token aksesibel | Sesuai token aksesibel | Error dan debit |
| `warning` | Sesuai token aksesibel | Sesuai token aksesibel | Peringatan dan status terbatas |

Gradient utama: ungu lembut → biru keabu-abuan → teal. Penggunaan dibatasi pada hero, ilustrasi autentikasi, dan elemen brand tertentu.

### 4.3 Typography dan komponen

- Font utama: Geist atau Inter.
- Hierarki heading dan body konsisten.
- Radius komponen umum: 12–16 px.
- Spacing menggunakan skala konsisten.
- Tombol memiliki state default, hover, focus, disabled, loading, dan error.
- Form memiliki label permanen; placeholder tidak boleh menjadi satu-satunya label.
- Gunakan skeleton untuk loading konten, bukan layout yang melompat.
- Gunakan toast untuk hasil tindakan singkat; error penting tetap tersedia di halaman terkait.
- Semua komponen utama harus memiliki state kosong, loading, error, offline, dan sukses.

### 4.4 Light mode dan dark mode

- Kedua mode didukung sejak awal.
- Light mode menjadi default awal.
- Preferensi tema disimpan pada profil pengguna dan dapat mengikuti system theme.
- Kontras teks dan kontrol harus diuji terhadap WCAG 2.2 AA sebagai target aksesibilitas.
- Warna status tidak boleh menjadi satu-satunya pembeda; sertakan ikon, teks, atau label.

### 4.5 Logo dan aset brand

- Logo AzaleaRouter disimpan sebagai aset brand lokal (SVG/PNG yang telah diverifikasi).
- Logo pengembang model berasal dari sumber resmi atau aset yang memiliki izin penggunaan yang sesuai.
- Jangan membuat logo palsu atau mengubah merek pihak ketiga sehingga menyesatkan.
- Jika logo tidak tersedia, gunakan fallback berupa inisial/nama pengembang dengan warna netral.
- Logo pengembang berbeda dari warna analitik model. Logo tidak boleh diwarnai ulang hanya untuk mengikuti grafik.

---

## 5. Sitemap dan Navigasi

### 5.1 Public website

- `/` — Landing page
- `/models` — Model marketplace
- `/models/[provider]/[model]` — Detail model
- `/pricing` — Penjelasan harga dan kalkulator
- `/docs` — Dokumentasi
- `/docs/quickstart` — Quickstart API
- `/docs/ide/[slug]` — Panduan IDE
- `/docs/cli/[slug]` — Panduan CLI
- `/help` — Help Center
- `/help/[slug]` — Artikel bantuan
- `/blog` — Daftar artikel
- `/blog/[slug]` — Detail artikel
- `/status` — Status layanan
- `/changelog` — Riwayat perubahan
- `/login` — Login
- `/register` — Registrasi
- `/forgot-password` — Reset password
- `/terms` — Terms of Service
- `/privacy` — Privacy Policy

### 5.2 Authenticated application

- `/app/overview` — Ringkasan dashboard
- `/app/chat` — AI Chat umum dan coding
- `/app/models` — Katalog model dalam konteks akun
- `/app/usage` — Usage Analytics
- `/app/transactions` — Riwayat transaksi
- `/app/wallet` — Saldo dan top-up
- `/app/api-keys` — API key
- `/app/playground` — API Playground
- `/app/settings/profile` — Profil
- `/app/settings/security` — Keamanan
- `/app/settings/preferences` — Preferensi
- `/app/notifications` — Notifikasi

### 5.3 Admin application

- `/admin/overview`
- `/admin/users`
- `/admin/models`
- `/admin/providers`
- `/admin/pricing`
- `/admin/wallets`
- `/admin/payments`
- `/admin/usage`
- `/admin/upstream`
- `/admin/support`
- `/admin/content`
- `/admin/audit-logs`
- `/admin/settings`

### 5.4 Navigasi utama

Navbar publik: **Models · Pricing · Docs · Blog · Help Center · Login · Get Started**.

Sidebar aplikasi: **Overview · AI Chat · Models · Usage Analytics · Wallet & Transactions · API Keys · API Playground · Documentation · Help Center · Settings**.

Admin memiliki navigasi terpisah dan dilindungi role-based access control.

---

## 6. Spesifikasi Halaman dan Modul

### 6.1 Landing Page

### Tujuan

Menjelaskan apa itu AzaleaRouter, manfaatnya, kisaran harga, model yang tersedia, cara kerja, dan cara memulai.

### Section

1. Hero: headline, penjelasan singkat, CTA `Get Started` dan `Explore Models`.
2. Value proposition: satu API, pilihan model, saldo Rupiah, transparansi biaya.
3. Featured models: model pilihan beserta logo, harga, kategori, dan status.
4. Use cases: coding, general chat, reasoning, vision, API integration.
5. How it works: daftar → top-up → buat API key → pilih model → gunakan.
6. Pricing preview: contoh tarif dan tautan kalkulator.
7. Integrations preview: IDE, CLI, dan aplikasi OpenAI-compatible.
8. FAQ.
9. Final CTA.
10. Footer: legal, dokumentasi, dukungan, blog, status.

### Acceptance criteria

- CTA utama menuju registrasi.
- Model unggulan diambil dari katalog yang aktif, bukan hard-coded.
- Harga dan tanggal sinkronisasi dapat diketahui.
- Landing page responsive dan SEO metadata tersedia.
- Tidak menampilkan klaim harga atau dukungan fitur yang belum diverifikasi.

### 6.2 Login dan Registrasi

### Layout

- Desktop: panel visual/ilustrasi di kiri, form di kanan.
- Mobile: ilustrasi dipadatkan di bagian atas atau disembunyikan secara adaptif; form menjadi prioritas.
- Panel login menampilkan pesan manfaat singkat: akses berbagai model melalui satu API.
- Panel registrasi menjelaskan manfaat: model beragam, harga transparan, pembayaran Rupiah, integrasi, dan dashboard rinci.

### Login form

- Email atau username sesuai keputusan autentikasi.
- Password, tombol show/hide.
- Remember me (hanya jika mekanisme sesi aman mendukungnya).
- Forgot password.
- Cloudflare Turnstile.
- Submit button dengan loading/error state.
- Link registrasi.
- Link Terms dan Privacy.
- Google sign-in hanya jika OAuth provider dikonfigurasi dan diuji.

### Registration form

- Nama lengkap.
- Email.
- Password dan konfirmasi.
- Indikator kekuatan password.
- Verifikasi email.
- Cloudflare Turnstile.
- Checkbox persetujuan Terms of Service dan pemberitahuan Privacy Policy; tidak dicentang otomatis.
- Simpan versi dokumen, timestamp, dan bukti persetujuan yang relevan.

### Antibot

- Cloudflare Turnstile Managed menjadi opsi default.
- Frontend mengirim token ke backend bersama form.
- Backend memanggil Cloudflare Siteverify sebelum membuat akun atau memproses login.
- Token tidak dipercaya hanya karena widget frontend tampil.
- Token expired, reused, invalid, atau Siteverify gagal akan menolak tindakan dan memberi instruksi untuk mencoba lagi.
- Secret Turnstile hanya berada di server-side secret manager/environment; tidak pernah dikirim ke browser.
- Terapkan rate limit terpisah untuk login, register, reset password, dan verifikasi email.

### Acceptance criteria

- Tanpa token Turnstile valid, backend menolak submission.
- Token satu kali pakai tidak dapat digunakan ulang.
- Pengguna menerima pesan validasi yang jelas dan tidak membocorkan apakah email terdaftar pada alur yang rawan enumerasi.
- Password tidak pernah dicatat dalam log.
- Proses verifikasi email dan reset password memiliki token sekali pakai dan masa berlaku.

### 6.3 Model Marketplace

### Tujuan

Membantu pengguna menemukan dan membandingkan model berdasarkan pengembang, kemampuan, konteks, harga, ketersediaan, dan endpoint.

### Informasi model card

- Logo pengembang.
- Nama model.
- Model ID.
- Nama pengembang/organisasi.
- Deskripsi singkat.
- Kategori: Coding, General, Reasoning, Vision, Audio, Embeddings, dan lainnya sesuai data.
- Harga input per 1 juta token.
- Harga output per 1 juta token.
- Cached input/cache pricing jika tersedia.
- Context window dan output limit jika tersedia.
- Capability chips: streaming, tool calling, vision, structured output, reasoning, dan modality lain.
- Status model: Available, Limited, Deprecated, Unavailable.
- Tautan detail dan tombol coba model.

### Logo pengembang

Katalog dapat memuat pengembang seperti DeepSeek, Qwen/Alibaba, OpenAI, MiniMax, Google, Meta, Mistral, Anthropic, dan pihak lain jika modelnya benar-benar tersedia dan lolos aturan katalog.

Aturan:
- Model memakai logo pengembang, bukan logo inference provider.
- Simpan logo sebagai aset lokal setelah sumber dan hak penggunaannya diperiksa.
- Logo model tidak dipaksa memiliki warna yang sama dengan seri grafik Usage Analytics.
- Jika pengembang belum terverifikasi, gunakan fallback netral.

### Filter dan pencarian

- Search berdasarkan nama model, provider, dan model ID.
- Filter kategori/capability.
- Filter pengembang.
- Filter harga maksimum input/output.
- Filter context window.
- Filter provider/endpoint.
- Filter model yang populer/baru/termurah.
- Filter hanya model yang tersedia.
- Sort berdasarkan harga, nama, context window, dan popularitas internal.

### Aturan harga budget

Default kategori budget: **tarif pelanggan maksimum USD 1 per 1 juta token untuk input dan USD 1 per 1 juta token untuk output**. Tarif upstream juga harus dipantau. Jika harga pelanggan setelah markup melewati batas, model tidak boleh tetap diberi label `Budget`.

- Harga harus berasal dari snapshot catalog/pricing yang bertanggal.
- Harga dapat berbeda antar provider endpoint.
- Jika auto routing dapat memilih endpoint dengan biaya berbeda, tampilkan tarif aktual/estimasi yang sesuai kebijakan routing; jangan menampilkan satu harga seolah pasti apabila tarifnya bervariasi.
- Model yang tidak memenuhi batas dapat tetap tersedia di kategori lain hanya jika kebijakan bisnis mengizinkan dan pengguna diberi informasi harga jelas.
- Admin dapat mengatur kategori, status, dan pengecualian dengan audit log.

### Acceptance criteria

- Tidak ada kartu model tanpa nama pengembang atau fallback.
- Harga selalu menunjukkan unit `/ 1M tokens`.
- Harga menunjukkan mata uang dan tanggal pembaruan.
- Filter dapat digabung.
- Model unavailable tidak bisa dipilih untuk request baru.
- Semua detail yang tidak diketahui diberi label `Not provided` atau tidak ditampilkan, bukan ditebak.

### Target jumlah katalog dan aturan model terbaru

- Target katalog publik saat peluncuran: **minimal 50 model AI berbeda** yang lolos validasi harga, ketersediaan, endpoint, dan capability.
- Katalog memprioritaskan model yang masih aktif dan berasal dari generasi terbaru yang tersedia di OpenRouter. Model lama yang tidak relevan, deprecated, atau telah berakhir masa ketersediaannya tidak boleh dipertahankan hanya untuk memenuhi angka 50.
- Model dihitung berdasarkan **canonical/base model**, bukan jumlah SKU. Varian `:batch`, alias yang mengarah ke model sama, atau listing provider berbeda tidak boleh dihitung sebagai model berbeda.
- Daftar kandidat pada Appendix A adalah **seed shortlist untuk pemeriksaan awal**, bukan jaminan seluruh item aktif atau sudah memenuhi batas harga. Model ID, canonical slug, harga, konteks, capability, modality, endpoint, expiry, dan provider harus diambil dari katalog API OpenRouter saat sinkronisasi.
- Minimal 50 model harus lolos sebelum katalog diberi status `Launch Ready`. Jika kurang dari 50 yang lolos, admin harus mengisi kekurangan dengan kandidat terbaru lain yang memenuhi kriteria; jangan memajang model fiktif, model expired, atau model di luar batas harga.
- Kategori `Budget` mempunyai batas default maksimal **USD 1 per 1 juta text input tokens dan USD 1 per 1 juta text output tokens pada harga pelanggan**, setelah markup. Harga image, audio, video, web search, cache write, dan biaya khusus lain ditampilkan terpisah bila berlaku.
- Jika pricing mempunyai tier, override, jam/hari tertentu, prompt-length threshold, atau harga berbeda antar endpoint, evaluasi seluruh kondisi yang mungkin dipakai routing. Model tidak boleh dilabeli `Budget` bila salah satu kondisi routing aktif dapat membuat harga text input atau output melampaui batas, kecuali routing dikunci ke endpoint/tier yang memenuhi batas dan hal itu dijelaskan kepada pengguna.
- Gunakan harga aktual per model/provider dari snapshot bertimestamp. Jangan menyalin angka harga permanen ke frontend atau menjadikan angka dalam PRD sebagai harga jual.
- Model gratis diberi label `Free` hanya jika SKU gratis masih aktif. Kuota, rate limit, expiry, dan kemungkinan penghentian provider wajib ditampilkan; gratis tidak berarti dijamin tersedia terus-menerus.
- Model spesialis (translation, extraction, moderation, decision, embedding, rerank, speech, image generation, atau endpoint non-chat) boleh ada di marketplace, tetapi tidak boleh muncul sebagai model AI Chat atau `/v1/chat/completions` jika API/kapabilitasnya tidak mendukungnya.
- Model preview/experimental diberi badge `Preview` atau `Experimental`; admin dapat mengaktifkan/menonaktifkannya tanpa menghapus riwayat usage.

### Sinkronisasi katalog

- Backend mengambil katalog upstream melalui adapter provider, lalu menormalisasi data ke entitas `Model`, `ModelDeveloper`, `ModelEndpoint`, `ModelPriceSnapshot`, dan `ModelCapability`.
- Sinkronisasi mencatat `synced_at`, source, canonical ID, model ID, harga, endpoint, status, dan perubahan metadata.
- Admin dapat melihat diff perubahan harga, capability, provider, dan expiry.
- Model yang hilang dari katalog upstream, dinonaktifkan, atau kedaluwarsa tidak langsung dihapus karena usage history harus tetap dapat dibaca. Statusnya diubah menjadi `Unavailable`/`Deprecated` dan tidak dapat dipilih untuk request baru.
- Kegagalan sync tidak boleh mengosongkan katalog aktif. Pertahankan snapshot terakhir yang valid, tampilkan waktu sinkronisasi terakhir, dan beri peringatan kepada admin.

### Acceptance criteria tambahan

- Target minimum 50 canonical model aktif yang telah lolos validasi sebelum public launch.
- Harga dan endpoint mempunyai timestamp/snapshot sumber.
- Listing `batch` atau alias tidak menggandakan jumlah model.
- Model non-chat tidak ditawarkan pada AI Chat jika endpoint tidak mendukungnya.
- Pilihan streaming/non-streaming mengikuti capability model/provider.

### 6.4 Detail Model dan Endpoint Routing

### Informasi halaman detail

- Logo, pengembang, nama, model ID.
- Deskripsi dan use case.
- Harga tiap jenis token yang tersedia.
- Context window, max output, modality, tokenizer jika tersedia.
- Capability matrix.
- Provider endpoint yang melayani model.
- Provider price, status, latency, throughput, uptime/error metrics jika upstream menyediakan data yang cukup.
- Informasi data retention/training policy berdasarkan sumber resmi yang dapat diverifikasi.
- Contoh API, IDE, dan CLI.

### Routing modes

1. **Auto:** gunakan routing default upstream.
2. **Cheapest:** gunakan pengurutan berdasarkan harga jika didukung oleh upstream.
3. **Fastest / Throughput:** gunakan sinyal throughput atau sorting upstream bila tersedia.
4. **Lowest latency:** gunakan sinyal latency bila tersedia.
5. **Specific provider:** batasi ke provider tertentu jika tersedia untuk model tersebut.
6. **Provider priority/order:** urutan prioritas provider jika didukung.
7. **Fallback:** izinkan atau matikan fallback sesuai kemampuan upstream.

### Aturan routing

- Daftar endpoint diambil dari API endpoint model upstream, bukan dibuat manual tanpa bukti.
- Endpoint/provider yang ditampilkan adalah daftar kandidat, bukan jaminan provider pasti melayani semua request.
- Untuk setiap request, catat routing preference, provider yang benar-benar melayani (jika tersedia), dan status fallback.
- Jika provider tertentu tidak tersedia, UI menonaktifkan pilihan tersebut dan menjelaskan alasannya.
- Pengguna boleh memilih auto atau preferensi provider, tetapi tidak boleh mengirim arbitrary upstream URL melalui UI standar.
- Routing adapter memetakan pilihan UI ke parameter resmi provider routing upstream.
- Hindari klaim `fastest` atau `cheapest` jika upstream tidak memberi data yang diperlukan untuk menyimpulkan hal tersebut.

### Cache endpoint

- Endpoint list boleh di-cache dengan TTL singkat yang dapat dikonfigurasi.
- Cache key memuat model ID dan filter relevan.
- Admin dapat memaksa refresh.
- Cache harus memiliki timestamp dan stale status.
- Cache tidak boleh menyembunyikan status model yang diketahui telah dinonaktifkan.

### Acceptance criteria

- Pengguna dapat melihat perbedaan model developer dan inference provider.
- Auto routing dapat digunakan tanpa memilih provider.
- Pilihan provider spesifik hanya muncul jika endpoint tersedia.
- Detail request menyimpan provider aktual jika tersedia dari upstream.
- Bila routing option tidak didukung upstream, UI tidak menampilkannya sebagai fitur aktif.

### 6.5 AI Chat

### Mode

- General Chat.
- Coding Chat.

### Kebutuhan

- Model picker.
- Endpoint routing selector sesuai kemampuan model.
- Streaming respons.
- Markdown dan code block.
- Copy response/code.
- Riwayat percakapan.
- Rename, archive, delete conversation.
- Upload file/gambar hanya untuk tipe yang didukung model dan backend.
- Indikator input/output token dan estimasi biaya.
- Status request: queued, running, completed, failed, canceled, reconciliation pending.
- Stop generation.
- Error harus mudah dipahami dan tidak mengungkap secret atau stack trace.

### Pengelolaan chat

- Percakapan hanya dapat diakses pemiliknya.
- Pengguna dapat menghapus chat dan menghapus data sesuai kebijakan retensi.
- Penyimpanan prompt/output harus dijelaskan di Privacy Policy.
- Default logging disesuaikan dengan prinsip data minimization; jangan menyimpan konten percakapan untuk analytics jika metadata usage cukup.

### 6.6 API Playground

- Pilih model dan endpoint.
- Editor prompt/messages.
- Parameter yang didukung model.
- Pilihan streaming/non-streaming.
- Kirim request dan tampilkan response.
- Tampilkan usage dan debit aktual setelah request selesai.
- Tampilkan contoh cURL/JavaScript/Python.
- Tombol copy konfigurasi.
- Jangan pernah menampilkan upstream secret.

### 6.7 API Keys

### Format dan tampilan key

- Semua API key pelanggan versi pertama **wajib diawali persis dengan `AZL-`**.
- Format token: `AZL-` + 43 karakter acak URL-safe yang dibuat dari 32 byte cryptographically secure random data (Base64URL tanpa padding).
- Contoh tampilan tersamarkan: `AZL-Ab12Cd34••••••••••••••••••••••••••••••••`.
- Jangan memakai prefix `sk-or-`, jangan meneruskan atau membungkus key OpenRouter, dan jangan mengungkap identitas/kredensial upstream di dalam key AzaleaRouter.
- Pada daftar key, tampilkan `AZL-` dan sebagian kecil karakter identifikasi saja, misalnya `AZL-Ab12Cd34••••`. Secret lengkap tidak boleh ditampilkan kembali setelah layar pembuatan ditutup.
- Format harus berversi di backend agar perubahan format di masa depan tidak merusak key yang sudah diterbitkan secara diam-diam.

### Kebutuhan

- Buat API key dengan awalan wajib `AZL-`.
- User dapat memberi label/nama key.
- Tampilkan full secret hanya satu kali saat dibuat; sediakan tombol copy dan peringatan bahwa key tidak dapat dilihat kembali.
- Simpan hash/HMAC key, bukan plaintext.
- Simpan `key_prefix` untuk identifikasi dan lookup awal; simpan `key_hash`, label, status, scope, limit, expiry, `last_used_at`, `created_at`, dan `revoked_at`.
- Sediakan revoke dan rotate key tanpa mengubah key lain.
- Tampilkan last used, created at, status, serta penggunaan per key.
- Limit opsional per key: spend limit, model allowlist, rate limit, source/app label, dan expiry.
- Semua perubahan key dicatat pada audit log.

### Keamanan

- Key pelanggan bukan OpenRouter key dan tidak boleh menjadi akses langsung ke upstream.
- Secret hanya dikirim sekali melalui TLS dan tidak ditulis ke log, analytics, URL, atau telemetry.
- Gunakan cryptographic random generator; hash/HMAC dengan server-side pepper yang disimpan di secret manager/environment aman; gunakan constant-time comparison saat validasi.
- Prefix dan hash mempunyai index yang sesuai agar verifikasi efisien tanpa menyimpan secret asli.
- Rate-limit autentikasi key dan sediakan revoke segera ketika key dicurigai bocor.
- API gateway menerima kredensial dalam `Authorization: Bearer AZL-...`; jangan menerima key pelanggan melalui query string.
- Key dengan format lama/non-`AZL-` ditolak setelah aturan format ini diaktifkan pada lingkungan produksi.

### Acceptance criteria

- Setiap key baru selalu diawali `AZL-` dan mempunyai entropy minimum 256 bit.
- Secret penuh hanya terlihat satu kali setelah pembuatan.
- Database tidak menyimpan plaintext key.
- Key yang dicabut langsung tidak dapat mengakses gateway.
- Key salah format, tidak valid, kedaluwarsa, atau dicabut ditolak dengan error autentikasi yang konsisten tanpa membocorkan informasi sensitif.

### 6.8 Wallet dan Top-up

### Kebijakan awal

- Mata uang utama: IDR.
- Minimum top-up awal: Rp50.000.
- Skema: prepaid / pay-as-you-go.
- Metode yang direncanakan: QRIS, virtual account, transfer bank, dan e-wallet; penyedia payment gateway dipilih setelah evaluasi biaya, webhook, settlement, dan dukungan operasional.

### Alur top-up

1. Pengguna memilih nominal.
2. Backend membuat payment intent dengan ID unik dan idempotency key.
3. Pengguna menyelesaikan pembayaran pada channel terpilih.
4. Payment gateway mengirim webhook.
5. Backend memverifikasi signature dan status transaksi ke gateway.
6. Backend memproses webhook secara idempotent.
7. Ledger mencatat kredit saldo satu kali.
8. Dashboard menerima event saldo masuk.

Browser redirect tidak boleh menjadi bukti tunggal pembayaran sukses.

### Wallet UI

- Saldo tersedia.
- Saldo tertahan/reserved.
- Total top-up.
- Total debit.
- Riwayat transaksi.
- Filter tanggal dan tipe transaksi.
- Detail transaksi dan ID referensi.
- Export CSV.

### Acceptance criteria

- Webhook duplikat tidak menggandakan saldo.
- Payment pending tidak menambah saldo.
- Payment gagal/kedaluwarsa tidak menambah saldo.
- Refund/reversal mempunyai ledger entry baru; transaksi lama tidak dihapus.

### 6.9 Usage Analytics Dashboard

### Tujuan

Menampilkan model apa yang dipakai, kapan dipakai, berapa token yang digunakan, dan berapa saldo yang benar-benar berubah.

### Filter waktu

- Hari ini.
- Kemarin.
- 7 hari terakhir.
- 30 hari terakhir.
- Bulan ini.
- Bulan sebelumnya.
- Rentang tanggal dan jam kustom.
- Zona waktu default tampilan: Asia/Jakarta (WIB); timestamp database disimpan UTC.

### Ringkasan

- Total pengeluaran periode.
- Total request.
- Total input tokens.
- Total cached input tokens.
- Total output tokens.
- Total reasoning tokens bila tersedia.
- Total saldo masuk.
- Saldo tersedia.
- Saldo tertahan.
- Model paling sering digunakan.
- Penggunaan per sumber: Website, IDE, CLI, API key.

### Grafik dan model color assignment

**Warna model tidak harus mengikuti warna merek provider.** DeepSeek tidak wajib selalu hijau, Qwen tidak wajib merah, GPT tidak wajib biru. Setiap model boleh mendapat warna berbeda secara random dari palet grafik yang telah disediakan.

Perilaku yang disyaratkan:

1. Saat sebuah model pertama kali muncul pada data usage pengguna, sistem memilih warna secara pseudo-random dari palet warna yang aman dibaca.
2. Warna hasil pilihan disimpan secara permanen untuk kombinasi user dan model ID.
3. Warna tidak berubah saat halaman di-refresh, rentang tanggal berubah, atau pengguna login dari perangkat lain.
4. Warna tidak boleh dibuat random ulang setiap render; hal itu akan membuat grafik sulit dibandingkan.
5. Pengguna dapat mengganti warna secara manual melalui pengaturan/legend chart.
6. Sistem memilih warna baru yang cukup berbeda dari warna model lain pada akun tersebut jika memungkinkan.
7. Warna yang dipilih berlaku di seluruh Usage Analytics, legend, tabel, tooltip, dan ringkasan.
8. Warna tetap harus memiliki label model, bukan satu-satunya penanda.
9. Jika model ID berbeda walau pengembangnya sama, tiap model boleh mendapat warna sendiri.
10. Jika model alias berubah tetapi canonical model ID sama, warna tetap mengikuti canonical model ID.

### Palette awal

Palet adalah daftar warna data-viz, bukan ketetapan brand. Contoh:

`#4F83E5`, `#2FA879`, `#E16B6B`, `#E6A23C`, `#8B70C9`, `#26A6A1`, `#D46A9B`, `#6F8F3D`, `#D17B45`, `#64748B`, `#A3A3E8`, `#3C9BCB`, `#B07A52`, `#718BBA`.

Palette harus diuji untuk kontras dan perbedaan warna. Jika warna yang tersisa sedikit, sistem boleh menggunakan variasi shade atau marker pattern, tetapi label teks selalu tersedia.

### Grafik

- Donut chart: proporsi penggunaan/biaya per model.
- Time series: penggunaan atau biaya per hari/jam.
- Stacked bar/area: biaya per model per tanggal.
- Bar chart: top models berdasarkan biaya atau request.
- Toggle metrik: biaya, request, input tokens, output tokens.
- Legend dapat mengaktifkan/nonaktifkan model.
- Klik data point membuka daftar request yang membentuk nilai tersebut.

### Detail setiap request

- Request ID.
- Timestamp.
- Model ID dan display name.
- Pengembang model.
- Endpoint/provider aktual jika tersedia.
- API key label (secret tidak pernah ditampilkan).
- Sumber request (chat, playground, IDE, CLI, API).
- Input tokens.
- Cached tokens.
- Output tokens.
- Reasoning tokens jika tersedia.
- Biaya upstream per komponen jika tersedia.
- Kurs USD/IDR snapshot.
- Markup snapshot.
- Pajak/biaya lain hanya jika memang diterapkan dan dapat dibuktikan.
- Total debit IDR.
- Status billing: reserved, settled, released, pending_reconciliation, refunded, failed/no_charge.
- Routing preference dan fallback status.

### Real-time behavior

- Ketika request dimulai, dashboard dapat menampilkan status running dan estimasi biaya yang jelas diberi label **estimasi/provisional**.
- Saat reservasi saldo berhasil, saldo tersedia dan saldo tertahan diperbarui.
- Setelah request selesai dan usage final diterima, biaya aktual diselesaikan dan sisa reservasi dilepas.
- Jika upstream tidak mengembalikan data usage/biaya final, transaksi masuk `pending_reconciliation`; sistem tidak boleh mengarang biaya final.
- Jika request gagal tanpa output/charge berdasarkan bukti upstream, reservasi dilepas dan transaksi diberi status no-charge/released sesuai aturan provider.
- Event dikirim setelah commit database berhasil.
- Dashboard harus dapat pulih jika koneksi real-time putus: reconnect dengan cursor/event ID atau fetch snapshot terbaru.

### Target real-time

- Target p95 dari commit ledger ke browser menerima event: maksimal 2 detik pada kondisi layanan normal.
- Jika event stream terputus, UI menampilkan status reconnecting dan melakukan refresh snapshot; tidak boleh menampilkan saldo stale sebagai saldo live tanpa indikator.
- Angka provisional dan final harus dibedakan secara visual dan tekstual.

### 6.10 Documentation

Kategori dokumentasi:

- Getting Started.
- Account, Wallet, dan API Key.
- API Quickstart.
- Chat Completions.
- Streaming.
- Model dan capability.
- Provider routing.
- Error codes dan troubleshooting.
- IDE integration.
- CLI integration.
- API Reference.

Setiap tutorial integrasi idealnya memuat:

1. Prasyarat.
2. Tempat memasukkan Base URL.
3. Cara membuat dan memasukkan API key.
4. Model ID yang benar.
5. Konfigurasi contoh.
6. Cara melakukan request uji.
7. Cara membaca usage dan saldo.
8. Troubleshooting error umum.

Dokumentasi IDE/CLI hanya mencantumkan aplikasi dan versi yang benar-benar telah diuji.

### 6.11 Help Center

Kategori:

- Account & Security.
- Wallet & Payments.
- Models & Pricing.
- API Keys.
- IDE & CLI Integration.
- API Errors.
- Troubleshooting.

Fitur:
- Pencarian artikel.
- Artikel terkait.
- Feedback artikel membantu/tidak.
- Form kontak atau tiket dukungan.
- Nomor tiket dan status penanganan.
- Lampiran hanya jika aman dan dibutuhkan.

### 6.12 Blog, Changelog, Status Page

Blog categories:
- Product Updates.
- Model Updates.
- AI News.
- Tutorials.
- Model Comparisons.

Blog memerlukan tanggal publikasi, kategori, author, waktu baca, gambar cover, SEO metadata, dan artikel terkait.

Changelog mencatat versi, tanggal, fitur baru, perbaikan, dan perubahan yang berdampak pada API/billing.

Status page menampilkan status Website, API Gateway, Authentication, Wallet/Payments, Model Catalog, dan upstream provider dengan timestamp insiden.

### 6.13 Admin Dashboard

Fitur wajib:

- Ringkasan revenue, top-up, debit, margin, biaya upstream, request, error, saldo tertahan, dan pending reconciliation.
- User search, status akun, suspend/unsuspend dengan alasan.
- Model catalog sync, enable/disable, logo mapping, deskripsi, kategori, capability, budget eligibility.
- Endpoint/provider status dan refresh.
- Pricing policy, markup, FX snapshot, harga jual, effective date.
- Payment transactions dan webhook log.
- Ledger inspection tanpa mengubah transaksi historis.
- Upstream balance/credit/status jika upstream menyediakan endpoint/data tersebut.
- Usage/error monitoring.
- Support ticket management.
- Blog/Help Center content management.
- Admin audit log untuk setiap perubahan penting.

Admin tidak boleh mengedit debit historis secara langsung. Koreksi dilakukan dengan ledger adjustment baru yang memiliki alasan, aktor, dan referensi.

---


## 7. Kontrak Integrasi Frontend–Backend

### 7.1 Prinsip
- Frontend hanya memanggil endpoint AzaleaRouter, bukan OpenRouter.
- Seluruh endpoint internal menggunakan base URL dari konfigurasi environment.
- Request dan response memakai TypeScript types dari kontrak OpenAPI atau package `shared`.
- Validasi frontend membantu pengalaman pengguna, tetapi backend tetap melakukan validasi otoritatif.
- Semua error menampilkan pesan aman dan `request_id` bila tersedia.
- API key hanya ditangani pada layar pembuatan/reveal satu kali dan tidak dimasukkan ke telemetry.

### 7.2 Data yang wajib diterima dari backend

| Data | Tanggung jawab backend | Tampilan frontend |
|---|---|---|
| Model catalog | ID kanonis, nama, developer, logo, status, capability | Kartu, filter, detail |
| Pricing | Harga snapshot, mata uang, unit, waktu berlaku | Harga input/output dan kalkulator |
| Endpoint | Daftar endpoint aktual dan status terverifikasi | Auto/manual provider selector |
| Wallet | Saldo tersedia dan tertahan | Wallet cards |
| Usage | Token, biaya komponen, status settlement | Grafik dan detail request |
| Model color | Warna persisten per user-model | Legend, chart, tabel |
| API key | Masked metadata dan secret saat create sekali | API key management |
| Payment | Status payment yang sudah diverifikasi | Top-up timeline |

### 7.3 Aturan finansial UI
- Angka saldo final selalu berasal dari response snapshot backend atau event setelah commit.
- Angka selama request berjalan diberi label `Estimasi` atau `Provisional`.
- Debit final hanya ditampilkan setelah settlement berhasil.
- UI membedakan saldo tersedia dengan saldo tertahan.
- Jangan optimistic-update saldo sebagai angka final sebelum backend mengonfirmasi.
- Saat koneksi real-time putus, UI menandai data stale/reconnecting dan mengambil snapshot terbaru.

### 7.4 Streaming chat
- AI Chat menggunakan stream dari backend; browser tidak berkomunikasi langsung ke upstream.
- Tampilkan state connecting, streaming, completed, failed, cancelled, dan interrupted.
- Jika stream terputus, tampilkan request ID dan opsi retry yang aman. Jangan retry otomatis tanpa idempotency semantics yang jelas.
- Tampilkan token dan biaya final setelah data settlement diterima.

### 7.5 Real-time dashboard
- SSE merupakan pilihan awal untuk update server-to-browser.
- Frontend memproses event wallet, usage, payment, catalog, dan notification yang didefinisikan backend.
- Event ID/cursor digunakan untuk reconnect jika didukung backend.
- Setelah reconnect, frontend meminta snapshot terkini sebelum menyatakan data live kembali.

## 8. Aturan UX Usage Analytics dan Warna Model

- Warna model dipilih secara random oleh service backend saat kombinasi user + canonical model pertama kali muncul.
- Frontend menerima `color_hex` dan tidak memilih ulang warna pada setiap render.
- Pengguna dapat membuka color picker dan mengubah warna; perubahan disimpan melalui API backend.
- Warna diterapkan konsisten pada donut chart, time series, stacked bar, legend, tooltip, dan tabel.
- Warna tidak mengikuti logo developer; DeepSeek tidak wajib hijau, Qwen tidak wajib merah, GPT tidak wajib biru.
- Nama model/label tetap ditampilkan; warna bukan satu-satunya penanda.
- Chart padat menyediakan toggle legend, tooltip, tabel alternatif, dan akses keyboard.

## 9. Struktur Aplikasi Frontend yang Disarankan

```text
apps/web/
  src/
    app/
      (marketing)/       # landing, models, pricing, docs, blog, help
      (auth)/            # login, register, reset password
      app/               # authenticated user dashboard
      admin/             # admin UI, role-protected
    components/
      layout/            # navbar, sidebar, footer
      ui/                # shared UI primitives
      charts/            # charts and legends
      forms/             # reusable forms
    features/
      auth/ catalog/ routing/ chat/ wallet/ usage/
      api-keys/ playground/ docs/ support/ admin/
    lib/
      api-client/        # typed backend client
      auth/ realtime/    # SSE client and reconnect
      formatters/        # IDR, date/time, token formatting
      telemetry/         # privacy-safe client telemetry
    styles/
      globals.css
      tokens.css
```

Aturan implementasi:
- Server Components untuk konten publik dan halaman yang cocok dirender di server.
- Client Components untuk interaksi, chart, form, stream, SSE, dan state lokal.
- Jangan memindahkan perhitungan billing ke browser.
- Cache browser/query client hanya untuk data aman dengan invalidation; wallet dan ledger tetap divalidasi backend.
- Halaman admin memerlukan pemeriksaan role di server dan backend; menyembunyikan menu saja tidak cukup.

## 10. Frontend Quality Requirements

### 10.1 Responsive behavior
- Desktop: sidebar dashboard terlihat; layout analitik multi-kolom.
- Tablet: sidebar dapat collapse; tabel kompleks memiliki horizontal scroll terkontrol.
- Mobile: navigasi menjadi drawer/bottom navigation sesuai kebutuhan; auth dan wallet menjadi prioritas; chart dapat berganti ke list/table.

### 10.2 Accessibility
- Target WCAG 2.2 AA.
- Semua fungsi dapat digunakan dengan keyboard.
- Focus indicator jelas.
- Form memiliki label dan pesan error yang terhubung.
- Kontras diuji di light dan dark mode.
- Status tidak hanya dibedakan menggunakan warna.
- Chart menyediakan ringkasan teks/tabel alternatif.

### 10.3 Performance
- Pagination/infinite loading untuk tabel panjang.
- Jangan mengambil seluruh usage history untuk satu render.
- Landing page mengutamakan LCP dan menghindari asset gambar terlalu besar.
- Logo memakai ukuran/format sesuai dan lazy loading bila tepat.
- Chart menggunakan aggregate API untuk dataset besar.
- Skeleton dan reserved layout space mencegah layout shift.

### 10.4 UI states
Setiap feature utama wajib mendefinisikan initial/loading, empty, success, validation error, API/server error, offline/reconnecting, disabled/permission denied, dan stale data state.

## 11. Frontend Testing dan Acceptance

### 11.1 Component/unit tests
- Theme tokens dan light/dark consistency.
- Form validation dan password visibility.
- API error mapping.
- IDR/date/token formatters.
- Model color rendering dan manual color change UI.
- Chart legend, filter, tooltip, keyboard access.
- Loading/empty/error/offline states.

### 11.2 Integration/E2E tests
- Landing page CTA → register.
- Login/register menampilkan response Turnstile/backend.
- Browse model → filter → detail → provider selector.
- API key dibuat → secret tampil satu kali → list menampilkan masked value.
- Top-up hanya berubah menjadi paid ketika backend mengonfirmasi.
- Chat stream complete/error/cancel.
- Usage filters mengubah chart/table sesuai response backend.
- Warna random tetap sama setelah refresh, login ulang, dan perubahan periode.
- Warna manual tersimpan setelah reload.
- SSE disconnect/reconnect memicu snapshot refresh.
- User tanpa role tidak dapat membuka halaman admin.

### 11.3 Frontend Definition of Done
- Semua halaman pada sitemap yang masuk milestone telah tersedia.
- Semua state UI penting diuji.
- API client menggunakan kontrak type-safe.
- Tidak ada secret upstream/payment di bundle browser.
- Tidak ada perhitungan debit final di frontend.
- Responsif, aksesibel, tanpa critical console error.
- E2E utama lulus pada staging.

## 12. Tahapan Implementasi Frontend

| Tahap | Pekerjaan frontend | Ketergantungan backend |
|---|---|---|
| FE-0 | Design tokens, komponen, layout shell, responsive baseline | Kontrak theme dan asset brand |
| FE-1 | Landing, login, register, reset password | Auth API, session, Turnstile verification |
| FE-2 | Marketplace, model detail, endpoint selector | Catalog, pricing, endpoint APIs |
| FE-3 | Dashboard overview dan wallet UI | Wallet snapshot, payment intent/status |
| FE-4 | API keys dan playground | Key management, gateway, model catalog |
| FE-5 | AI Chat umum/coding + streaming UI | Chat gateway dan streaming contract |
| FE-6 | Usage analytics, chart warna persisten, SSE | Usage aggregates, color preference API, event stream |
| FE-7 | Docs, Help Center, Blog, Changelog, Status | CMS/content/status APIs |
| FE-8 | Admin UI dan hardening | Admin APIs, RBAC, audit log |
| FE-9 | Accessibility, performance, responsive, E2E, polish | Staging API stabil |

Frontend dapat dikerjakan paralel dengan backend, tetapi integrasi hanya selesai bila kontrak API staging tersedia dan E2E lulus.

## 13. Future Phases yang Menggunakan Akun yang Sama

- CLI akan memakai akun, API key, wallet, model catalog, serta usage source `CLI`.
- IDE AzaleaRouter akan memakai akun dan layanan backend yang sama, tetapi mempunyai UI/editor/agent workflow sendiri.
- Website Phase 1 menyediakan dokumentasi integrasi dan pengelolaan penggunaan lintas sumber, bukan IDE/CLI penuh.

## 14. Hubungan Dokumen

- Backend source of truth dan API contract: `AzaleaRouter-PRD-Backend-v0.3.md`.
- Ikhtisar produk dan dependency: `AzaleaRouter-PRD-Index-v0.3.md`.
- Dokumen gabungan v0.2 adalah arsip historis.
