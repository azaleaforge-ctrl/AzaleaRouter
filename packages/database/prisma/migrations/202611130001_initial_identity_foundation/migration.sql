CREATE TYPE "user_role" AS ENUM ('user', 'support', 'admin', 'super_admin');
CREATE TYPE "user_status" AS ENUM ('pending_verification', 'active', 'suspended', 'deletion_pending', 'deleted');

CREATE TABLE "users" (
  "id" UUID NOT NULL,
  "auth_subject_id" VARCHAR(128) NOT NULL,
  "email_normalized" VARCHAR(320) NOT NULL,
  "email_verified_at" TIMESTAMPTZ(6),
  "role" "user_role" NOT NULL DEFAULT 'user',
  "status" "user_status" NOT NULL DEFAULT 'pending_verification',
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL,
  "deleted_at" TIMESTAMPTZ(6),
  CONSTRAINT "users_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "users_email_normalized_not_blank" CHECK (length(trim("email_normalized")) > 0),
  CONSTRAINT "users_auth_subject_id_not_blank" CHECK (length(trim("auth_subject_id")) > 0)
);

CREATE UNIQUE INDEX "users_auth_subject_id_key" ON "users"("auth_subject_id");
CREATE UNIQUE INDEX "users_email_normalized_key" ON "users"("email_normalized");
CREATE INDEX "users_status_created_at_idx" ON "users"("status", "created_at");

CREATE TABLE "user_profiles" (
  "user_id" UUID NOT NULL,
  "display_name" VARCHAR(80),
  "avatar_ref" VARCHAR(512),
  "locale" VARCHAR(16) NOT NULL DEFAULT 'id-ID',
  "timezone" VARCHAR(64) NOT NULL DEFAULT 'Asia/Jakarta',
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL,
  CONSTRAINT "user_profiles_pkey" PRIMARY KEY ("user_id"),
  CONSTRAINT "user_profiles_display_name_length" CHECK ("display_name" IS NULL OR length("display_name") <= 80)
);

CREATE TABLE "user_preferences" (
  "user_id" UUID NOT NULL,
  "theme" VARCHAR(16) NOT NULL DEFAULT 'system',
  "default_model_id" VARCHAR(255),
  "default_routing" JSONB,
  "notification_preferences" JSONB,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL,
  CONSTRAINT "user_preferences_pkey" PRIMARY KEY ("user_id"),
  CONSTRAINT "user_preferences_theme_check" CHECK ("theme" IN ('light', 'dark', 'system'))
);

CREATE TABLE "user_consents" (
  "id" UUID NOT NULL,
  "user_id" UUID NOT NULL,
  "consent_type" VARCHAR(64) NOT NULL,
  "document_version" VARCHAR(64) NOT NULL,
  "accepted_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "source" VARCHAR(32) NOT NULL,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "user_consents_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "user_consents_type_not_blank" CHECK (length(trim("consent_type")) > 0),
  CONSTRAINT "user_consents_version_not_blank" CHECK (length(trim("document_version")) > 0)
);

CREATE INDEX "user_consents_user_id_accepted_at_idx" ON "user_consents"("user_id", "accepted_at");
CREATE INDEX "user_consents_consent_type_document_version_idx" ON "user_consents"("consent_type", "document_version");

CREATE TABLE "audit_logs" (
  "id" UUID NOT NULL,
  "actor_id" UUID,
  "actor_role" VARCHAR(32),
  "action" VARCHAR(120) NOT NULL,
  "resource_type" VARCHAR(80) NOT NULL,
  "resource_id" VARCHAR(128),
  "reason" VARCHAR(1000),
  "request_id" VARCHAR(100),
  "before_json" JSONB,
  "after_json" JSONB,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "audit_logs_action_not_blank" CHECK (length(trim("action")) > 0),
  CONSTRAINT "audit_logs_resource_type_not_blank" CHECK (length(trim("resource_type")) > 0)
);

CREATE INDEX "audit_logs_actor_id_created_at_idx" ON "audit_logs"("actor_id", "created_at");
CREATE INDEX "audit_logs_resource_type_resource_id_created_at_idx" ON "audit_logs"("resource_type", "resource_id", "created_at");
CREATE INDEX "audit_logs_action_created_at_idx" ON "audit_logs"("action", "created_at");

CREATE TABLE "outbox_events" (
  "id" UUID NOT NULL,
  "aggregate_type" VARCHAR(80) NOT NULL,
  "aggregate_id" VARCHAR(128) NOT NULL,
  "event_type" VARCHAR(120) NOT NULL,
  "schema_version" INTEGER NOT NULL DEFAULT 1,
  "payload_safe" JSONB NOT NULL,
  "attempts" INTEGER NOT NULL DEFAULT 0,
  "available_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "published_at" TIMESTAMPTZ(6),
  CONSTRAINT "outbox_events_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "outbox_events_attempts_nonnegative" CHECK ("attempts" >= 0),
  CONSTRAINT "outbox_events_schema_version_positive" CHECK ("schema_version" > 0)
);

CREATE INDEX "outbox_events_published_at_available_at_created_at_idx" ON "outbox_events"("published_at", "available_at", "created_at");
CREATE INDEX "outbox_events_aggregate_type_aggregate_id_created_at_idx" ON "outbox_events"("aggregate_type", "aggregate_id", "created_at");

CREATE TABLE "idempotency_records" (
  "id" UUID NOT NULL,
  "scope" VARCHAR(160) NOT NULL,
  "idempotency_key" VARCHAR(255) NOT NULL,
  "request_hash" CHAR(64) NOT NULL,
  "response_reference" VARCHAR(255),
  "status" VARCHAR(24) NOT NULL DEFAULT 'in_progress',
  "expires_at" TIMESTAMPTZ(6) NOT NULL,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL,
  CONSTRAINT "idempotency_records_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "idempotency_records_hash_format" CHECK ("request_hash" ~ '^[0-9a-f]{64}$'),
  CONSTRAINT "idempotency_records_status_check" CHECK ("status" IN ('in_progress', 'completed', 'failed'))
);

CREATE UNIQUE INDEX "idempotency_records_scope_idempotency_key_key" ON "idempotency_records"("scope", "idempotency_key");
CREATE INDEX "idempotency_records_expires_at_idx" ON "idempotency_records"("expires_at");

ALTER TABLE "user_profiles"
  ADD CONSTRAINT "user_profiles_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "user_preferences"
  ADD CONSTRAINT "user_preferences_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "user_consents"
  ADD CONSTRAINT "user_consents_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Consent and audit evidence is immutable. Account deletion uses a tombstone
-- and a separately approved retention/anonymization workflow.
CREATE FUNCTION "reject_append_only_mutation"() RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'append-only record cannot be updated or deleted';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "user_consents_append_only"
  BEFORE UPDATE OR DELETE ON "user_consents"
  FOR EACH ROW EXECUTE FUNCTION "reject_append_only_mutation"();

CREATE TRIGGER "audit_logs_append_only"
  BEFORE UPDATE OR DELETE ON "audit_logs"
  FOR EACH ROW EXECUTE FUNCTION "reject_append_only_mutation"();
