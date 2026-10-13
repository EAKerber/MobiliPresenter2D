-- Temporary, read-only configurator access.
-- Run with a migration/owner connection. Runtime Functions use a restricted
-- PostgreSQL role and never expose these tables through a public API.

CREATE SCHEMA IF NOT EXISTS access_control;
REVOKE ALL ON SCHEMA access_control FROM PUBLIC;

CREATE TABLE IF NOT EXISTS access_control.access_grants (
  id uuid PRIMARY KEY,
  recipient_email text NOT NULL,
  scope text NOT NULL CHECK (scope = 'config'),
  token_hash char(64) NOT NULL UNIQUE,
  issued_by_identity_id text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL,
  redeemed_at timestamptz,
  revoked_at timestamptz,
  revoked_by_identity_id text,
  CHECK (expires_at > created_at)
);

CREATE INDEX IF NOT EXISTS access_grants_recipient_created_idx
  ON access_control.access_grants (lower(recipient_email), created_at DESC);

CREATE INDEX IF NOT EXISTS access_grants_expiry_idx
  ON access_control.access_grants (expires_at);

CREATE TABLE IF NOT EXISTS access_control.access_sessions (
  id uuid PRIMARY KEY,
  grant_id uuid NOT NULL REFERENCES access_control.access_grants(id) ON DELETE CASCADE,
  token_hash char(64) NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL,
  revoked_at timestamptz,
  CHECK (expires_at > created_at)
);

CREATE INDEX IF NOT EXISTS access_sessions_grant_idx
  ON access_control.access_sessions (grant_id);

CREATE INDEX IF NOT EXISTS access_sessions_expiry_idx
  ON access_control.access_sessions (expires_at);

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'access_runtime') THEN
    CREATE ROLE access_runtime NOLOGIN;
  END IF;
END;
$$;

GRANT USAGE ON SCHEMA access_control TO access_runtime;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA access_control TO access_runtime;
ALTER DEFAULT PRIVILEGES IN SCHEMA access_control
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO access_runtime;

ALTER TABLE access_control.access_grants ENABLE ROW LEVEL SECURITY;
ALTER TABLE access_control.access_grants FORCE ROW LEVEL SECURITY;
CREATE POLICY access_runtime_grants_all
  ON access_control.access_grants
  FOR ALL
  TO access_runtime
  USING (true)
  WITH CHECK (true);

ALTER TABLE access_control.access_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE access_control.access_sessions FORCE ROW LEVEL SECURITY;
CREATE POLICY access_runtime_sessions_all
  ON access_control.access_sessions
  FOR ALL
  TO access_runtime
  USING (true)
  WITH CHECK (true);
