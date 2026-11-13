"use client";

import { useState } from "react";
import { api } from "@/components/shared/api";
import { useApiData } from "@/components/shared/hooks";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/form";
import { Switch } from "@/components/ui/form";
import { DemoBadge, DemoNote, ErrorState, Skeleton } from "@/components/ui/feedback";
import { useToast } from "@/components/ui/toast";
import { formatDateTime } from "@/lib/formatters";

export function SecurityClient() {
  const { toast } = useToast();
  const state = useApiData(() => api.settings.getSecurity(), []);
  const [twoFactor, setTwoFactor] = useState<boolean | null>(null);
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  const effective2fa = twoFactor ?? state.data?.twoFactorEnabled ?? false;

  async function changePassword(event: React.FormEvent) {
    event.preventDefault();
    const nextErrors: Record<string, string> = {};
    if (!current) nextErrors.current = "Password saat ini wajib diisi.";
    if (!next) nextErrors.next = "Password baru wajib diisi.";
    else if (next.length < 8) nextErrors.next = "Password baru minimal 8 karakter.";
    if (confirm !== next) nextErrors.confirm = "Konfirmasi tidak sama.";
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;
    setSaving(true);
    const res = await api.settings.changePassword({ currentPassword: current, newPassword: next });
    setSaving(false);
    if (res.ok) {
      setCurrent("");
      setNext("");
      setConfirm("");
      toast({ title: "Password diganti (simulasi)", description: res.data.message, tone: "primary" });
    } else {
      toast({ title: "Gagal mengganti password", description: res.error.message, tone: "danger" });
    }
  }

  return (
    <div>
      <PageHeader
        title="Keamanan"
        description="Pengaturan keamanan akun. Semua aksi di halaman ini disimulasikan."
        actions={<DemoBadge label="Simulasi" />}
      />

      {state.loading && !state.data ? (
        <Card className="p-6">
          <div className="space-y-4" aria-hidden="true">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-40 w-full" />
          </div>
        </Card>
      ) : state.error ? (
        <ErrorState description={state.error} onRetry={state.reload} />
      ) : state.data ? (
        <div className="space-y-6">
          <Card>
            <CardHeader title="Status keamanan" />
            <CardContent className="space-y-4">
              <Switch
                checked={effective2fa}
                onChange={(v) => {
                  setTwoFactor(v);
                  toast({
                    title: "Simulasi",
                    description: `Two-factor authentication ${v ? "diaktifkan" : "dinonaktifkan"} secara lokal — tidak mengubah keamanan nyata.`,
                    tone: "primary",
                  });
                }}
                label="Two-factor authentication (2FA)"
                description="Pada produk final, 2FA diverifikasi backend."
              />
              <div className="flex items-center justify-between border-t border-line pt-4 text-[13px]">
                <span className="text-muted">Sesi aktif</span>
                <span className="font-medium text-ink">{state.data.activeSessions} sesi (demo)</span>
              </div>
              <div className="flex items-center justify-between text-[13px]">
                <span className="text-muted">Password terakhir diganti</span>
                <span className="font-medium text-ink">
                  {state.data.lastPasswordChangeAt ? formatDateTime(state.data.lastPasswordChangeAt) : "Belum pernah"}
                </span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader title="Ganti password" description="Validasi di sisi browser; perubahan disimulasikan." />
            <CardContent>
              <form onSubmit={changePassword} noValidate className="max-w-md space-y-4">
                <Field label="Password saat ini" required error={errors.current}>
                  {({ id, describedBy, invalid }) => (
                    <Input id={id} type="password" autoComplete="current-password" value={current} invalid={invalid} aria-describedby={describedBy} onChange={(e) => setCurrent(e.target.value)} />
                  )}
                </Field>
                <Field label="Password baru" required error={errors.next} hint="Minimal 8 karakter.">
                  {({ id, describedBy, invalid }) => (
                    <Input id={id} type="password" autoComplete="new-password" value={next} invalid={invalid} aria-describedby={describedBy} onChange={(e) => setNext(e.target.value)} />
                  )}
                </Field>
                <Field label="Konfirmasi password baru" required error={errors.confirm}>
                  {({ id, describedBy, invalid }) => (
                    <Input id={id} type="password" autoComplete="new-password" value={confirm} invalid={invalid} aria-describedby={describedBy} onChange={(e) => setConfirm(e.target.value)} />
                  )}
                </Field>
                <Button type="submit" loading={saving}>
                  Ganti password
                </Button>
              </form>
              <DemoNote className="mt-4">
                Password tidak pernah dicatat ke log. Pada produk final, penggantian diverifikasi
                backend dengan hash yang aman.
              </DemoNote>
            </CardContent>
          </Card>
        </div>
      ) : null}
    </div>
  );
}
