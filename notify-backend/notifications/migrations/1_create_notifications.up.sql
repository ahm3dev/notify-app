-- pgcrypto provides gen_random_uuid() on older Postgres versions.
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE notifications (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  -- No FK to users (separate service/DB); existence validated via service call.
  user_id    UUID NOT NULL,
  channel    TEXT NOT NULL CHECK (channel IN ('in_app', 'email')),
  title      TEXT NOT NULL,
  body       TEXT NOT NULL,
  read_at    TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Speeds up per-user, newest-first list queries (avoids a full scan + sort).
CREATE INDEX notifications_user_created_idx
  ON notifications (user_id, created_at DESC);
