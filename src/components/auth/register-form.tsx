"use client";

import Link from "next/link";
import { useState } from "react";
import { api } from "@/components/shared/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Field, Input, Checkbox } from "@/components/ui/form";
import { DemoNote } from "@/components/ui/feedback";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function passwordScore(password: string): 0 | 1 | 2 | 3 {
  if (!password) return 0;
  let score = 0;
  if (password.length >= 8) score++;
  if (password.length >= 12 && /[A-Z]/.test(password) && /[0-9]/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password) && /[A-Za-z]/.test(password) && /[0-9]/.test(password)) score++;
  return Math.min(score, 3) as 0 | 1 | 2 | 3;
}

const STRENGTH_LABELS = ["Lemah", "Cukup", "Kuat", "Sangat kuat"] as const;
const STRENGTH_TONES = ["bg-danger", "bg-warning", "bg-teal-bright", "bg-teal"] as const;

export function RegisterForm() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [apiError, setApiError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);

  const score = passwordScore(password);

  function validate(): boolean {
    const next: Record<string, string> = {};
    if (!name.trim()) next.name = "Nama lengkap wajib diisi.";
    if (!email.trim()) next.email = "Email wajib diisi.";
    else if (!EMAIL_RE.test(email.trim())) next.email = "Format email belum valid.";
    if (!password) next.password = "Password wajib diisi.";
    else if (password.length < 8) next.password = "Password minimal 8 karakter.";
    if (confirm !== password) next.confirm = "Konfirmasi password tidak sama.";
    if (!acceptTerms) next.acceptTerms = "Kamu harus menyetujui Terms dan mengetahui Privacy Policy.";
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setApiError(null);
    if (!validate()) return;
    setLoading(true);
    const res = await api.auth.register({
      name: name.trim(),
      email: email.trim(),
      password,
      acceptTerms,
      turnstileToken: "demo-token-not-verified",
    });
    setLoading(false);
    if (res.ok) {
      setSuccess(res.data.message);
    } else {
      setApiError(res.error.message);
      if (res.error.fieldErrors) setErrors(res.error.fieldErrors);
    }
  }

  if (success) {
    return (
      <Card>
        <CardContent className="space-y-4 p-6 text-center">
          <span aria-hidden="true" className="mx-auto flex size-12 items-center justify-center rounded-full bg-primary-soft text-primary">
            <svg viewBox="0 0 20 20" className="size-6" fill="none" stroke="currentColor" strokeWidth="1.7">
              <path d="M4 5h12v10H4zM4 6l8 6 8-6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </span>
          <h1 className="text-xl font-semibold tracking-tight text-ink">Cek email kamu (simulasi)</h1>
          <p className="text-sm leading-6 text-muted">{success}</p>
          <div className="pt-2">
            <Link href="/login" className="inline-flex h-10 items-center rounded-control bg-primary px-4 text-sm font-medium text-on-primary hover:bg-primary-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
              Ke halaman masuk
            </Link>
          </div>
          <DemoNote>
            Verifikasi email disimulasikan — tidak ada email yang dikirim dan tidak ada akun nyata
            yang dibuat.
          </DemoNote>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight text-ink">Buat akun demo</h1>
        <p className="text-sm text-muted">
          Sudah punya akun?{" "}
          <Link href="/login" className="font-medium text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
            Masuk
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

            <Field label="Nama lengkap" required error={errors.name}>
              {({ id, describedBy, invalid }) => (
                <Input id={id} autoComplete="name" value={name} invalid={invalid} aria-describedby={describedBy} onChange={(e) => setName(e.target.value)} />
              )}
            </Field>

            <Field label="Email" required error={errors.email}>
              {({ id, describedBy, invalid }) => (
                <Input id={id} type="email" autoComplete="email" value={email} invalid={invalid} aria-describedby={describedBy} onChange={(e) => setEmail(e.target.value)} />
              )}
            </Field>

            <Field label="Password" required error={errors.password} hint="Minimal 8 karakter. Gunakan kombinasi huruf, angka, dan simbol.">
              {({ id, describedBy, invalid }) => (
                <span className="block space-y-2">
                  <Input
                    id={id}
                    type="password"
                    autoComplete="new-password"
                    value={password}
                    invalid={invalid}
                    aria-describedby={describedBy}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                  <span aria-live="polite" className="flex items-center gap-2">
                    <span aria-hidden="true" className="flex flex-1 gap-1">
                      {[0, 1, 2].map((i) => (
                        <span
                          key={i}
                          className={`h-1 flex-1 rounded-full ${i < score ? STRENGTH_TONES[score] : "bg-line"}`}
                        />
                      ))}
                    </span>
                    <span className="w-20 text-right text-xs text-muted">
                      {password ? STRENGTH_LABELS[score] : ""}
                    </span>
                  </span>
                </span>
              )}
            </Field>

            <Field label="Konfirmasi password" required error={errors.confirm}>
              {({ id, describedBy, invalid }) => (
                <Input
                  id={id}
                  type="password"
                  autoComplete="new-password"
                  value={confirm}
                  invalid={invalid}
                  aria-describedby={describedBy}
                  onChange={(e) => setConfirm(e.target.value)}
                />
              )}
            </Field>

            <div>
              <Checkbox
                label={
                  <span>
                    Saya menyetujui{" "}
                    <Link href="/terms" className="font-medium text-primary hover:underline">Terms of Service</Link> dan
                    mengetahui{" "}
                    <Link href="/privacy" className="font-medium text-primary hover:underline">Privacy Policy</Link> (placeholder demo).
                  </span>
                }
                checked={acceptTerms}
                onChange={(e) => setAcceptTerms(e.target.checked)}
                aria-invalid={Boolean(errors.acceptTerms)}
              />
              {errors.acceptTerms ? (
                <p role="alert" className="mt-1.5 text-xs font-medium text-danger">
                  {errors.acceptTerms}
                </p>
              ) : null}
            </div>

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
              Buat akun
            </Button>
          </form>
        </CardContent>
      </Card>

      <DemoNote>
        Registrasi disimulasikan — persetujuan dokumen tidak dicatat sebagai bukti hukum dan
        verifikasi email tidak benar-benar dikirim.
      </DemoNote>
    </div>
  );
}
