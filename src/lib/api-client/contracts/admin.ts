import type {
  ApiResult,
  ISODateString,
  Page,
  PageQuery,
  RequestOptions,
} from "../types";
import type { ModelStatus } from "./catalog";

export interface AdminOverview {
  revenueIdr: number;
  topUpIdr: number;
  debitIdr: number;
  marginIdr: number;
  upstreamCostUsd: number;
  requests: number;
  errorRatePercent: number;
  reservedBalanceIdr: number;
  pendingReconciliationCount: number;
  activeUsers: number;
  generatedAt: ISODateString;
  simulated: true;
}

export interface AdminUser {
  id: string;
  name: string;
  email: string;
  role: "user" | "admin";
  status: "active" | "suspended" | "pending";
  balanceIdr: number;
  createdAt: ISODateString;
  simulated: true;
}

export interface AdminModelRow {
  id: string;
  name: string;
  developerName: string;
  status: ModelStatus;
  budgetEligible: boolean;
  lastSyncedAt: ISODateString;
  simulated: true;
}

export interface AdminProviderRow {
  id: string;
  name: string;
  status: "operational" | "degraded" | "unavailable";
  models: number;
  lastCheckedAt: ISODateString;
  simulated: true;
}

export interface AdminPaymentRow {
  id: string;
  userId: string;
  amountIdr: number;
  method: string;
  status: "pending" | "paid" | "failed" | "expired" | "refunded";
  createdAt: ISODateString;
  simulated: true;
}

export interface AdminAuditEntry {
  id: string;
  actor: string;
  action: string;
  target: string;
  reason: string;
  createdAt: ISODateString;
  simulated: true;
}

export interface AdminMutationResult {
  simulated: true;
  /** Demo mutations never persist. The UI must treat the change as local-only. */
  applied: false;
  message: string;
  auditEntry: AdminAuditEntry;
}

export interface AdminService {
  getOverview(options?: RequestOptions): Promise<ApiResult<AdminOverview>>;
  listUsers(
    query?: PageQuery & { search?: string; status?: AdminUser["status"] },
    options?: RequestOptions,
  ): Promise<ApiResult<Page<AdminUser>>>;
  listModels(
    query?: PageQuery & { search?: string },
    options?: RequestOptions,
  ): Promise<ApiResult<Page<AdminModelRow>>>;
  listProviders(options?: RequestOptions): Promise<ApiResult<AdminProviderRow[]>>;
  listPayments(
    query?: PageQuery,
    options?: RequestOptions,
  ): Promise<ApiResult<Page<AdminPaymentRow>>>;
  listAuditLogs(
    query?: PageQuery,
    options?: RequestOptions,
  ): Promise<ApiResult<Page<AdminAuditEntry>>>;
  setUserStatus(
    input: { userId: string; status: "active" | "suspended"; reason: string },
    options?: RequestOptions,
  ): Promise<ApiResult<AdminMutationResult>>;
  setModelStatus(
    input: { modelId: string; status: ModelStatus; reason: string },
    options?: RequestOptions,
  ): Promise<ApiResult<AdminMutationResult>>;
  refreshProvider(
    input: { providerId: string },
    options?: RequestOptions,
  ): Promise<ApiResult<AdminMutationResult>>;
}
