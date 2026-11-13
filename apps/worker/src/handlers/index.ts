import type { BackgroundJobHandler } from "../queue.js";
import { systemHealthCheckHandler } from "./system-health-check.js";

export const jobHandlers: ReadonlyMap<string, BackgroundJobHandler> = new Map([
  ["system.health-check", systemHealthCheckHandler],
]);
