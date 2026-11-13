import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import type { ReactNode } from "react";
import { ToastProvider } from "@/components/ui/toast";
import { DEMO_DATA_NOTICE } from "@/lib/api-client";
import "@/styles/globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  // metadataBase intentionally omitted until the production domain is confirmed.
  title: {
    default: "AzaleaRouter — Satu API untuk banyak model AI",
    template: "%s · AzaleaRouter",
  },
  description:
    "Demo frontend AzaleaRouter: gateway API AI dengan satu akun, satu API key, dan saldo Rupiah. Seluruh data bersifat ilustratif.",
  openGraph: {
    title: "AzaleaRouter — Satu API untuk banyak model AI",
    description: DEMO_DATA_NOTICE,
    type: "website",
    locale: "id_ID",
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f7f8fc" },
    { media: "(prefers-color-scheme: dark)", color: "#111420" },
  ],
};

/** Applies the stored (non-secret) theme before first paint to avoid FOUC. */
const THEME_BOOTSTRAP = `(function(){try{var t=localStorage.getItem("azr-theme");var d=t==="dark"||((!t||t==="system")&&window.matchMedia("(prefers-color-scheme: dark)").matches);document.documentElement.classList.toggle("dark",d);}catch(e){}})();`;

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="id" className={inter.variable} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_BOOTSTRAP }} />
      </head>
      <body>
        <ToastProvider>
          <a
            href="#konten-utama"
            className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[70] focus:rounded-control focus:bg-primary focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:text-on-primary"
          >
            Lewati ke konten utama
          </a>
          {children}
        </ToastProvider>
      </body>
    </html>
  );
}
