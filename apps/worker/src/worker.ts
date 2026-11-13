import { createDatabaseClient } from "@azalea-router/database";
import { createOpenRouterCatalogSyncHandler } from "@azalea-router/catalog";
import { env } from "./config/env.js";
import { createJobHandlers } from "./handlers/index.js";
import { logWorkerEvent, type SafeWorkerLogFields } from "./lib/logger.js";
import { createBackgroundQueue } from "./queue.js";
import { createBackgroundWorker } from "./worker-runtime.js";

const database = env.DATABASE_URL ? createDatabaseClient(env.DATABASE_URL) : undefined;
if (database) await database.$connect();

const queue = database ? createBackgroundQueue() : undefined;
if (queue) {
  await queue.add(
    "auth.cleanup-expired",
    {},
    {
      jobId: "auth-cleanup-expired-hourly",
      repeat: { every: 60 * 60 * 1000 },
    },
  );
}

const catalogSyncHandler = database && env.CATALOG_SYNC_ENABLED
  ? createOpenRouterCatalogSyncHandler(database, {
      apiKey: env.OPENROUTER_CATALOG_API_KEY!,
      endpointConcurrency: 4,
    })
  : undefined;

if (queue && catalogSyncHandler) {
  await queue.add(
    "catalog.openrouter.sync",
    {},
    {
      jobId: "catalog-openrouter-sync-6-hourly",
      repeat: { every: 6 * 60 * 60 * 1000 },
    },
  );
}

const worker = createBackgroundWorker({
  handlers: createJobHandlers(database, catalogSyncHandler),
});

worker.on("completed", (job) => {
  const fields: SafeWorkerLogFields = {
    queueName: env.WORKER_QUEUE_NAME,
    jobName: job.name,
  };
  if (job.id !== undefined) fields.jobId = job.id;
  logWorkerEvent("info", "worker.job.completed", fields);
});

worker.on("failed", (job) => {
  const fields: SafeWorkerLogFields = { queueName: env.WORKER_QUEUE_NAME };
  if (job) {
    fields.jobName = job.name;
    if (job.id !== undefined) fields.jobId = job.id;
  }
  logWorkerEvent("warn", "worker.job.failed", fields);
});

worker.on("error", () => {
  logWorkerEvent("error", "worker.connection.error", {
    queueName: env.WORKER_QUEUE_NAME,
  });
});

await worker.waitUntilReady();
logWorkerEvent("info", "worker.ready", { queueName: env.WORKER_QUEUE_NAME });

let shuttingDown = false;
async function shutdown(signal: NodeJS.Signals): Promise<void> {
  if (shuttingDown) return;
  shuttingDown = true;

  logWorkerEvent("info", "worker.shutdown", { signal, queueName: env.WORKER_QUEUE_NAME });
  try {
    await worker.close();
    await queue?.close();
    await database?.$disconnect();
    process.exitCode = 0;
  } catch {
    logWorkerEvent("error", "worker.shutdown.error", { queueName: env.WORKER_QUEUE_NAME });
    process.exitCode = 1;
  }
}

process.once("SIGINT", () => void shutdown("SIGINT"));
process.once("SIGTERM", () => void shutdown("SIGTERM"));
