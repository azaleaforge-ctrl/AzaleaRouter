import { Router } from "express";
import { z } from "zod";
import type { DatabaseClient } from "@azalea-router/database";
import { requirePermission } from "../middleware/authorization.js";
import "../auth/types.js";

const pageSchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(25),
  cursor: z.string().uuid().optional(),
}).strict();

const auditQuerySchema = pageSchema.extend({
  actor_id: z.string().uuid().optional(),
  action: z.string().trim().min(1).max(120).optional(),
  resource_type: z.string().trim().min(1).max(80).optional(),
  since: z.string().datetime({ offset: true }).optional(),
  until: z.string().datetime({ offset: true }).optional(),
}).strict().superRefine((value, context) => {
  if (value.since && value.until && Date.parse(value.since) > Date.parse(value.until)) {
    context.addIssue({
      code: "custom",
      path: ["until"],
      message: "until must be greater than or equal to since.",
    });
  }
});

function decimalString(value: { toString(): string } | null | undefined): string | null {
  return value?.toString() ?? null;
}

export interface AdminRouterOptions {
  database: DatabaseClient;
}

export function createAdminRouter(options: AdminRouterOptions): Router {
  const router = Router();

  router.get("/admin/operations/summary", requirePermission("operations:read"), async (_req, res) => {
    const now = new Date();
    const [
      usageReconciliationRequired,
      paymentWebhooksPending,
      outboxEventsPending,
      filesQuarantined,
    ] = await Promise.all([
      options.database.usageRecord.count({
        where: { reconciliationStatus: "required" },
      }),
      options.database.paymentWebhook.count({
        where: { status: { in: ["received", "failed"] } },
      }),
      options.database.outboxEvent.count({
        where: {
          publishedAt: null,
          OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
        },
      }),
      options.database.fileAttachment.count({
        where: { status: "QUARANTINED", deletedAt: null },
      }),
    ]);

    res.status(200).json({
      as_of: now.toISOString(),
      counts: {
        usage_reconciliation_required: usageReconciliationRequired,
        payment_webhooks_pending_or_failed: paymentWebhooksPending,
        outbox_events_pending: outboxEventsPending,
        files_quarantined: filesQuarantined,
      },
    });
  });

  router.get("/admin/usage/reconciliation", requirePermission("operations:read"), async (req, res) => {
    const query = pageSchema.parse(req.query);
    const rows = await options.database.usageRecord.findMany({
      where: { reconciliationStatus: "required" },
      orderBy: [{ startedAt: "desc" }, { id: "desc" }],
      take: query.limit + 1,
      ...(query.cursor ? { cursor: { id: query.cursor }, skip: 1 } : {}),
      select: {
        id: true,
        userId: true,
        canonicalModelId: true,
        providerSlug: true,
        status: true,
        reconciliationStatus: true,
        promptTokens: true,
        completionTokens: true,
        totalTokens: true,
        reservedChargeIdr: true,
        providerCostIdr: true,
        customerChargeIdr: true,
        errorCode: true,
        startedAt: true,
        completedAt: true,
        settledAt: true,
      },
    });

    const hasMore = rows.length > query.limit;
    const page = hasMore ? rows.slice(0, query.limit) : rows;
    res.status(200).json({
      data: page.map((row) => ({
        id: row.id,
        user_id: row.userId,
        canonical_model_id: row.canonicalModelId,
        provider: row.providerSlug,
        status: row.status,
        reconciliation_status: row.reconciliationStatus,
        prompt_tokens: row.promptTokens.toString(),
        completion_tokens: row.completionTokens.toString(),
        total_tokens: row.totalTokens.toString(),
        reserved_charge_idr: decimalString(row.reservedChargeIdr),
        provider_cost_idr: decimalString(row.providerCostIdr),
        customer_charge_idr: decimalString(row.customerChargeIdr),
        error_code: row.errorCode,
        started_at: row.startedAt.toISOString(),
        completed_at: row.completedAt?.toISOString() ?? null,
        settled_at: row.settledAt?.toISOString() ?? null,
      })),
      next_cursor: hasMore ? page.at(-1)?.id ?? null : null,
    });
  });

  router.get("/admin/audit-logs", requirePermission("audit:read"), async (req, res) => {
    const query = auditQuerySchema.parse(req.query);
    const rows = await options.database.auditLog.findMany({
      where: {
        ...(query.actor_id ? { actorId: query.actor_id } : {}),
        ...(query.action ? { action: query.action } : {}),
        ...(query.resource_type ? { resourceType: query.resource_type } : {}),
        ...(query.since || query.until
          ? {
              createdAt: {
                ...(query.since ? { gte: new Date(query.since) } : {}),
                ...(query.until ? { lte: new Date(query.until) } : {}),
              },
            }
          : {}),
      },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: query.limit + 1,
      ...(query.cursor ? { cursor: { id: query.cursor }, skip: 1 } : {}),
      select: {
        id: true,
        actorId: true,
        actorRole: true,
        action: true,
        resourceType: true,
        resourceId: true,
        requestId: true,
        reason: true,
        beforeJson: true,
        afterJson: true,
        createdAt: true,
      },
    });

    const hasMore = rows.length > query.limit;
    const page = hasMore ? rows.slice(0, query.limit) : rows;
    res.status(200).json({
      data: page.map((row) => ({
        id: row.id,
        actor_id: row.actorId,
        actor_role: row.actorRole,
        action: row.action,
        resource_type: row.resourceType,
        resource_id: row.resourceId,
        request_id: row.requestId,
        reason_present: Boolean(row.reason),
        before_present: row.beforeJson !== null,
        after_present: row.afterJson !== null,
        created_at: row.createdAt.toISOString(),
      })),
      next_cursor: hasMore ? page.at(-1)?.id ?? null : null,
    });
  });

  return router;
}
