"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import type { ApiMeta, ApiResult } from "@/lib/api-client";

export interface AsyncState<T> {
  data: T | null;
  error: string | null;
  /** ApiErrorCode of the failure, when the adapter reported one. */
  errorCode: string | null;
  /** True while a fetch for the current deps/reload is in flight. */
  loading: boolean;
  meta: ApiMeta | null;
  reload: () => void;
  setData: (data: T) => void;
  /** Convenience flag from meta (snapshot may be stale). */
  stale: boolean;
}

/**
 * Fetches an `ApiResult` and unwraps its ok/error union into UI state.
 * Race-safe: only the latest invocation may commit. The demo adapter never
 * throws for expected failures, but unexpected throws still become errors.
 *
 * While a refetch is in flight, previously committed data stays visible
 * (keep-previous semantics) so filters and tabs never blank the screen.
 */
export function useApiData<T>(
  fetcher: () => Promise<ApiResult<T>>,
  deps: readonly unknown[],
  options: { keepPrevious?: boolean } = {},
): AsyncState<T> {
  const key = JSON.stringify(deps);

  // Render-time adjustment for derived run counter (React-endorsed pattern).
  const [prevKey, setPrevKey] = useState(key);
  const [runId, setRunId] = useState(0);
  if (key !== prevKey) {
    setPrevKey(key);
    setRunId((r) => r + 1);
  }
  const [settledRun, setSettledRun] = useState(-1);

  const [state, setState] = useState<{
    data: T | null;
    error: string | null;
    errorCode: string | null;
    meta: ApiMeta | null;
  }>({ data: null, error: null, errorCode: null, meta: null });

  const latest = useRef(0);
  const fetcherRef = useRef(fetcher);
  const keepRef = useRef(options.keepPrevious ?? false);

  // Keep latest callbacks in refs (assigned in effects, never during render).
  useEffect(() => {
    fetcherRef.current = fetcher;
    keepRef.current = options.keepPrevious ?? false;
  });

  useEffect(() => {
    const run = runId;
    latest.current = run;
    let cancelled = false;
    fetcherRef.current()
      .then((result) => {
        if (cancelled || latest.current !== run) return;
        if (result.ok) {
          setState({ data: result.data, error: null, errorCode: null, meta: result.meta });
        } else {
          setState((prev) => ({
            data: keepRef.current ? prev.data : null,
            error: result.error.message,
            errorCode: result.error.code,
            meta: result.meta,
          }));
        }
        setSettledRun(run);
      })
      .catch((err: unknown) => {
        if (cancelled || latest.current !== run) return;
        const message =
          err instanceof DOMException && err.name === "AbortError"
            ? null
            : err instanceof Error
              ? err.message
              : "Terjadi kesalahan yang tidak diketahui.";
        setState((prev) => ({
          data: prev.data,
          error: message ?? prev.error,
          errorCode: prev.errorCode,
          meta: prev.meta,
        }));
        setSettledRun(run);
      });
    return () => {
      cancelled = true;
    };
  }, [runId, key]);

  const reload = useCallback(() => setRunId((r) => r + 1), []);
  const setData = useCallback((data: T) => {
    setState((prev) => ({ ...prev, data }));
  }, []);

  return {
    data: state.data,
    error: state.error,
    errorCode: state.errorCode,
    loading: runId !== settledRun,
    meta: state.meta,
    reload,
    setData,
    stale: state.meta?.stale === true,
  };
}

function noopSubscribe(): () => void {
  return () => undefined;
}

/** Browser online/offline signal for offline banners. */
export function useOnline(): boolean {
  return useSyncExternalStore(
    (onStoreChange) => {
      window.addEventListener("online", onStoreChange);
      window.addEventListener("offline", onStoreChange);
      return () => {
        window.removeEventListener("online", onStoreChange);
        window.removeEventListener("offline", onStoreChange);
      };
    },
    () => navigator.onLine,
    () => true,
  );
}

/** True once the client has hydrated (server snapshot renders false). */
export function useHydrated(): boolean {
  return useSyncExternalStore(
    noopSubscribe,
    () => true,
    () => false,
  );
}

type ThemeChoice = "light" | "dark" | "system";
const THEME_KEY = "azr-theme";

function readStoredTheme(): ThemeChoice {
  if (typeof window === "undefined") return "system";
  try {
    const raw = window.localStorage.getItem(THEME_KEY);
    if (raw === "light" || raw === "dark" || raw === "system") return raw;
  } catch {
    /* storage unavailable — keep system default */
  }
  return "system";
}

const mediaQuery = "(prefers-color-scheme: dark)";

/** Non-secret theme preference, mirrored to the mock settings service by callers. */
export function useTheme() {
  const hydrated = useHydrated();
  // Lazy initializer reads the real preference on the client's first render.
  const [theme, setThemeState] = useState<ThemeChoice>(readStoredTheme);

  const systemDark = useSyncExternalStore(
    (onStoreChange) => {
      const media = window.matchMedia(mediaQuery);
      media.addEventListener("change", onStoreChange);
      return () => media.removeEventListener("change", onStoreChange);
    },
    () => window.matchMedia(mediaQuery).matches,
    () => false,
  );

  // Gate on hydration so server HTML and the first client render agree.
  const effectiveTheme: ThemeChoice = hydrated ? theme : "system";
  const resolved: "light" | "dark" =
    effectiveTheme === "system" ? (systemDark ? "dark" : "light") : effectiveTheme;

  // Sync the DOM class to the resolved theme (external system — no state).
  useEffect(() => {
    if (!hydrated) return;
    document.documentElement.classList.toggle("dark", resolved === "dark");
  }, [resolved, hydrated]);

  const setTheme = useCallback((choice: ThemeChoice) => {
    setThemeState(choice);
    try {
      window.localStorage.setItem(THEME_KEY, choice);
    } catch {
      /* ignore */
    }
  }, []);

  return { theme: effectiveTheme, resolved, setTheme };
}

export function useClickOutside(onOutside: () => void) {
  const ref = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    function handler(event: MouseEvent) {
      if (ref.current && !ref.current.contains(event.target as Node)) onOutside();
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [onOutside]);
  return ref;
}

export function useDebounced<T>(value: T, delayMs = 300): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const id = window.setTimeout(() => setDebounced(value), delayMs);
    return () => window.clearTimeout(id);
  }, [value, delayMs]);
  return debounced;
}
