import type {
  NotificationItem,
  SecuritySettings,
  UserPreferences,
  UserProfile,
} from "@/lib/api-client/contracts/settings";

export const DEMO_PROFILE: UserProfile = {
  id: "USR-DEMO-0001",
  name: "Rani Demo",
  email: "rani@demo.test",
  company: "Azalea Demo Workspace",
  timezone: "Asia/Jakarta",
  locale: "id-ID",
  avatarInitials: "RD",
  demo: true,
};

export const DEMO_PREFERENCES: UserPreferences = {
  theme: "light",
  language: "id",
  currencyDisplay: "IDR",
  reducedMotion: false,
  defaultModelId: "aurora-labs/azalea-chat-1",
  demo: true,
};

export const DEMO_SECURITY: SecuritySettings = {
  twoFactorEnabled: false,
  activeSessions: 1,
  lastPasswordChangeAt: "2026-10-01T09:00:00.000Z",
  demo: true,
};

export const DEMO_NOTIFICATIONS: readonly NotificationItem[] = [
  {
    id: "NOTIF-DEMO-0001",
    title: "Saldo demo diperbarui",
    body: "Snapshot saldo ilustratif dimuat ulang. Tidak ada transaksi nyata.",
    createdAt: "2026-11-13T08:45:00.000Z",
    read: false,
    kind: "billing",
    demo: true,
  },
  {
    id: "NOTIF-DEMO-0002",
    title: "Pemakaian mendekati batas demo",
    body: "Contoh peringatan usage untuk menguji tampilan notifikasi.",
    createdAt: "2026-11-12T16:20:00.000Z",
    read: false,
    kind: "usage",
    demo: true,
  },
  {
    id: "NOTIF-DEMO-0003",
    title: "API key demo dicabut",
    body: "Key demo lama dicabut pada simulasi. Tidak ada akses nyata yang berubah.",
    createdAt: "2026-11-11T10:05:00.000Z",
    read: true,
    kind: "security",
    demo: true,
  },
  {
    id: "NOTIF-DEMO-0004",
    title: "Pembaruan tampilan demo",
    body: "Contoh pengumuman produk untuk menguji daftar notifikasi.",
    createdAt: "2026-11-09T09:00:00.000Z",
    read: true,
    kind: "product",
    demo: true,
  },
];
