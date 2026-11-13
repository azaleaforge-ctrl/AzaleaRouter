import type {
  ChangelogEntry,
  ContentArticle,
  ContentArticleSummary,
  DocSection,
  StatusSnapshot,
} from "@/lib/api-client/contracts/content";

function article(
  slug: string,
  title: string,
  excerpt: string,
  category: string,
  updatedAt: string,
  readingMinutes: number,
  body: string[],
  relatedSlugs: string[] = [],
): ContentArticle {
  return {
    slug,
    title,
    excerpt,
    category,
    updatedAt,
    readingMinutes,
    body,
    relatedSlugs,
    demo: true,
  };
}

export function toArticleSummary(articleItem: ContentArticle): ContentArticleSummary {
  return {
    slug: articleItem.slug,
    title: articleItem.title,
    excerpt: articleItem.excerpt,
    category: articleItem.category,
    updatedAt: articleItem.updatedAt,
    readingMinutes: articleItem.readingMinutes,
    demo: true,
  };
}

export const DEMO_DOC_ARTICLES: readonly ContentArticle[] = [
  article(
    "quickstart",
    "Quickstart API demo",
    "Langkah awal memanggil endpoint demo dengan API key yang tidak dapat digunakan.",
    "Getting Started",
    "2026-11-10T00:00:00.000Z",
    4,
    [
      "Halaman ini adalah dokumentasi demo. Base URL, API key, dan respons di bawah ini bukan layanan nyata dan tidak boleh dipakai untuk produksi.",
      "Buat API key demo dari halaman API Keys. Token yang ditampilkan sengaja tidak dapat digunakan untuk autentikasi ke layanan mana pun.",
      "Kirim request contoh ke endpoint demo. Tidak ada permintaan yang diteruskan ke OpenRouter atau penyedia model.",
    ],
    ["chat-completions", "streaming"],
  ),
  article(
    "account-setup",
    "Menyiapkan akun demo",
    "Ringkasan alur registrasi dan login yang seluruhnya disimulasikan.",
    "Getting Started",
    "2026-11-09T00:00:00.000Z",
    3,
    [
      "Registrasi demo tidak membuat akun nyata dan tidak mengirim email verifikasi.",
      "Login demo tidak membuat sesi nyata. Pemilihan peran hanya untuk navigasi layar demo.",
    ],
    ["quickstart"],
  ),
  article(
    "wallet-topup",
    "Wallet dan top-up demo",
    "Cara membaca saldo, saldo tertahan, dan status top-up simulasi.",
    "Account, Wallet, dan API Key",
    "2026-11-11T00:00:00.000Z",
    5,
    [
      "Saldo yang tampil adalah fixture ilustratif. Tidak ada ledger, pembayaran, atau kredit saldo nyata.",
      "Top-up demo tidak membuat payment intent nyata. Status pembayaran tidak boleh dianggap sebagai konfirmasi.",
      "Angka provisional dan final dibedakan secara tekstual pada layar demo.",
    ],
    ["api-keys", "wallet-payments"],
  ),
  article(
    "api-keys",
    "API key demo",
    "Membuat, menyamarkan, mencabut, dan merotasi key demo.",
    "Account, Wallet, dan API Key",
    "2026-11-11T00:00:00.000Z",
    4,
    [
      "Key demo memakai awalan AZL- dan diberi penanda DEMO agar terlihat jelas sebagai nilai palsu.",
      "Secret penuh hanya ditampilkan sekali pada layar simulasi. Daftar key hanya menampilkan bentuk tersamarkan.",
      "Rotasi dan pencabutan tidak mengubah layanan nyata dan tidak menulis audit log nyata.",
    ],
    ["quickstart", "api-keys-help"],
  ),
  article(
    "chat-completions",
    "Chat Completions demo",
    "Bentuk request dan respons chat yang dipakai oleh mock adapter.",
    "API",
    "2026-11-12T00:00:00.000Z",
    6,
    [
      "Contoh request di halaman ini hanya menggambarkan kontrak yang diharapkan. Mock adapter tidak mengirim request jaringan.",
      "Respons chat demo memuat status, token, dan estimasi biaya yang seluruhnya ilustratif.",
    ],
    ["streaming", "errors"],
  ),
  article(
    "streaming",
    "Streaming dan pembatalan demo",
    "Perilaku stream lokal, pembatalan, dan pemulihan setelah gangguan.",
    "API",
    "2026-11-12T00:00:00.000Z",
    5,
    [
      "Stream demo mengirim potongan teks dari fixture lokal. Tidak ada koneksi SSE atau upstream.",
      "Pembatalan menghentikan iterasi stream. Gangguan stream menghasilkan event interrupted dengan opsi retry yang aman.",
    ],
    ["chat-completions", "errors"],
  ),
  article(
    "errors",
    "Error dan troubleshooting demo",
    "Kode error aman yang dipakai oleh mock adapter.",
    "API",
    "2026-11-10T00:00:00.000Z",
    4,
    [
      "Error demo tidak memuat stack trace, secret, atau payload upstream.",
      "Kode OFFLINE dan UPSTREAM_UNAVAILABLE bersifat retryable. VALIDATION_ERROR memuat field error yang aman.",
    ],
    ["streaming"],
  ),
  article(
    "ide-vscode",
    "Integrasi IDE demo",
    "Panduan tampilan untuk integrasi IDE yang belum diuji terhadap aplikasi nyata.",
    "Integrations",
    "2026-11-08T00:00:00.000Z",
    5,
    [
      "Panduan ini hanya contoh tampilan. Tidak ada integrasi IDE yang diverifikasi atau didukung secara resmi.",
      "Jangan memasukkan API key nyata ke contoh konfigurasi demo.",
    ],
    ["cli-azalea", "api-keys"],
  ),
  article(
    "cli-azalea",
    "CLI demo",
    "Contoh perintah CLI yang tidak dijalankan oleh aplikasi demo.",
    "Integrations",
    "2026-11-08T00:00:00.000Z",
    4,
    [
      "Perintah pada halaman ini adalah ilustrasi. Tidak ada paket CLI yang diterbitkan atau diuji.",
      "Gunakan hanya token demo yang tidak dapat digunakan untuk autentikasi.",
    ],
    ["ide-vscode", "quickstart"],
  ),
];

export const DEMO_DOC_SECTIONS: readonly DocSection[] = [
  {
    slug: "getting-started",
    title: "Getting Started",
    description: "Langkah awal menggunakan demo AzaleaRouter.",
    articles: DEMO_DOC_ARTICLES.filter((item) =>
      ["quickstart", "account-setup"].includes(item.slug),
    ).map(toArticleSummary),
  },
  {
    slug: "account-wallet",
    title: "Account, Wallet, dan API Key",
    description: "Saldo, top-up, dan pengelolaan key demo.",
    articles: DEMO_DOC_ARTICLES.filter((item) =>
      ["wallet-topup", "api-keys"].includes(item.slug),
    ).map(toArticleSummary),
  },
  {
    slug: "api",
    title: "API",
    description: "Kontrak chat, streaming, dan error demo.",
    articles: DEMO_DOC_ARTICLES.filter((item) =>
      ["chat-completions", "streaming", "errors"].includes(item.slug),
    ).map(toArticleSummary),
  },
  {
    slug: "integrations",
    title: "Integrations",
    description: "Contoh panduan IDE dan CLI yang belum diverifikasi.",
    articles: DEMO_DOC_ARTICLES.filter((item) =>
      ["ide-vscode", "cli-azalea"].includes(item.slug),
    ).map(toArticleSummary),
  },
];

export const DEMO_HELP_ARTICLES: readonly ContentArticle[] = [
  article(
    "account-security",
    "Keamanan akun demo",
    "Langkah yang ditampilkan untuk keamanan akun, tanpa autentikasi nyata.",
    "Account & Security",
    "2026-11-09T00:00:00.000Z",
    3,
    [
      "Demo tidak menyimpan password, sesi, atau kredensial nyata.",
      "Aktifkan 2FA pada layar demo hanya untuk melihat status simulasi.",
    ],
    ["api-keys-help"],
  ),
  article(
    "wallet-payments",
    "Wallet dan pembayaran demo",
    "Mengapa status top-up demo tidak boleh dianggap sebagai pembayaran sukses.",
    "Wallet & Payments",
    "2026-11-10T00:00:00.000Z",
    4,
    [
      "Tidak ada payment gateway, webhook, atau ledger nyata pada demo ini.",
      "Status pending, gagal, dan kedaluwarsa hanya menggambarkan tampilan UI.",
    ],
    ["wallet-topup"],
  ),
  article(
    "models-pricing",
    "Model dan harga demo",
    "Cara membaca harga per 1 juta token pada katalog ilustratif.",
    "Models & Pricing",
    "2026-11-11T00:00:00.000Z",
    4,
    [
      "Nama model, pengembang, dan harga pada demo adalah fiksi. Tidak ada klaim ketersediaan atau harga nyata.",
      "Harga selalu ditampilkan dengan unit per 1 juta token dan tanggal snapshot fixture.",
    ],
    ["api-errors"],
  ),
  article(
    "api-keys-help",
    "Bantuan API key demo",
    "Key demo tidak dapat digunakan dan tidak disimpan sebagai plaintext.",
    "API Keys",
    "2026-11-11T00:00:00.000Z",
    3,
    [
      "Token demo memakai penanda DEMO dan NOT-A-REAL-KEY.",
      "Jika token demo bocor, tidak ada akses nyata yang dapat diperoleh.",
    ],
    ["account-security", "api-keys"],
  ),
  article(
    "api-errors",
    "Mengatasi error API demo",
    "Arti kode error dan kapan aman mencoba lagi.",
    "API Errors",
    "2026-11-10T00:00:00.000Z",
    4,
    [
      "Error demo selalu aman untuk ditampilkan dan tidak memuat detail internal.",
      "Coba lagi hanya untuk kode yang ditandai retryable. Validasi form harus diperbaiki lebih dulu.",
    ],
    ["errors", "models-pricing"],
  ),
];

export const DEMO_BLOG_POSTS: readonly ContentArticle[] = [
  article(
    "product-update-demo",
    "Pembaruan produk demo",
    "Ringkasan perubahan tampilan demo, bukan pengumuman rilis nyata.",
    "Product Updates",
    "2026-11-12T00:00:00.000Z",
    4,
    [
      "Artikel ini adalah konten demo. Tidak ada fitur produksi yang dirilis.",
      "Perubahan pada demo hanya memengaruhi fixture dan tampilan lokal.",
    ],
    ["model-update-demo"],
  ),
  article(
    "model-update-demo",
    "Pembaruan katalog model demo",
    "Contoh artikel perubahan katalog yang seluruhnya fiktif.",
    "Model Updates",
    "2026-11-10T00:00:00.000Z",
    3,
    [
      "Model dan pengembang pada artikel ini adalah fiksi untuk menguji tata letak.",
      "Tidak ada model nyata yang ditambahkan atau dihapus.",
    ],
    ["product-update-demo"],
  ),
  article(
    "tutorial-streaming",
    "Tutorial streaming demo",
    "Contoh artikel tutorial untuk perilaku stream lokal.",
    "Tutorials",
    "2026-11-08T00:00:00.000Z",
    6,
    [
      "Tutorial ini menjelaskan cara UI menampilkan event stream demo.",
      "Tidak ada koneksi jaringan atau upstream yang dibuat.",
    ],
    ["comparison-demo"],
  ),
  article(
    "comparison-demo",
    "Perbandingan model demo",
    "Contoh perbandingan model fiktif tanpa klaim performa.",
    "Model Comparisons",
    "2026-11-06T00:00:00.000Z",
    5,
    [
      "Perbandingan pada artikel ini hanya menguji komponen tabel dan kartu.",
      "Tidak ada benchmark, klaim kecepatan, atau klaim kualitas model nyata.",
    ],
    ["tutorial-streaming"],
  ),
];

export const DEMO_STATUS: StatusSnapshot = {
  overall: "degraded",
  components: [
    {
      id: "website",
      name: "Website",
      status: "operational",
      description: "Status demo untuk halaman publik.",
      updatedAt: "2026-11-13T08:50:00.000Z",
    },
    {
      id: "api-gateway",
      name: "API Gateway",
      status: "operational",
      description: "Status demo untuk gateway. Tidak ada gateway nyata.",
      updatedAt: "2026-11-13T08:50:00.000Z",
    },
    {
      id: "authentication",
      name: "Authentication",
      status: "degraded",
      description: "Contoh status degraded untuk menguji tampilan.",
      updatedAt: "2026-11-13T08:45:00.000Z",
    },
    {
      id: "wallet-payments",
      name: "Wallet/Payments",
      status: "maintenance",
      description: "Contoh maintenance. Tidak ada pembayaran nyata.",
      updatedAt: "2026-11-13T08:40:00.000Z",
    },
    {
      id: "model-catalog",
      name: "Model Catalog",
      status: "operational",
      description: "Status demo untuk katalog ilustratif.",
      updatedAt: "2026-11-13T08:50:00.000Z",
    },
    {
      id: "upstream-providers",
      name: "Upstream Providers",
      status: "unknown",
      description: "Demo tidak terhubung ke penyedia upstream mana pun.",
      updatedAt: "2026-11-13T08:50:00.000Z",
    },
  ],
  incidents: [
    {
      id: "INC-DEMO-0001",
      title: "Contoh insiden autentikasi demo",
      status: "monitoring",
      startedAt: "2026-11-13T07:30:00.000Z",
      resolvedAt: null,
      summary:
        "Insiden ini fiktif dan hanya dipakai untuk menguji tampilan status. Tidak ada layanan nyata yang terdampak.",
    },
  ],
  updatedAt: "2026-11-13T08:50:00.000Z",
  simulated: true,
};

export const DEMO_CHANGELOG: readonly ChangelogEntry[] = [
  {
    version: "0.3.0-demo",
    date: "2026-11-12T00:00:00.000Z",
    title: "Fondasi demo frontend",
    changes: [
      { type: "added", text: "Kontrak layanan bertipe dan mock adapter deterministik." },
      { type: "added", text: "Fixture katalog, wallet, usage, API key, chat, dan admin." },
      { type: "changed", text: "Semua data finansial diberi label simulasi." },
    ],
    demo: true,
  },
  {
    version: "0.2.0-demo",
    date: "2026-11-05T00:00:00.000Z",
    title: "Contoh pembaruan katalog",
    changes: [
      { type: "added", text: "Contoh model fiktif untuk menguji filter dan pencarian." },
      { type: "fixed", text: "Contoh perbaikan tampilan harga per 1 juta token." },
    ],
    demo: true,
  },
  {
    version: "0.1.0-demo",
    date: "2026-10-28T00:00:00.000Z",
    title: "Awal demo",
    changes: [
      { type: "added", text: "Kerangka proyek Next.js dan halaman fondasi." },
      { type: "security", text: "Tidak ada secret nyata yang disimpan pada fixture." },
    ],
    demo: true,
  },
];
