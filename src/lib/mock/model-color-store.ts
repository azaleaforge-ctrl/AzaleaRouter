import type { ModelColor } from "@/lib/api-client/contracts/usage";
import { DEMO_MODEL_COLORS } from "./fixtures/usage";

/**
 * Versioned, non-secret demo preference. Only model-color overrides are stored;
 * no credentials, balances, or chat content ever enter this key.
 */
export const MODEL_COLOR_STORAGE_KEY = "azr-demo-model-colors:v1";

const HEX_COLOR_PATTERN = /^#[0-9A-Fa-f]{6}$/;
const KNOWN_MODEL_IDS = new Set(
  DEMO_MODEL_COLORS.map((color) => color.modelId),
);

interface StoredModelColor {
  colorHex: string;
  assignedAt: string;
  source: "manual";
}

type ModelColorOverrides = Record<string, StoredModelColor>;

/** Non-browser fallback used by unit tests and when storage is unavailable. */
let memoryOverrides: ModelColorOverrides = {};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function parseOverrides(raw: string | null): ModelColorOverrides {
  if (!raw) {
    return {};
  }

  try {
    const parsed: unknown = JSON.parse(raw);
    if (!isRecord(parsed)) {
      return {};
    }

    const overrides: ModelColorOverrides = {};
    for (const [modelId, value] of Object.entries(parsed)) {
      if (!KNOWN_MODEL_IDS.has(modelId) || !isRecord(value)) {
        continue;
      }
      const colorHex = value.colorHex;
      const assignedAt = value.assignedAt;
      if (typeof colorHex !== "string" || !HEX_COLOR_PATTERN.test(colorHex)) {
        continue;
      }
      if (
        typeof assignedAt !== "string" ||
        Number.isNaN(Date.parse(assignedAt))
      ) {
        continue;
      }
      overrides[modelId] = { colorHex, assignedAt, source: "manual" };
    }
    return overrides;
  } catch {
    return {};
  }
}

function readOverrides(): ModelColorOverrides {
  if (typeof window === "undefined") {
    return { ...memoryOverrides };
  }

  try {
    const stored = parseOverrides(
      window.localStorage.getItem(MODEL_COLOR_STORAGE_KEY),
    );
    return { ...stored, ...memoryOverrides };
  } catch {
    return { ...memoryOverrides };
  }
}

function writeOverrides(overrides: ModelColorOverrides): void {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.localStorage.setItem(
      MODEL_COLOR_STORAGE_KEY,
      JSON.stringify(overrides),
    );
  } catch {
    /* Storage unavailable — the in-memory fallback remains authoritative. */
  }
}

export function setModelColorOverride(
  modelId: string,
  colorHex: string,
  assignedAt: string,
): void {
  if (!KNOWN_MODEL_IDS.has(modelId) || !HEX_COLOR_PATTERN.test(colorHex)) {
    return;
  }

  const next: ModelColorOverrides = {
    ...readOverrides(),
    [modelId]: { colorHex, assignedAt, source: "manual" },
  };
  memoryOverrides = next;
  writeOverrides(next);
}

export function applyModelColorOverrides(
  colors: readonly ModelColor[],
): ModelColor[] {
  const overrides = readOverrides();
  return colors.map((color) => {
    const override = overrides[color.modelId];
    if (!override) {
      return color;
    }
    return {
      ...color,
      colorHex: override.colorHex,
      assignedAt: override.assignedAt,
      source: "manual",
    };
  });
}

/** Test/demo reset. Clears both the memory fallback and the versioned key. */
export function resetModelColorOverridesForTests(): void {
  memoryOverrides = {};
  if (typeof window === "undefined") {
    return;
  }
  try {
    window.localStorage.removeItem(MODEL_COLOR_STORAGE_KEY);
  } catch {
    /* ignore unavailable storage */
  }
}
