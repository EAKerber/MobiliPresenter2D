"use strict";

// PostgreSQL-only: a ticket must be atomically consumed by exactly one
// concurrent redemption. Netlify Blobs cannot provide this guarantee.
function createStore(pool) {
  if (!pool || typeof pool.connect !== "function" || typeof pool.query !== "function") {
    throw new TypeError("transactional PostgreSQL pool required");
  }
  async function transaction(action) {
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      const result = await action(client);
      await client.query("COMMIT");
      return result;
    } catch (error) {
      await client.query("ROLLBACK").catch(() => {});
      throw error;
    } finally {
      client.release();
    }
  }
  async function issue({ ticketHash, subject, recipient, issuer, audience, ttlSeconds }) {
    return transaction(async client => {
      // Lock the issuer first and then the recipient consistently; two requests
      // cannot evade issuance limits by racing.
      await client.query("SELECT pg_advisory_xact_lock(hashtext($1))",
        ["casa-access:issuer:" + audience + ":" + issuer]);
      await client.query("SELECT pg_advisory_xact_lock(hashtext($1))",
        ["casa-access:recipient:" + audience + ":" + recipient]);
      const counts = await client.query(
        `SELECT
          (SELECT COUNT(*)::int FROM casa_access_tickets
            WHERE audience=$1 AND issuer=$2 AND issued_at>now()-interval '1 hour') AS by_issuer,
          (SELECT COUNT(*)::int FROM casa_access_tickets
            WHERE audience=$1 AND recipient=$3 AND issued_at>now()-interval '1 hour') AS by_recipient`,
        [audience, issuer, recipient]
      );
      if (counts.rows[0].by_issuer >= 30 || counts.rows[0].by_recipient >= 3) {
        return { ok: false, code: "rate_limited" };
      }
      await client.query(
        `INSERT INTO casa_access_tickets
         (ticket_hash, subject, recipient, issuer, audience, expires_at)
         VALUES ($1,$2,$3,$4,$5,now()+($6::int * interval '1 second'))`,
        [ticketHash, subject, recipient, issuer, audience, ttlSeconds]
      );
      return { ok: true };
    });
  }
  async function revokeTicket({ ticketHash, audience }) {
    await pool.query(
      "UPDATE casa_access_tickets SET revoked_at=now() WHERE ticket_hash=$1 AND audience=$2 AND consumed_at IS NULL AND revoked_at IS NULL",
      [ticketHash, audience]
    );
  }
  async function redeem({ ticketHash, sessionHash, audience, sessionSeconds }) {
    return transaction(async client => {
      const claim = await client.query(
        `UPDATE casa_access_tickets SET consumed_at=now()
         WHERE ticket_hash=$1 AND audience=$2
           AND consumed_at IS NULL AND revoked_at IS NULL AND expires_at>now()
         RETURNING ticket_hash, subject`,
        [ticketHash, audience]
      );
      if (claim.rows.length !== 1) return { ok: false, code: "invalid_or_expired" };
      await client.query(
        `INSERT INTO casa_access_sessions
          (session_hash, ticket_hash, subject, audience, expires_at)
         VALUES ($1,$2,$3,$4,now()+($5::int * interval '1 second'))`,
        [sessionHash, claim.rows[0].ticket_hash, claim.rows[0].subject, audience, sessionSeconds]
      );
      return { ok: true };
    });
  }
  async function verify({ sessionHash, audience }) {
    const result = await pool.query(
      `SELECT subject,
          floor(extract(epoch from issued_at))::bigint AS issued_at,
          floor(extract(epoch from expires_at))::bigint AS expires_at
         FROM casa_access_sessions
         WHERE session_hash=$1 AND audience=$2
           AND revoked_at IS NULL AND expires_at>now()`,
      [sessionHash, audience]
    );
    if (!result.rows.length) return null;
    const row = result.rows[0];
    return { subject: row.subject.trim(), issuedAt: Number(row.issued_at),
      expiresAt: Number(row.expires_at) };
  }
  async function revokeSession({ sessionHash, audience }) {
    await pool.query(
      "UPDATE casa_access_sessions SET revoked_at=now() WHERE session_hash=$1 AND audience=$2 AND revoked_at IS NULL",
      [sessionHash, audience]
    );
  }
  return Object.freeze({ issue, revokeTicket, redeem, verify, revokeSession });
}

let cached = null;
function getConfiguredStore() {
  if (process.env.CASA_ACCESS_ENABLED !== "1") return null;
  const connectionString = process.env.CASA_ACCESS_DB_URL;
  if (!connectionString || !/^postgres(?:ql)?:\/\//.test(connectionString)) return null;
  if (!cached) {
    const { Pool } = require("pg");
    const pool = new Pool({ connectionString, connectionTimeoutMillis: 3000,
      idleTimeoutMillis: 15000, max: 3 });
    cached = createStore(pool);
  }
  return cached;
}
module.exports = Object.freeze({ createStore, getConfiguredStore });
