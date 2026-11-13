import type { DemoScenario } from "@/lib/api-client/types";
import { DEFAULT_SCENARIO, DEMO_NOW } from "./scenarios";

export interface MockConfig {
  scenario?: DemoScenario;
  /** Latency used only by the `delayed` scenario. */
  latencyMs?: number;
  /** Delay between simulated chat stream chunks. */
  streamChunkDelayMs?: number;
  /** Injectable clock for deterministic tests. */
  now?: () => Date;
}

export interface MockContext {
  scenario: DemoScenario;
  latencyMs: number;
  streamChunkDelayMs: number;
  now: () => Date;
}

export function createMockContext(config: MockConfig = {}): MockContext {
  return {
    scenario: config.scenario ?? DEFAULT_SCENARIO,
    latencyMs: config.latencyMs ?? 450,
    streamChunkDelayMs: config.streamChunkDelayMs ?? 35,
    now: config.now ?? (() => new Date(DEMO_NOW)),
  };
}
