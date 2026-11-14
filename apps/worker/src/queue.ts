import { Queue, type Job } from "bullmq";
import { env } from "./config/env.js";
import { parseRedisConnectionOptions } from "./lib/redis-connection.js";

export type BackgroundJobPayload = Record<string, unknown>;
export type BackgroundJobResult = Record<string, unknown>;
export type BackgroundJob = Job<BackgroundJobPayload, BackgroundJobResult>;

export type BackgroundJobHandler = (job: BackgroundJob) => Promise<BackgroundJobResult>;

export interface QueueRuntimeOptions {
  queueName?: string;
  redisUrl?: string;
}

export function createBackgroundQueue(options: QueueRuntimeOptions = {}) {
  const queueName = options.queueName ?? env.WORKER_QUEUE_NAME;
  const redisUrl = options.redisUrl ?? env.REDIS_URL;

  return new Queue<BackgroundJobPayload, BackgroundJobResult>(queueName, {
    connection: parseRedisConnectionOptions(redisUrl),
    defaultJobOptions: {
      attempts: 3,
      backoff: { type: "exponential", delay: 1_000 },
      removeOnComplete: { age: 86_400, count: 1_000 },
      removeOnFail: { age: 604_800, count: 5_000 },
    },
  });
}
