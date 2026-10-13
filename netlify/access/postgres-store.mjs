import pg from "pg";
import { SUPABASE_DATABASE_CA } from "./supabase-database-ca.mjs";
import {
  ACCESS_SCOPE,
  createId,
  createOpaqueToken,
  hashOpaqueToken,
  normalizeRecipientEmail,
} from "./tokens.mjs";

const { Pool } = pg;
let pool;

function env(name) {
  if (typeof Netlify !== "undefined" && Netlify?.env?.get) return Netlify.env.get(name);
  return process.env[name];
}

function getPool() {
  if (pool) return pool;
  const connectionString = env("DATABASE_URL");
  if (!connectionString) throw new Error("access_store_not_configured");

  pool = new Pool({
    connectionString,
    max: 1,
    idleTimeoutMillis: 5_000,
    connectionTimeoutMillis: 4_000,
    ssl: {
      ca: SUPABASE_DATABASE_CA,
      rejectUnauthorized: true,
    },
    application_name: "mobilipresenter2d-access",
  });
  pool.on("error", () => {
    // Avoid logging connection details or environment values.
  });
  return pool;
}

async function inTransaction(callback) {
  const client = await getPool().connect();
  try {
    await client.query("BEGIN");
    const result = await callback(client);
    await client.query("COMMIT");
    return result;
  } catch (error) {
    try { await client.query("ROLLBACK"); } catch { /* preserve the original failure */ }
    throw error;
  } finally {
    client.release();
  }
}

export async function issueGrant({ id, recipientEmail, tokenHash, issuedBy, expiresAt }) {
  if (!id || !normalizeRecipientEmail(recipientEmail)
    || typeof tokenHash !== "string" || !/^[a-f0-9]{64}$/.test(tokenHash)
    || !issuedBy || !expiresAt || !Number.isFinite(new Date(expiresAt).getTime())) {
    throw new TypeError("invalid_grant_input");
  }
  const result = await getPool().query(
    `INSERT INTO access_control.access_grants
      (id, recipient_email, scope, token_hash, issued_by_identity_id, expires_at)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING id, recipient_email, scope, created_at, expires_at`,
    [id, normalizeRecipientEmail(recipientEmail), ACCESS_SCOPE, tokenHash, issuedBy, expiresAt],
  );
  return result.rows[0];
}

export async function redeemGrant({ grantToken }) {
  const grantHash = hashOpaqueToken(grantToken);
  if (!grantHash) return { ok: false, code: "invalid_or_expired_link" };

  const sessionToken = createOpaqueToken();
  const sessionHash = hashOpaqueToken(sessionToken);
  const sessionId = createId();

  const result = await inTransaction(async (client) => {
    const selected = await client.query(
      `SELECT id, expires_at, redeemed_at, revoked_at, expires_at > now() AS unexpired
         FROM access_control.access_grants
        WHERE token_hash = $1 AND scope = $2
        FOR UPDATE`,
      [grantHash, ACCESS_SCOPE],
    );
    const grant = selected.rows[0];
    if (!grant || !grant.unexpired || grant.redeemed_at || grant.revoked_at) {
      return { ok: false, code: "invalid_or_expired_link" };
    }

    const updated = await client.query(
      `UPDATE access_control.access_grants
          SET redeemed_at = now()
        WHERE id = $1 AND redeemed_at IS NULL AND revoked_at IS NULL
        RETURNING expires_at`,
      [grant.id],
    );
    if (updated.rowCount !== 1) return { ok: false, code: "invalid_or_expired_link" };

    const inserted = await client.query(
      `INSERT INTO access_control.access_sessions (id, grant_id, token_hash, expires_at)
       VALUES ($1, $2, $3, $4)
       RETURNING expires_at`,
      [sessionId, grant.id, sessionHash, updated.rows[0].expires_at],
    );
    return { ok: true, sessionToken, expiresAt: inserted.rows[0].expires_at };
  });

  return result;
}

export async function findActiveSession(sessionToken) {
  const sessionHash = hashOpaqueToken(sessionToken);
  if (!sessionHash) return null;
  const result = await getPool().query(
    `SELECT s.id, s.grant_id, s.expires_at
       FROM access_control.access_sessions AS s
       JOIN access_control.access_grants AS g ON g.id = s.grant_id
      WHERE s.token_hash = $1
        AND s.revoked_at IS NULL
        AND s.expires_at > now()
        AND g.revoked_at IS NULL
        AND g.scope = $2
      LIMIT 1`,
    [sessionHash, ACCESS_SCOPE],
  );
  return result.rows[0] ?? null;
}

export async function revokeGrant({ grantId, revokedBy }) {
  if (!grantId || !revokedBy) return false;
  return inTransaction(async (client) => {
    const updated = await client.query(
      `UPDATE access_control.access_grants
          SET revoked_at = now(), revoked_by_identity_id = $2
        WHERE id = $1 AND revoked_at IS NULL
        RETURNING id`,
      [grantId, revokedBy],
    );
    if (updated.rowCount !== 1) return false;
    await client.query(
      `UPDATE access_control.access_sessions
          SET revoked_at = now()
        WHERE grant_id = $1 AND revoked_at IS NULL`,
      [grantId],
    );
    return true;
  });
}

export async function listRecentGrants({ limit = 100 } = {}) {
  const boundedLimit = Math.min(100, Math.max(1, Number.isInteger(limit) ? limit : 100));
  const result = await getPool().query(
    `SELECT id, recipient_email, scope, issued_by_identity_id, revoked_by_identity_id,
            created_at, expires_at, redeemed_at, revoked_at
       FROM access_control.access_grants
      ORDER BY created_at DESC
      LIMIT $1`,
    [boundedLimit],
  );
  return result.rows;
}

