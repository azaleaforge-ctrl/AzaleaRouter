import type {
  ApiErrorCode,
  ApiErrorShape,
  ApiMeta,
  ApiResult,
  DemoScenario,
  RequestOptions,
} from "@/lib/api-client/types";
import { DEMO_DATA_NOTICE } from "@/lib/api-client/types";
import { createError } from "@/lib/api-client/errors";
import type { MockContext } from "./context";

export const DEFAULT_SCENARIO: DemoScenario = "normal";
export const DEMO_NOW = "2026-11-13T09:00:00.000Z";
export const DEMO_TIMEZONE = "Asia/Jakarta";

export function createMeta(scenario: DemoScenario, now: Date): ApiMeta {
  return {
    demo: true,
    source: "mock",
    scenario,
    generatedAt: now.toISOString(),
    stale: scenario === "stale" || scenario === "reconnect",
    connection:
      scenario === "offline"
        ? "offline"
        : scenario === "reconnect"
          ? "reconnecting"
          : "live",
    notice: DEMO_DATA_NOTICE,
  };
}

export function delay(ms: number, signal?: AbortSignal): Promise<void> {
  if (ms <= 0 || signal?.aborted) {
    return Promise.resolve();
  }

  return new Promise((resolve) => {
    const timer = setTimeout(() => {
      signal?.removeEventListener("abort", onAbort);
      resolve();
    }, ms);
    const onAbort = () => {
      clearTimeout(timer);
      resolve();
    };
    signal?.addEventListener("abort", onAbort, { once: true });
  });
}

export function hashString(value: string): number {
  let hash = 0x811c9dc5;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

export function deterministicId(prefix: string, seed: string): string {
  const first = hashString(seed).toString(16).padStart(8, "0").toUpperCase();
  const second = hashString(`${seed}:${prefix}`)
    .toString(16)
    .padStart(8, "0")
    .toUpperCase();
  return `${prefix}-DEMO-${first}${second}`;
}

export function deterministicToken(seed: string, length = 32): string {
  let output = "";
  let counter = 0;
  while (output.length < length) {
    output += hashString(`${seed}:${counter}`)
      .toString(36)
      .toUpperCase()
      .padStart(7, "0");
    counter += 1;
  }
  return output.slice(0, length);
}

function requestIdFor(scenario: DemoScenario, meta: ApiMeta): string {
  return deterministicId("REQ", `${scenario}:${meta.generatedAt}`);
}

export async function respond<T>(
  ctx: MockContext,
  options: RequestOptions | undefined,
  handler: (meta: ApiMeta) => T,
): Promise<ApiResult<T>> {
  const scenario = options?.scenario ?? ctx.scenario;
  const meta = createMeta(scenario, ctx.now());

  if (scenario === "delayed") {
    await delay(ctx.latencyMs, options?.signal);
  }

  if (options?.signal?.aborted) {
    return {
      ok: false,
      error: createError("CANCELLED", { requestId: requestIdFor(scenario, meta) }),
      meta,
    };
  }

  if (scenario === "error") {
    return {
      ok: false,
      error: createError("UPSTREAM_UNAVAILABLE", {
        requestId: requestIdFor(scenario, meta),
      }),
      meta,
    };
  }

  if (scenario === "offline") {
    return {
      ok: false,
      error: createError("OFFLINE", { requestId: requestIdFor(scenario, meta) }),
      meta: { ...meta, connection: "offline" },
    };
  }

  try {
    return { ok: true, data: handler(meta), meta };
  } catch {
    return {
      ok: false,
      error: createError("UNKNOWN", {
        requestId: requestIdFor(scenario, meta),
      }),
      meta,
    };
  }
}

export async function fail<T>(
  ctx: MockContext,
  options: RequestOptions | undefined,
  code: ApiErrorCode,
  overrides: Partial<Omit<ApiErrorShape, "code">> = {},
): Promise<ApiResult<T>> {
  const scenario = options?.scenario ?? ctx.scenario;
  const meta = createMeta(scenario, ctx.now());

  if (scenario === "delayed") {
    await delay(ctx.latencyMs, options?.signal);
  }

  if (options?.signal?.aborted) {
    return {
      ok: false,
      error: createError("CANCELLED", { requestId: requestIdFor(scenario, meta) }),
      meta,
    };
  }

  if (scenario === "error") {
    return {
      ok: false,
      error: createError("UPSTREAM_UNAVAILABLE", {
        requestId: requestIdFor(scenario, meta),
      }),
      meta,
    };
  }

  if (scenario === "offline") {
    return {
      ok: false,
      error: createError("OFFLINE", { requestId: requestIdFor(scenario, meta) }),
      meta: { ...meta, connection: "offline" },
    };
  }

  return {
    ok: false,
    error: createError(code, {
      requestId: requestIdFor(scenario, meta),
      ...overrides,
    }),
    meta,
  };
}
