"use client";

import { useEffect, useRef, useState } from "react";
import type { ChatConversationSummary, ChatMessage, ChatMode, ChatStreamEvent, ModelSummary } from "@/lib/api-client";
import { DEMO_DATA_NOTICE } from "@/lib/api-client";
import { api } from "@/components/shared/api";
import { useApiData } from "@/components/shared/hooks";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Field, Input, Select, Textarea } from "@/components/ui/form";
import { Modal, Drawer } from "@/components/ui/overlay";
import { DemoBadge, EmptyState, Skeleton } from "@/components/ui/feedback";
import { Tabs } from "@/components/ui/tabs";
import { CodeBlock, CopyButton } from "@/components/ui/code";
import { useToast } from "@/components/ui/toast";
import { formatRelativeTime } from "@/lib/formatters";

interface StreamState {
  status: "connecting" | "running";
  text: string;
  requestId: string | null;
  usage: { inputTokens: number; outputTokens: number; estimatedCostIdr: number } | null;
  interrupted: { message: string; requestId: string | null } | null;
  error: string | null;
}

const IDLE_STREAM: StreamState = { status: "connecting", text: "", requestId: null, usage: null, interrupted: null, error: null };

/** Minimal markdown: fenced code blocks + paragraphs + inline code. */
function MessageBody({ content }: { content: string }) {
  const parts = content.split(/```(\w*)\n?([\s\S]*?)```/g);
  if (parts.length === 1) {
    return (
      <div className="space-y-2">
        {content.split(/\n{2,}/).map((p, i) => (
          <InlineText key={i} text={p} />
        ))}
      </div>
    );
  }
  const nodes: React.ReactNode[] = [];
  for (let i = 0; i < parts.length; i += 3) {
    const text = parts[i] ?? "";
    const lang = parts[i + 1];
    const code = parts[i + 2];
    if (text.trim()) {
      nodes.push(
        <div key={`t${i}`} className="space-y-2">
          {text.split(/\n{2,}/).map((p, j) => (
            <InlineText key={j} text={p} />
          ))}
        </div>,
      );
    }
    if (code) {
      nodes.push(<CodeBlock key={`c${i}`} code={code.replace(/\n$/, "")} filename={lang || "kode"} />);
    }
  }
  return <div className="space-y-3">{nodes}</div>;
}

function InlineText({ text }: { text: string }) {
  const segments = text.split(/(`[^`]+`)/g);
  return (
    <p className="whitespace-pre-wrap text-[13.5px] leading-6">
      {segments.map((seg, i) =>
        seg.startsWith("`") && seg.endsWith("`") && seg.length > 2 ? (
          <code key={i} className="rounded bg-surface-2 px-1 py-0.5 font-mono text-[12.5px]">
            {seg.slice(1, -1)}
          </code>
        ) : (
          <span key={i}>{seg}</span>
        ),
      )}
    </p>
  );
}

export function ChatClient() {
  const { toast } = useToast();
  const conversations = useApiData(() => api.chat.listConversations(), []);
  const models = useApiData(() => api.catalog.list({ onlyAvailable: true, pageSize: 50 }), []);

  const [activeId, setActiveId] = useState<string | null>(null);
  const [stream, setStream] = useState<StreamState | null>(null);
  const [pending, setPending] = useState<{ conversationId: string; content: string } | null>(null);
  const [input, setInput] = useState("");
  const [listOpen, setListOpen] = useState(false);
  const [newOpen, setNewOpen] = useState(false);
  const [newMode, setNewMode] = useState<ChatMode>("general");
  const [newModel, setNewModel] = useState("");
  const [renameTarget, setRenameTarget] = useState<ChatConversationSummary | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<ChatConversationSummary | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const bottomRef = useRef<HTMLDivElement | null>(null);

  const modelOptions: ModelSummary[] = models.data?.page.items ?? [];
  // Derive the active conversation instead of auto-selecting in an effect.
  const effectiveActiveId = activeId ?? conversations.data?.[0]?.id ?? null;
  const activeConversation = conversations.data?.find((c) => c.id === effectiveActiveId) ?? null;

  const thread = useApiData(
    () =>
      effectiveActiveId
        ? api.chat.getConversation(effectiveActiveId)
        : Promise.resolve({
            ok: true as const,
            data: {
              id: "",
              title: "",
              mode: "general" as ChatMode,
              modelId: "",
              archived: false,
              createdAt: "",
              updatedAt: "",
              simulated: true as const,
              messages: [] as ChatMessage[],
            },
            meta: {
              demo: true,
              source: "mock" as const,
              scenario: "normal" as const,
              generatedAt: new Date().toISOString(),
              stale: false,
              connection: "live" as const,
              notice: DEMO_DATA_NOTICE,
            },
          }),
    [effectiveActiveId],
  );

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [thread.data?.messages.length, stream?.text]);

  async function runStream(conversationId: string, content: string) {
    const controller = new AbortController();
    abortRef.current = controller;
    setStream(IDLE_STREAM);
    try {
      const events = api.chat.streamMessage(
        { conversationId, content, modelId: activeConversation?.modelId },
        { signal: controller.signal },
      );
      for await (const event of events) {
        handleEvent(event);
      }
    } catch {
      if (!controller.signal.aborted) {
        setStream((prev) => prev ?? { ...IDLE_STREAM, error: "Stream demo terputus sebelum selesai." });
      }
    } finally {
      abortRef.current = null;
    }

    function handleEvent(event: ChatStreamEvent) {
      switch (event.type) {
        case "start":
          setStream((prev) => ({ ...(prev ?? IDLE_STREAM), status: "running", requestId: event.requestId }));
          break;
        case "delta":
          setStream((prev) => ({ ...(prev ?? IDLE_STREAM), status: "running", text: (prev?.text ?? "") + event.text }));
          break;
        case "usage":
          setStream((prev) => ({
            ...(prev ?? IDLE_STREAM),
            usage: { inputTokens: event.inputTokens, outputTokens: event.outputTokens, estimatedCostIdr: event.estimatedCostIdr },
          }));
          break;
        case "done":
          setStream(null);
          setPending(null);
          thread.reload();
          conversations.reload();
          break;
        case "cancelled":
          setStream(null);
          setPending(null);
          toast({ title: "Generasi dihentikan", description: "Stream demo dibatalkan.", tone: "neutral" });
          thread.reload();
          break;
        case "interrupted":
          setStream((prev) => ({ ...(prev ?? IDLE_STREAM), interrupted: { message: event.message, requestId: event.requestId } }));
          break;
        case "error":
          setStream((prev) => ({ ...(prev ?? IDLE_STREAM), error: event.error.message }));
          break;
      }
    }
  }

  async function send() {
    const content = input.trim();
    if (!content || stream) return;
    let conversationId = effectiveActiveId;
    if (!conversationId) {
      const created = await api.chat.createConversation({
        title: content.slice(0, 40),
        mode: "general",
        modelId: modelOptions[0]?.id ?? "",
      });
      if (!created.ok) {
        toast({ title: "Gagal membuat percakapan", description: created.error.message, tone: "danger" });
        return;
      }
      conversationId = created.data.id;
      setActiveId(conversationId);
      conversations.reload();
    }
    setInput("");
    setPending({ conversationId, content });
    await runStream(conversationId, content);
  }

  function stop() {
    abortRef.current?.abort();
    setStream(null);
  }

  async function createConversation() {
    const res = await api.chat.createConversation({
      title: undefined,
      mode: newMode,
      modelId: newModel || modelOptions[0]?.id || "",
    });
    if (res.ok) {
      setNewOpen(false);
      setActiveId(res.data.id);
      conversations.reload();
    } else {
      toast({ title: "Gagal membuat percakapan", description: res.error.message, tone: "danger" });
    }
  }

  async function rename() {
    if (!renameTarget) return;
    const res = await api.chat.renameConversation(renameTarget.id, renameValue.trim() || renameTarget.title);
    setRenameTarget(null);
    if (res.ok) conversations.reload();
    else toast({ title: "Gagal mengganti nama", description: res.error.message, tone: "danger" });
  }

  async function remove() {
    if (!deleteTarget) return;
    const res = await api.chat.deleteConversation(deleteTarget.id);
    setDeleteTarget(null);
    if (res.ok) {
      if (activeId === deleteTarget.id) setActiveId(null);
      conversations.reload();
      toast({ title: "Percakapan dihapus (demo)", description: "Data percakapan demo dihapus secara lokal.", tone: "primary" });
    } else {
      toast({ title: "Gagal menghapus", description: res.error.message, tone: "danger" });
    }
  }

  const messages = thread.data?.messages ?? [];

  return (
    <div className="flex h-[calc(100dvh-8.5rem)] min-h-[480px] gap-4">
      {/* Conversation list — desktop */}
      <Card className="hidden w-72 shrink-0 flex-col lg:flex">
        <div className="flex items-center justify-between border-b border-line px-4 py-3">
          <h2 className="text-sm font-semibold text-ink">Percakapan</h2>
          <Button size="sm" variant="subtle" onClick={() => setNewOpen(true)}>
            + Baru
          </Button>
        </div>
        <ConversationList
          state={conversations}
          activeId={activeId}
          onSelect={setActiveId}
          onRename={(c) => {
            setRenameTarget(c);
            setRenameValue(c.title);
          }}
          onDelete={setDeleteTarget}
        />
      </Card>

      {/* Thread */}
      <Card className="flex min-w-0 flex-1 flex-col">
        <div className="flex items-center justify-between gap-3 border-b border-line px-4 py-3">
          <div className="flex min-w-0 items-center gap-2">
            <Button variant="ghost" size="sm" className="lg:hidden" onClick={() => setListOpen(true)} aria-label="Buka daftar percakapan">
              ☰
            </Button>
            <div className="min-w-0">
              <h1 className="truncate text-sm font-semibold text-ink">
                {activeConversation?.title ?? "AI Chat"}
              </h1>
              <p className="text-xs text-muted">
                {activeConversation?.mode === "coding" ? "Coding Chat" : "General Chat"}
                {activeConversation?.modelId ? ` · ${activeConversation.modelId}` : ""}
              </p>
            </div>
          </div>
          <DemoBadge label="Simulasi" />
        </div>

        <div className="flex-1 space-y-4 overflow-y-auto px-4 py-4">
          {thread.loading && !thread.data ? (
            <div className="space-y-3" aria-hidden="true">
              <Skeleton className="h-16 w-2/3" />
              <Skeleton className="ml-auto h-16 w-1/2" />
              <Skeleton className="h-16 w-3/4" />
            </div>
          ) : messages.length === 0 && !stream ? (
            <EmptyState
              title="Mulai percakapan"
              description="Tanya apa saja — respons dihasilkan simulator lokal, bukan model upstream."
            />
          ) : (
            <>
              {messages.map((m) => (
                <div key={m.id} className={m.role === "user" ? "flex justify-end" : "flex justify-start"}>
                  <div
                    className={`max-w-[85%] rounded-card px-4 py-3 ${
                      m.role === "user" ? "bg-primary text-on-primary" : "border border-line bg-surface-2/60"
                    }`}
                  >
                    {m.role === "user" ? (
                      <p className="whitespace-pre-wrap text-[13.5px] leading-6">{m.content}</p>
                    ) : (
                      <MessageBody content={m.content} />
                    )}
                    {m.role === "assistant" && (m.inputTokens !== null || m.estimatedCostIdr !== null) ? (
                      <p className="mt-2 flex flex-wrap items-center gap-2 border-t border-line pt-2 text-[11px] text-muted">
                        {m.inputTokens !== null ? <span>{m.inputTokens} in / {m.outputTokens} out token</span> : null}
                        {m.estimatedCostIdr !== null ? <Badge tone="warning">estimasi demo {m.estimatedCostIdr} IDR</Badge> : null}
                        <span className="ml-auto"><CopyButton text={m.content} label="Salin" /></span>
                      </p>
                    ) : null}
                    {m.status === "cancelled" ? <Badge tone="neutral" className="mt-2">Dibatalkan</Badge> : null}
                  </div>
                </div>
              ))}

              {pending && pending.conversationId === effectiveActiveId ? (
                <div className="flex justify-end">
                  <div className="max-w-[85%] rounded-card bg-primary px-4 py-3 text-on-primary">
                    <p className="whitespace-pre-wrap text-[13.5px] leading-6">{pending.content}</p>
                  </div>
                </div>
              ) : null}

              {stream ? (
                <div className="flex justify-start">
                  <div className="max-w-[85%] rounded-card border border-line bg-surface-2/60 px-4 py-3">
                    {stream.status === "connecting" && !stream.text ? (
                      <p className="flex items-center gap-2 text-[13px] text-muted">
                        <span aria-hidden="true" className="size-2 animate-pulse rounded-full bg-primary" />
                        Menyambung ke stream demo…
                      </p>
                    ) : (
                      <MessageBody content={stream.text} />
                    )}
                    {stream.usage ? (
                      <p className="mt-2 border-t border-line pt-2 text-[11px] text-muted">
                        <Badge tone="warning">Provisional</Badge> {stream.usage.inputTokens} in /{" "}
                        {stream.usage.outputTokens} out · estimasi demo Rp{stream.usage.estimatedCostIdr}
                      </p>
                    ) : null}
                    {stream.interrupted ? (
                      <div className="mt-2 rounded-control bg-danger-soft px-3 py-2 text-[12px] text-danger">
                        <p className="font-semibold">Stream terputus</p>
                        <p>{stream.interrupted.message}</p>
                        <p className="mt-0.5 font-mono text-[11px]">Request ID: {stream.interrupted.requestId}</p>
                      </div>
                    ) : null}
                    {stream.error ? (
                      <p role="alert" className="mt-2 rounded-control bg-danger-soft px-3 py-2 text-[12px] font-medium text-danger">
                        {stream.error}
                      </p>
                    ) : null}
                  </div>
                </div>
              ) : null}
              <div ref={bottomRef} />
            </>
          )}
        </div>

        {/* Composer */}
        <div className="border-t border-line p-3">
          {stream?.interrupted ? (
            <div className="mb-2 flex items-center justify-between gap-2 rounded-control bg-warning-soft px-3 py-2 text-xs text-warning">
              <span>Stream terputus sebelum selesai. Coba kirim ulang pesan terakhir.</span>
              <Button size="sm" variant="secondary" onClick={() => setStream(null)}>
                Tutup
              </Button>
            </div>
          ) : null}
          <div className="flex items-end gap-2">
            <Textarea
              aria-label="Pesan"
              placeholder="Tulis pesan… (Enter kirim, Shift+Enter baris baru)"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  void send();
                }
              }}
              className="min-h-11 flex-1"
              disabled={Boolean(stream)}
            />
            {stream ? (
              <Button variant="danger" onClick={stop}>
                Stop
              </Button>
            ) : (
              <Button onClick={() => void send()} disabled={!input.trim()}>
                Kirim
              </Button>
            )}
          </div>
          <p className="mt-2 text-[11px] text-muted">
            Respons dihasilkan simulator lokal — tidak ada request ke upstream dan tidak ada biaya
            nyata.
          </p>
        </div>
      </Card>

      {/* Mobile conversation drawer */}
      <Drawer open={listOpen} onClose={() => setListOpen(false)} title="Percakapan">
        <Button size="sm" variant="subtle" className="mb-3 w-full" onClick={() => { setListOpen(false); setNewOpen(true); }}>
          + Percakapan baru
        </Button>
        <ConversationList
          state={conversations}
          activeId={activeId}
          onSelect={(id) => {
            setActiveId(id);
            setListOpen(false);
          }}
          onRename={(c) => {
            setRenameTarget(c);
            setRenameValue(c.title);
          }}
          onDelete={setDeleteTarget}
        />
      </Drawer>

      {/* New conversation modal */}
      <Modal open={newOpen} onClose={() => setNewOpen(false)} title="Percakapan baru" description="Pilih mode dan model awal.">
        <div className="space-y-4">
          <Tabs
            ariaLabel="Mode chat"
            tabs={[
              { id: "general", label: "General Chat" },
              { id: "coding", label: "Coding Chat" },
            ]}
            active={newMode}
            onChange={(id) => setNewMode(id as ChatMode)}
          />
          <Field label="Model">
            {({ id }) => (
              <Select id={id} value={newModel} onChange={(e) => setNewModel(e.target.value)}>
                {modelOptions.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name} — {m.developer.name}
                  </option>
                ))}
              </Select>
            )}
          </Field>
          <Button className="w-full" onClick={createConversation}>
            Buat percakapan
          </Button>
        </div>
      </Modal>

      {/* Rename modal */}
      <Modal open={renameTarget !== null} onClose={() => setRenameTarget(null)} title="Ganti nama percakapan" size="sm">
        <div className="space-y-4">
          <Field label="Nama baru">
            {({ id }) => <Input id={id} value={renameValue} onChange={(e) => setRenameValue(e.target.value)} />}
          </Field>
          <div className="flex gap-2">
            <Button className="flex-1" onClick={rename}>
              Simpan
            </Button>
            <Button variant="secondary" className="flex-1" onClick={() => setRenameTarget(null)}>
              Batal
            </Button>
          </div>
        </div>
      </Modal>

      {/* Delete confirm */}
      <Modal open={deleteTarget !== null} onClose={() => setDeleteTarget(null)} title="Hapus percakapan?" size="sm">
        <p className="text-[13px] leading-6 text-muted">
          Percakapan <span className="font-semibold text-ink">{deleteTarget?.title}</span> akan
          dihapus dari demo. Tindakan ini hanya memengaruhi data mock lokal.
        </p>
        <div className="mt-4 flex gap-2">
          <Button variant="danger" className="flex-1" onClick={remove}>
            Hapus
          </Button>
          <Button variant="secondary" className="flex-1" onClick={() => setDeleteTarget(null)}>
            Batal
          </Button>
        </div>
      </Modal>
    </div>
  );
}

function ConversationList({
  state,
  activeId,
  onSelect,
  onRename,
  onDelete,
}: {
  state: { data: ChatConversationSummary[] | null; loading: boolean; error: string | null };
  activeId: string | null;
  onSelect: (id: string) => void;
  onRename: (c: ChatConversationSummary) => void;
  onDelete: (c: ChatConversationSummary) => void;
}) {
  if (state.loading && state.data === null) {
    return (
      <div className="space-y-2 p-3" aria-hidden="true">
        {[0, 1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-14 w-full" />
        ))}
      </div>
    );
  }
  if (!state.data || state.data.length === 0) {
    return <p className="p-4 text-[13px] text-muted">Belum ada percakapan. Buat satu untuk mulai.</p>;
  }
  return (
    <ul className="flex-1 space-y-1 overflow-y-auto p-2">
      {state.data.map((c) => (
        <li key={c.id} className="group relative">
          <button
            type="button"
            onClick={() => onSelect(c.id)}
            aria-current={c.id === activeId ? "true" : undefined}
            className={`w-full rounded-control px-3 py-2.5 pr-16 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
              c.id === activeId ? "bg-primary-soft" : "hover:bg-surface-2"
            }`}
          >
            <span className={`block truncate text-[13px] font-medium ${c.id === activeId ? "text-primary" : "text-ink"}`}>
              {c.title}
            </span>
            <span className="mt-0.5 flex items-center gap-1.5 text-[11px] text-muted">
              <Badge tone="outline">{c.mode === "coding" ? "Coding" : "General"}</Badge>
              {c.archived ? <Badge tone="neutral">Arsip</Badge> : null}
              <span>{formatRelativeTime(c.updatedAt)}</span>
            </span>
          </button>
          <span className="absolute right-2 top-2.5 flex gap-0.5 opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100">
            <button
              type="button"
              aria-label={`Ganti nama ${c.title}`}
              onClick={() => onRename(c)}
              className="rounded p-1 text-muted hover:bg-surface hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <svg aria-hidden="true" viewBox="0 0 16 16" className="size-3.5" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="m9.5 3.5 3 3L6 13H3v-3l6.5-6.5Z" strokeLinejoin="round" />
              </svg>
            </button>
            <button
              type="button"
              aria-label={`Hapus ${c.title}`}
              onClick={() => onDelete(c)}
              className="rounded p-1 text-muted hover:bg-danger-soft hover:text-danger focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <svg aria-hidden="true" viewBox="0 0 16 16" className="size-3.5" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M3 4.5h10M6.5 4.5V3h3v1.5M5 4.5 5.5 13h5L11 4.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          </span>
        </li>
      ))}
    </ul>
  );
}
