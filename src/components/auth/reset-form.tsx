"use client";

import Link from "next/link";
import { useState } from "react";
import { api } from "@/components/shared/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Field, Input } from "@/components/ui/form";
import { DemoNote } from "@/components/ui/feedback";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function ResetForm() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [apiError, setApiError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState<string | null>(null);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setApiError(null);
    if (!email.trim()) {
      setError("Email wajib diisi.");
      return;
    }
    if (!EMAIL_RE.test(email.trim())) {
      setError("Format email belum valid.");
      return;
    }
    setError(null);
    setLoading(true);
    const res = await api.auth.requestPasswordReset({ email: email.trim() });
    setLoading(false);
    if (res.ok) {
      setSent(res.data.message);
    } else {
      setApiError(res.error.message);
    }
  }

  if (sent) {
    return (
      <Card>
        <CardContent className="space-y-4 p-6 text-center">
          <span aria-hidden="true" className="mx-auto flex size-12 items-center justify-center rounded-full bg-primary-soft text-primary">
            <svg viewBox="0 0 20 20" className="size-6" fill="none" stroke="currentColor" strokeWidth="1.7">
              <path d="M4 5h12v10H4zM4 6l8 6 8-6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </span>
          <h1 className="text-xl font-semibold tracking-tight text-ink">Periksa email kamu (simulasi)</h1>
          <p className="text-sm leading-6 text-muted">{sent}</p>
          <div className="pt-2">
            <Link href="/login" className="inline-flex h-10 items-center rounded-control bg-primary px-4 text-sm font-medium text-on-primary hover:bg-primary-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
              Kembali ke masuk
            </Link>
          </div>
          <DemoNote>
            Pesan sengaja generik agar tidak membocorkan apakah email terdaftar. Tidak ada email
            nyata yang dikirim di demo ini.
          </DemoNote>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight text-ink">Reset password</h1>
        <p className="text-sm text-muted">
          Masukkan email terdaftar dan kami akan mengirim tautan reset (disimulasikan).
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
            <Field label="Email" required error={error}>
              {({ id, describedBy, invalid }) => (
                <Input
                  id={id}
                  type="email"
                  autoComplete="email"
                  value={email}
                  invalid={invalid}
                  aria-describedby={describedBy}
                  onChange={(e) => setEmail(e.target.value)}
                />
              )}
            </Field>
            <Button type="submit" loading={loading} className="w-full" size="lg">
              Kirim tautan reset
            </Button>
          </form>
        </CardContent>
      </Card>

      <p className="text-center text-sm text-muted">
        Ingat password-mu?{" "}
        <Link href="/login" className="font-medium text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
          Masuk
        </Link>
      </p>
    </div>
  );
}
