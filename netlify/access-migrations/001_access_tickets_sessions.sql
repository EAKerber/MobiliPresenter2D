-- CP-PUBLIC-03a2-2 manual migration. Do NOT put under Netlify's auto-migrate
-- directory or apply to production when testing a Draft PR.
-- Apply only to a dedicated preview database after explicit configuration.
CREATE TABLE IF NOT EXISTS casa_access_tickets (
  ticket_hash char(64) PRIMARY KEY,
  subject char(64) NOT NULL,
  recipient text NOT NULL,
  issuer text NOT NULL,
  audience text NOT NULL,
  issued_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL,
  consumed_at timestamptz,
  revoked_at timestamptz,
  CONSTRAINT ticket_one_terminal_state CHECK (consumed_at IS NULL OR revoked_at IS NULL)
);
CREATE INDEX IF NOT EXISTS casa_access_tickets_rate_recipient_idx
  ON casa_access_tickets (audience, recipient, issued_at DESC);
CREATE INDEX IF NOT EXISTS casa_access_tickets_rate_issuer_idx
  ON casa_access_tickets (audience, issuer, issued_at DESC);
CREATE INDEX IF NOT EXISTS casa_access_tickets_expiry_idx
  ON casa_access_tickets (expires_at);
CREATE TABLE IF NOT EXISTS casa_access_sessions (
  session_hash char(64) PRIMARY KEY,
  ticket_hash char(64) NOT NULL UNIQUE REFERENCES casa_access_tickets(ticket_hash),
  subject char(64) NOT NULL,
  audience text NOT NULL,
  issued_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL,
  revoked_at timestamptz
);
CREATE INDEX IF NOT EXISTS casa_access_sessions_subject_idx
  ON casa_access_sessions (audience, subject, expires_at);
CREATE INDEX IF NOT EXISTS casa_access_sessions_expiry_idx
  ON casa_access_sessions (expires_at);
