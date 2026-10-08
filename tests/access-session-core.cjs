"use strict";
const assert = require("node:assert/strict");
const core = require("../netlify/lib/buyer-session-core.cjs");
const http = require("../netlify/lib/buyer-session-http.cjs");
const buyer = require("../netlify/lib/authorized-buyer-read.cjs");
const email = require("../netlify/lib/buyer-session-email.cjs");
const ORIGIN = "https://deploy-preview-186--mobilipresenter2d.netlify.app";
const context = { site: { id: "test-site" },
  deploy: { context: "deploy-preview", id: "test-deploy-186" } };
const aud = http.audience(context);
const makeRequest = (path, method, body, headers = {}) => new Request(
  ORIGIN + path, { method, headers: { Origin: ORIGIN,
    "Content-Type": "application/json", ...headers },
  ...(body ? { body: JSON.stringify(body) } : {}) }
);

async function main() {
  const secret = core.generate();
  assert(core.TOKEN_PATTERN.test(secret));
  assert.equal(core.digest(secret).length, 64);
  assert.notEqual(core.generate(), secret);
  assert.equal(core.normalizeEmail(" TEST@EXAMPLE.COM "), "test@example.com");
  assert.equal(core.normalizeEmail("x\r\n@example.com"), null);
  assert(core.sameOrigin(makeRequest("/api/access/redeem", "POST", {}), ORIGIN));
  assert(!core.sameOrigin(makeRequest("/api/access/redeem", "POST", {},
    { Origin: "https://attacker.example" }), ORIGIN));
  assert(!core.sameOrigin(makeRequest("/api/access/redeem", "POST", {},
    { "Sec-Fetch-Site": "cross-site" }), ORIGIN));
  assert.throws(() => core.normalizeOrigin("http://insecure.example"));
  assert.throws(() => core.normalizeOrigin(ORIGIN + "/something"));
  assert.equal(http.audience({ site: { id: "test-site" },
    deploy: { context: "production" } }), "test-site:production");
  assert.notEqual(aud, "test-site:production");
  const requested = [];
  const valid = new Map(), sessions = new Map();
  let consumed = 0;
  const store = {
    async issue(v) { valid.set(v.ticketHash, { ...v, active: true }); return { ok: true }; },
    async revokeTicket(v) { valid.get(v.ticketHash).active = false; },
    async redeem(v) {
      const entry = valid.get(v.ticketHash);
      // Deliberately synchronous single-winner update before any await.
      if (!entry?.active || entry.used || entry.audience !== v.audience) return { ok: false };
      entry.used = true;
      consumed++;
      const issuedAt = Math.floor(Date.now() / 1000);
      sessions.set(v.sessionHash, { subject: entry.subject, audience: v.audience,
        issuedAt, expiresAt: issuedAt + v.sessionSeconds, revoked: false });
      return { ok: true };
    },
    async verify(v) {
      const entry = sessions.get(v.sessionHash);
      return entry && !entry.revoked && entry.audience === v.audience
        && entry.expiresAt > Math.floor(Date.now() / 1000) ? entry : null;
    },
    async revokeSession(v) {
      const s = sessions.get(v.sessionHash);
      if (s && s.audience === v.audience) s.revoked = true;
    }
  };
  const sender = { async send(message) { requested.push(message); } };
  assert.deepEqual(await core.issue({ store, sender, origin: ORIGIN,
    email: " BUYER@example.com ", issuer: "adm-1", audience: aud }), { ok: true });
  assert.equal(requested[0].to, "buyer@example.com");
  const url = new URL(requested[0].link);
  assert.equal(url.origin, ORIGIN);
  assert.equal(url.pathname, "/access/");
  assert.equal(url.search, "");
  assert(url.hash.startsWith("#ticket="));
  const ticket = url.hash.slice("#ticket=".length);
  assert.equal(JSON.stringify([...valid.values()]).includes(ticket), false,
    "no token plaintext persisted");
  const attempts = await Promise.all(Array.from({ length: 32 },
    () => core.redeem({ store, token: ticket, audience: aud })));
  assert.equal(attempts.filter(x => x.ok).length, 1);
  assert.equal(consumed, 1);
  const sessionCookie = attempts.find(x => x.ok).sessionCookie;
  assert(sessionCookie.startsWith("__Host-casa-config-session="));
  assert.match(sessionCookie, /; Secure; HttpOnly; SameSite=Lax; Max-Age=43200/);
  const request = makeRequest("/api/access/session", "GET", null,
    { Cookie: sessionCookie.split(";")[0] });
  const verified = await core.verify({ store, request, audience: aud });
  assert.equal(verified.verified, true);
  assert.equal(verified.kind, "customer-session");
  assert(verified.scopes.includes("configuration:read"));
  assert.equal(await core.verify({ store, request, audience: "other-audience" }), null);
  assert.equal(await core.revoke({ store, request, audience: aud }),
    "__Host-casa-config-session=; Path=/; Secure; HttpOnly; SameSite=Lax; Max-Age=0");
  assert.equal(await core.verify({ store, request, audience: aud }), null);
  assert.equal((await core.redeem({ store, token: ticket, audience: aud })).ok, false);
  assert.equal((await core.redeem({ store, token: "not a ticket", audience: aud })).ok, false);
  const malformed = makeRequest("/api/access/session", "GET", null,
    { Cookie: sessionCookie.split(";")[0] + "; " + sessionCookie.split(";")[0] });
  assert.equal(core.readSessionCookie(malformed), null, "duplicate cookie must fail closed");

  const failSender = { async send() { throw Error("provider failure"); } };
  const before = valid.size;
  assert.deepEqual(await core.issue({ store, sender: failSender, origin: ORIGIN,
    email: "fail@example.com", issuer: "adm-1", audience: aud }),
    { ok: false, code: "delivery_unavailable" });
  assert.equal(valid.size, before + 1);
  assert.equal([...valid.values()].at(-1).active, false, "failed delivery revokes token");

  let storeReads = 0;
  const guard = { ...store, async issue(...args) { storeReads++; return store.issue(...args); } };
  const deny = await http.issue(makeRequest("/api/access/issue", "POST",
    { email: "new@example.com" }), context, {
      store: guard, sender, origin: ORIGIN,
      getIdentityUser: async () => null
    });
  assert.equal(deny.status, 401);
  assert.equal(storeReads, 0);
  const forbidden = await http.issue(makeRequest("/api/access/issue", "POST",
    { email: "new@example.com" }), context, {
      store: guard, sender, origin: ORIGIN,
      getIdentityUser: async () => ({ id: "buyer", roles: ["customer"] })
    });
  assert.equal(forbidden.status, 403);
  assert.equal(storeReads, 0);
  const admin = await http.issue(makeRequest("/api/access/issue", "POST",
    { email: "new@example.com" }), context, {
      store: guard, sender, origin: ORIGIN,
      getIdentityUser: async () => ({ id: "adm-1", app_metadata: { roles: ["admin"] } })
    });
  assert.equal(admin.status, 202);
  assert.deepEqual(await admin.json(), { delivered: true });
  assert.equal(storeReads, 1);

  const crossSite = await http.redeem(makeRequest("/api/access/redeem", "POST",
    { ticket: core.generate() }, { Origin: "https://evil.example" }), context,
    { store, origin: ORIGIN });
  assert.equal(crossSite.status, 403);
  const noProvider = await http.redeem(makeRequest("/api/access/redeem", "POST",
    { ticket: core.generate() }), context, { origin: ORIGIN });
  assert.equal(noProvider.status, 503, "unset DB always fails closed");

  let captured;
  const smtp = email.createSender({ apiKey: "re_fake", from: "access@example.com",
    fetcher: async (url, options) => {
      captured = { url, options };
      return { ok: true, json: async () => ({ id: "test-provider-id" }) };
    } });
  await smtp.send({ to: "test@example.com", link: ORIGIN + "/access/#ticket=aaa" });
  assert.equal(captured.url, "https://api.resend.com/emails");
  assert.equal(captured.options.headers.Authorization, "Bearer re_fake");
  assert.equal(JSON.parse(captured.options.body).to[0], "test@example.com");

  // Read endpoint never trusts arbitrary headers/cookie claims as verified.
  assert.equal(buyer.hasVerifiedAdminRole({ roles: ["customer"],
    app_metadata: { roles: ["customer"] } }), false);
  console.log("CP-PUBLIC-03a2-2 protocol, origin, 32-way replay, revocation, email, issue authorization: PASS");
}
main().catch(error => { console.error(error); process.exitCode = 1; });
