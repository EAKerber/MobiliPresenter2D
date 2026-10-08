"use strict";

const core = require("./buyer-session-core.cjs");
const storage = require("./buyer-session-postgres.cjs");
const mail = require("./buyer-session-email.cjs");
const HEADERS = Object.freeze({
  "Cache-Control": "private, no-store, max-age=0",
  "Content-Type": "application/json; charset=utf-8",
  "X-Content-Type-Options": "nosniff",
  "Referrer-Policy": "no-referrer",
  "Vary": "Cookie, Authorization"
});
const reply = (body, status = 200, cookie = null) =>
  new Response(JSON.stringify(body), { status, headers: {
    ...HEADERS, ...(cookie ? { "Set-Cookie": cookie } : {})
  } });
const hasAdminRole = user => Boolean(user && typeof user === "object" && [
  ...(Array.isArray(user.roles) ? user.roles : []),
  ...(Array.isArray(user.app_metadata?.roles) ? user.app_metadata.roles : [])
].includes("admin"));
function audience(context) {
  const site = context?.site?.id, deploy = context?.deploy;
  if (typeof site !== "string" || !site || !deploy
    || typeof deploy.context !== "string") throw new TypeError("site/deploy context required");
  if (deploy.context === "production") return site + ":production";
  if (typeof deploy.id !== "string" || !deploy.id) throw new TypeError("preview deploy id required");
  return site + ":deploy:" + deploy.id;
}
function configured({ store, sender, origin } = {}) {
  const readyStore = store || storage.getConfiguredStore();
  const readySender = sender || mail.getConfiguredSender();
  const trustedOrigin = origin || process.env.CASA_ACCESS_ORIGIN;
  if (!readyStore || !trustedOrigin) return null;
  try {
    return { store: readyStore, sender: readySender, origin: core.normalizeOrigin(trustedOrigin) };
  } catch {
    return null;
  }
}
async function readJson(request, maxBytes = 2048) {
  if (Number(request.headers.get("content-length") || 0) > maxBytes) return null;
  let content;
  try { content = await request.text(); } catch { return null; }
  if (Buffer.byteLength(content, "utf8") > maxBytes) return null;
  try {
    const value = JSON.parse(content);
    return value && typeof value === "object" && !Array.isArray(value) ? value : null;
  } catch {
    return null;
  }
}
function permittedPath(request) {
  // Endpoints exist both via /api/* routing and Netlify's direct Function alias.
  // Do not branch authorization on request path.
  try { return new URL(request.url).search === ""; } catch { return false; }
}
async function issue(request, context, { getIdentityUser, store, sender, origin } = {}) {
  if (request.method !== "POST") return reply({ error: "method_not_allowed" }, 405);
  if (!permittedPath(request)) return reply({ error: "invalid_request" }, 400);
  const config = configured({ store, sender, origin });
  if (!config?.store || !config.sender) return reply({ error: "access_unavailable" }, 503);
  if (!core.sameOrigin(request, config.origin)) return reply({ error: "forbidden_origin" }, 403);
  let user;
  try { user = await getIdentityUser(); } catch { return reply({ error: "access_unavailable" }, 503); }
  if (!user) return reply({ error: "unauthorized" }, 401);
  if (!hasAdminRole(user) || typeof user.id !== "string" || !user.id) {
    return reply({ error: "forbidden" }, 403);
  }
  const body = await readJson(request);
  if (!body || Object.keys(body).join("|") !== "email") return reply({ error: "invalid_request" }, 400);
  if (!core.normalizeEmail(body.email)) return reply({ error: "invalid_request" }, 400);
  try {
    const result = await core.issue({
      store: config.store, sender: config.sender, origin: config.origin,
      email: body.email, issuer: user.id, audience: audience(context)
    });
    if (!result.ok && result.code === "rate_limited") return reply({ error: "rate_limited" }, 429);
    return result.ok ? reply({ accepted: true }, 202) :
      reply({ error: "access_unavailable" }, 503);
  } catch {
    return reply({ error: "access_unavailable" }, 503);
  }
}
async function redeem(request, context, { store, origin } = {}) {
  if (request.method !== "POST") return reply({ error: "method_not_allowed" }, 405);
  if (!permittedPath(request)) return reply({ error: "invalid_request" }, 400);
  const config = configured({ store, origin });
  if (!config) return reply({ error: "access_unavailable" }, 503);
  if (!core.sameOrigin(request, config.origin)) return reply({ error: "forbidden_origin" }, 403);
  const body = await readJson(request);
  if (!body || Object.keys(body).join("|") !== "ticket") return reply({ error: "invalid_request" }, 400);
  try {
    const result = await core.redeem({
      store: config.store, token: body.ticket, audience: audience(context)
    });
    return result.ok
      ? reply({ authenticated: true }, 200, result.sessionCookie)
      : reply({ error: "invalid_or_expired" }, 401);
  } catch {
    return reply({ error: "access_unavailable" }, 503);
  }
}
async function session(request, context, { store, origin } = {}) {
  if (request.method !== "GET") return reply({ error: "method_not_allowed" }, 405);
  if (!permittedPath(request)) return reply({ error: "invalid_request" }, 400);
  const config = configured({ store, origin });
  if (!config) return reply({ error: "access_unavailable" }, 503);
  try {
    const current = await core.verify({
      store: config.store, request, audience: audience(context)
    });
    return current ? reply({ authenticated: true }, 200)
      : reply({ authenticated: false }, 401);
  } catch {
    return reply({ error: "access_unavailable" }, 503);
  }
}
async function logout(request, context, { store, origin } = {}) {
  if (request.method !== "POST") return reply({ error: "method_not_allowed" }, 405);
  if (!permittedPath(request)) return reply({ error: "invalid_request" }, 400);
  const config = configured({ store, origin });
  if (!config) return reply({ error: "access_unavailable" }, 503);
  if (!core.sameOrigin(request, config.origin)) return reply({ error: "forbidden_origin" }, 403);
  try {
    const cleared = await core.revoke({
      store: config.store, request, audience: audience(context)
    });
    return reply({ authenticated: false }, 200, cleared);
  } catch {
    // Never report logout as complete if the server revocation failed.
    return reply({ error: "access_unavailable" }, 503);
  }
}
module.exports = Object.freeze({ audience, issue, redeem, session, logout,
  hasAdminRole, readJson, HEADERS });
