import type { DemoSession } from "@/lib/api-client/contracts/auth";

export const DEMO_USER_SESSION: DemoSession = {
  demo: true,
  simulated: true,
  role: "user",
  displayName: "Rani Demo",
  email: "rani@demo.test",
  sessionToken: null,
};

export const DEMO_ADMIN_SESSION: DemoSession = {
  demo: true,
  simulated: true,
  role: "admin",
  displayName: "Admin Demo",
  email: "admin@demo.test",
  sessionToken: null,
};

export const DEMO_AUTH_MESSAGES = {
  login:
    "Login disimulasikan. Tidak ada autentikasi nyata, sesi nyata, atau verifikasi Turnstile.",
  register:
    "Registrasi disimulasikan. Tidak ada akun nyata yang dibuat dan tidak ada email verifikasi yang dikirim.",
  reset:
    "Reset password disimulasikan. Tidak ada email yang dikirim dan tidak ada password yang diubah.",
} as const;
