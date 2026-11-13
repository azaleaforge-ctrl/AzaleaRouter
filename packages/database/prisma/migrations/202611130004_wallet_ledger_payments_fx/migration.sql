CREATE TABLE "ledger_accounts" (
  "id" UUID NOT NULL,
  "code" VARCHAR(80) NOT NULL,
  "name" VARCHAR(160) NOT NULL,
  "account_type" VARCHAR(32) NOT NULL,
  "normal_balance" VARCHAR(8) NOT NULL,
  "currency" CHAR(3) NOT NULL,
  "owner_user_id" UUID,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL,
  CONSTRAINT "ledger_accounts_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "ledger_accounts_code_not_blank" CHECK (length(trim("code")) > 0),
  CONSTRAINT "ledger_accounts_account_type_check" CHECK ("account_type" IN ('asset','liability','equity','revenue','expense')),
  CONSTRAINT "ledger_accounts_normal_balance_check" CHECK ("normal_balance" IN ('debit','credit')),
  CONSTRAINT "ledger_accounts_currency_idr" CHECK ("currency" = 'IDR')
);
CREATE UNIQUE INDEX "ledger_accounts_code_key" ON "ledger_accounts"("code");
CREATE UNIQUE INDEX "ledger_accounts_owner_user_id_key" ON "ledger_accounts"("owner_user_id") WHERE "owner_user_id" IS NOT NULL;
ALTER TABLE "ledger_accounts" ADD CONSTRAINT "ledger_accounts_owner_user_id_fkey"
  FOREIGN KEY ("owner_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "wallet_accounts" (
  "id" UUID NOT NULL,
  "user_id" UUID NOT NULL,
  "ledger_account_id" UUID NOT NULL,
  "currency" CHAR(3) NOT NULL DEFAULT 'IDR',
  "status" VARCHAR(16) NOT NULL DEFAULT 'active',
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL,
  CONSTRAINT "wallet_accounts_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "wallet_accounts_currency_idr" CHECK ("currency" = 'IDR'),
  CONSTRAINT "wallet_accounts_status_check" CHECK ("status" IN ('active','frozen','closed'))
);
CREATE UNIQUE INDEX "wallet_accounts_user_id_key" ON "wallet_accounts"("user_id");
CREATE UNIQUE INDEX "wallet_accounts_ledger_account_id_key" ON "wallet_accounts"("ledger_account_id");
CREATE INDEX "wallet_accounts_status_currency_idx" ON "wallet_accounts"("status","currency");
ALTER TABLE "wallet_accounts" ADD CONSTRAINT "wallet_accounts_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "wallet_accounts" ADD CONSTRAINT "wallet_accounts_ledger_account_id_fkey"
  FOREIGN KEY ("ledger_account_id") REFERENCES "ledger_accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "ledger_transactions" (
  "id" UUID NOT NULL,
  "idempotency_key" VARCHAR(128) NOT NULL,
  "transaction_type" VARCHAR(40) NOT NULL,
  "currency" CHAR(3) NOT NULL,
  "status" VARCHAR(16) NOT NULL DEFAULT 'pending',
  "reference_type" VARCHAR(40),
  "reference_id" VARCHAR(128),
  "safe_metadata" JSONB,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "posted_at" TIMESTAMPTZ(6),
  CONSTRAINT "ledger_transactions_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "ledger_transactions_status_check" CHECK ("status" IN ('pending','posted','void')),
  CONSTRAINT "ledger_transactions_idempotency_not_blank" CHECK (length(trim("idempotency_key")) > 0),
  CONSTRAINT "ledger_transactions_posted_timestamp" CHECK (("status" = 'posted') = ("posted_at" IS NOT NULL))
);
CREATE UNIQUE INDEX "ledger_transactions_idempotency_key_key" ON "ledger_transactions"("idempotency_key");
CREATE INDEX "ledger_transactions_reference_idx" ON "ledger_transactions"("reference_type","reference_id");
CREATE INDEX "ledger_transactions_status_created_idx" ON "ledger_transactions"("status","created_at");

CREATE TABLE "ledger_entries" (
  "id" UUID NOT NULL,
  "ledger_transaction_id" UUID NOT NULL,
  "ledger_account_id" UUID NOT NULL,
  "direction" VARCHAR(8) NOT NULL,
  "amount" DECIMAL(38,0) NOT NULL,
  "currency" CHAR(3) NOT NULL,
  "memo" VARCHAR(255),
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ledger_entries_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "ledger_entries_direction_check" CHECK ("direction" IN ('debit','credit')),
  CONSTRAINT "ledger_entries_amount_positive" CHECK ("amount" > 0),
  CONSTRAINT "ledger_entries_currency_idr" CHECK ("currency" = 'IDR')
);
CREATE INDEX "ledger_entries_ledger_account_created_idx" ON "ledger_entries"("ledger_account_id","created_at");
CREATE INDEX "ledger_entries_transaction_idx" ON "ledger_entries"("ledger_transaction_id");
ALTER TABLE "ledger_entries" ADD CONSTRAINT "ledger_entries_transaction_fkey"
  FOREIGN KEY ("ledger_transaction_id") REFERENCES "ledger_transactions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ledger_entries" ADD CONSTRAINT "ledger_entries_account_fkey"
  FOREIGN KEY ("ledger_account_id") REFERENCES "ledger_accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "wallet_reservations" (
  "id" UUID NOT NULL,
  "user_id" UUID NOT NULL,
  "wallet_account_id" UUID NOT NULL,
  "idempotency_key" VARCHAR(128) NOT NULL,
  "amount" DECIMAL(38,0) NOT NULL,
  "currency" CHAR(3) NOT NULL DEFAULT 'IDR',
  "status" VARCHAR(16) NOT NULL DEFAULT 'reserved',
  "expires_at" TIMESTAMPTZ(6) NOT NULL,
  "ledger_transaction_id" UUID,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL,
  CONSTRAINT "wallet_reservations_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "wallet_reservations_amount_positive" CHECK ("amount" > 0),
  CONSTRAINT "wallet_reservations_currency_idr" CHECK ("currency" = 'IDR'),
  CONSTRAINT "wallet_reservations_status_check" CHECK ("status" IN ('reserved','settled','released','expired'))
);
CREATE UNIQUE INDEX "wallet_reservations_idempotency_key_key" ON "wallet_reservations"("idempotency_key");
CREATE UNIQUE INDEX "wallet_reservations_ledger_transaction_id_key" ON "wallet_reservations"("ledger_transaction_id") WHERE "ledger_transaction_id" IS NOT NULL;
CREATE INDEX "wallet_reservations_wallet_status_expiry_idx" ON "wallet_reservations"("wallet_account_id","status","expires_at");
CREATE INDEX "wallet_reservations_user_created_idx" ON "wallet_reservations"("user_id","created_at");
ALTER TABLE "wallet_reservations" ADD CONSTRAINT "wallet_reservations_user_fkey"
  FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "wallet_reservations" ADD CONSTRAINT "wallet_reservations_wallet_fkey"
  FOREIGN KEY ("wallet_account_id") REFERENCES "wallet_accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "wallet_reservations" ADD CONSTRAINT "wallet_reservations_ledger_transaction_fkey"
  FOREIGN KEY ("ledger_transaction_id") REFERENCES "ledger_transactions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "payment_intents" (
  "id" UUID NOT NULL,
  "user_id" UUID NOT NULL,
  "provider" VARCHAR(32) NOT NULL,
  "provider_reference" VARCHAR(255),
  "idempotency_key" VARCHAR(128) NOT NULL,
  "amount" DECIMAL(38,0) NOT NULL,
  "currency" CHAR(3) NOT NULL DEFAULT 'IDR',
  "status" VARCHAR(16) NOT NULL DEFAULT 'pending',
  "expires_at" TIMESTAMPTZ(6) NOT NULL,
  "safe_metadata" JSONB,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL,
  CONSTRAINT "payment_intents_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "payment_intents_amount_positive" CHECK ("amount" > 0),
  CONSTRAINT "payment_intents_currency_idr" CHECK ("currency" = 'IDR'),
  CONSTRAINT "payment_intents_status_check" CHECK ("status" IN ('pending','processing','paid','failed','expired','refunded'))
);
CREATE UNIQUE INDEX "payment_intents_provider_reference_key" ON "payment_intents"("provider_reference") WHERE "provider_reference" IS NOT NULL;
CREATE UNIQUE INDEX "payment_intents_idempotency_key_key" ON "payment_intents"("idempotency_key");
CREATE INDEX "payment_intents_user_created_idx" ON "payment_intents"("user_id","created_at");
CREATE INDEX "payment_intents_status_expiry_idx" ON "payment_intents"("status","expires_at");
ALTER TABLE "payment_intents" ADD CONSTRAINT "payment_intents_user_fkey"
  FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "payment_webhooks" (
  "id" UUID NOT NULL,
  "provider" VARCHAR(32) NOT NULL,
  "provider_event_id" VARCHAR(255) NOT NULL,
  "body_hash" CHAR(64) NOT NULL,
  "signature_verified_at" TIMESTAMPTZ(6) NOT NULL,
  "status" VARCHAR(16) NOT NULL DEFAULT 'received',
  "payment_intent_id" UUID,
  "processed_at" TIMESTAMPTZ(6),
  "safe_summary" JSONB,
  "received_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "payment_webhooks_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "payment_webhooks_body_hash_format" CHECK ("body_hash" ~ '^[0-9a-f]{64}$'),
  CONSTRAINT "payment_webhooks_status_check" CHECK ("status" IN ('received','processed','rejected','failed'))
);
CREATE UNIQUE INDEX "payment_webhooks_provider_event_key" ON "payment_webhooks"("provider","provider_event_id");
CREATE INDEX "payment_webhooks_intent_received_idx" ON "payment_webhooks"("payment_intent_id","received_at");
CREATE INDEX "payment_webhooks_status_received_idx" ON "payment_webhooks"("status","received_at");
ALTER TABLE "payment_webhooks" ADD CONSTRAINT "payment_webhooks_intent_fkey"
  FOREIGN KEY ("payment_intent_id") REFERENCES "payment_intents"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "fx_rate_snapshots" (
  "id" UUID NOT NULL,
  "base_currency" CHAR(3) NOT NULL,
  "quote_currency" CHAR(3) NOT NULL,
  "rate" DECIMAL(38,24) NOT NULL,
  "source" VARCHAR(80) NOT NULL,
  "source_fetched_at" TIMESTAMPTZ(6) NOT NULL,
  "payload_hash" CHAR(64) NOT NULL,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "fx_rate_snapshots_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "fx_rate_snapshots_pair_usd_idr" CHECK ("base_currency" = 'USD' AND "quote_currency" = 'IDR'),
  CONSTRAINT "fx_rate_snapshots_rate_positive" CHECK ("rate" > 0),
  CONSTRAINT "fx_rate_snapshots_hash_format" CHECK ("payload_hash" ~ '^[0-9a-f]{64}$')
);
CREATE INDEX "fx_rate_snapshots_pair_fetched_idx" ON "fx_rate_snapshots"("base_currency","quote_currency","source_fetched_at");

CREATE TABLE "pricing_policy_snapshots" (
  "id" UUID NOT NULL,
  "catalog_price_snapshot_id" UUID NOT NULL,
  "fx_rate_snapshot_id" UUID NOT NULL,
  "policy_version" VARCHAR(64) NOT NULL,
  "markup_basis_points" INTEGER NOT NULL,
  "fixed_fee_idr" DECIMAL(38,0) NOT NULL DEFAULT 0,
  "maximum_stale_seconds" INTEGER NOT NULL,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "pricing_policy_snapshots_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "pricing_policy_snapshots_markup_range" CHECK ("markup_basis_points" BETWEEN 0 AND 100000),
  CONSTRAINT "pricing_policy_snapshots_fixed_fee_nonnegative" CHECK ("fixed_fee_idr" >= 0),
  CONSTRAINT "pricing_policy_snapshots_stale_positive" CHECK ("maximum_stale_seconds" > 0)
);
CREATE INDEX "pricing_policy_snapshots_price_created_idx" ON "pricing_policy_snapshots"("catalog_price_snapshot_id","created_at");
CREATE INDEX "pricing_policy_snapshots_fx_idx" ON "pricing_policy_snapshots"("fx_rate_snapshot_id");
ALTER TABLE "pricing_policy_snapshots" ADD CONSTRAINT "pricing_policy_snapshots_catalog_price_fkey"
  FOREIGN KEY ("catalog_price_snapshot_id") REFERENCES "catalog_price_snapshots"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "pricing_policy_snapshots" ADD CONSTRAINT "pricing_policy_snapshots_fx_rate_fkey"
  FOREIGN KEY ("fx_rate_snapshot_id") REFERENCES "fx_rate_snapshots"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- A transaction can be created pending, populated, then posted exactly once.
CREATE FUNCTION "guard_ledger_transaction_mutation"() RETURNS trigger AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    IF OLD."status" = 'posted' THEN RAISE EXCEPTION 'posted ledger transactions are immutable'; END IF;
    RETURN OLD;
  END IF;
  IF OLD."status" = 'posted' THEN
    RAISE EXCEPTION 'posted ledger transactions are immutable';
  END IF;
  IF NEW."id" <> OLD."id" OR NEW."idempotency_key" <> OLD."idempotency_key"
     OR NEW."currency" <> OLD."currency" OR NEW."created_at" <> OLD."created_at" THEN
    RAISE EXCEPTION 'ledger transaction identity is immutable';
  END IF;
  IF OLD."status" <> 'pending' OR NEW."status" NOT IN ('posted','void') THEN
    RAISE EXCEPTION 'invalid ledger transaction transition';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "ledger_transactions_guard"
  BEFORE UPDATE OR DELETE ON "ledger_transactions"
  FOR EACH ROW EXECUTE FUNCTION "guard_ledger_transaction_mutation"();

CREATE FUNCTION "guard_ledger_entry_insert"() RETURNS trigger AS $$
DECLARE
  transaction_status TEXT;
  transaction_currency CHAR(3);
  account_currency CHAR(3);
BEGIN
  SELECT "status","currency" INTO transaction_status,transaction_currency
    FROM "ledger_transactions" WHERE "id" = NEW."ledger_transaction_id";
  SELECT "currency" INTO account_currency FROM "ledger_accounts" WHERE "id" = NEW."ledger_account_id";
  IF transaction_status IS DISTINCT FROM 'pending' THEN
    RAISE EXCEPTION 'ledger entries may only be added to pending transactions';
  END IF;
  IF transaction_currency IS DISTINCT FROM NEW."currency" OR account_currency IS DISTINCT FROM NEW."currency" THEN
    RAISE EXCEPTION 'ledger entry currency mismatch';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
CREATE TRIGGER "ledger_entries_insert_guard"
  BEFORE INSERT ON "ledger_entries"
  FOR EACH ROW EXECUTE FUNCTION "guard_ledger_entry_insert"();

CREATE FUNCTION "reject_ledger_entry_mutation"() RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'ledger entries are immutable';
END;
$$ LANGUAGE plpgsql;
CREATE TRIGGER "ledger_entries_no_update_delete"
  BEFORE UPDATE OR DELETE ON "ledger_entries"
  FOR EACH ROW EXECUTE FUNCTION "reject_ledger_entry_mutation"();

CREATE FUNCTION "assert_posted_ledger_transaction_balanced"() RETURNS trigger AS $$
DECLARE
  txn_id UUID;
  txn_status TEXT;
  debit_total NUMERIC(38,0);
  credit_total NUMERIC(38,0);
  entry_count BIGINT;
BEGIN
  txn_id := CASE WHEN TG_OP = 'DELETE' THEN OLD."id" ELSE NEW."id" END;
  IF TG_TABLE_NAME = 'ledger_entries' THEN
    txn_id := CASE WHEN TG_OP = 'DELETE' THEN OLD."ledger_transaction_id" ELSE NEW."ledger_transaction_id" END;
  END IF;
  SELECT "status" INTO txn_status FROM "ledger_transactions" WHERE "id" = txn_id;
  IF txn_status = 'posted' THEN
    SELECT COUNT(*),
      COALESCE(SUM(CASE WHEN "direction" = 'debit' THEN "amount" ELSE 0 END),0),
      COALESCE(SUM(CASE WHEN "direction" = 'credit' THEN "amount" ELSE 0 END),0)
    INTO entry_count,debit_total,credit_total
    FROM "ledger_entries" WHERE "ledger_transaction_id" = txn_id;
    IF entry_count < 2 OR debit_total <> credit_total THEN
      RAISE EXCEPTION 'posted ledger transaction must contain at least two balanced entries';
    END IF;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE CONSTRAINT TRIGGER "ledger_transactions_balance_check"
  AFTER INSERT OR UPDATE ON "ledger_transactions"
  DEFERRABLE INITIALLY DEFERRED
  FOR EACH ROW EXECUTE FUNCTION "assert_posted_ledger_transaction_balanced"();
CREATE CONSTRAINT TRIGGER "ledger_entries_balance_check"
  AFTER INSERT ON "ledger_entries"
  DEFERRABLE INITIALLY DEFERRED
  FOR EACH ROW EXECUTE FUNCTION "assert_posted_ledger_transaction_balanced"();

CREATE FUNCTION "guard_wallet_reservation_transition"() RETURNS trigger AS $$
BEGIN
  IF OLD."id" <> NEW."id" OR OLD."user_id" <> NEW."user_id"
     OR OLD."wallet_account_id" <> NEW."wallet_account_id"
     OR OLD."idempotency_key" <> NEW."idempotency_key"
     OR OLD."amount" <> NEW."amount" OR OLD."currency" <> NEW."currency" THEN
    RAISE EXCEPTION 'wallet reservation identity and amount are immutable';
  END IF;
  IF OLD."status" <> 'reserved' OR NEW."status" NOT IN ('settled','released','expired') THEN
    RAISE EXCEPTION 'invalid wallet reservation transition';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
CREATE TRIGGER "wallet_reservations_guard"
  BEFORE UPDATE ON "wallet_reservations"
  FOR EACH ROW EXECUTE FUNCTION "guard_wallet_reservation_transition"();
CREATE FUNCTION "reject_wallet_reservation_delete"() RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'wallet reservation records are immutable and cannot be deleted';
END;
$$ LANGUAGE plpgsql;
CREATE TRIGGER "wallet_reservations_no_delete"
  BEFORE DELETE ON "wallet_reservations"
  FOR EACH ROW EXECUTE FUNCTION "reject_wallet_reservation_delete"();

CREATE FUNCTION "guard_payment_intent_transition"() RETURNS trigger AS $$
BEGIN
  IF OLD."id" <> NEW."id" OR OLD."user_id" <> NEW."user_id"
     OR OLD."provider" <> NEW."provider"
     OR OLD."idempotency_key" <> NEW."idempotency_key"
     OR OLD."amount" <> NEW."amount" OR OLD."currency" <> NEW."currency"
     OR OLD."expires_at" <> NEW."expires_at" THEN
    RAISE EXCEPTION 'payment intent identity, provider, amount and expiry are immutable';
  END IF;
  IF OLD."provider_reference" IS NOT NULL
     AND OLD."provider_reference" IS DISTINCT FROM NEW."provider_reference" THEN
    RAISE EXCEPTION 'payment provider reference can only be assigned once';
  END IF;
  IF OLD."status" IN ('paid','refunded','failed','expired') THEN
    RAISE EXCEPTION 'terminal payment intent is immutable';
  END IF;
  IF NOT (
    (OLD."status" = 'pending' AND NEW."status" IN ('pending','processing','paid','failed','expired')) OR
    (OLD."status" = 'processing' AND NEW."status" IN ('paid','failed','expired','refunded'))
  ) THEN
    RAISE EXCEPTION 'invalid payment intent transition';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
CREATE TRIGGER "payment_intents_guard"
  BEFORE UPDATE ON "payment_intents"
  FOR EACH ROW EXECUTE FUNCTION "guard_payment_intent_transition"();
CREATE FUNCTION "reject_payment_intent_delete"() RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'payment intent history cannot be deleted';
END;
$$ LANGUAGE plpgsql;
CREATE TRIGGER "payment_intents_no_delete"
  BEFORE DELETE ON "payment_intents"
  FOR EACH ROW EXECUTE FUNCTION "reject_payment_intent_delete"();

CREATE FUNCTION "guard_payment_webhook_processing"() RETURNS trigger AS $
BEGIN
  IF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION 'payment webhook inbox records cannot be deleted';
  END IF;
  IF OLD."id" <> NEW."id"
     OR OLD."provider" <> NEW."provider"
     OR OLD."provider_event_id" <> NEW."provider_event_id"
     OR OLD."body_hash" <> NEW."body_hash"
     OR OLD."signature_verified_at" <> NEW."signature_verified_at"
     OR OLD."payment_intent_id" IS DISTINCT FROM NEW."payment_intent_id"
     OR OLD."received_at" <> NEW."received_at"
     OR OLD."safe_summary" IS DISTINCT FROM NEW."safe_summary" THEN
    RAISE EXCEPTION 'payment webhook receipt identity is immutable';
  END IF;
  IF OLD."status" <> 'received' OR NEW."status" NOT IN ('processed','rejected','failed') THEN
    RAISE EXCEPTION 'invalid payment webhook processing transition';
  END IF;
  IF NEW."status" = 'processed' AND NEW."processed_at" IS NULL THEN
    RAISE EXCEPTION 'processed webhook requires processing timestamp';
  END IF;
  RETURN NEW;
END;
$ LANGUAGE plpgsql;
CREATE TRIGGER "payment_webhooks_processing_guard"
  BEFORE UPDATE OR DELETE ON "payment_webhooks"
  FOR EACH ROW EXECUTE FUNCTION "guard_payment_webhook_processing"();

CREATE FUNCTION "reject_financial_snapshot_mutation"() RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'financial pricing and FX snapshots are immutable';
END;
$$ LANGUAGE plpgsql;
CREATE TRIGGER "fx_rate_snapshots_no_update_delete"
  BEFORE UPDATE OR DELETE ON "fx_rate_snapshots"
  FOR EACH ROW EXECUTE FUNCTION "reject_financial_snapshot_mutation"();
CREATE TRIGGER "pricing_policy_snapshots_no_update_delete"
  BEFORE UPDATE OR DELETE ON "pricing_policy_snapshots"
  FOR EACH ROW EXECUTE FUNCTION "reject_financial_snapshot_mutation"();
