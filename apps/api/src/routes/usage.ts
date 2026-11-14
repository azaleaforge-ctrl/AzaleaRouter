import { Router } from "express";
import { z } from "zod";
import type { DatabaseClient } from "@azalea-router/database";
import { UsageService } from "@azalea-router/billing";
import { requireActiveAccount } from "../middleware/authorization.js";
import { requireCsrf } from "../middleware/csrf.js";
import { HttpError } from "../lib/http-error.js";
import "../auth/types.js";

const dateSchema = z.string().datetime({ offset: true }).transform((value) => new Date(value));
const rangeSchema = z.object({
  from: dateSchema.optional(),
  to: dateSchema.optional(),
}).strict();

const listSchema = z.object({
  from: dateSchema.optional(),
  to: dateSchema.optional(),
  limit: z.coerce.number().int().min(1).max(100).default(25),
  cursor: z.string().uuid().optional(),
  status: z.enum(["started", "streaming", "settled", "failed", "released", "pending_reconciliation"]).optional(),
}).strict();

function validateRange(from?: Date, to?: Date): void {
  if (from && to && from.getTime() > to.getTime()) {
    throw new HttpError(400, "USAGE_DATE_RANGE_INVALID", "The start date must be before the end date.");
  }
  if (to && to.getTime() > Date.now() + 60_000) {
    throw new HttpError(400, "USAGE_DATE_RANGE_INVALID", "The end date cannot be in the future.");
  }
  if (from && to && to.getTime() - from.getTime() > 366 * 24 * 60 * 60 * 1000) {
    throw new HttpError(400, "USAGE_DATE_RANGE_TOO_LARGE", "Usage queries are limited to a 366-day date range.");
  }
}

export function csvCell(value: unknown): string {
  const text = value === null || value === undefined ? "" : String(value);
  // Prefix spreadsheet formula starters after optional whitespace. CSV quoting
  // alone does not stop Excel/LibreOffice from evaluating formula cells.
  const trimmed = text.trimStart();
  const safe = ["=", "+", "-", "@"].some((prefix) => trimmed.startsWith(prefix)) ? `'${text}` : text;
  return `"${safe.replaceAll('"', '""')}"`;
}

function decimal(value: { toString(): string } | string | null | undefined): string | null {
  if (value === null || value === undefined) return null;
  return typeof value === "string" ? value : value.toString();
}

function mapUsageRecord(record: {
  id: string;
  requestId: string;
  canonicalModelId: string;
  sourceModelId: string;
  providerSlug: string;
  source: string;
  status: string;
  reconciliationStatus: string;
  promptTokens: bigint;
  completionTokens: bigint;
  cachedTokens: bigint;
  reasoningTokens: bigint;
  totalTokens: bigint;
  providerCostIdr: { toString(): string } | null;
  customerChargeIdr: { toString(): string } | null;
  reservedChargeIdr: { toString(): string };
  currency: string;
  errorCode: string | null;
  startedAt: Date;
  completedAt: Date | null;
  settledAt: Date | null;
  latencyMs: number | null;
}) {
  return {
    id: record.id,
    request_id: record.requestId,
    model_id: record.canonicalModelId,
    source_model_id: record.sourceModelId,
    provider: record.providerSlug,
    source: record.source,
    status: record.status,
    reconciliation_status: record.reconciliationStatus,
    prompt_tokens: record.promptTokens.toString(),
    completion_tokens: record.completionTokens.toString(),
    cached_tokens: record.cachedTokens.toString(),
    reasoning_tokens: record.reasoningTokens.toString(),
    total_tokens: record.totalTokens.toString(),
    provider_cost_idr: decimal(record.providerCostIdr),
    customer_charge_idr: decimal(record.customerChargeIdr),
    reserved_charge_idr: decimal(record.reservedChargeIdr),
    currency: record.currency,
    error_code: record.errorCode,
    latency_ms: record.latencyMs,
    started_at: record.startedAt.toISOString(),
    completed_at: record.completedAt?.toISOString() ?? null,
    settled_at: record.settledAt?.toISOString() ?? null,
  };
}

export interface UsageRouterOptions {
  database: DatabaseClient;
  usage: UsageService;
  csrfCookieName: string;
  allowedOrigins: string[];
  exportMaximumRows?: number;
  exportLifetimeSeconds?: number;
}

export function createUsageRouter(options: UsageRouterOptions): Router {
  const router = Router();
  const active = requireActiveAccount();
  const csrf = requireCsrf({
    cookieName: options.csrfCookieName,
    allowedOrigins: options.allowedOrigins,
  });
  const maximumExportRows = options.exportMaximumRows ?? 5_000;
  const exportLifetimeSeconds = options.exportLifetimeSeconds ?? 24 * 60 * 60;
  const maximumExportBytes = 5 * 1024 * 1024;

  router.get("/usage/summary", active, async (req, res) => {
    const query = rangeSchema.parse(req.query);
    validateRange(query.from, query.to);
    const from = query.from ?? new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const to = query.to ?? new Date();

    const rows = await options.database.$queryRaw<Array<{
      request_count: string;
      settled_count: string;
      failed_count: string;
      pending_count: string;
      prompt_tokens: string;
      completion_tokens: string;
      cached_tokens: string;
      reasoning_tokens: string;
      total_tokens: string;
      provider_cost_idr: string;
      customer_charge_idr: string;
      reserved_charge_idr: string;
    }>>`
      SELECT
        COUNT(*)::text AS request_count,
        COUNT(*) FILTER (WHERE "status" = 'settled')::text AS settled_count,
        COUNT(*) FILTER (WHERE "status" IN ('failed','released'))::text AS failed_count,
        COUNT(*) FILTER (WHERE "status" = 'pending_reconciliation')::text AS pending_count,
        COALESCE(SUM("prompt_tokens"),0)::text AS prompt_tokens,
        COALESCE(SUM("completion_tokens"),0)::text AS completion_tokens,
        COALESCE(SUM("cached_tokens"),0)::text AS cached_tokens,
        COALESCE(SUM("reasoning_tokens"),0)::text AS reasoning_tokens,
        COALESCE(SUM("total_tokens"),0)::text AS total_tokens,
        COALESCE(SUM("provider_cost_idr"),0)::text AS provider_cost_idr,
        COALESCE(SUM("customer_charge_idr"),0)::text AS customer_charge_idr,
        COALESCE(SUM(
          CASE WHEN "status" IN ('started','streaming','completed','pending_reconciliation')
            THEN "reserved_charge_idr" ELSE 0 END
        ),0)::text AS reserved_charge_idr
      FROM "usage_records"
      WHERE "user_id" = ${req.auth!.userId}::uuid
        AND "started_at" >= ${from}
        AND "started_at" <= ${to}
    `;
    const total = rows[0] ?? {
      request_count: "0", settled_count: "0", failed_count: "0", pending_count: "0",
      prompt_tokens: "0", completion_tokens: "0", cached_tokens: "0", reasoning_tokens: "0",
      total_tokens: "0", provider_cost_idr: "0", customer_charge_idr: "0", reserved_charge_idr: "0",
    };
    res.status(200).json({
      range: { from: from.toISOString(), to: to.toISOString() },
      currency: "IDR",
      requests: {
        total: total.request_count,
        settled: total.settled_count,
        failed: total.failed_count,
        pending_reconciliation: total.pending_count,
      },
      tokens: {
        prompt: total.prompt_tokens,
        completion: total.completion_tokens,
        cached: total.cached_tokens,
        reasoning: total.reasoning_tokens,
        total: total.total_tokens,
      },
      costs: {
        provider_cost_idr: total.provider_cost_idr,
        charged_idr: total.customer_charge_idr,
        reserved_idr: total.reserved_charge_idr,
      },
    });
  });

  router.get("/usage/requests", active, async (req, res) => {
    const query = listSchema.parse(req.query);
    validateRange(query.from, query.to);
    const where = {
      userId: req.auth!.userId,
      ...(query.status ? { status: query.status } : {}),
      ...(query.from || query.to ? {
        startedAt: {
          ...(query.from ? { gte: query.from } : {}),
          ...(query.to ? { lte: query.to } : {}),
        },
      } : {}),
    };
    const records = await options.database.usageRecord.findMany({
      where,
      orderBy: [{ startedAt: "desc" }, { id: "desc" }],
      take: query.limit + 1,
      ...(query.cursor ? { cursor: { id: query.cursor }, skip: 1 } : {}),
    });
    const hasMore = records.length > query.limit;
    const page = hasMore ? records.slice(0, query.limit) : records;
    res.status(200).json({
      data: page.map(mapUsageRecord),
      next_cursor: hasMore ? page.at(-1)?.id ?? null : null,
    });
  });

  router.get("/usage/requests/:requestId", active, async (req, res) => {
    const record = await options.database.usageRecord.findFirst({
      where: { userId: req.auth!.userId, requestId: req.params.requestId },
    });
    if (!record) throw new HttpError(404, "USAGE_REQUEST_NOT_FOUND", "Usage request was not found.");
    res.status(200).json({ data: mapUsageRecord(record) });
  });

  router.post("/usage/exports", active, csrf, async (req, res) => {
    const input = rangeSchema.parse(req.body);
    validateRange(input.from, input.to);
    const from = input.from ?? new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const to = input.to ?? new Date();
    const rows = await options.database.usageRecord.findMany({
      where: {
        userId: req.auth!.userId,
        startedAt: { gte: from, lte: to },
      },
      orderBy: [{ startedAt: "asc" }, { id: "asc" }],
      take: maximumExportRows + 1,
    });
    if (rows.length > maximumExportRows) {
      throw new HttpError(413, "USAGE_EXPORT_TOO_LARGE", `The export exceeds the ${maximumExportRows}-row limit. Narrow the date range.`);
    }

    const headers = [
      "request_id", "started_at", "completed_at", "model_id", "source_model_id",
      "provider", "source", "status", "prompt_tokens", "completion_tokens",
      "cached_tokens", "reasoning_tokens", "total_tokens", "provider_cost_idr",
      "customer_charge_idr", "reserved_charge_idr", "currency", "latency_ms",
      "error_code",
    ];
    const csvRows = [
      headers,
      ...rows.map((row) => [
        row.requestId, row.startedAt.toISOString(), row.completedAt?.toISOString() ?? "",
        row.canonicalModelId, row.sourceModelId, row.providerSlug, row.source, row.status,
        row.promptTokens.toString(), row.completionTokens.toString(), row.cachedTokens.toString(),
        row.reasoningTokens.toString(), row.totalTokens.toString(),
        decimal(row.providerCostIdr) ?? "", decimal(row.customerChargeIdr) ?? "",
        decimal(row.reservedChargeIdr), row.currency, row.latencyMs ?? "", row.errorCode ?? "",
      ]),
    ];
    const csv = csvRows.map((row) => row.map(csvCell).join(",")).join("\r\n") + "\r\n";
    if (Buffer.byteLength(csv, "utf8") > maximumExportBytes) {
      throw new HttpError(413, "USAGE_EXPORT_TOO_LARGE", "The CSV export exceeds the 5 MiB limit. Narrow the date range.");
    }
    const created = await options.database.usageExport.create({
      data: {
        userId: req.auth!.userId,
        status: "completed",
        filters: { from: from.toISOString(), to: to.toISOString() },
        rowCount: rows.length,
        csvContent: csv,
        completedAt: now,
        expiresAt: new Date(now.getTime() + exportLifetimeSeconds * 1000),
      },
      select: { id: true, status: true, rowCount: true, createdAt: true, expiresAt: true },
    });
    res.status(201).json({
      export: {
        id: created.id,
        status: created.status,
        row_count: created.rowCount,
        created_at: created.createdAt.toISOString(),
        expires_at: created.expiresAt.toISOString(),
        download_path: `/api/v1/usage/exports/${created.id}`,
      },
    });
  });

  router.get("/usage/exports/:id", active, async (req, res) => {
    const id = z.string().uuid().parse(req.params.id);
    const record = await options.database.usageExport.findFirst({
      where: { id, userId: req.auth!.userId },
    });
    if (!record) throw new HttpError(404, "USAGE_EXPORT_NOT_FOUND", "Usage export was not found.");
    if (record.expiresAt.getTime() <= Date.now() || !record.csvContent) {
      throw new HttpError(410, "USAGE_EXPORT_EXPIRED", "Usage export has expired.");
    }
    res.status(200);
    res.setHeader("content-type", "text/csv; charset=utf-8");
    res.setHeader("content-disposition", `attachment; filename="azalea-router-usage-${record.id}.csv"`);
    res.setHeader("cache-control", "no-store");
    res.send(record.csvContent);
  });

  router.get("/usage/model-colors", active, async (req, res) => {
    const colors = await options.usage.getModelColors(req.auth!.userId);
    res.status(200).json({
      data: colors.map((item) => ({
        model_id: item.catalogModelId,
        canonical_slug: item.catalogModel.canonicalSlug,
        model_name: item.catalogModel.name,
        color: item.color,
        assignment_method: item.assignmentMethod,
        updated_at: item.updatedAt.toISOString(),
      })),
    });
  });

  router.put("/usage/model-colors/:modelId", active, csrf, async (req, res) => {
    const modelId = z.string().uuid().parse(req.params.modelId);
    const input = z.object({ color: z.string().regex(/^#[0-9A-Fa-f]{6}$/) }).strict().parse(req.body);
    try {
      const color = await options.usage.setModelColor(req.auth!.userId, modelId, input.color);
      res.status(200).json({
        model_id: color.catalogModelId,
        color: color.color,
        assignment_method: color.assignmentMethod,
        updated_at: color.updatedAt.toISOString(),
      });
    } catch (error) {
      if (error instanceof Error && error.message === "MODEL_NOT_FOUND") {
        throw new HttpError(404, "MODEL_NOT_FOUND", "Model was not found.");
      }
      throw error;
    }
  });

  return router;
}
