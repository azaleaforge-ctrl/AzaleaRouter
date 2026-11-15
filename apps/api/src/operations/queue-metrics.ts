import { Queue } from "bullmq";

export interface QueueMetricsCounts {
  waiting: number; active: number; delayed: number; completed: number;
  failed: number; paused: number; waiting_children: number; prioritized: number;
}
export interface QueueMetricsReader { readCounts(): Promise<QueueMetricsCounts>; }
export interface ManagedQueueMetricsReader extends QueueMetricsReader { close(): Promise<void>; }

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
