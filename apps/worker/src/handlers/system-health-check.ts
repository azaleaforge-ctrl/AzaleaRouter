import type { BackgroundJobHandler } from "../queue.js";

export const systemHealthCheckHandler: BackgroundJobHandler = async (job) => ({
  status: "ok",
  processedAt: new Date().toISOString(),
  jobId: job.id ?? null,
});
