"use client";

import { useRef, useState } from "react";
import type { RoutingMode } from "@/lib/api-client";
import { api } from "@/components/shared/api";
import { useApiData } from "@/components/shared/hooks";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Field, Input, Select, Switch, Textarea } from "@/components/ui/form";
import { DemoBadge, DemoNote, Skeleton } from "@/components/ui/feedback";
import { Tabs } from "@/components/ui/tabs";
import { CodeBlock } from "@/components/ui/code";
import { formatTokenCount } from "@/lib/formatters";

/**
 * Documentation sample only. `.example` is reserved and never resolves to a
 * live service. Replace with the confirmed production base URL (or
 * NEXT_PUBLIC_AZALEA_API_BASE_URL) before use.
 */
const SAMPLE_API_BASE_URL = "https://api.azalearouter.example/v1";

const ROUTING_LABELS: Record<RoutingMode, string> = {
  auto: "Otomatis (auto)",
  cheapest: "Termurah",
  fastest: "Tercepat",
  "lowest-latency": "Latensi terendah",
  "specific-provider": "Provider tertentu",
  "provider-priority": "Prioritas provider",
  fallback: "Fallback",
};

interface ResponseState {
  text: string;
  running: boolean;
  usage: { inputTokens: number; outputTokens: number; estimatedCostIdr: number } | null;
  error: string | null;
}

export function PlaygroundClient() {
  const models = useApiData(() => api.catalog.list({ onlyAvailable: true, pageSize: 50 }), []);
  const modelOptions = models.data?.page.items ?? [];

  const [modelId, setModelId] = useState("");
  const [routing, setRouting] = useState<RoutingMode>("auto");
  const [streaming, setStreaming] = useState(true);
  const [system, setSystem] = useState("");
  const [userMessage, setUserMessage] = useState("Jelaskan cara kerja API gateway dalam tiga kalimat.");
  const [temperature, setTemperature] = useState("0.7");
  const [maxTokens, setMaxTokens] = useState("512");
  const [response, setResponse] = useState<ResponseState | null>(null);
  const [sampleTab, setSampleTab] = useState("curl");
  const abortRef = useRef<AbortController | null>(null);

  const effectiveModel = modelId || modelOptions[0]?.id || "";

  function buildSamples() {
    const base = SAMPLE_API_BASE_URL;
    const body = JSON.stringify(
      { model: effectiveModel, messages: [{ role: "user", content: userMessage }], stream: streaming, temperature: Number(temperature) || 0.7, max_tokens: Number(maxTokens) || 512 },
      null,
      2,
    );
    return {
      curl: `curl ${base}/chat/completions \\\n  -H "Authorization: Bearer $AZALEA_API_KEY" \\\n  -H "Content-Type: application/json" \\\n  -d '${body}'`,
      javascript: `const res = await fetch("${base}/chat/completions", {\n  method: "POST",\n  headers: {\n    Authorization: \`Bearer \${process.env.AZALEA_API_KEY}\`,\n    "Content-Type": "application/json",\n  },\n  body: JSON.stringify(${body}),\n});`,
      python: `import os, requests\n\nrequests.post(\n    "${base}/chat/completions",\n    headers={"Authorization": f"Bearer {os.environ['AZALEA_API_KEY']}"},\n    json=${body.replace(/true/g, "True").replace(/false/g, "False").replace(/"/g, '"')},\n)`,
    };
  }

  async function run() {
    if (!effectiveModel || !userMessage.trim() || response?.running) return;
    const controller = new AbortController();
    abortRef.current = controller;
    setResponse({ text: "", running: true, usage: null, error: null });
    try {
      const conv = await api.chat.createConversation({ title: "Playground", mode: "general", modelId: effectiveModel });
      if (!conv.ok) {
        setResponse({ text: "", running: false, usage: null, error: conv.error.message });
        return;
      }
      const events = api.chat.streamMessage(
        { conversationId: conv.data.id, content: userMessage, modelId: effectiveModel, routingMode: routing },
        { signal: controller.signal },
      );
      for await (const event of events) {
        if (event.type === "delta") {
          setResponse((prev) => ({ ...(prev ?? { text: "", running: true, usage: null, error: null }), text: prev?.text + event.text }));
        } else if (event.type === "usage") {
          setResponse((prev) => ({
            ...(prev ?? { text: "", running: true, usage: null, error: null }),
            usage: { inputTokens: event.inputTokens, outputTokens: event.outputTokens, estimatedCostIdr: event.estimatedCostIdr },
          }));
        } else if (event.type === "done") {
          setResponse((prev) => ({ ...(prev ?? { text: "", running: false, usage: null, error: null }), running: false }));
        } else if (event.type === "error") {
          setResponse({ text: "", running: false, usage: null, error: event.error.message });
        } else if (event.type === "interrupted") {
          setResponse((prev) => ({ ...(prev ?? { text: "", running: true, usage: null, error: null }), running: false, error: event.message }));
        } else if (event.type === "cancelled") {
          setResponse((prev) => ({ ...(prev ?? { text: "", running: false, usage: null, error: null }), running: false }));
        }
      }
    } catch {
      if (!controller.signal.aborted) {
        setResponse((prev) => ({ ...(prev ?? { text: "", running: false, usage: null, error: null }), running: false, error: "Stream demo terputus." }));
      }
    } finally {
      abortRef.current = null;
    }
  }

  const samples = buildSamples();

  return (
    <div>
      <PageHeader
        title="API Playground"
        description="Susun request, kirim ke simulator, dan lihat respons beserta estimasi token dan biaya."
        actions={<DemoBadge label="Simulasi" />}
      />

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Config */}
        <Card>
          <CardHeader title="Konfigurasi request" description="Parameter mengikuti kemampuan model demo." />
          <CardContent className="space-y-4">
            {models.loading && !models.data ? (
              <Skeleton className="h-40 w-full" />
            ) : (
              <>
                <Field label="Model">
                  {({ id }) => (
                    <Select id={id} value={effectiveModel} onChange={(e) => setModelId(e.target.value)}>
                      {modelOptions.map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.name} — {m.developer.name}
                        </option>
                      ))}
                    </Select>
                  )}
                </Field>
                <Field label="Routing mode" hint="Pilihan mengikuti mode yang didukung endpoint demo.">
                  {({ id }) => (
                    <Select id={id} value={routing} onChange={(e) => setRouting(e.target.value as RoutingMode)}>
                      {(Object.keys(ROUTING_LABELS) as RoutingMode[]).map((rm) => (
                        <option key={rm} value={rm}>
                          {ROUTING_LABELS[rm]}
                        </option>
                      ))}
                    </Select>
                  )}
                </Field>
                <Switch checked={streaming} onChange={setStreaming} label="Streaming" description="Tampilkan respons secara bertahap." />
                <Field label="System message" hint="Opsional">
                  {({ id }) => (
                    <Textarea id={id} value={system} onChange={(e) => setSystem(e.target.value)} placeholder="mis. Kamu asisten yang menjawab singkat." />
                  )}
                </Field>
                <Field label="User message" required>
                  {({ id }) => <Textarea id={id} value={userMessage} onChange={(e) => setUserMessage(e.target.value)} />}
                </Field>
                <div className="grid grid-cols-2 gap-4">
                  <Field label="Temperature">
                    {({ id }) => (
                      <Input id={id} type="number" min={0} max={2} step={0.1} value={temperature} onChange={(e) => setTemperature(e.target.value)} />
                    )}
                  </Field>
                  <Field label="Max tokens">
                    {({ id }) => (
                      <Input id={id} type="number" min={1} value={maxTokens} onChange={(e) => setMaxTokens(e.target.value)} />
                    )}
                  </Field>
                </div>
                <div className="flex gap-2">
                  <Button className="flex-1" onClick={() => void run()} loading={response?.running} disabled={!effectiveModel || !userMessage.trim()}>
                    Kirim request
                  </Button>
                  {response?.running ? (
                    <Button variant="danger" onClick={() => { abortRef.current?.abort(); setResponse((p) => (p ? { ...p, running: false } : p)); }}>
                      Stop
                    </Button>
                  ) : null}
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Response + samples */}
        <div className="space-y-6">
          <Card>
            <CardHeader
              title="Respons"
              actions={
                response?.usage ? (
                  <Badge tone="warning">
                    Provisional · {formatTokenCount(response.usage.inputTokens)} in /{" "}
                    {formatTokenCount(response.usage.outputTokens)} out · estimasi demo Rp
                    {response.usage.estimatedCostIdr}
                  </Badge>
                ) : null
              }
            />
            <CardContent>
              {response?.running && !response.text ? (
                <p className="flex items-center gap-2 text-[13px] text-muted">
                  <span aria-hidden="true" className="size-2 animate-pulse rounded-full bg-primary" />
                  Menjalankan request demo…
                </p>
              ) : response?.error ? (
                <p role="alert" className="rounded-control bg-danger-soft px-3 py-2 text-[13px] font-medium text-danger">
                  {response.error}
                </p>
              ) : response?.text ? (
                <div className="max-h-72 overflow-y-auto whitespace-pre-wrap rounded-control bg-surface-2/60 p-4 text-[13.5px] leading-6">
                  {response.text}
                </div>
              ) : (
                <p className="text-[13px] text-muted">Respons demo akan muncul di sini setelah request dikirim.</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader title="Contoh kode" description="Ganti $AZALEA_API_KEY dengan API key demo-mu." />
            <CardContent className="space-y-3">
              <Tabs
                ariaLabel="Bahasa contoh"
                tabs={[
                  { id: "curl", label: "cURL" },
                  { id: "javascript", label: "JavaScript" },
                  { id: "python", label: "Python" },
                ]}
                active={sampleTab}
                onChange={setSampleTab}
              />
              <CodeBlock
                code={samples[sampleTab as keyof typeof samples]}
                filename={sampleTab === "curl" ? "terminal" : sampleTab === "javascript" ? "request.js" : "request.py"}
              />
              <DemoNote>
                Contoh memakai env var — tidak ada token palsu yang ditulis di kode. Request nyata
                memerlukan backend gateway.
              </DemoNote>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
