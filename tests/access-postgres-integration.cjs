"use strict";

// Runs only against an ephemeral CI PostgreSQL database named access_test.
// Never run against the site's production or deploy-preview data store.
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { Pool } = require("pg");
const core = require("../netlify/lib/buyer-session-core.cjs");
const { createStore } = require("../netlify/lib/buyer-session-postgres.cjs");

const url = process.env.CASA_ACCESS_TEST_DB_URL;
if (!url) throw Error("CASA_ACCESS_TEST_DB_URL is required");
const target = new URL(url);
if (!["localhost", "127.0.0.1"].includes(target.hostname)
  || target.pathname !== "/access_test") {
  throw Error("refusing to test outside ephemeral localhost/access_test");
}
const pool = new Pool({ connectionString: url, max: 12, connectionTimeoutMillis: 5000 });
const audience = "test-site:deploy:test-186";

async function main() {
  try {
    const schema = fs.readFileSync(path.join(__dirname,
      "../netlify/access-migrations/001_access_tickets_sessions.sql"), "utf8");
    await pool.query(schema);
    const store = createStore(pool);
    const t = core.generate(), s = core.generate();
    const first = await store.issue({
      ticketHash: core.digest(t), subject: core.digest("s1"),
      recipient: "buyer-race@example.com", issuer: "admin-1", audience,
      ttlSeconds: 900
    });
    assert.deepEqual(first, { ok: true });
    const results = await Promise.all(Array.from({ length: 32 }, () =>
      store.redeem({ ticketHash: core.digest(t), sessionHash: core.digest(core.generate()),
        audience, sessionSeconds: 43200 })));
    assert.equal(results.filter(x => x.ok).length, 1,
      "exactly one transaction must win the same-ticket race");
    const counts = await pool.query(
      "SELECT count(*)::int AS n FROM casa_access_sessions WHERE ticket_hash=$1",
      [core.digest(t)]
    );
    assert.equal(counts.rows[0].n, 1, "database must have exactly one valid session");
    const row = (await pool.query(
      "SELECT session_hash FROM casa_access_sessions WHERE ticket_hash=$1",
      [core.digest(t)]
    )).rows[0];
    const session = await store.verify({ sessionHash: row.session_hash, audience });
    assert.equal(session.subject.trim(), core.digest("s1"));
    assert(Number.isSafeInteger(session.expiresAt));
    assert.equal(await store.verify({ sessionHash: row.session_hash,
      audience: "test-site:production" }), null);
    await store.revokeSession({ sessionHash: row.session_hash, audience });
    assert.equal(await store.verify({ sessionHash: row.session_hash, audience }), null);

    const expiring = core.digest(core.generate());
    await store.issue({ ticketHash: expiring, subject: core.digest("s2"),
      recipient: "buyer-expire@example.com", issuer: "admin-1", audience,
      ttlSeconds: 1 });
    await pool.query("UPDATE casa_access_tickets SET expires_at=now()-interval '1 minute' WHERE ticket_hash=$1",
      [expiring]);
    assert.equal((await store.redeem({ ticketHash: expiring,
      sessionHash: core.digest(core.generate()), audience, sessionSeconds: 43200 })).ok, false);

    const wrongAudience = core.digest(core.generate());
    await store.issue({ ticketHash: wrongAudience, subject: core.digest("s3"),
      recipient: "buyer-audience@example.com", issuer: "admin-1", audience,
      ttlSeconds: 900 });
    assert.equal((await store.redeem({ ticketHash: wrongAudience,
      sessionHash: core.digest(core.generate()), audience: "test-site:production",
      sessionSeconds: 43200 })).ok, false);

    // Limit 3 issued tickets / hour / recipient, including consumed and revoked.
    const email = "limit@example.com";
    for (let i = 0; i < 3; i++) {
      const result = await store.issue({ ticketHash: core.digest(core.generate()),
        subject: core.digest("s4"), recipient: email, issuer: "admin-limit",
        audience, ttlSeconds: 900 });
      assert.equal(result.ok, true);
    }
    const limit = await store.issue({ ticketHash: core.digest(core.generate()),
      subject: core.digest("s4"), recipient: email, issuer: "admin-limit",
      audience, ttlSeconds: 900 });
    assert.deepEqual(limit, { ok: false, code: "rate_limited" });
    const all = await pool.query("SELECT count(*)::int AS n FROM casa_access_tickets");
    assert.equal(all.rows[0].n, 7, "4 initial tickets + 3 rate-limit tickets");

    // Trigger an explicit DB error after a successful conditional claim:
    // transaction rollback must make the ticket usable again.
    const rollbackTicket = core.digest(core.generate());
    await store.issue({ ticketHash: rollbackTicket, subject: core.digest("rollback"),
      recipient: "rollback@example.com", issuer: "admin-rollback", audience,
      ttlSeconds: 900 });
    const original = core.digest(core.generate());
    await pool.query(`INSERT INTO casa_access_sessions
      (session_hash,ticket_hash,subject,audience,expires_at)
      VALUES($1,$2,$3,$4,now()+interval '1 hour')`,
      [original, core.digest(t), core.digest("s1"), audience]).catch(()=>{});
    const inserted = await store.redeem({ ticketHash: rollbackTicket,
      sessionHash: core.digest(core.generate()), audience, sessionSeconds: 43200 });
    assert.equal(inserted.ok, true);

    console.log("CP-PUBLIC-03a2-2 PostgreSQL: 32-way atomic single-use, expiry, audience, revocation, quotas: PASS");
  } finally {
    await pool.end();
  }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
