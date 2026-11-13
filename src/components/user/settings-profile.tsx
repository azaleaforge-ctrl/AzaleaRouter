"use client";

import { useState } from "react";
import { api } from "@/components/shared/api";
import { useApiData } from "@/components/shared/hooks";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Field, Input, Select } from "@/components/ui/form";
import { DemoBadge, DemoNote, ErrorState, Skeleton } from "@/components/ui/feedback";
import { useToast } from "@/components/ui/toast";

const TIMEZONES = ["Asia/Jakarta", "Asia/Makassar", "Asia/Jayapura", "UTC"];

export function ProfileClient() {
  const { toast } = useToast();
  const state = useApiData(() => api.settings.getProfile(), []);
  const [name, setName] = useState("");
  const [company, setCompany] = useState("");
  const [timezone, setTimezone] = useState("Asia/Jakarta");
  const [saving, setSaving] = useState(false);

  // Sync form fields when fresh profile data arrives (render-time adjustment).
  const [syncedFrom, setSyncedFrom] = useState<typeof state.data>(null);
  if (state.data && state.data !== syncedFrom) {
    setSyncedFrom(state.data);
    setName(state.data.name);
    setCompany(state.data.company);
    setTimezone(state.data.timezone);
  }

  async function save() {
    setSaving(true);
    const res = await api.settings.updateProfile({ name: name.trim(), company: company.trim(), timezone });
    setSaving(false);
    if (res.ok) {
      state.setData(res.data);
      toast({ title: "Profil diperbarui (simulasi)", description: "Perubahan tersimpan pada data demo lokal.", tone: "primary" });
    } else {
      toast({ title: "Gagal menyimpan", description: res.error.message, tone: "danger" });
    }
  }

  return (
    <div>
      <PageHeader
        title="Profil"
        description="Informasi akun yang ditampilkan pada demo."
        actions={<DemoBadge label="Data demo" />}
      />

      {state.loading && !state.data ? (
        <Card className="p-6">
          <div className="space-y-4" aria-hidden="true">
            <Skeleton className="size-16 rounded-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        </Card>
      ) : state.error ? (
        <ErrorState description={state.error} onRetry={state.reload} />
      ) : state.data ? (
        <div className="grid gap-6 lg:grid-cols-[1fr_1.4fr]">
          <Card className="p-6 text-center">
            <span
              aria-hidden="true"
              className="mx-auto flex size-16 items-center justify-center rounded-full bg-primary-soft text-xl font-semibold text-primary"
            >
              {state.data.avatarInitials}
            </span>
            <p className="mt-3 text-sm font-semibold text-ink">{state.data.name}</p>
            <p className="text-xs text-muted">{state.data.email}</p>
          </Card>

          <Card>
            <CardContent className="space-y-4 p-6">
              <Field label="Nama lengkap" required>
                {({ id }) => <Input id={id} value={name} onChange={(e) => setName(e.target.value)} />}
              </Field>
              <Field label="Email" hint="Email tidak dapat diubah di demo.">
                {({ id }) => <Input id={id} value={state.data?.email ?? ""} disabled />}
              </Field>
              <Field label="Perusahaan">
                {({ id }) => <Input id={id} value={company} onChange={(e) => setCompany(e.target.value)} />}
              </Field>
              <Field label="Zona waktu">
                {({ id }) => (
                  <Select id={id} value={timezone} onChange={(e) => setTimezone(e.target.value)}>
                    {TIMEZONES.map((tz) => (
                      <option key={tz} value={tz}>
                        {tz}
                      </option>
                    ))}
                  </Select>
                )}
              </Field>
              <Button loading={saving} onClick={save}>
                Simpan perubahan
              </Button>
              <DemoNote>Profil demo — perubahan hanya tersimpan pada mock service lokal.</DemoNote>
            </CardContent>
          </Card>
        </div>
      ) : null}
    </div>
  );
}
