import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ApiResult } from "@/lib/api-client/types";
import { createMockApiClient } from "./index";
import {
  MODEL_COLOR_STORAGE_KEY,
  resetModelColorOverridesForTests,
} from "./model-color-store";
import { DEMO_MODEL_COLORS } from "./fixtures/usage";

const NOW = new Date("2026-11-13T09:00:00.000Z");
const MODEL_ID = "aurora-labs/azalea-chat-1";

function client() {
  return createMockApiClient({
    latencyMs: 0,
    streamChunkDelayMs: 0,
    now: () => NOW,
  });
}

function expectOk<T>(result: ApiResult<T>): T {
  if (!result.ok) {
    throw new Error(`Expected success, received ${result.error.code}`);
  }
  return result.data;
}

function fakeStorage(initial: Record<string, string> = {}) {
  const values = new Map(Object.entries(initial));
  return {
    values,
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => {
      values.set(key, value);
    },
    removeItem: (key: string) => {
      values.delete(key);
    },
  };
}

beforeEach(() => {
  resetModelColorOverridesForTests();
});

afterEach(() => {
  resetModelColorOverridesForTests();
  vi.unstubAllGlobals();
});

describe("model color persistence", () => {
  it("persists an override through the non-browser fallback", async () => {
    const api = client();

    const updated = expectOk(
      await api.usage.updateModelColor({
        modelId: MODEL_ID,
        colorHex: "#123456",
      }),
    );
    expect(updated.colorHex).toBe("#123456");
    expect(updated.source).toBe("manual");

    const colors = expectOk(await api.usage.listModelColors());
    const persisted = colors.find((color) => color.modelId === MODEL_ID);
    expect(persisted?.colorHex).toBe("#123456");
    expect(persisted?.source).toBe("manual");
  });

  it("writes and reads the versioned localStorage key", async () => {
    const storage = fakeStorage();
    const setItem = vi.fn(storage.setItem);
    vi.stubGlobal("window", {
      localStorage: { ...storage, setItem },
    });

    const api = client();
    await api.usage.updateModelColor({
      modelId: MODEL_ID,
      colorHex: "#123456",
    });

    expect(setItem).toHaveBeenCalledWith(
      MODEL_COLOR_STORAGE_KEY,
      expect.any(String),
    );
    expect(storage.values.get(MODEL_COLOR_STORAGE_KEY)).toContain("#123456");

    const colors = expectOk(await api.usage.listModelColors());
    expect(
      colors.find((color) => color.modelId === MODEL_ID)?.colorHex,
    ).toBe("#123456");
  });

  it("ignores unknown model IDs, invalid hex, and malformed entries", async () => {
    const storage = fakeStorage({
      [MODEL_COLOR_STORAGE_KEY]: JSON.stringify({
        [MODEL_ID]: {
          colorHex: "not-a-color",
          assignedAt: NOW.toISOString(),
        },
        "unknown/model": {
          colorHex: "#123456",
          assignedAt: NOW.toISOString(),
        },
        "kopi-ai/kopi-mini": {
          colorHex: "#ABCDEF",
          assignedAt: "not-a-date",
        },
        "nusantara-ai/nusa-vision": "not-an-object",
      }),
    });
    vi.stubGlobal("window", { localStorage: storage });

    const colors = expectOk(await client().usage.listModelColors());
    const defaultColor = DEMO_MODEL_COLORS.find(
      (color) => color.modelId === MODEL_ID,
    )?.colorHex;

    expect(colors.find((color) => color.modelId === MODEL_ID)?.colorHex).toBe(
      defaultColor,
    );
    expect(colors.some((color) => color.modelId === "unknown/model")).toBe(
      false,
    );
  });

  it("falls back to memory when localStorage throws", async () => {
    vi.stubGlobal("window", {
      localStorage: {
        getItem: () => {
          throw new Error("storage blocked");
        },
        setItem: () => {
          throw new Error("storage blocked");
        },
        removeItem: () => {
          throw new Error("storage blocked");
        },
      },
    });

    const api = client();
    await api.usage.updateModelColor({
      modelId: MODEL_ID,
      colorHex: "#123456",
    });

    const colors = expectOk(await api.usage.listModelColors());
    expect(
      colors.find((color) => color.modelId === MODEL_ID)?.colorHex,
    ).toBe("#123456");
  });

  it("does not persist an unknown model ID", async () => {
    const api = client();

    const result = await api.usage.updateModelColor({
      modelId: "unknown/model",
      colorHex: "#123456",
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("NOT_FOUND");
    }

    const colors = expectOk(await api.usage.listModelColors());
    expect(colors.some((color) => color.modelId === "unknown/model")).toBe(
      false,
    );
  });
});
