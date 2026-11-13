import type { DemoScenario } from "@/lib/api-client/types";

export const APP_NAME = "AzaleaRouter";
export const DEMO_MODE = true;
export const DEFAULT_DEMO_SCENARIO: DemoScenario = "normal";

export const DEMO_SCENARIOS: readonly DemoScenario[] = [
  "normal",
  "empty",
  "delayed",
  "error",
  "offline",
  "stale",
  "stream-interrupted",
  "reconnect",
];

export const API_ADAPTER = process.env.NEXT_PUBLIC_AZALEA_API_ADAPTER ?? "mock";
export const API_BASE_URL = process.env.NEXT_PUBLIC_AZALEA_API_BASE_URL ?? "";
