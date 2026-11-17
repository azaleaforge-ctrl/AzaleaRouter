import { Queue } from "bullmq";

export interface QueueMetricsCounts {
  waiting: number; active: number; delayed: number; completed: number;
  failed: number; paused: number; waiting_children: number; prioritized: number;
}
export interface QueueMetricsReader { readCounts(): Promise<QueueMetricsCounts>; }

export type QueueJobState =
  | "completed" | "failed" | "delayed" | "active" | "waiting"
  | "waiting-children" | "paused" | "prioritized" | "unknown";

export interface QueueJobInspection {
  id: string;
  name: string;
  state: QueueJobState;
  attempts_made: number;
  attempts_allowed: number;
  created_at: string | null;
  processed_at: string | null;
  finished_at: string | null;
}

export interface QueueJobInspectionReader {
  readJob(jobId: string): Promise<QueueJobInspection | null>;
}

export interface ManagedQueueMetricsReader extends QueueMetricsReader, QueueJobInspectionReader {
  close(): Promise<void>;
}

interface InspectableQueueJob {
  id?: string;
  name: string;
  attemptsMade: number;
  opts: { attempts?: number };
  timestamp: number;
  processedOn?: number;
  finishedOn?: number;
}

const safeQueueJobStates = new Set<QueueJobState>([
  "completed", "failed", "delayed", "active", "waiting",
  "waiting-children", "paused", "prioritized", "unknown",
]);

function safeJobTimestamp(value: number | undefined): string | null {
  if (value === undefined || !Number.isSafeInteger(value) || value < 0) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function safeJobCount(value: number | undefined, fallback: number): number {
  return value !== undefined && Number.isSafeInteger(value) && value >= 0 && value <= 1_000_000
    ? value
    : fallback;
}

/**
 * Project BullMQ's internal Job object onto an intentionally small admin DTO.
 * Never add data, returnvalue, failedReason, stacktrace, or provider/customer payloads here.
 */
export function toQueueJobInspection(job: InspectableQueueJob, state: string): QueueJobInspection {
  const safeId = typeof job.id === "string" && /^[A-Za-z0-9:_-]{1,128}$/.test(job.id)
    ? job.id
    : "unknown";
  const safeName = /^[A-Za-z0-9][A-Za-z0-9._-]{0,99}$/.test(job.name)
    ? job.name
    : "unknown";
  const safeState = safeQueueJobStates.has(state as QueueJobState)
    ? state as QueueJobState
    : "unknown";

  return {
    id: safeId,
    name: safeName,
    state: safeState,
    attempts_made: safeJobCount(job.attemptsMade, 0),
    attempts_allowed: Math.max(1, safeJobCount(job.opts.attempts, 1)),
    created_at: safeJobTimestamp(job.timestamp),
    processed_at: safeJobTimestamp(job.processedOn),
    finished_at: safeJobTimestamp(job.finishedOn),
  };
}

export function parseQueueRedisConnectionOptions(redisUrl: string) {
  const url = new URL(redisUrl);
  if (url.protocol !== "redis:" && url.protocol !== "rediss:") {
    throw new Error("REDIS_URL must use redis:// or rediss://.");
  }
  if (!url.hostname || url.hash || url.search) throw new Error("REDIS_URL contains unsupported components.");
  const port = url.port ? Number(url.port) : 6379;
  if (!Number.isInteger(port) || port < 1 || port > 65_535) throw new Error("REDIS_URL port is invalid.");
  const databasePath = url.pathname.startsWith("/") ? url.pathname.slice(1) : url.pathname;
  let database: number | undefined;
  if (databasePath) {
    if (!/^[0-9]+$/.test(databasePath)) throw new Error("REDIS_URL database index is invalid.");
    database = Number(databasePath);
    if (!Number.isSafeInteger(database) || database < 0) throw new Error("REDIS_URL database index is invalid.");
  }
  let username: string | undefined;
  let password: string | undefined;
  try {
    if (url.username) username = decodeURIComponent(url.username);
    if (url.password) password = decodeURIComponent(url.password);
  } catch { throw new Error("REDIS_URL credentials are malformed."); }
  return {
    host: url.hostname, port, maxRetriesPerRequest: 1, connectTimeout: 3_000,
    ...(username ? { username } : {}), ...(password ? { password } : {}),
    ...(database !== undefined ? { db: database } : {}),
    ...(url.protocol === "rediss:" ? { tls: {} } : {}),
  };
}

export function createBullMqQueueMetricsReader(redisUrl: string, queueName: string): ManagedQueueMetricsReader {
  if (!/^[a-zA-Z0-9:_-]{1,100}$/.test(queueName)) throw new Error("WORKER_QUEUE_NAME is invalid.");
  const queue = new Queue(queueName, { connection: parseQueueRedisConnectionOptions(redisUrl) });
  return {
    async readJob(jobId: string) {
      const job = await queue.getJob(jobId);
      if (!job) return null;
      return toQueueJobInspection(job, await job.getState());
    },
    async readCounts() {
      const counts = await queue.getJobCounts("waiting", "active", "delayed", "completed", "failed", "paused", "waiting-children", "prioritized");
      return {
        waiting: counts.waiting ?? 0, active: counts.active ?? 0, delayed: counts.delayed ?? 0,
        completed: counts.completed ?? 0, failed: counts.failed ?? 0, paused: counts.paused ?? 0,
        waiting_children: counts["waiting-children"] ?? 0, prioritized: counts.prioritized ?? 0,
      };
    },
    close: () => queue.close(),
  };
}
