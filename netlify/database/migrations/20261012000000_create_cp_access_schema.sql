-- Minimal first schema for buyer access grants and opaque sessions.
-- No seed data: deploy preview validates provisioning and migration only.

CREATE TABLE cp_access_grants (
  grant_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient_email text NOT NULL,
  scope text NOT NULL DEFAULT 'config:read'
    CHECK (scope = 'config:read'),
  token_hash bytea NOT NULL UNIQUE
    CHECK (octet_length(token_hash) = 32),
  issued_by_identity_id text NOT NULL,
  issued_by_role text NOT NULL
    CHECK (issued_by_role IN ('admin', 'staff')),
  created_at timestamptz NOT NULL DEFAULT now(),
  token_expires_at timestamptz NOT NULL,
  redeemed_at timestamptz,
  revoked_at timestamptz,
  CONSTRAINT cp_access_grants_email_normalized
    CHECK (recipient_email = lower(btrim(recipient_email))),
  CONSTRAINT cp_access_grants_expiry_after_creation
    CHECK (token_expires_at > created_at),
  CONSTRAINT cp_access_grants_redeemed_after_creation
    CHECK (redeemed_at IS NULL OR redeemed_at >= created_at),
  CONSTRAINT cp_access_grants_revoked_after_creation
    CHECK (revoked_at IS NULL OR revoked_at >= created_at)
);

CREATE INDEX cp_access_grants_recipient_created_idx
  ON cp_access_grants (recipient_email, created_at DESC);

CREATE TABLE cp_access_sessions (
  session_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  grant_id uuid NOT NULL UNIQUE
    REFERENCES cp_access_grants (grant_id),
  scope text NOT NULL DEFAULT 'config:read'
    CHECK (scope = 'config:read'),
  token_hash bytea NOT NULL UNIQUE
    CHECK (octet_length(token_hash) = 32),
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL,
  revoked_at timestamptz,
  CONSTRAINT cp_access_sessions_expiry_after_creation
    CHECK (expires_at > created_at),
  CONSTRAINT cp_access_sessions_revoked_after_creation
    CHECK (revoked_at IS NULL OR revoked_at >= created_at)
);

CREATE INDEX cp_access_sessions_active_expiry_idx
  ON cp_access_sessions (expires_at)
  WHERE revoked_at IS NULL;
