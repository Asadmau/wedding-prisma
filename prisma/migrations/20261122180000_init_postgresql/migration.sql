-- Initial PostgreSQL schema for Wedding Invitation.
-- All timestamps intentionally remain TEXT to preserve the original ISO-8601 API contract.

CREATE TABLE "admins" (
  "id" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "password_hash" TEXT NOT NULL,
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "created_at" TEXT NOT NULL,
  "updated_at" TEXT NOT NULL,
  CONSTRAINT "admins_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "templates" (
  "id" TEXT NOT NULL,
  "key" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "preview_image_url" TEXT NOT NULL,
  "accent_color" TEXT NOT NULL,
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "sort_order" INTEGER NOT NULL DEFAULT 0,
  "created_at" TEXT NOT NULL,
  "updated_at" TEXT NOT NULL,
  CONSTRAINT "templates_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "invitations" (
  "id" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "template_id" TEXT NOT NULL,
  "is_published" BOOLEAN NOT NULL DEFAULT true,
  "hero_subtitle" TEXT NOT NULL DEFAULT '',
  "hero_image_url" TEXT NOT NULL DEFAULT '',
  "opening_quote" TEXT NOT NULL DEFAULT '',
  "opening_quote_author" TEXT NOT NULL DEFAULT '',
  "seo_title" TEXT NOT NULL DEFAULT '',
  "seo_description" TEXT NOT NULL DEFAULT '',
  "og_image_url" TEXT NOT NULL DEFAULT '',
  "music_url" TEXT NOT NULL DEFAULT '',
  "music_title" TEXT NOT NULL DEFAULT '',
  "is_music_enabled" BOOLEAN NOT NULL DEFAULT true,
  "primary_date" TEXT NOT NULL,
  "countdown_target" TEXT NOT NULL,
  "created_at" TEXT NOT NULL,
  "updated_at" TEXT NOT NULL,
  CONSTRAINT "invitations_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "invitations_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "templates"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE TABLE "sessions" (
  "id" TEXT NOT NULL,
  "admin_id" TEXT NOT NULL,
  "token_hash" TEXT NOT NULL,
  "csrf_token" TEXT NOT NULL,
  "expires_at" TEXT NOT NULL,
  "user_agent" TEXT,
  "ip_address" TEXT,
  "created_at" TEXT NOT NULL,
  CONSTRAINT "sessions_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "sessions_admin_id_fkey" FOREIGN KEY ("admin_id") REFERENCES "admins"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE "couples" (
  "id" TEXT NOT NULL,
  "invitation_id" TEXT NOT NULL,
  "groom_full_name" TEXT NOT NULL,
  "groom_nick_name" TEXT NOT NULL,
  "groom_parents" TEXT NOT NULL DEFAULT '',
  "groom_bio" TEXT NOT NULL DEFAULT '',
  "groom_instagram" TEXT NOT NULL DEFAULT '',
  "groom_photo_url" TEXT NOT NULL DEFAULT '',
  "bride_full_name" TEXT NOT NULL,
  "bride_nick_name" TEXT NOT NULL,
  "bride_parents" TEXT NOT NULL DEFAULT '',
  "bride_bio" TEXT NOT NULL DEFAULT '',
  "bride_instagram" TEXT NOT NULL DEFAULT '',
  "bride_photo_url" TEXT NOT NULL DEFAULT '',
  "created_at" TEXT NOT NULL,
  "updated_at" TEXT NOT NULL,
  CONSTRAINT "couples_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "couples_invitation_id_fkey" FOREIGN KEY ("invitation_id") REFERENCES "invitations"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE "events" (
  "id" TEXT NOT NULL,
  "invitation_id" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "category" TEXT NOT NULL DEFAULT 'CEREMONY',
  "event_date" TEXT NOT NULL,
  "start_time" TEXT NOT NULL,
  "end_time" TEXT NOT NULL DEFAULT '',
  "timezone" TEXT NOT NULL DEFAULT 'WIB',
  "venue_name" TEXT NOT NULL,
  "venue_address" TEXT NOT NULL,
  "maps_url" TEXT NOT NULL DEFAULT '',
  "maps_embed_url" TEXT NOT NULL DEFAULT '',
  "dress_code" TEXT NOT NULL DEFAULT '',
  "description" TEXT NOT NULL DEFAULT '',
  "sort_order" INTEGER NOT NULL DEFAULT 0,
  "created_at" TEXT NOT NULL,
  "updated_at" TEXT NOT NULL,
  CONSTRAINT "events_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "events_invitation_id_fkey" FOREIGN KEY ("invitation_id") REFERENCES "invitations"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE "love_stories" (
  "id" TEXT NOT NULL,
  "invitation_id" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "period_label" TEXT NOT NULL,
  "story_date" TEXT NOT NULL DEFAULT '',
  "description" TEXT NOT NULL,
  "image_url" TEXT NOT NULL DEFAULT '',
  "sort_order" INTEGER NOT NULL DEFAULT 0,
  "created_at" TEXT NOT NULL,
  "updated_at" TEXT NOT NULL,
  CONSTRAINT "love_stories_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "love_stories_invitation_id_fkey" FOREIGN KEY ("invitation_id") REFERENCES "invitations"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE "galleries" (
  "id" TEXT NOT NULL,
  "invitation_id" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "caption" TEXT NOT NULL DEFAULT '',
  "image_url" TEXT NOT NULL,
  "storage_key" TEXT NOT NULL DEFAULT '',
  "mime_type" TEXT NOT NULL DEFAULT 'image/jpeg',
  "file_size" INTEGER NOT NULL DEFAULT 0,
  "sort_order" INTEGER NOT NULL DEFAULT 0,
  "created_at" TEXT NOT NULL,
  "updated_at" TEXT NOT NULL,
  CONSTRAINT "galleries_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "galleries_invitation_id_fkey" FOREIGN KEY ("invitation_id") REFERENCES "invitations"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE "guests" (
  "id" TEXT NOT NULL,
  "invitation_id" TEXT NOT NULL,
  "full_name" TEXT NOT NULL,
  "phone" TEXT NOT NULL DEFAULT '',
  "email" TEXT NOT NULL DEFAULT '',
  "group_name" TEXT NOT NULL DEFAULT 'Umum',
  "max_guests" INTEGER NOT NULL DEFAULT 2,
  "guest_slug" TEXT,
  "token_hash" TEXT NOT NULL,
  "token_encrypted" TEXT NOT NULL DEFAULT '',
  "notes" TEXT NOT NULL DEFAULT '',
  "created_at" TEXT NOT NULL,
  "updated_at" TEXT NOT NULL,
  CONSTRAINT "guests_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "guests_invitation_id_fkey" FOREIGN KEY ("invitation_id") REFERENCES "invitations"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE "rsvps" (
  "id" TEXT NOT NULL,
  "invitation_id" TEXT NOT NULL,
  "guest_id" TEXT,
  "guest_name" TEXT NOT NULL,
  "guest_phone" TEXT NOT NULL DEFAULT '',
  "attendance_status" TEXT NOT NULL,
  "guest_count" INTEGER NOT NULL DEFAULT 1,
  "message" TEXT NOT NULL DEFAULT '',
  "edit_token_hash" TEXT NOT NULL DEFAULT '',
  "created_at" TEXT NOT NULL,
  "updated_at" TEXT NOT NULL,
  CONSTRAINT "rsvps_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "rsvps_invitation_id_fkey" FOREIGN KEY ("invitation_id") REFERENCES "invitations"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "rsvps_guest_id_fkey" FOREIGN KEY ("guest_id") REFERENCES "guests"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE TABLE "wishes" (
  "id" TEXT NOT NULL,
  "invitation_id" TEXT NOT NULL,
  "guest_id" TEXT,
  "author_name" TEXT NOT NULL,
  "relation_label" TEXT NOT NULL DEFAULT '',
  "message" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'PENDING',
  "moderated_at" TEXT,
  "created_at" TEXT NOT NULL,
  "updated_at" TEXT NOT NULL,
  CONSTRAINT "wishes_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "wishes_invitation_id_fkey" FOREIGN KEY ("invitation_id") REFERENCES "invitations"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "wishes_guest_id_fkey" FOREIGN KEY ("guest_id") REFERENCES "guests"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE TABLE "gift_accounts" (
  "id" TEXT NOT NULL,
  "invitation_id" TEXT NOT NULL,
  "bank_name" TEXT NOT NULL,
  "account_number" TEXT NOT NULL,
  "account_holder" TEXT NOT NULL,
  "qr_image_url" TEXT NOT NULL DEFAULT '',
  "notes" TEXT NOT NULL DEFAULT '',
  "sort_order" INTEGER NOT NULL DEFAULT 0,
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "created_at" TEXT NOT NULL,
  "updated_at" TEXT NOT NULL,
  CONSTRAINT "gift_accounts_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "gift_accounts_invitation_id_fkey" FOREIGN KEY ("invitation_id") REFERENCES "invitations"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE "site_settings" (
  "id" TEXT NOT NULL,
  "invitation_id" TEXT NOT NULL,
  "rsvp_enabled" BOOLEAN NOT NULL DEFAULT true,
  "rsvp_deadline" TEXT NOT NULL DEFAULT '',
  "wishes_enabled" BOOLEAN NOT NULL DEFAULT true,
  "wishes_auto_approve" BOOLEAN NOT NULL DEFAULT false,
  "gifts_enabled" BOOLEAN NOT NULL DEFAULT true,
  "music_enabled" BOOLEAN NOT NULL DEFAULT true,
  "gallery_enabled" BOOLEAN NOT NULL DEFAULT true,
  "love_story_enabled" BOOLEAN NOT NULL DEFAULT true,
  "whatsapp_template" TEXT NOT NULL DEFAULT '',
  "footer_text" TEXT NOT NULL DEFAULT '',
  "created_at" TEXT NOT NULL,
  "updated_at" TEXT NOT NULL,
  CONSTRAINT "site_settings_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "site_settings_invitation_id_fkey" FOREIGN KEY ("invitation_id") REFERENCES "invitations"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "admins_email_key" ON "admins"("email");
CREATE UNIQUE INDEX "templates_key_key" ON "templates"("key");
CREATE UNIQUE INDEX "invitations_slug_key" ON "invitations"("slug");
CREATE INDEX "invitations_slug_idx" ON "invitations"("slug");
CREATE UNIQUE INDEX "sessions_token_hash_key" ON "sessions"("token_hash");
CREATE INDEX "sessions_admin_id_idx" ON "sessions"("admin_id");
CREATE INDEX "sessions_expires_at_idx" ON "sessions"("expires_at");
CREATE UNIQUE INDEX "couples_invitation_id_key" ON "couples"("invitation_id");
CREATE INDEX "events_invitation_id_idx" ON "events"("invitation_id");
CREATE INDEX "love_stories_invitation_id_idx" ON "love_stories"("invitation_id");
CREATE INDEX "galleries_invitation_id_idx" ON "galleries"("invitation_id");
CREATE UNIQUE INDEX "guests_token_hash_key" ON "guests"("token_hash");
CREATE INDEX "guests_invitation_id_idx" ON "guests"("invitation_id");
CREATE INDEX "guests_token_hash_idx" ON "guests"("token_hash");
CREATE UNIQUE INDEX "guests_invitation_id_guest_slug_key" ON "guests"("invitation_id", "guest_slug");
CREATE UNIQUE INDEX "rsvps_guest_id_key" ON "rsvps"("guest_id");
CREATE INDEX "rsvps_invitation_id_idx" ON "rsvps"("invitation_id");
CREATE INDEX "rsvps_attendance_status_idx" ON "rsvps"("attendance_status");
CREATE INDEX "wishes_invitation_id_status_idx" ON "wishes"("invitation_id", "status");
CREATE INDEX "gift_accounts_invitation_id_idx" ON "gift_accounts"("invitation_id");
CREATE UNIQUE INDEX "site_settings_invitation_id_key" ON "site_settings"("invitation_id");
