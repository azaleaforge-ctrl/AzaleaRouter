"use client";

import { useState } from "react";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Field, Input, Switch, Textarea } from "@/components/ui/form";
import { DemoBadge, DemoNote } from "@/components/ui/feedback";
import { useToast } from "@/components/ui/toast";

export function AdminSettingsClient() {
  const { toast } = useToast();
  const [supportEmail, setSupportEmail] = useState("support@example.invalid");
  const [maintenance, setMaintenance] = useState(false);
  const [banner, setBanner] = useState("");
  const [rateLimit, setRateLimit] = useState("60");

  return (
    <div>
      <PageHeader
        title="Settings"
        description="Pengaturan platform. Kontrak admin settings belum tersedia di demo — tidak ada nilai yang tersimpan."
        actions={<DemoBadge label="Simulasi lokal" />}
      />

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader title="Umum" />
          <CardContent className="space-y-4">
            <Field label="Nama platform">
              {({ id }) => <Input id={id} value="AzaleaRouter (demo)" disabled />}
            </Field>
            <Field label="Email dukungan">
              {({ id }) => <Input id={id} type="email" value={supportEmail} onChange={(e) => setSupportEmail(e.target.value)} />}
            </Field>
          </CardContent>
        </Card>

        <Card>
          <CardHeader title="Operasional" />
          <CardContent className="space-y-4">
            <Switch
              checked={maintenance}
              onChange={setMaintenance}
              label="Mode maintenance"
              description="Pada produk final, mode ini dikontrol backend dengan banner global."
            />
            <Field label="Banner pengumuman" hint="Ditampilkan di halaman publik (simulasi).">
              {({ id }) => (
                <Textarea id={id} value={banner} onChange={(e) => setBanner(e.target.value)} placeholder="mis. Maintenance terjadwal Sabtu 02.00 WIB" />
              )}
            </Field>
          </CardContent>
        </Card>

        <Card>
          <CardHeader title="Keamanan" />
          <CardContent className="space-y-4">
            <Switch
              checked
              onChange={() => toast({ title: "Simulasi", description: "Prefix AZL- wajib dan tidak dapat dinonaktifkan di demo.", tone: "primary" })}
              label="Wajibkan prefix AZL- pada API key"
              description="Aturan format key versi pertama — tidak dapat dimatikan."
            />
            <Field label="Rate limit default (request/menit)">
              {({ id }) => <Input id={id} type="number" min={1} value={rateLimit} onChange={(e) => setRateLimit(e.target.value)} />}
            </Field>
          </CardContent>
        </Card>

        <Card>
          <CardHeader title="Simpan" />
          <CardContent className="space-y-4">
            <Button
              onClick={() =>
                toast({
                  title: "Disimpan secara lokal (simulasi)",
                  description: "Pengaturan admin memerlukan kontrak backend — tidak ada nilai yang tersimpan.",
                  tone: "primary",
                })
              }
            >
              Simpan (simulasi)
            </Button>
            <DemoNote>
              Gap tercatat: kontrak admin settings belum tersedia. Semua nilai di halaman ini hanya
              hidup di memori browser.
            </DemoNote>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
