"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { api } from "@/components/shared/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Field, Input, Checkbox } from "@/components/ui/form";
import { DemoNote } from "@/components/ui/feedback";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [apiError, setApiError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState<{ message: string; nextStep: string } | null>(null);

  function validate(): boolean {
    const next: Record<string, string> = {};
    if (!email.trim()) next.email = "Email wajib diisi.";
    else if (!EMAIL_RE.test(email.trim())) next.email = "Format email belum valid.";
    if (!password) next.password = "Password wajib diisi.";
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setApiError(null);
    if (!validate()) return;
    setLoading(true);
    const res = await api.auth.login({ email: email.trim(), password, turnstileToken: "demo-token-not-verified" });
    setLoading(false);
    if (res.ok) {
      if (res.data.nextStep === "dashboard") {
        setSuccess({ message: res.data.message, nextStep: res.data.nextStep });
      } else {
        setSuccess({ message: res.data.message, nextStep: res.data.nextStep });
      }
    } else {
      setApiError(res.error.message);
      if (res.error.fieldErrors) setErrors(res.error.fieldErrors);
    }
  }

  if (success) {
    return (
      <Card>
        <CardContent className="space-y-4 p-6 text-center">
          <span aria-hidden="true" className="mx-auto flex size-12 items-center justify-center rounded-full bg-teal-soft text-teal">
            <svg viewBox="0 0 20 20" className="size-6" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="m4 10.5 4 4 8-9" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </span>
          <h1 className="text-xl font-semibold tracking-tight text-ink">Login berhasil (simulasi)</h1>
          <p className="text-sm leading-6 text-muted">{success.message}</p>
          <div className="flex justify-center gap-3 pt-2">
            <Button onClick={() => router.push("/app/overview")}>Buka dashboard demo</Button>
            <Link
              href="/"
              className="inline-flex h-10 items-center rounded-control px-4 text-sm font-medium text-muted hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              Ke beranda
            </Link>
          </div>
          <DemoNote>Sesi demo tidak menerbitkan token nyata — role switching hanya alat navigasi.</DemoNote>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight text-ink">Masuk ke AzaleaRouter</h1>
        <p className="text-sm text-muted">
          Belum punya akun?{" "}
          <Link href="/register" className="font-medium text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
            Daftar
          </Link>
        </p>
      </header>

      <Card>
        <CardContent className="p-6">
          <form onSubmit={onSubmit} noValidate className="space-y-4">
            {apiError ? (
              <p role="alert" className="rounded-control border border-danger/40 bg-danger-soft px-3 py-2.5 text-[13px] font-medium text-danger">
                {apiError}
              </p>
            ) : null}

            <Field label="Email" required error={errors.email}>
              {({ id, describedBy, invalid }) => (
                <Input
                  id={id}
                  type="email"
                  autoComplete="email"
                  placeholder="nama@contoh.id"
                  value={email}
                  invalid={invalid}
                  aria-describedby={describedBy}
                  onChange={(e) => setEmail(e.target.value)}
                />
              )}
            </Field>

            <Field label="Password" required error={errors.password}>
              {({ id, describedBy, invalid }) => (
                <span className="relative block">
                  <Input
                    id={id}
                    type={showPassword ? "text" : "password"}
                    autoComplete="current-password"
                    value={password}
                    invalid={invalid}
                    aria-describedby={describedBy}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pr-16"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    aria-pressed={showPassword}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded px-1.5 py-1 text-xs font-medium text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    {showPassword ? "Sembunyikan" : "Tampilkan"}
                  </button>
                </span>
              )}
            </Field>

            <div className="flex items-center justify-between gap-3">
              <Checkbox label="Ingat saya" disabled />
              <Link
                href="/forgot-password"
                className="text-[13px] font-medium text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                Lupa password?
              </Link>
            </div>

            {/* Turnstile placeholder — never represented as server-verified */}
            <div className="flex items-center gap-3 rounded-control border border-dashed border-line-strong bg-surface-2/60 px-4 py-3.5">
              <span aria-hidden="true" className="flex size-8 items-center justify-center rounded-control bg-surface text-muted">
                <svg viewBox="0 0 20 20" className="size-4.5" fill="none" stroke="currentColor" strokeWidth="1.6">
                  <path d="M10 3a7 7 0 1 0 7 7" strokeLinecap="round" />
                  <path d="M10 6.5A3.5 3.5 0 1 0 13.5 10" strokeLinecap="round" />
                </svg>
              </span>
              <div>
                <p className="text-[13px] font-medium text-ink">Cloudflare Turnstile</p>
                <p className="text-xs text-muted">Placeholder demo — tidak memverifikasi server.</p>
              </div>
            </div>

            <Button type="submit" loading={loading} className="w-full" size="lg">
              Masuk
            </Button>

            <p className="text-center text-xs text-muted">
              Dengan masuk, kamu menyetujui{" "}
              <Link href="/terms" className="text-primary hover:underline">Terms of Service</Link> dan{" "}
              <Link href="/privacy" className="text-primary hover:underline">Privacy Policy</Link> (placeholder demo).
            </p>
          </form>
        </CardContent>
      </Card>

      <DemoNote>
        Login disimulasikan di browser — kredensial apa pun dengan format valid diterima demo dan
        tidak mengembalikan sesi nyata.
      </DemoNote>
    </div>
  );
}
