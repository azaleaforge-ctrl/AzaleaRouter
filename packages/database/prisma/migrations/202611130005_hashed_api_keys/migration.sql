CREATE TABLE "api_keys" (
  "id" UUID NOT NULL,
  "user_id" UUID NOT NULL,
  "name" VARCHAR(80) NOT NULL,
  "key_prefix" VARCHAR(24) NOT NULL,
  "token_hash" CHAR(64) NOT NULL,
  "pepper_version" VARCHAR(32) NOT NULL,
  "scopes" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "allowed_model_ids" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "spend_limit_idr" DECIMAL(38,0),
  "rate_limit_rpm" INTEGER NOT NULL DEFAULT 60,
  "concurrency_limit" INTEGER NOT NULL DEFAULT 2,
  "status" VARCHAR(16) NOT NULL DEFAULT 'active',
  "expires_at" TIMESTAMPTZ(6),
  "last_used_at" TIMESTAMPTZ(6),
  "revoked_at" TIMESTAMPTZ(6),
  "rotated_from_id" UUID,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "api_keys_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "api_keys_name_not_blank" CHECK (length(trim("name")) > 0),
  CONSTRAINT "api_keys_prefix_format" CHECK ("key_prefix" ~ '^AZL-[A-Za-z0-9_-]{8,16}$'),
  CONSTRAINT "api_keys_token_hash_format" CHECK ("token_hash" ~ '^[0-9a-f]{64}$'),
  CONSTRAINT "api_keys_spend_limit_nonnegative" CHECK ("spend_limit_idr" IS NULL OR "spend_limit_idr" >= 0),
  CONSTRAINT "api_keys_rate_limit_positive" CHECK ("rate_limit_rpm" > 0 AND "rate_limit_rpm" <= 100000),
  CONSTRAINT "api_keys_concurrency_positive" CHECK ("concurrency_limit" > 0 AND "concurrency_limit" <= 1000),
  CONSTRAINT "api_keys_status_check" CHECK ("status" IN ('active','revoked','rotated','expired')),
  CONSTRAINT "api_keys_revocation_timestamp" CHECK (("status" IN ('revoked','rotated','expired')) = ("revoked_at" IS NOT NULL))
);
CREATE UNIQUE INDEX "api_keys_token_hash_key" ON "api_keys"("token_hash");
CREATE UNIQUE INDEX "api_keys_rotated_from_id_key" ON "api_keys"("rotated_from_id");
CREATE INDEX "api_keys_user_status_created_idx" ON "api_keys"("user_id","status","created_at");
CREATE INDEX "api_keys_status_expiry_idx" ON "api_keys"("status","expires_at");
ALTER TABLE "api_keys" ADD CONSTRAINT "api_keys_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "api_keys" ADD CONSTRAINT "api_keys_rotated_from_id_fkey"
  FOREIGN KEY ("rotated_from_id") REFERENCES "api_keys"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE FUNCTION "guard_api_key_mutation"() RETURNS trigger AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION 'API key records are retained as security audit history';
  END IF;
  IF OLD."id" <> NEW."id"
     OR OLD."user_id" <> NEW."user_id"
     OR OLD."key_prefix" <> NEW."key_prefix"
     OR OLD."token_hash" <> NEW."token_hash"
     OR OLD."pepper_version" <> NEW."pepper_version"
     OR OLD."created_at" <> NEW."created_at"
     OR OLD."rotated_from_id" IS DISTINCT FROM NEW."rotated_from_id" THEN
    RAISE EXCEPTION 'API key secret and identity fields are immutable';
  END IF;
  IF OLD."status" = 'active' AND NEW."status" IN ('revoked','rotated','expired') THEN
    IF NEW."revoked_at" IS NULL THEN
      RAISE EXCEPTION 'revoked API key requires revoked_at timestamp';
    END IF;
  ELSIF OLD."status" = 'active' AND NEW."status" = 'active' THEN
    IF NEW."revoked_at" IS NOT NULL THEN
      RAISE EXCEPTION 'active API key cannot have revoked_at timestamp';
    END IF;
    IF OLD."last_used_at" IS NOT NULL
       AND NEW."last_used_at" IS NOT NULL
       AND NEW."last_used_at" < OLD."last_used_at" THEN
      RAISE EXCEPTION 'API key last_used_at cannot move backwards';
    END IF;
  ELSE
    RAISE EXCEPTION 'invalid API key lifecycle transition';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "api_keys_guard"
  BEFORE UPDATE OR DELETE ON "api_keys"
  FOR EACH ROW EXECUTE FUNCTION "guard_api_key_mutation"();
