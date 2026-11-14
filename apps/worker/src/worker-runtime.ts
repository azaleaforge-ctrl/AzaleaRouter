import { Worker } from "bullmq";
import { env } from "./config/env.js";
import type {
  BackgroundJobHandler,
  BackgroundJobPayload,
  BackgroundJobResult,
} from "./queue.js";
import { parseRedisConnectionOptions } from "./lib/redis-connection.js";

export interface WorkerRuntimeOptions {
  queueName?: string;
  redisUrl?: string;
  concurrency?: number;
  handlers: ReadonlyMap<string, BackgroundJobHandler>;
}

export function createBackgroundWorker(options: WorkerRuntimeOptions) {
  const queueName = options.queueName ?? env.WORKER_QUEUE_NAME;
  const redisUrl = options.redisUrl ?? env.REDIS_URL;
  const concurrency = options.concurrency ?? env.WORKER_CONCURRENCY;

  return new Worker<BackgroundJobPayload, BackgroundJobResult>(
    queueName,
    async (job) => {
      const handler = options.handlers.get(job.name);
      if (!handler) {
        // Do not log or echo job payloads: they may contain customer data.
        throw new Error("UNSUPPORTED_JOB_TYPE");
      }
      return handler(job);
    },
    {
      connection: parseRedisConnectionOptions(redisUrl),
      concurrency,
    },
  );
}
