import assert from "node:assert/strict";
import { createServer, type Server } from "node:http";
import test from "node:test";
import type { DatabaseClient } from "@azalea-router/database";
import { createApp } from "../src/app.js";
import { createAdminRouter, type AdminRouterOptions } from "../src/routes/admin.js";

async function startAdminServer(
  database: DatabaseClient,
  queueMetrics?: AdminRouterOptions["queueMetrics"],
  queueJobReader?: AdminRouterOptions["queueJobReader"],
  queueFailedJobsReader?: AdminRouterOptions["queueFailedJobsReader"],
): Promise<{ server: Server; baseUrl: string }> {
  const app = createApp({
    adminRouter: createAdminRouter({
      database,
      ...(queueMetrics ? { queueMetrics } : {}),
      ...(queueJobReader ? { queueJobReader } : {}),
      ...(queueFailedJobsReader ? { queueFailedJobsReader } : {}),
    }),
    sessionVerifier: {
      resolvePrincipal: async (request) => {
        const role = request.header("x-test-role");
        if (role !== "admin" && role !== "support" && role !== "user") return null;
        return {
          userId: "test-actor",
          email: "test-actor@example.test",
          role,
          status: "active",
        };
      },
    },
  });
  const server = createServer(app);
  await new Promise<void>((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolve);
  });
  const address = server.address();
  if (!address || typeof address === "string") throw new Error("Admin test server failed to bind.");
  return { server, baseUrl: `http://127.0.0.1:${address.port}` };
}

async function closeServer(server: Server): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    server.close((error) => error ? reject(error) : resolve());
  });
}

test("admin operations endpoints require an authenticated principal", async () => {
  const database = {} as unknown as DatabaseClient;
  const { server, baseUrl } = await startAdminServer(database);
  try {
    const [summary, queueJob, queueFailed] = await Promise.all([
      fetch(`${baseUrl}/api/v1/admin/operations/summary`),
      fetch(`${baseUrl}/api/v1/admin/operations/queue/jobs/job-123`),
      fetch(`${baseUrl}/api/v1/admin/operations/queue/failed`),
    ]);
    assert.equal(summary.status, 401);
    assert.equal(queueJob.status, 401);
    assert.equal(queueFailed.status, 401);
  } finally {
    await closeServer(server);
  }
});

test("support role cannot access admin operations or audit data", async () => {
  const database = {} as unknown as DatabaseClient;
  const { server, baseUrl } = await startAdminServer(database);
  try {
    const [operations, audit, queue, queueJob, queueFailed, user] = await Promise.all([
      fetch(`${baseUrl}/api/v1/admin/operations/summary`, { headers: { "x-test-role": "support" } }),
      fetch(`${baseUrl}/api/v1/admin/audit-logs`, { headers: { "x-test-role": "support" } }),
      fetch(`${baseUrl}/api/v1/admin/operations/queue`, { headers: { "x-test-role": "support" } }),
      fetch(`${baseUrl}/api/v1/admin/operations/queue/jobs/job-123`, { headers: { "x-test-role": "support" } }),
      fetch(`${baseUrl}/api/v1/admin/operations/queue/failed`, { headers: { "x-test-role": "support" } }),
      fetch(`${baseUrl}/api/v1/admin/operations/summary`, { headers: { "x-test-role": "user" } }),
    ]);
    assert.equal(operations.status, 403);
    assert.equal(audit.status, 403);
    assert.equal(queue.status, 403);
    assert.equal(queueJob.status, 403);
    assert.equal(queueFailed.status, 403);
    assert.equal(user.status, 403);
  } finally {
    await closeServer(server);
  }
});

test("operations summary returns database-backed counts without exposing event payloads", async () => {
  const calls: string[] = [];
  const database = {
    usageRecord: { count: async (args: unknown) => { calls.push("usage"); assert.deepEqual(args, { where: { reconciliationStatus: "pending" } }); return 2; } },
    paymentWebhook: { count: async () => { calls.push("payments"); return 3; } },
    outboxEvent: { count: async () => { calls.push("outbox"); return 4; } },
    fileAttachment: { count: async () => { calls.push("files"); return 5; } },
  } as unknown as DatabaseClient;
  const { server, baseUrl } = await startAdminServer(database);
  try {
    const response = await fetch(`${baseUrl}/api/v1/admin/operations/summary`, {
      headers: { "x-test-role": "admin" },
    });
    const body = await response.json() as { as_of: string; counts: Record<string, number> };
    assert.equal(response.status, 200);
    assert.ok(Number.isFinite(Date.parse(body.as_of)));
    assert.deepEqual(body.counts, {
      usage_reconciliation_required: 2,
      payment_webhooks_pending_or_failed: 3,
      outbox_events_pending: 4,
      files_quarantined: 5,
    });
    assert.deepEqual(calls.sort(), ["files", "outbox", "payments", "usage"]);
  } finally {
    await closeServer(server);
  }
});

test("audit list omits raw before/after JSON and uses a stable bounded cursor", async () => {
  let query: unknown;
  const database = {
    auditLog: {
      findMany: async (args: unknown) => {
        query = args;
        return [
          {
            id: "00000000-0000-4000-8000-000000000001",
            actorId: "00000000-0000-4000-8000-000000000002",
            actorRole: "admin",
            action: "user.suspend",
            resourceType: "user",
            resourceId: "00000000-0000-4000-8000-000000000003",
            requestId: "request-123",
            reason: "policy review",
            beforeJson: { secret: "must-not-leak" },
            afterJson: { private_value: "must-not-leak" },
            createdAt: new Date("2026-11-14T00:00:00.000Z"),
          },
          {
            id: "00000000-0000-4000-8000-000000000004",
            actorId: null,
            actorRole: null,
            action: "auth.login",
            resourceType: "session",
            resourceId: null,
            requestId: null,
            reason: null,
            beforeJson: null,
            afterJson: null,
            createdAt: new Date("2026-11-13T00:00:00.000Z"),
          },
        ];
      },
    },
  } as unknown as DatabaseClient;
  const { server, baseUrl } = await startAdminServer(database);
  try {
    const response = await fetch(`${baseUrl}/api/v1/admin/audit-logs?limit=1&action=user.suspend`, {
      headers: { "x-test-role": "admin" },
    });
    const body = await response.json() as { data: Array<Record<string, unknown>>; next_cursor: string | null };
    assert.equal(response.status, 200);
    assert.equal(body.data.length, 1);
    assert.equal(body.data[0]?.before_present, true);
    assert.equal(body.data[0]?.after_present, true);
    assert.equal(body.data[0]?.reason_present, true);
    assert.equal("beforeJson" in (body.data[0] ?? {}), false);
    assert.equal(JSON.stringify(body).includes("must-not-leak"), false);
    assert.equal(body.next_cursor, "00000000-0000-4000-8000-000000000001");
    assert.equal((query as { take: number }).take, 2);
  } finally {
    await closeServer(server);
  }
});

test("usage reconciliation response serializes decimal and bigint values as strings", async () => {
  const database = {
    usageRecord: {
      findMany: async () => [{
        id: "00000000-0000-4000-8000-000000000011",
        userId: "00000000-0000-4000-8000-000000000012",
        canonicalModelId: "vendor/model",
        providerSlug: "provider",
        status: "pending_reconciliation",
        reconciliationStatus: "pending",
        promptTokens: 12n,
        completionTokens: 3n,
        totalTokens: 15n,
        reservedChargeIdr: { toString: () => "1500" },
        providerCostIdr: { toString: () => "1700" },
        customerChargeIdr: null,
        errorCode: "USAGE_MISSING",
        startedAt: new Date("2026-11-14T00:00:00.000Z"),
        completedAt: null,
        settledAt: null,
      }],
    },
  } as unknown as DatabaseClient;
  const { server, baseUrl } = await startAdminServer(database);
  try {
    const response = await fetch(`${baseUrl}/api/v1/admin/usage/reconciliation?limit=5`, {
      headers: { "x-test-role": "admin" },
    });
    const body = await response.json() as { data: Array<Record<string, unknown>> };
    assert.equal(response.status, 200);
    assert.equal(body.data[0]?.prompt_tokens, "12");
    assert.equal(body.data[0]?.reserved_charge_idr, "1500");
    assert.equal(body.data[0]?.customer_charge_idr, null);
  } finally {
    await closeServer(server);
  }
});


test("audit filters reject an inverted time range before querying the database", async () => {
  const database = {} as unknown as DatabaseClient;
  const { server, baseUrl } = await startAdminServer(database);
  try {
    const response = await fetch(
      `${baseUrl}/api/v1/admin/audit-logs?since=2026-11-14T10:00:00Z&until=2026-11-14T09:00:00Z`,
      { headers: { "x-test-role": "admin" } },
    );
    assert.equal(response.status, 400);
  } finally {
    await closeServer(server);
  }
});


test("queue metrics endpoint is read-only and exposes counts but no job payloads", async () => {
  const database = {} as unknown as DatabaseClient;
  const queueMetrics = { readCounts: async () => ({
    waiting: 3, active: 2, delayed: 1, completed: 40, failed: 5,
    paused: 0, waiting_children: 0, prioritized: 0,
  }) };
  const { server, baseUrl } = await startAdminServer(database, queueMetrics);
  try {
    const response = await fetch(`${baseUrl}/api/v1/admin/operations/queue`, {
      headers: { "x-test-role": "admin" },
    });
    const body = await response.json() as {
      as_of: string; counts: Record<string, number>; dead_letter_queue_configured: boolean;
    };
    assert.equal(response.status, 200);
    assert.ok(Number.isFinite(Date.parse(body.as_of)));
    assert.deepEqual(body.counts, {
      waiting: 3, active: 2, delayed: 1, completed: 40, failed: 5,
      paused: 0, waiting_children: 0, prioritized: 0,
    });
    assert.equal(body.dead_letter_queue_configured, false);
    assert.equal(JSON.stringify(body).includes("job payload"), false);
  } finally { await closeServer(server); }
});

test("queue metrics endpoint fails closed when Redis metrics are not configured", async () => {
  const { server, baseUrl } = await startAdminServer({} as unknown as DatabaseClient);
  try {
    const response = await fetch(`${baseUrl}/api/v1/admin/operations/queue`, {
      headers: { "x-test-role": "admin" },
    });
    const body = await response.json() as { error?: { code?: string } };
    assert.equal(response.status, 503);
    assert.equal(body.error?.code, "QUEUE_METRICS_UNAVAILABLE");
  } finally { await closeServer(server); }
});

test("queue metrics endpoint sanitizes Redis failures", async () => {
  const queueMetrics = { readCounts: async () => { throw new Error("redis://user:secret@redis.internal"); } };
  const { server, baseUrl } = await startAdminServer({} as unknown as DatabaseClient, queueMetrics);
  try {
    const response = await fetch(`${baseUrl}/api/v1/admin/operations/queue`, {
      headers: { "x-test-role": "admin" },
    });
    const raw = await response.text();
    assert.equal(response.status, 503);
    assert.equal(raw.includes("secret"), false);
    assert.equal(raw.includes("redis.internal"), false);
  } finally { await closeServer(server); }
});


test("failed queue job list is bounded, paginated and exposes only safe metadata", async () => {
  const requests: Array<{ offset: number; limit: number }> = [];
  const queueFailedJobsReader = {
    readFailedJobs: async (offset: number, limit: number) => {
      requests.push({ offset, limit });
      return {
        data: [{
          id: "unknown",
          name: "unknown",
          state: "failed" as const,
          attempts_made: 2,
          attempts_allowed: 3,
          created_at: "2026-11-18T03:00:00.000Z",
          processed_at: "2026-11-18T03:00:01.000Z",
          finished_at: "2026-11-18T03:00:02.000Z",
        }],
        total: 3,
      };
    },
  };
  const { server, baseUrl } = await startAdminServer(
    {} as unknown as DatabaseClient,
    undefined,
    undefined,
    queueFailedJobsReader,
  );
  try {
    const response = await fetch(
      `${baseUrl}/api/v1/admin/operations/queue/failed?limit=1&offset=1`,
      { headers: { "x-test-role": "admin" } },
    );
    const body = await response.json() as {
      as_of: string;
      data: Array<Record<string, unknown>>;
      pagination: { offset: number; limit: number; total: number; next_offset: number | null };
    };
    assert.equal(response.status, 200);
    assert.ok(Number.isFinite(Date.parse(body.as_of)));
    assert.deepEqual(body.data[0], {
      id: "unknown",
      name: "unknown",
      state: "failed",
      attempts_made: 2,
      attempts_allowed: 3,
      created_at: "2026-11-18T03:00:00.000Z",
      processed_at: "2026-11-18T03:00:01.000Z",
      finished_at: "2026-11-18T03:00:02.000Z",
    });
    assert.deepEqual(body.pagination, { offset: 1, limit: 1, total: 3, next_offset: 2 });
    assert.deepEqual(requests, [{ offset: 1, limit: 1 }]);
    const serialized = JSON.stringify(body);
    assert.equal(serialized.includes("customer-123"), false);
    assert.equal(serialized.includes("failedReason"), false);
    assert.equal(serialized.includes("stacktrace"), false);
    assert.equal(serialized.includes("payload"), false);
  } finally {
    await closeServer(server);
  }
});

test("failed queue job list rejects unbounded offsets and fails closed on Redis errors", async () => {
  let reads = 0;
  const queueFailedJobsReader = {
    readFailedJobs: async () => {
      reads += 1;
      throw new Error("redis://user:secret@redis.internal");
    },
  };
  const configured = await startAdminServer(
    {} as unknown as DatabaseClient,
    undefined,
    undefined,
    queueFailedJobsReader,
  );
  try {
    const invalid = await fetch(
      `${configured.baseUrl}/api/v1/admin/operations/queue/failed?offset=5001`,
      { headers: { "x-test-role": "admin" } },
    );
    assert.equal(invalid.status, 400);
    assert.equal(reads, 0);

    const unavailable = await fetch(
      `${configured.baseUrl}/api/v1/admin/operations/queue/failed?limit=10`,
      { headers: { "x-test-role": "admin" } },
    );
    const raw = await unavailable.text();
    assert.equal(unavailable.status, 503);
    assert.equal(raw.includes("secret"), false);
    assert.equal(raw.includes("redis.internal"), false);
    assert.equal(reads, 1);
  } finally {
    await closeServer(configured.server);
  }

  const unconfigured = await startAdminServer({} as unknown as DatabaseClient);
  try {
    const response = await fetch(
      `${unconfigured.baseUrl}/api/v1/admin/operations/queue/failed`,
      { headers: { "x-test-role": "admin" } },
    );
    const body = await response.json() as { error?: { code?: string } };
    assert.equal(response.status, 503);
    assert.equal(body.error?.code, "QUEUE_FAILED_JOBS_UNAVAILABLE");
  } finally {
    await closeServer(unconfigured.server);
  }
});

test("queue job inspection returns only safe metadata to an authorized admin", async () => {
  const requested: string[] = [];
  const queueJobReader = {
    readJob: async (jobId: string) => {
      requested.push(jobId);
      return {
        id: jobId,
        name: "catalog.openrouter.sync",
        state: "failed" as const,
        attempts_made: 3,
        attempts_allowed: 3,
        created_at: "2026-11-17T03:00:00.000Z",
        processed_at: "2026-11-17T03:00:01.000Z",
        finished_at: "2026-11-17T03:00:02.000Z",
      };
    },
  };
  const { server, baseUrl } = await startAdminServer(
    {} as unknown as DatabaseClient,
    undefined,
    queueJobReader,
  );
  try {
    const response = await fetch(
      `${baseUrl}/api/v1/admin/operations/queue/jobs/catalog-openrouter-sync-6-hourly`,
      { headers: { "x-test-role": "admin" } },
    );
    const body = await response.json() as { as_of: string; job: Record<string, unknown> };
    assert.equal(response.status, 200);
    assert.ok(Number.isFinite(Date.parse(body.as_of)));
    assert.deepEqual(body.job, {
      id: "catalog-openrouter-sync-6-hourly",
      name: "catalog.openrouter.sync",
      state: "failed",
      attempts_made: 3,
      attempts_allowed: 3,
      created_at: "2026-11-17T03:00:00.000Z",
      processed_at: "2026-11-17T03:00:01.000Z",
      finished_at: "2026-11-17T03:00:02.000Z",
    });
    assert.deepEqual(requested, ["catalog-openrouter-sync-6-hourly"]);
    assert.equal(JSON.stringify(body).includes("failedReason"), false);
    assert.equal(JSON.stringify(body).includes("stacktrace"), false);
    assert.equal(JSON.stringify(body).includes("payload"), false);
  } finally {
    await closeServer(server);
  }
});

test("queue job inspection rejects invalid IDs, returns 404 for missing jobs and 503 when unavailable", async () => {
  let reads = 0;
  const queueJobReader = { readJob: async () => { reads += 1; return null; } };
  const { server, baseUrl } = await startAdminServer(
    {} as unknown as DatabaseClient,
    undefined,
    queueJobReader,
  );
  try {
    const invalid = await fetch(
      `${baseUrl}/api/v1/admin/operations/queue/jobs/bad%20id`,
      { headers: { "x-test-role": "admin" } },
    );
    assert.equal(invalid.status, 400);
    assert.equal(reads, 0);

    const missing = await fetch(
      `${baseUrl}/api/v1/admin/operations/queue/jobs/not-found`,
      { headers: { "x-test-role": "admin" } },
    );
    assert.equal(missing.status, 404);
    assert.equal(reads, 1);
  } finally {
    await closeServer(server);
  }

  const unavailable = await startAdminServer({} as unknown as DatabaseClient);
  try {
    const response = await fetch(
      `${unavailable.baseUrl}/api/v1/admin/operations/queue/jobs/job-123`,
      { headers: { "x-test-role": "admin" } },
    );
    const body = await response.json() as { error?: { code?: string } };
    assert.equal(response.status, 503);
    assert.equal(body.error?.code, "QUEUE_INSPECTION_UNAVAILABLE");
  } finally {
    await closeServer(unavailable.server);
  }
});
