CREATE TABLE "usage_records" (
  "id" UUID NOT NULL,
  "user_id" UUID NOT NULL,
  "api_key_id" UUID NOT NULL,
  "catalog_model_id" UUID NOT NULL,
  "catalog_endpoint_id" UUID NOT NULL,
  "idempotency_key" VARCHAR(128) NOT NULL,
  "request_id" VARCHAR(100) NOT NULL,
  "provider_request_id" VARCHAR(255),
  "canonical_model_id" VARCHAR(255) NOT NULL,
  "source_model_id" VARCHAR(255) NOT NULL,
  "provider_slug" VARCHAR(255) NOT NULL,
  "status" VARCHAR(32) NOT NULL DEFAULT 'started',
  "reconciliation_status" VARCHAR(32) NOT NULL DEFAULT 'not_required',
  "prompt_tokens" BIGINT NOT NULL DEFAULT 0,
  "completion_tokens" BIGINT NOT NULL DEFAULT 0,
  "total_tokens" BIGINT NOT NULL DEFAULT 0,
  "prompt_price_usd" DECIMAL(38,24),
  "completion_price_usd" DECIMAL(38,24),
  "provider_cost_idr" DECIMAL(38,0),
  "customer_charge_idr" DECIMAL(38,0),
  "currency" CHAR(3) NOT NULL DEFAULT 'IDR',
  "catalog_price_snapshot_id" UUID,
  "fx_rate_snapshot_id" UUID,
  "pricing_policy_snapshot_id" UUID,
  "wallet_reservation_id" UUID,
  "error_code" VARCHAR(80),
  "started_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "completed_at" TIMESTAMPTZ(6),
  "settled_at" TIMESTAMPTZ(6),
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL,
  CONSTRAINT "usage_records_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "usage_records_idempotency_not_blank" CHECK (length(trim("idempotency_key")) > 0),
  CONSTRAINT "usage_records_request_not_blank" CHECK (length(trim("request_id")) > 0),
  CONSTRAINT "usage_records_status_check" CHECK ("status" IN ('started','streaming','completed','failed','cancelled','unknown_cost','pending_reconciliation','settled','released')),
  CONSTRAINT "usage_records_reconciliation_check" CHECK ("reconciliation_status" IN ('not_required','pending','reconciled','blocked')),
  CONSTRAINT "usage_records_token_nonnegative" CHECK ("prompt_tokens" >= 0 AND "completion_tokens" >= 0 AND "total_tokens" >= 0),
  CONSTRAINT "usage_records_token_sum" CHECK ("total_tokens" = "prompt_tokens" + "completion_tokens"),
  CONSTRAINT "usage_records_usd_prices_nonnegative" CHECK (
    ("prompt_price_usd" IS NULL OR "prompt_price_usd" >= 0) AND
    ("completion_price_usd" IS NULL OR "completion_price_usd" >= 0)
  ),
  CONSTRAINT "usage_records_idr_amounts_nonnegative" CHECK (
    ("provider_cost_idr" IS NULL OR "provider_cost_idr" >= 0) AND
    ("customer_charge_idr" IS NULL OR "customer_charge_idr" >= 0)
  ),
  CONSTRAINT "usage_records_currency_idr" CHECK ("currency" = 'IDR')
);
CREATE UNIQUE INDEX "usage_records_idempotency_key_key" ON "usage_records"("idempotency_key");
CREATE INDEX "usage_records_user_started_idx" ON "usage_records"("user_id","started_at");
CREATE INDEX "usage_records_api_key_started_idx" ON "usage_records"("api_key_id","started_at");
CREATE INDEX "usage_records_model_started_idx" ON "usage_records"("catalog_model_id","started_at");
CREATE INDEX "usage_records_reconciliation_started_idx" ON "usage_records"("status","reconciliation_status","started_at");
CREATE INDEX "usage_records_provider_request_idx" ON "usage_records"("provider_request_id");
ALTER TABLE "usage_records" ADD CONSTRAINT "usage_records_user_fkey"
  FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "usage_records" ADD CONSTRAINT "usage_records_api_key_fkey"
  FOREIGN KEY ("api_key_id") REFERENCES "api_keys"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "usage_records" ADD CONSTRAINT "usage_records_model_fkey"
  FOREIGN KEY ("catalog_model_id") REFERENCES "catalog_models"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "usage_records" ADD CONSTRAINT "usage_records_endpoint_fkey"
  FOREIGN KEY ("catalog_endpoint_id") REFERENCES "catalog_endpoints"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "usage_records" ADD CONSTRAINT "usage_records_catalog_price_fkey"
  FOREIGN KEY ("catalog_price_snapshot_id") REFERENCES "catalog_price_snapshots"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "usage_records" ADD CONSTRAINT "usage_records_fx_rate_fkey"
  FOREIGN KEY ("fx_rate_snapshot_id") REFERENCES "fx_rate_snapshots"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "usage_records" ADD CONSTRAINT "usage_records_pricing_policy_fkey"
  FOREIGN KEY ("pricing_policy_snapshot_id") REFERENCES "pricing_policy_snapshots"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "usage_records" ADD CONSTRAINT "usage_records_wallet_reservation_fkey"
  FOREIGN KEY ("wallet_reservation_id") REFERENCES "wallet_reservations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE FUNCTION "guard_usage_record_mutation"() RETURNS trigger AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION 'usage records cannot be deleted by ordinary application flows';
  END IF;
  IF OLD."id" <> NEW."id"
     OR OLD."user_id" <> NEW."user_id"
     OR OLD."api_key_id" <> NEW."api_key_id"
     OR OLD."catalog_model_id" <> NEW."catalog_model_id"
     OR OLD."catalog_endpoint_id" <> NEW."catalog_endpoint_id"
     OR OLD."idempotency_key" <> NEW."idempotency_key"
     OR OLD."request_id" <> NEW."request_id"
     OR OLD."canonical_model_id" <> NEW."canonical_model_id"
     OR OLD."source_model_id" <> NEW."source_model_id"
     OR OLD."provider_slug" <> NEW."provider_slug"
     OR OLD."catalog_price_snapshot_id" IS DISTINCT FROM NEW."catalog_price_snapshot_id"
     OR OLD."fx_rate_snapshot_id" IS DISTINCT FROM NEW."fx_rate_snapshot_id"
     OR OLD."pricing_policy_snapshot_id" IS DISTINCT FROM NEW."pricing_policy_snapshot_id"
     OR OLD."wallet_reservation_id" IS DISTINCT FROM NEW."wallet_reservation_id"
     OR OLD."started_at" <> NEW."started_at" THEN
    RAISE EXCEPTION 'usage identity and pricing snapshot references are immutable';
  END IF;
  IF OLD."status" IN ('settled','released','failed','cancelled') THEN
    RAISE EXCEPTION 'terminal usage record is immutable';
  END IF;
  IF NOT (
    (OLD."status" = 'started' AND NEW."status" IN ('streaming','completed','failed','cancelled','unknown_cost','pending_reconciliation')) OR
    (OLD."status" = 'streaming' AND NEW."status" IN ('completed','failed','cancelled','unknown_cost','pending_reconciliation')) OR
    (OLD."status" IN ('unknown_cost','pending_reconciliation') AND NEW."status" IN ('pending_reconciliation','settled','released'))
  ) THEN
    RAISE EXCEPTION 'invalid usage record state transition';
  END IF;
  IF NEW."status" = 'settled' AND (
    NEW."settled_at" IS NULL OR NEW."provider_cost_idr" IS NULL OR NEW."customer_charge_idr" IS NULL
  ) THEN
    RAISE EXCEPTION 'settled usage requires final costs and settlement timestamp';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
CREATE TRIGGER "usage_records_guard"
  BEFORE UPDATE OR DELETE ON "usage_records"
  FOR EACH ROW EXECUTE FUNCTION "guard_usage_record_mutation"();

CREATE TABLE "usage_aggregates" (
  "id" UUID NOT NULL,
  "user_id" UUID NOT NULL,
  "catalog_model_id" UUID NOT NULL,
  "period_start" TIMESTAMPTZ(6) NOT NULL,
  "period" VARCHAR(16) NOT NULL,
  "request_count" BIGINT NOT NULL DEFAULT 0,
  "successful_request_count" BIGINT NOT NULL DEFAULT 0,
  "failed_request_count" BIGINT NOT NULL DEFAULT 0,
  "prompt_tokens" BIGINT NOT NULL DEFAULT 0,
  "completion_tokens" BIGINT NOT NULL DEFAULT 0,
  "total_tokens" BIGINT NOT NULL DEFAULT 0,
  "provider_cost_idr" DECIMAL(38,0) NOT NULL DEFAULT 0,
  "customer_charge_idr" DECIMAL(38,0) NOT NULL DEFAULT 0,
  "currency" CHAR(3) NOT NULL DEFAULT 'IDR',
  "source_updated_at" TIMESTAMPTZ(6) NOT NULL,
  "updated_at" TIMESTAMPTZ(6) NOT NULL,
  CONSTRAINT "usage_aggregates_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "usage_aggregates_period_check" CHECK ("period" IN ('hour','day','month')),
  CONSTRAINT "usage_aggregates_counts_nonnegative" CHECK (
    "request_count" >= 0 AND "successful_request_count" >= 0 AND "failed_request_count" >= 0 AND
    "prompt_tokens" >= 0 AND "completion_tokens" >= 0 AND "total_tokens" >= 0
  ),
  CONSTRAINT "usage_aggregates_tokens_sum" CHECK ("total_tokens" = "prompt_tokens" + "completion_tokens"),
  CONSTRAINT "usage_aggregates_amounts_nonnegative" CHECK ("provider_cost_idr" >= 0 AND "customer_charge_idr" >= 0),
  CONSTRAINT "usage_aggregates_currency_idr" CHECK ("currency" = 'IDR')
);
CREATE UNIQUE INDEX "usage_aggregates_unique_period_key" ON "usage_aggregates"("user_id","catalog_model_id","period_start","period");
CREATE INDEX "usage_aggregates_user_period_idx" ON "usage_aggregates"("user_id","period_start");
CREATE INDEX "usage_aggregates_model_period_idx" ON "usage_aggregates"("catalog_model_id","period_start");
ALTER TABLE "usage_aggregates" ADD CONSTRAINT "usage_aggregates_user_fkey"
  FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "usage_aggregates" ADD CONSTRAINT "usage_aggregates_model_fkey"
  FOREIGN KEY ("catalog_model_id") REFERENCES "catalog_models"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "model_color_preferences" (
  "id" UUID NOT NULL,
  "user_id" UUID NOT NULL,
  "catalog_model_id" UUID NOT NULL,
  "color" VARCHAR(7) NOT NULL,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL,
  CONSTRAINT "model_color_preferences_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "model_color_preferences_hex" CHECK ("color" ~ '^#[0-9A-Fa-f]{6}$')
);
CREATE UNIQUE INDEX "model_color_preferences_user_model_key" ON "model_color_preferences"("user_id","catalog_model_id");
CREATE INDEX "model_color_preferences_user_updated_idx" ON "model_color_preferences"("user_id","updated_at");
ALTER TABLE "model_color_preferences" ADD CONSTRAINT "model_color_preferences_user_fkey"
  FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "model_color_preferences" ADD CONSTRAINT "model_color_preferences_model_fkey"
  FOREIGN KEY ("catalog_model_id") REFERENCES "catalog_models"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "outbox_events" (
  "id" UUID NOT NULL,
  "user_id" UUID,
  "aggregate_type" VARCHAR(64) NOT NULL,
  "aggregate_id" VARCHAR(128) NOT NULL,
  "event_type" VARCHAR(128) NOT NULL,
  "idempotency_key" VARCHAR(128) NOT NULL,
  "safe_payload" JSONB NOT NULL,
  "occurred_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "available_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "published_at" TIMESTAMPTZ(6),
  "attempts" INTEGER NOT NULL DEFAULT 0,
  "last_error_code" VARCHAR(80),
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL,
  CONSTRAINT "outbox_events_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "outbox_events_idempotency_not_blank" CHECK (length(trim("idempotency_key")) > 0),
  CONSTRAINT "outbox_events_attempts_nonnegative" CHECK ("attempts" >= 0)
);
CREATE UNIQUE INDEX "outbox_events_idempotency_key_key" ON "outbox_events"("idempotency_key");
CREATE INDEX "outbox_events_publish_idx" ON "outbox_events"("published_at","available_at","created_at");
CREATE INDEX "outbox_events_user_occurred_idx" ON "outbox_events"("user_id","occurred_at");
ALTER TABLE "outbox_events" ADD CONSTRAINT "outbox_events_user_fkey"
  FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE FUNCTION "guard_outbox_event_mutation"() RETURNS trigger AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION 'outbox events cannot be deleted before retention cleanup';
  END IF;
  IF OLD."id" <> NEW."id"
     OR OLD."user_id" IS DISTINCT FROM NEW."user_id"
     OR OLD."aggregate_type" <> NEW."aggregate_type"
     OR OLD."aggregate_id" <> NEW."aggregate_id"
     OR OLD."event_type" <> NEW."event_type"
     OR OLD."idempotency_key" <> NEW."idempotency_key"
     OR OLD."safe_payload" <> NEW."safe_payload"
     OR OLD."occurred_at" <> NEW."occurred_at"
     OR OLD."created_at" <> NEW."created_at" THEN
    RAISE EXCEPTION 'outbox event identity and payload are immutable';
  END IF;
  IF NEW."attempts" < OLD."attempts" OR NEW."published_at" < OLD."published_at" THEN
    RAISE EXCEPTION 'outbox delivery state cannot move backwards';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
CREATE TRIGGER "outbox_events_guard"
  BEFORE UPDATE OR DELETE ON "outbox_events"
  FOR EACH ROW EXECUTE FUNCTION "guard_outbox_event_mutation"();
