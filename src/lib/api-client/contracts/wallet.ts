import type {
  ApiResult,
  DateRangeQuery,
  ISODateString,
  Page,
  PageQuery,
  RequestOptions,
} from "../types";

export type TransactionType =
  | "top_up"
  | "usage_debit"
  | "refund"
  | "adjustment"
  | "reservation_release";

export type TransactionStatus =
  | "settled"
  | "pending"
  | "failed"
  | "reversed"
  | "pending_reconciliation";

export interface WalletSnapshot {
  simulated: true;
  currency: "IDR";
  availableBalance: number;
  reservedBalance: number;
  totalTopUp: number;
  totalDebit: number;
  updatedAt: ISODateString;
  stale: boolean;
  connection: "live" | "reconnecting" | "offline";
}

export interface WalletTransaction {
  id: string;
  type: TransactionType;
  status: TransactionStatus;
  /** Signed IDR amount. Negative values are debits. */
  amount: number;
  currency: "IDR";
  description: string;
  referenceId: string;
  createdAt: ISODateString;
  simulated: true;
}

export interface TransactionQuery extends PageQuery, DateRangeQuery {
  type?: TransactionType;
  status?: TransactionStatus;
}

export type TopUpMethod =
  | "qris"
  | "virtual-account"
  | "bank-transfer"
  | "e-wallet";

export interface TopUpInput {
  amount: number;
  method: TopUpMethod;
}

export interface TopUpSimulation {
  id: string;
  simulated: true;
  /** The demo never creates a real payment intent. */
  isRealPayment: false;
  status: "simulated_pending" | "simulated_completed" | "simulated_failed";
  amount: number;
  currency: "IDR";
  method: TopUpMethod;
  createdAt: ISODateString;
  expiresAt: ISODateString;
  message: string;
  timeline: Array<{ at: ISODateString; label: string; done: boolean }>;
}

export interface WalletService {
  getSnapshot(options?: RequestOptions): Promise<ApiResult<WalletSnapshot>>;
  listTransactions(
    query?: TransactionQuery,
    options?: RequestOptions,
  ): Promise<ApiResult<Page<WalletTransaction>>>;
  createTopUp(
    input: TopUpInput,
    options?: RequestOptions,
  ): Promise<ApiResult<TopUpSimulation>>;
  getTopUp(
    id: string,
    options?: RequestOptions,
  ): Promise<ApiResult<TopUpSimulation>>;
}
