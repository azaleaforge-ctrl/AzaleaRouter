import type { ApiKey } from "@/lib/api-client/contracts/api-keys";

export const DEMO_API_KEYS: readonly ApiKey[] = [
  {
    id: "KEY-DEMO-0001",
    label: "Produksi demo",
    maskedKey: "AZL-Ab12Cd34••••",
    status: "active",
    scopes: ["chat:write", "usage:read"],
    spendLimitIdr: 500_000,
    rateLimitPerMinute: 60,
    modelAllowlist: ["aurora-labs/azalea-chat-1"],
    lastUsedAt: "2026-11-13T08:40:00.000Z",
    createdAt: "2026-10-02T09:00:00.000Z",
    revokedAt: null,
    expiresAt: null,
    simulated: true,
  },
  {
    id: "KEY-DEMO-0002",
    label: "IDE demo",
    maskedKey: "AZL-Ef56Gh78••••",
    status: "active",
    scopes: ["chat:write"],
    spendLimitIdr: null,
    rateLimitPerMinute: 30,
    modelAllowlist: [],
    lastUsedAt: "2026-11-12T09:05:00.000Z",
    createdAt: "2026-10-18T14:30:00.000Z",
    revokedAt: null,
    expiresAt: "2027-01-18T14:30:00.000Z",
    simulated: true,
  },
  {
    id: "KEY-DEMO-0003",
    label: "Kunci lama demo",
    maskedKey: "AZL-Ij90Kl12••••",
    status: "revoked",
    scopes: ["chat:write"],
    spendLimitIdr: 100_000,
    rateLimitPerMinute: 10,
    modelAllowlist: [],
    lastUsedAt: "2026-10-20T11:00:00.000Z",
    createdAt: "2026-09-01T08:00:00.000Z",
    revokedAt: "2026-10-25T10:00:00.000Z",
    expiresAt: null,
    simulated: true,
  },
];

export const DEMO_API_KEY_WARNING =
  "Token demo ini tidak dapat digunakan untuk autentikasi nyata. Secret penuh hanya ditampilkan sekali di layar simulasi ini.";
