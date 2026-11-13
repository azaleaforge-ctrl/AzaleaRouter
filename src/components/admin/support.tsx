"use client";

import { useState } from "react";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { Badge, type BadgeTone } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Field, Input, Select, Textarea } from "@/components/ui/form";
import { DemoBadge, DemoNote, EmptyState } from "@/components/ui/feedback";
import { useToast } from "@/components/ui/toast";
import { formatRelativeTime } from "@/lib/formatters";

interface LocalTicket {
  id: string;
  subject: string;
  priority: "rendah" | "sedang" | "tinggi";
  description: string;
  createdAt: string;
  done: boolean;
}

const PRIORITY_META: Record<LocalTicket["priority"], { label: string; tone: BadgeTone }> = {
  rendah: { label: "Rendah", tone: "neutral" },
  sedang: { label: "Sedang", tone: "warning" },
  tinggi: { label: "Tinggi", tone: "danger" },
};

export function AdminSupportClient() {
  const { toast } = useToast();
  const [tickets, setTickets] = useState<LocalTicket[]>([]);
  const [subject, setSubject] = useState("");
  const [priority, setPriority] = useState<LocalTicket["priority"]>("sedang");
  const [description, setDescription] = useState("");
  const [subjectError, setSubjectError] = useState<string | null>(null);

  function create(event: React.FormEvent) {
    event.preventDefault();
    if (!subject.trim()) {
      setSubjectError("Subjek wajib diisi.");
      return;
    }
    setSubjectError(null);
    setTickets((prev) => [
      {
        id: `TICKET-DEMO-${String(prev.length + 1).padStart(4, "0")}`,
        subject: subject.trim(),
        priority,
        description: description.trim(),
        createdAt: new Date().toISOString(),
        done: false,
      },
      ...prev,
    ]);
    setSubject("");
    setDescription("");
    toast({ title: "Tiket demo dibuat", description: "Tiket hanya hidup di memori browser.", tone: "primary" });
  }

  return (
    <div>
      <PageHeader
        title="Support"
        description="Manajemen tiket dukungan. Kontrak admin.support belum tersedia di demo — halaman ini menyimulasikan alur kerja secara lokal."
        actions={<DemoBadge label="Simulasi lokal" />}
      />

      <DemoNote className="mb-6">
        Gap tercatat: daftar tiket nyata, nomor tiket, dan status penanganan memerlukan backend
        dukungan. Tiket di halaman ini hanya hidup di memori browser dan hilang saat refresh.
      </DemoNote>

      <div className="grid gap-6 lg:grid-cols-[1fr_1.3fr]">
        <Card>
          <CardHeader title="Buat tiket demo" description="Simulasi triase tiket masuk." />
          <CardContent>
            <form onSubmit={create} className="space-y-4" noValidate>
              <Field label="Subjek" required error={subjectError}>
                {({ id, describedBy, invalid }) => (
                  <Input id={id} value={subject} invalid={invalid} aria-describedby={describedBy} onChange={(e) => setSubject(e.target.value)} placeholder="mis. Top-up tidak muncul" />
                )}
              </Field>
              <Field label="Prioritas">
                {({ id }) => (
                  <Select id={id} value={priority} onChange={(e) => setPriority(e.target.value as LocalTicket["priority"])}>
                    <option value="rendah">Rendah</option>
                    <option value="sedang">Sedang</option>
                    <option value="tinggi">Tinggi</option>
                  </Select>
                )}
              </Field>
              <Field label="Deskripsi">
                {({ id }) => <Textarea id={id} value={description} onChange={(e) => setDescription(e.target.value)} />}
              </Field>
              <Button type="submit">Buat tiket (simulasi)</Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader title="Antrean tiket (sesi ini)" description={`${tickets.length} tiket demo di memori.`} />
          {tickets.length === 0 ? (
            <EmptyState
              title="Belum ada tiket"
              description="Buat tiket demo untuk melihat alur triase. Tiket nyata memerlukan kontrak backend."
            />
          ) : (
            <ul className="divide-y divide-line">
              {tickets.map((t) => (
                <li key={t.id} className="flex items-start justify-between gap-3 px-5 py-4">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-xs text-muted">{t.id}</span>
                      <Badge tone={PRIORITY_META[t.priority].tone} dot>
                        {PRIORITY_META[t.priority].label}
                      </Badge>
                      {t.done ? <Badge tone="teal">Selesai</Badge> : <Badge tone="primary">Baru</Badge>}
                    </div>
                    <p className="mt-1.5 text-[13.5px] font-semibold text-ink">{t.subject}</p>
                    {t.description ? <p className="mt-0.5 line-clamp-2 text-[13px] text-muted">{t.description}</p> : null}
                    <p className="mt-1 text-xs text-muted">{formatRelativeTime(t.createdAt)}</p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setTickets((prev) => prev.map((x) => (x.id === t.id ? { ...x, done: !x.done } : x)))}
                  >
                    {t.done ? "Buka lagi" : "Tandai selesai"}
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
}
