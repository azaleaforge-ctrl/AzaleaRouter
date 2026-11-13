CREATE TABLE "catalog_developers" (
  "id" UUID NOT NULL,
  "source" VARCHAR(32) NOT NULL,
  "slug" VARCHAR(255) NOT NULL,
  "display_name" VARCHAR(255) NOT NULL,
  "source_url" VARCHAR(1000),
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL,
  CONSTRAINT "catalog_developers_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "catalog_developers_slug_not_blank" CHECK (length(trim("slug")) > 0),
  CONSTRAINT "catalog_developers_display_name_not_blank" CHECK (length(trim("display_name")) > 0)
);
CREATE UNIQUE INDEX "catalog_developers_source_slug_key" ON "catalog_developers"("source", "slug");
CREATE INDEX "catalog_developers_display_name_idx" ON "catalog_developers"("display_name");

CREATE TABLE "catalog_providers" (
  "id" UUID NOT NULL,
  "source" VARCHAR(32) NOT NULL,
  "slug" VARCHAR(255) NOT NULL,
  "display_name" VARCHAR(255) NOT NULL,
  "source_url" VARCHAR(1000),
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL,
  CONSTRAINT "catalog_providers_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "catalog_providers_slug_not_blank" CHECK (length(trim("slug")) > 0),
  CONSTRAINT "catalog_providers_display_name_not_blank" CHECK (length(trim("display_name")) > 0)
);
CREATE UNIQUE INDEX "catalog_providers_source_slug_key" ON "catalog_providers"("source", "slug");
CREATE INDEX "catalog_providers_display_name_idx" ON "catalog_providers"("display_name");

CREATE TABLE "catalog_models" (
  "id" UUID NOT NULL,
  "source" VARCHAR(32) NOT NULL,
  "source_model_id" VARCHAR(255) NOT NULL,
  "canonical_slug" VARCHAR(255) NOT NULL,
  "name" VARCHAR(255) NOT NULL,
  "description" TEXT,
  "source_created_at" TIMESTAMPTZ(6),
  "source_updated_at" TIMESTAMPTZ(6),
  "context_length" INTEGER,
  "max_completion_tokens" INTEGER,
  "input_modalities" TEXT[] NOT NULL,
  "output_modalities" TEXT[] NOT NULL,
  "supported_parameters" TEXT[] NOT NULL,
  "served_endpoints" TEXT[] NOT NULL,
  "raw_metadata" JSONB NOT NULL,
  "is_active" BOOLEAN NOT NULL DEFAULT TRUE,
  "last_seen_at" TIMESTAMPTZ(6) NOT NULL,
  "developer_id" UUID,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL,
  CONSTRAINT "catalog_models_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "catalog_models_context_length_positive" CHECK ("context_length" IS NULL OR "context_length" > 0),
  CONSTRAINT "catalog_models_max_completion_positive" CHECK ("max_completion_tokens" IS NULL OR "max_completion_tokens" > 0),
  CONSTRAINT "catalog_models_name_not_blank" CHECK (length(trim("name")) > 0),
  CONSTRAINT "catalog_models_canonical_slug_not_blank" CHECK (length(trim("canonical_slug")) > 0)
);
CREATE UNIQUE INDEX "catalog_models_source_canonical_slug_key" ON "catalog_models"("source", "canonical_slug");
CREATE UNIQUE INDEX "catalog_models_source_source_model_id_key" ON "catalog_models"("source", "source_model_id");
CREATE INDEX "catalog_models_is_active_name_idx" ON "catalog_models"("is_active", "name");
CREATE INDEX "catalog_models_developer_id_is_active_idx" ON "catalog_models"("developer_id", "is_active");
ALTER TABLE "catalog_models"
  ADD CONSTRAINT "catalog_models_developer_id_fkey"
  FOREIGN KEY ("developer_id") REFERENCES "catalog_developers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "catalog_endpoints" (
  "id" UUID NOT NULL,
  "source" VARCHAR(32) NOT NULL,
  "source_endpoint_id" VARCHAR(512) NOT NULL,
  "model_id" UUID NOT NULL,
  "provider_id" UUID NOT NULL,
  "endpoint_name" VARCHAR(255) NOT NULL,
  "model_variant" VARCHAR(255),
  "api_path" VARCHAR(255) NOT NULL,
  "context_length" INTEGER,
  "max_completion_tokens" INTEGER,
  "max_prompt_tokens" INTEGER,
  "quantization" VARCHAR(64),
  "supported_parameters" TEXT[] NOT NULL,
  "is_active" BOOLEAN NOT NULL DEFAULT TRUE,
  "raw_metadata" JSONB NOT NULL,
  "source_fetched_at" TIMESTAMPTZ(6) NOT NULL,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL,
  CONSTRAINT "catalog_endpoints_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "catalog_endpoints_source_endpoint_not_blank" CHECK (length(trim("source_endpoint_id")) > 0),
  CONSTRAINT "catalog_endpoints_context_positive" CHECK ("context_length" IS NULL OR "context_length" > 0),
  CONSTRAINT "catalog_endpoints_completion_positive" CHECK ("max_completion_tokens" IS NULL OR "max_completion_tokens" > 0)
);
CREATE UNIQUE INDEX "catalog_endpoints_source_source_endpoint_id_key" ON "catalog_endpoints"("source", "source_endpoint_id");
CREATE INDEX "catalog_endpoints_model_id_is_active_idx" ON "catalog_endpoints"("model_id", "is_active");
CREATE INDEX "catalog_endpoints_provider_id_is_active_idx" ON "catalog_endpoints"("provider_id", "is_active");
ALTER TABLE "catalog_endpoints"
  ADD CONSTRAINT "catalog_endpoints_model_id_fkey"
  FOREIGN KEY ("model_id") REFERENCES "catalog_models"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "catalog_endpoints"
  ADD CONSTRAINT "catalog_endpoints_provider_id_fkey"
  FOREIGN KEY ("provider_id") REFERENCES "catalog_providers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "catalog_price_snapshots" (
  "id" UUID NOT NULL,
  "endpoint_id" UUID NOT NULL,
  "currency" CHAR(3) NOT NULL,
  "prompt_price" DECIMAL(38,24) NOT NULL,
  "completion_price" DECIMAL(38,24) NOT NULL,
  "request_price" DECIMAL(38,24) NOT NULL DEFAULT 0,
  "image_price" DECIMAL(38,24) NOT NULL DEFAULT 0,
  "source_fetched_at" TIMESTAMPTZ(6) NOT NULL,
  "source_payload_hash" CHAR(64) NOT NULL,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "catalog_price_snapshots_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "catalog_price_snapshots_currency_usd" CHECK ("currency" = 'USD'),
  CONSTRAINT "catalog_price_snapshots_prices_nonnegative" CHECK (
    "prompt_price" >= 0 AND "completion_price" >= 0 AND "request_price" >= 0 AND "image_price" >= 0
  ),
  CONSTRAINT "catalog_price_snapshots_payload_hash" CHECK ("source_payload_hash" ~ '^[0-9a-f]{64}$')
);
CREATE INDEX "catalog_price_snapshots_endpoint_fetched_idx" ON "catalog_price_snapshots"("endpoint_id", "source_fetched_at");
ALTER TABLE "catalog_price_snapshots"
  ADD CONSTRAINT "catalog_price_snapshots_endpoint_id_fkey"
  FOREIGN KEY ("endpoint_id") REFERENCES "catalog_endpoints"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "catalog_sync_runs" (
  "id" UUID NOT NULL,
  "source" VARCHAR(32) NOT NULL,
  "status" VARCHAR(24) NOT NULL,
  "started_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "completed_at" TIMESTAMPTZ(6),
  "discovered_models" INTEGER NOT NULL DEFAULT 0,
  "validated_models" INTEGER NOT NULL DEFAULT 0,
  "active_models" INTEGER NOT NULL DEFAULT 0,
  "discovered_endpoints" INTEGER NOT NULL DEFAULT 0,
  "price_snapshots" INTEGER NOT NULL DEFAULT 0,
  "error_code" VARCHAR(80),
  "safe_summary" JSONB,
  CONSTRAINT "catalog_sync_runs_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "catalog_sync_runs_status_check" CHECK ("status" IN ('running', 'succeeded', 'partial', 'failed')),
  CONSTRAINT "catalog_sync_runs_counts_nonnegative" CHECK (
    "discovered_models" >= 0 AND "validated_models" >= 0 AND "active_models" >= 0 AND
    "discovered_endpoints" >= 0 AND "price_snapshots" >= 0
  )
);
CREATE INDEX "catalog_sync_runs_source_started_idx" ON "catalog_sync_runs"("source", "started_at");
CREATE INDEX "catalog_sync_runs_status_started_idx" ON "catalog_sync_runs"("status", "started_at");

-- Source price history must never be overwritten when future provider prices change.
CREATE FUNCTION "reject_catalog_price_snapshot_mutation"() RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'catalog price snapshots are append-only';
END;
$$ LANGUAGE plpgsql;
CREATE TRIGGER "catalog_price_snapshots_append_only"
  BEFORE UPDATE OR DELETE ON "catalog_price_snapshots"
  FOR EACH ROW EXECUTE FUNCTION "reject_catalog_price_snapshot_mutation"();
