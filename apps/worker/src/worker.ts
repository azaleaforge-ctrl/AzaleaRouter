import { env } from "./config/env.js";
import { jobHandlers } from "./handlers/index.js";
import { logWorkerEvent, type SafeWorkerLogFields } from "./lib/logger.js";
import { createBackgroundWorker } from "./worker-runtime.js";

const worker = createBackgroundWorker({ handlers: jobHandlers });

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
  // Error messages may include connection details; emit only a stable event.
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
    process.exitCode = 0;
  } catch {
    logWorkerEvent("error", "worker.shutdown.error", { queueName: env.WORKER_QUEUE_NAME });
    process.exitCode = 1;
  }
}

process.once("SIGINT", () => void shutdown("SIGINT"));
process.once("SIGTERM", () => void shutdown("SIGTERM"));
