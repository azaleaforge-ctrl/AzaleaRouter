CREATE TYPE "conversation_status" AS ENUM ('active', 'archived', 'deleted');
CREATE TYPE "message_role" AS ENUM ('system', 'developer', 'user', 'assistant', 'tool');
CREATE TYPE "message_status" AS ENUM ('pending', 'streaming', 'completed', 'failed', 'cancelled');
CREATE TYPE "attachment_status" AS ENUM ('quarantined', 'clean', 'rejected', 'deleted');
CREATE TYPE "support_ticket_status" AS ENUM ('open', 'in_progress', 'waiting', 'resolved', 'closed');
CREATE TYPE "support_ticket_priority" AS ENUM ('low', 'normal', 'high', 'urgent');
CREATE TYPE "support_ticket_visibility" AS ENUM ('public', 'internal');
CREATE TYPE "content_entry_type" AS ENUM ('docs', 'help', 'blog', 'status', 'changelog');
CREATE TYPE "content_entry_status" AS ENUM ('draft', 'review', 'published', 'archived');

CREATE TABLE "conversations" (
  "id" UUID NOT NULL,
  "user_id" UUID NOT NULL,
  "title" VARCHAR(160) NOT NULL DEFAULT 'New conversation',
  "status" "conversation_status" NOT NULL DEFAULT 'active',
  "default_model_id" VARCHAR(255),
  "metadata_safe" JSONB,
  "last_message_at" TIMESTAMPTZ(6),
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL,
  "archived_at" TIMESTAMPTZ(6),
  "deleted_at" TIMESTAMPTZ(6),
  CONSTRAINT "conversations_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "conversations_title_not_blank" CHECK (length(trim("title")) > 0)
);
CREATE INDEX "conversations_user_status_updated_idx" ON "conversations"("user_id","status","updated_at");
CREATE INDEX "conversations_user_last_message_idx" ON "conversations"("user_id","last_message_at");
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "chat_messages" (
  "id" UUID NOT NULL,
  "conversation_id" UUID NOT NULL,
  "author_user_id" UUID,
  "role" "message_role" NOT NULL,
  "status" "message_status" NOT NULL DEFAULT 'completed',
  "content" JSONB NOT NULL,
  "canonical_model_id" VARCHAR(255),
  "source_model_id" VARCHAR(255),
  "provider_slug" VARCHAR(128),
  "provider_request_id" VARCHAR(255),
  "request_id" VARCHAR(100),
  "prompt_tokens" BIGINT NOT NULL DEFAULT 0,
  "completion_tokens" BIGINT NOT NULL DEFAULT 0,
  "total_tokens" BIGINT NOT NULL DEFAULT 0,
  "customer_charge_idr" DECIMAL(38,0),
  "error_code" VARCHAR(80),
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL,
  "completed_at" TIMESTAMPTZ(6),
  "deleted_at" TIMESTAMPTZ(6),
  CONSTRAINT "chat_messages_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "chat_messages_token_counts_nonnegative" CHECK ("prompt_tokens" >= 0 AND "completion_tokens" >= 0 AND "total_tokens" >= 0),
  CONSTRAINT "chat_messages_charge_nonnegative" CHECK ("customer_charge_idr" IS NULL OR "customer_charge_idr" >= 0),
  CONSTRAINT "chat_messages_content_object_or_array" CHECK (jsonb_typeof("content") IN ('object','array'))
);
CREATE INDEX "chat_messages_conversation_created_id_idx" ON "chat_messages"("conversation_id","created_at","id");
CREATE INDEX "chat_messages_author_created_idx" ON "chat_messages"("author_user_id","created_at");
CREATE INDEX "chat_messages_status_created_idx" ON "chat_messages"("status","created_at");
ALTER TABLE "chat_messages" ADD CONSTRAINT "chat_messages_conversation_id_fkey"
  FOREIGN KEY ("conversation_id") REFERENCES "conversations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "chat_messages" ADD CONSTRAINT "chat_messages_author_user_id_fkey"
  FOREIGN KEY ("author_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "file_attachments" (
  "id" UUID NOT NULL,
  "user_id" UUID NOT NULL,
  "conversation_id" UUID,
  "message_id" UUID,
  "original_filename" VARCHAR(255) NOT NULL,
  "safe_filename" VARCHAR(255) NOT NULL,
  "mime_type" VARCHAR(160) NOT NULL,
  "file_size" BIGINT NOT NULL,
  "sha256" CHAR(64) NOT NULL,
  "storage_key" VARCHAR(512) NOT NULL,
  "status" "attachment_status" NOT NULL DEFAULT 'quarantined',
  "scan_engine" VARCHAR(120),
  "scan_verdict" VARCHAR(32),
  "scan_completed_at" TIMESTAMPTZ(6),
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "expires_at" TIMESTAMPTZ(6),
  "deleted_at" TIMESTAMPTZ(6),
  CONSTRAINT "file_attachments_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "file_attachments_size_check" CHECK ("file_size" > 0 AND "file_size" <= 20971520),
  CONSTRAINT "file_attachments_sha256_format" CHECK ("sha256" ~ '^[0-9a-f]{64}$'),
  CONSTRAINT "file_attachments_original_filename_not_blank" CHECK (length(trim("original_filename")) > 0),
  CONSTRAINT "file_attachments_safe_filename_not_blank" CHECK (length(trim("safe_filename")) > 0),
  CONSTRAINT "file_attachments_storage_key_not_blank" CHECK (length(trim("storage_key")) > 0)
);
CREATE UNIQUE INDEX "file_attachments_storage_key_key" ON "file_attachments"("storage_key");
CREATE INDEX "file_attachments_user_created_idx" ON "file_attachments"("user_id","created_at");
CREATE INDEX "file_attachments_conversation_created_idx" ON "file_attachments"("conversation_id","created_at");
CREATE INDEX "file_attachments_message_id_idx" ON "file_attachments"("message_id");
CREATE INDEX "file_attachments_status_expiry_idx" ON "file_attachments"("status","expires_at");
ALTER TABLE "file_attachments" ADD CONSTRAINT "file_attachments_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "file_attachments" ADD CONSTRAINT "file_attachments_conversation_id_fkey"
  FOREIGN KEY ("conversation_id") REFERENCES "conversations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "file_attachments" ADD CONSTRAINT "file_attachments_message_id_fkey"
  FOREIGN KEY ("message_id") REFERENCES "chat_messages"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "notifications" (
  "id" UUID NOT NULL,
  "user_id" UUID NOT NULL,
  "type" VARCHAR(80) NOT NULL,
  "title" VARCHAR(160) NOT NULL,
  "body" VARCHAR(1000),
  "payload_safe" JSONB,
  "read_at" TIMESTAMPTZ(6),
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "expires_at" TIMESTAMPTZ(6),
  CONSTRAINT "notifications_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "notifications_type_not_blank" CHECK (length(trim("type")) > 0),
  CONSTRAINT "notifications_title_not_blank" CHECK (length(trim("title")) > 0)
);
CREATE INDEX "notifications_user_read_created_idx" ON "notifications"("user_id","read_at","created_at");
CREATE INDEX "notifications_expires_at_idx" ON "notifications"("expires_at");
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "support_tickets" (
  "id" UUID NOT NULL,
  "ticket_number" VARCHAR(32) NOT NULL,
  "owner_user_id" UUID NOT NULL,
  "assigned_support_id" UUID,
  "subject" VARCHAR(160) NOT NULL,
  "category" VARCHAR(64) NOT NULL,
  "status" "support_ticket_status" NOT NULL DEFAULT 'open',
  "priority" "support_ticket_priority" NOT NULL DEFAULT 'normal',
  "last_message_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL,
  "resolved_at" TIMESTAMPTZ(6),
  "closed_at" TIMESTAMPTZ(6),
  CONSTRAINT "support_tickets_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "support_tickets_subject_not_blank" CHECK (length(trim("subject")) > 0),
  CONSTRAINT "support_tickets_category_not_blank" CHECK (length(trim("category")) > 0)
);
CREATE UNIQUE INDEX "support_tickets_ticket_number_key" ON "support_tickets"("ticket_number");
CREATE INDEX "support_tickets_owner_status_updated_idx" ON "support_tickets"("owner_user_id","status","updated_at");
CREATE INDEX "support_tickets_assignee_status_updated_idx" ON "support_tickets"("assigned_support_id","status","updated_at");
CREATE INDEX "support_tickets_status_priority_last_message_idx" ON "support_tickets"("status","priority","last_message_at");
ALTER TABLE "support_tickets" ADD CONSTRAINT "support_tickets_owner_user_id_fkey"
  FOREIGN KEY ("owner_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "support_tickets" ADD CONSTRAINT "support_tickets_assigned_support_id_fkey"
  FOREIGN KEY ("assigned_support_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "support_ticket_messages" (
  "id" UUID NOT NULL,
  "ticket_id" UUID NOT NULL,
  "author_user_id" UUID NOT NULL,
  "visibility" "support_ticket_visibility" NOT NULL DEFAULT 'public',
  "body" TEXT NOT NULL,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "edited_at" TIMESTAMPTZ(6),
  "deleted_at" TIMESTAMPTZ(6),
  CONSTRAINT "support_ticket_messages_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "support_ticket_messages_body_not_blank" CHECK (length(trim("body")) > 0 AND length("body") <= 20000)
);
CREATE INDEX "support_ticket_messages_ticket_created_idx" ON "support_ticket_messages"("ticket_id","created_at");
CREATE INDEX "support_ticket_messages_author_created_idx" ON "support_ticket_messages"("author_user_id","created_at");
ALTER TABLE "support_ticket_messages" ADD CONSTRAINT "support_ticket_messages_ticket_id_fkey"
  FOREIGN KEY ("ticket_id") REFERENCES "support_tickets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "support_ticket_messages" ADD CONSTRAINT "support_ticket_messages_author_user_id_fkey"
  FOREIGN KEY ("author_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "content_entries" (
  "id" UUID NOT NULL,
  "type" "content_entry_type" NOT NULL,
  "status" "content_entry_status" NOT NULL DEFAULT 'draft',
  "slug" VARCHAR(180) NOT NULL,
  "locale" VARCHAR(16) NOT NULL DEFAULT 'id-ID',
  "title" VARCHAR(200) NOT NULL,
  "summary" VARCHAR(500),
  "body_markdown" TEXT NOT NULL,
  "tags" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "author_user_id" UUID,
  "published_at" TIMESTAMPTZ(6),
  "scheduled_at" TIMESTAMPTZ(6),
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL,
  "archived_at" TIMESTAMPTZ(6),
  CONSTRAINT "content_entries_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "content_entries_slug_not_blank" CHECK (length(trim("slug")) > 0),
  CONSTRAINT "content_entries_title_not_blank" CHECK (length(trim("title")) > 0),
  CONSTRAINT "content_entries_publication_consistent" CHECK (
    ("status" <> 'published' OR "published_at" IS NOT NULL) AND
    ("status" <> 'archived' OR "archived_at" IS NOT NULL)
  )
);
CREATE UNIQUE INDEX "content_entries_type_slug_locale_key" ON "content_entries"("type","slug","locale");
CREATE INDEX "content_entries_type_status_published_idx" ON "content_entries"("type","status","published_at");
CREATE INDEX "content_entries_author_created_idx" ON "content_entries"("author_user_id","created_at");
ALTER TABLE "content_entries" ADD CONSTRAINT "content_entries_author_user_id_fkey"
  FOREIGN KEY ("author_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- File metadata is private and immutable after upload except for scanner/retention state.
CREATE FUNCTION "guard_file_attachment_mutation"() RETURNS trigger AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION 'file attachment metadata cannot be physically deleted';
  END IF;
  IF OLD."id" <> NEW."id"
     OR OLD."user_id" <> NEW."user_id"
     OR OLD."storage_key" <> NEW."storage_key"
     OR OLD."sha256" <> NEW."sha256"
     OR OLD."file_size" <> NEW."file_size"
     OR OLD."mime_type" <> NEW."mime_type" THEN
    RAISE EXCEPTION 'file attachment identity is immutable';
  END IF;
  IF NOT (
    (OLD."status" = 'quarantined' AND NEW."status" IN ('quarantined','clean','rejected','deleted')) OR
    (OLD."status" = 'clean' AND NEW."status IN ('clean','deleted')) OR
    (OLD."status" = 'rejected' AND NEW."status" IN ('rejected','deleted')) OR
    (OLD."status" = 'deleted' AND NEW."status" = 'deleted')
  ) THEN
    RAISE EXCEPTION 'invalid file attachment status transition';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "file_attachments_guard"
  BEFORE UPDATE OR DELETE ON "file_attachments"
  FOR EACH ROW EXECUTE FUNCTION "guard_file_attachment_mutation"();

CREATE FUNCTION "guard_notification_mutation"() RETURNS trigger AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION 'notification rows must be expired by retention policy';
  END IF;
  IF OLD."id" <> NEW."id"
     OR OLD."user_id" <> NEW."user_id"
     OR OLD."type" <> NEW."type"
     OR OLD."title" <> NEW."title"
     OR OLD."body" IS DISTINCT FROM NEW."body"
     OR OLD."payload_safe" IS DISTINCT FROM NEW."payload_safe"
     OR OLD."created_at" <> NEW."created_at" THEN
    RAISE EXCEPTION 'notification content is immutable';
  END IF;
  IF OLD."read_at" IS NOT NULL AND NEW."read_at" IS DISTINCT FROM OLD."read_at" THEN
    RAISE EXCEPTION 'notification read receipt cannot be reset';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "notifications_guard"
  BEFORE UPDATE OR DELETE ON "notifications"
  FOR EACH ROW EXECUTE FUNCTION "guard_notification_mutation"();
