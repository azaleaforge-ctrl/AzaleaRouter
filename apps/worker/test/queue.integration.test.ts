import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { once } from "node:events";
import test from "node:test";
import { createBackgroundQueue } from "../src/queue.js";
import { createBackgroundWorker } from "../src/worker-runtime.js";

const redisUrl = process.env.REDIS_URL;

test("BullMQ worker processes a registered job using Redis", { skip: !redisUrl }, async () => {
  const queueName = `test-${randomUUID()}`;
  const queue = createBackgroundQueue({ queueName, redisUrl });
  const worker = createBackgroundWorker({
    queueName,
    redisUrl,
    concurrency: 1,
    handlers: new Map([
      ["test.echo", async (job) => ({ received: job.data.value })],
    ]),
  });

  try {
    await worker.waitUntilReady();
    const completed = once(worker, "completed", {
      signal: AbortSignal.timeout(10_000),
    });
    await queue.add("test.echo", { value: "azalea-router-worker-test" });
    const [job, result] = await completed as [
      { name: string; id?: string },
      { received: unknown },
    ];

    assert.equal(job.name, "test.echo");
    assert.equal(result.received, "azalea-router-worker-test");
  } finally {
    await worker.close();
    await queue.close();
  }
});
