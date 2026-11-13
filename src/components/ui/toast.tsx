"use client";

import { createContext, useCallback, useContext, useMemo, useRef, useState } from "react";
import type { BadgeTone } from "@/components/ui/badge";

interface Toast {
  id: number;
  title: string;
  description?: string;
  tone: BadgeTone;
}

export interface ToastInput {
  title: string;
  description?: string;
  tone?: BadgeTone;
}

interface ToastApi {
  toast: (input: ToastInput) => void;
}

const ToastContext = createContext<ToastApi | null>(null);

export function useToast(): ToastApi {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast harus dipakai di dalam <ToastProvider>");
  return ctx;
}

const TONE_STYLES: Record<BadgeTone, string> = {
  neutral: "border-line",
  primary: "border-primary/40",
  teal: "border-teal/50",
  warning: "border-warning/50",
  danger: "border-danger/50",
  outline: "border-line",
};

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const nextId = useRef(1);

  const toast = useCallback((input: ToastInput) => {
    const id = nextId.current++;
    setToasts((prev) => [...prev.slice(-3), { id, title: input.title, description: input.description, tone: input.tone ?? "neutral" }]);
    window.setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4500);
  }, []);

  const api = useMemo(() => ({ toast }), [toast]);

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div
        aria-live="polite"
        aria-label="Notifikasi"
        className="pointer-events-none fixed bottom-4 right-4 z-[60] flex w-full max-w-sm flex-col gap-2"
      >
        {toasts.map((t) => (
          <div
            key={t.id}
            role="status"
            className={`pointer-events-auto animate-fade-up rounded-card border bg-surface px-4 py-3 shadow-float ${TONE_STYLES[t.tone]}`}
          >
            <p className="text-[13px] font-semibold text-ink">{t.title}</p>
            {t.description ? <p className="mt-0.5 text-xs leading-5 text-muted">{t.description}</p> : null}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
