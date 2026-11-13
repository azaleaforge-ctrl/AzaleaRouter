"use client";

import { useState } from "react";
import { api } from "@/components/shared/api";
import { useApiData, useTheme } from "@/components/shared/hooks";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Field, Select } from "@/components/ui/form";
import { Switch } from "@/components/ui/form";
import { DemoBadge, DemoNote, ErrorState, Skeleton } from "@/components/ui/feedback";
import { useToast } from "@/components/ui/toast";

const THEME_OPTIONS = [
  { value: "light", label: "Terang" },
  { value: "dark", label: "Gelap" },
  { value: "system", label: "Ikuti sistem" },
] as const;

export function PreferencesClient() {
  const { toast } = useToast();
  const { setTheme } = useTheme();
  const state = useApiData(() => api.settings.getPreferences(), []);
  const models = useApiData(() => api.catalog.list({ pageSize: 50 }), []);
  const [theme, setThemeChoice] = useState<"light" | "dark" | "system">("system");
  const [reducedMotion, setReducedMotion] = useState(false);
  const [defaultModel, setDefaultModel] = useState("");
  const [saving, setSaving] = useState(false);

  // Sync form state when fresh preferences arrive (render-time adjustment).
  const [syncedFrom, setSyncedFrom] = useState<typeof state.data>(null);
  if (state.data && state.data !== syncedFrom) {
    setSyncedFrom(state.data);
    setThemeChoice(state.data.theme);
    setReducedMotion(state.data.reducedMotion);
    setDefaultModel(state.data.defaultModelId ?? "");
  }

  async function save() {
    setSaving(true);
    const res = await api.settings.updatePreferences({ theme, reducedMotion, defaultModelId: defaultModel || null });
    setSaving(false);
    if (res.ok) {
      state.setData(res.data);
      toast({ title: "Preferensi tersimpan (demo)", description: "Disimpan pada preferensi demo lokal.", tone: "primary" });
    } else {
      toast({ title: "Gagal menyimpan", description: res.error.message, tone: "danger" });
    }
  }

  return (
    <div>
      <PageHeader
        title="Preferensi"
        description="Tampilan dan perilaku aplikasi. Preferensi non-rahasia disimpan secara lokal."
        actions={<DemoBadge label="Data demo" />}
      />

      {state.loading && !state.data ? (
        <Card className="p-6">
          <div className="space-y-4" aria-hidden="true">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        </Card>
      ) : state.error ? (
        <ErrorState description={state.error} onRetry={state.reload} />
      ) : (
        <div className="space-y-6">
          <Card>
            <CardHeader title="Tampilan" />
            <CardContent className="space-y-5">
              <fieldset>
                <legend className="mb-2 text-[13px] font-medium text-ink">Tema</legend>
                <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Tema">
                  {THEME_OPTIONS.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      role="radio"
                      aria-checked={theme === option.value}
                      onClick={() => {
                        setThemeChoice(option.value);
                        setTheme(option.value);
                      }}
                      className={`rounded-control border px-4 py-2 text-[13px] font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                        theme === option.value
                          ? "border-primary bg-primary-soft text-primary"
                          : "border-line bg-surface text-muted hover:text-ink"
                      }`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
                <p className="mt-2 text-xs text-muted">Mode terang adalah tampilan default; preferensi ikut sistem bila dipilih.</p>
              </fieldset>
              <div className="border-t border-line pt-4">
                <Switch
                  checked={reducedMotion}
                  onChange={(v) => {
                    setReducedMotion(v);
                    toast({ title: "Simulasi", description: "Preferensi gerak minimal disimpan secara lokal.", tone: "primary" });
                  }}
                  label="Kurangi animasi"
                  description="Sistem juga menghormati prefers-reduced-motion perangkat."
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader title="Model & bahasa" />
            <CardContent className="space-y-4">
              <Field label="Model default" hint="Dipakai sebagai pilihan awal di Chat dan Playground.">
                {({ id }) => (
                  <Select id={id} value={defaultModel} onChange={(e) => setDefaultModel(e.target.value)}>
                    <option value="">Tidak ada (pilih manual)</option>
                    {(models.data?.page.items ?? []).map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.name} — {m.developer.name}
                      </option>
                    ))}
                  </Select>
                )}
              </Field>
              <Field label="Bahasa" hint="Demo hanya menyediakan Bahasa Indonesia.">
                {({ id }) => (
                  <Select id={id} value="id" disabled>
                    <option value="id">Bahasa Indonesia</option>
                  </Select>
                )}
              </Field>
              <Field label="Tampilan mata uang" hint="Mata uang demo tetap IDR.">
                {({ id }) => (
                  <Select id={id} value="IDR" disabled>
                    <option value="IDR">IDR — Rupiah</option>
                  </Select>
                )}
              </Field>
              <Button loading={saving} onClick={save}>
                Simpan preferensi
              </Button>
              <DemoNote>
                Preferensi disimpan pada mock service demo — bukan profil nyata. Tema juga
                tersimpan di localStorage browser (non-rahasia).
              </DemoNote>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
