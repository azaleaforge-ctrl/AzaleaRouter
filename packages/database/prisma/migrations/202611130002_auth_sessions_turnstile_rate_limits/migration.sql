CREATE TABLE "auth_sessions" (
  "id" UUID NOT NULL,
  "user_id" UUID NOT NULL,
  "session_token_hash" CHAR(64) NOT NULL,
  "csrf_token_hash" CHAR(64) NOT NULL,
  "encrypted_access_token" TEXT NOT NULL,
  "encrypted_refresh_token" TEXT NOT NULL,
  "encryption_key_version" VARCHAR(32) NOT NULL,
  "access_expires_at" TIMESTAMPTZ(6) NOT NULL,
  "refresh_expires_at" TIMESTAMPTZ(6) NOT NULL,
  "last_seen_at" TIMESTAMPTZ(6),
  "revoked_at" TIMESTAMPTZ(6),
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "auth_sessions_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "auth_sessions_session_hash_format" CHECK ("session_token_hash" ~ '^[0-9a-f]{64}$'),
  CONSTRAINT "auth_sessions_csrf_hash_format" CHECK ("csrf_token_hash" ~ '^[0-9a-f]{64}$'),
  CONSTRAINT "auth_sessions_encryption_key_version_not_blank" CHECK (length(trim("encryption_key_version")) > 0),
  CONSTRAINT "auth_sessions_refresh_after_access" CHECK ("refresh_expires_at" >= "access_expires_at")
);
CREATE UNIQUE INDEX "auth_sessions_session_token_hash_key" ON "auth_sessions"("session_token_hash");
CREATE INDEX "auth_sessions_user_id_revoked_at_access_expires_at_idx" ON "auth_sessions"("user_id", "revoked_at", "access_expires_at");
CREATE INDEX "auth_sessions_refresh_expires_at_idx" ON "auth_sessions"("refresh_expires_at");
ALTER TABLE "auth_sessions"
  ADD CONSTRAINT "auth_sessions_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "turnstile_token_uses" (
  "id" UUID NOT NULL,
  "token_hash" CHAR(64) NOT NULL,
  "action" VARCHAR(64) NOT NULL,
  "hostname" VARCHAR(253) NOT NULL,
  "challenge_at" TIMESTAMPTZ(6) NOT NULL,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "expires_at" TIMESTAMPTZ(6) NOT NULL,
  CONSTRAINT "turnstile_token_uses_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "turnstile_token_uses_hash_format" CHECK ("token_hash" ~ '^[0-9a-f]{64}$'),
  CONSTRAINT "turnstile_token_uses_action_not_blank" CHECK (length(trim("action")) > 0),
  CONSTRAINT "turnstile_token_uses_hostname_not_blank" CHECK (length(trim("hostname")) > 0)
);
CREATE UNIQUE INDEX "turnstile_token_uses_token_hash_key" ON "turnstile_token_uses"("token_hash");
CREATE INDEX "turnstile_token_uses_expires_at_idx" ON "turnstile_token_uses"("expires_at");

CREATE TABLE "auth_rate_limits" (
  "id" UUID NOT NULL,
  "bucket_hash" CHAR(64) NOT NULL,
  "window_start" TIMESTAMPTZ(6) NOT NULL,
  "hit_count" INTEGER NOT NULL DEFAULT 1,
  "expires_at" TIMESTAMPTZ(6) NOT NULL,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "auth_rate_limits_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "auth_rate_limits_bucket_hash_format" CHECK ("bucket_hash" ~ '^[0-9a-f]{64}$'),
  CONSTRAINT "auth_rate_limits_hit_count_positive" CHECK ("hit_count" > 0)
);
CREATE UNIQUE INDEX "auth_rate_limits_bucket_hash_window_start_key" ON "auth_rate_limits"("bucket_hash", "window_start");
CREATE INDEX "auth_rate_limits_expires_at_idx" ON "auth_rate_limits"("expires_at");

-- Session rows contain encrypted identity-provider tokens and are revocable.
CREATE FUNCTION "reject_revoked_auth_session_mutation"() RETURNS trigger AS $$
BEGIN
  IF OLD."revoked_at" IS NOT NULL THEN
    RAISE EXCEPTION 'revoked auth session is immutable';
  END IF;
  IF NEW."id" <> OLD."id"
     OR NEW."user_id" <> OLD."user_id"
     OR NEW."session_token_hash" <> OLD."session_token_hash"
     OR NEW."created_at" <> OLD."created_at" THEN
    RAISE EXCEPTION 'auth session identity columns are immutable';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "auth_sessions_identity_immutable"
  BEFORE UPDATE ON "auth_sessions"
  FOR EACH ROW EXECUTE FUNCTION "reject_revoked_auth_session_mutation"();

-- A session is never physically deleted as an ordinary logout operation.
CREATE FUNCTION "reject_auth_session_delete"() RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'auth session rows must be revoked, not deleted';
END;
$$ LANGUAGE plpgsql;
CREATE TRIGGER "auth_sessions_no_delete"
  BEFORE DELETE ON "auth_sessions"
  FOR EACH ROW EXECUTE FUNCTION "reject_auth_session_delete"();

-- Token replay and rate-limit records are operationally expiring records,
-- not financial/audit truth. A bounded cleanup job may delete expired rows.
