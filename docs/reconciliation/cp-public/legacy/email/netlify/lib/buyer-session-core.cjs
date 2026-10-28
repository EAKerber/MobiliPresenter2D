"use strict";

const { randomBytes, createHash } = require("node:crypto");

// CP-PUBLIC-03a2-2. Opaque bearer secrets exist ONLY transiently in memory.
// No JWT, localStorage, plaintext token in database, query string or logs.
const COOKIE = "__Host-casa-config-session";
const TICKET_SECONDS = 15 * 60;
const SESSION_SECONDS = 12 * 60 * 60;
const TOKEN_PATTERN = /^[A-Za-z0-9_-]{43}$/;
const VALID_EMAIL = /^[^\s@<>]{1,64}@[^\s@<>]{1,190}$/;
const generate = () => randomBytes(32).toString("base64url");
const digest = (secret) => createHash("sha256").update(secret, "utf8").digest("hex");
const normalizeEmail = (raw) => {
  if (typeof raw !== "string") return null;
  const value = raw.trim().toLowerCase();
  return value.length <= 254 && VALID_EMAIL.test(value) && !/[\r\n]/.test(value) ? value : null;
};
const normalizeOrigin = (origin) => {
  if (typeof origin !== "string") throw new TypeError("trusted origin missing");
  const value = new URL(origin);
  if (value.protocol !== "https:" || value.username || value.password || value.pathname !== "/"
    || value.search || value.hash) throw new TypeError("trusted https origin required");
  return value.origin;
};
const cookie = (token) => [
  COOKIE + "=" + token, "Path=/", "Secure", "HttpOnly", "SameSite=Lax",
  "Max-Age=" + SESSION_SECONDS
].join("; ");
const clearCookie = () => [
  COOKIE + "=", "Path=/", "Secure", "HttpOnly", "SameSite=Lax", "Max-Age=0"
].join("; ");
function readSessionCookie(request) {
  const header = request?.headers?.get?.("cookie") || "";
  const matching = header.split(";").map(part => part.trim())
    .filter(part => part.startsWith(COOKIE + "="));
  if (matching.length !== 1) return null;
  const token = matching[0].slice(COOKIE.length + 1);
  return TOKEN_PATTERN.test(token) ? token : null;
}
function sameOrigin(request, trustedOrigin) {
  try {
    const target = normalizeOrigin(trustedOrigin);
    const url = new URL(request.url);
    // Prevent Host/X-Forwarded-Host influence on emailed magic links.
    return url.origin === target && request.headers.get("origin") === target
      && request.headers.get("sec-fetch-site") !== "cross-site";
  } catch {
    return false;
  }
}
async function issue({ store, sender, origin, email, issuer, audience }) {
  const normalized = normalizeEmail(email);
  if (!normalized || typeof issuer !== "string" || !issuer
    || typeof audience !== "string" || !audience
    || typeof store?.issue !== "function" || typeof store?.revokeTicket !== "function"
    || typeof sender?.send !== "function") throw new TypeError("invalid issuance context");
  const siteOrigin = normalizeOrigin(origin);
  const token = generate();
  const ticketHash = digest(token);
  const subject = digest("buyer-subject:v1:" + normalized);
  const result = await store.issue({
    ticketHash, subject, recipient: normalized, issuer, audience, ttlSeconds: TICKET_SECONDS
  });
  if (!result?.ok) return { ok: false, code: result?.code || "unavailable" };
  // Fragment secret is never sent in HTTP requests to /access/. The landing
  // must NOT load analytics or other external scripts before redeem.
  const link = siteOrigin + "/access/#ticket=" + token;
  try {
    await sender.send({ to: normalized, link });
  } catch {
    // Ambiguous mail-provider outcome: revoke even if the email was sent.
    // Never leak the token in the response or exception/log.
    await store.revokeTicket({ ticketHash, audience }).catch(() => {});
    return { ok: false, code: "delivery_unavailable" };
  }
  return { ok: true };
}
async function redeem({ store, token, audience }) {
  if (!TOKEN_PATTERN.test(token || "") || typeof audience !== "string" || !audience) {
    return { ok: false, code: "invalid_or_expired" };
  }
  const sessionToken = generate();
  const result = await store.redeem({
    ticketHash: digest(token), sessionHash: digest(sessionToken),
    audience, sessionSeconds: SESSION_SECONDS
  });
  if (!result?.ok) return { ok: false, code: "invalid_or_expired" };
  return { ok: true, sessionCookie: cookie(sessionToken) };
}
async function verify({ store, request, audience }) {
  const token = readSessionCookie(request);
  if (!token || typeof audience !== "string" || !audience) return null;
  const session = await store.verify({ sessionHash: digest(token), audience });
  if (!session || typeof session.subject !== "string"
    || !Number.isSafeInteger(session.issuedAt)
    || !Number.isSafeInteger(session.expiresAt)) return null;
  return Object.freeze({
    verified: true, kind: "customer-session", subject: session.subject,
    scopes: ["configuration:read"], issuedAt: session.issuedAt,
    expiresAt: session.expiresAt
  });
}
async function revoke({ store, request, audience }) {
  const token = readSessionCookie(request);
  if (token) await store.revokeSession({ sessionHash: digest(token), audience });
  return clearCookie();
}
module.exports = Object.freeze({
  COOKIE, TICKET_SECONDS, SESSION_SECONDS, TOKEN_PATTERN, generate, digest,
  normalizeEmail, normalizeOrigin, cookie, clearCookie, readSessionCookie,
  sameOrigin, issue, redeem, verify, revoke
});
