"use strict";

// CP-PUBLIC-03a1 — server-only authorization boundary for the FULL document.
// Identity is trusted only after @netlify/identity.getUser() verifies it.
// Customer sessions are NOT issued or verified yet: a later server-side
// validator may be injected, but no HTTP header or cookie is trusted here.
const MAX_SESSION_SECONDS = 12 * 60 * 60;
const REQUIRED_SCOPE = "configuration:read";

function hasAdminRole(user) {
  if (!user || typeof user !== "object") return false;
  const direct = Array.isArray(user.roles) ? user.roles : [];
  const metadata = Array.isArray(user.app_metadata?.roles) ? user.app_metadata.roles : [];
  return direct.includes("admin") || metadata.includes("admin");
}

// A validator must already have cryptographically verified the session,
// checked revocation, issuer, token audience and session concurrency, and
// returned this internal object. Never construct it from HTTP input directly.
function isVerifiedCustomerReadSession(value, nowSeconds) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  if (value.verified !== true || value.kind !== "customer-session"
    || typeof value.subject !== "string" || !value.subject.trim()
    || !Array.isArray(value.scopes) || !value.scopes.includes(REQUIRED_SCOPE)
    || !Number.isSafeInteger(value.issuedAt) || !Number.isSafeInteger(value.expiresAt)
    || value.issuedAt > nowSeconds + 60 || value.expiresAt <= nowSeconds
    || value.expiresAt <= value.issuedAt
    || value.expiresAt - value.issuedAt > MAX_SESSION_SECONDS) return false;
  return true;
}

async function authorize(request, { getIdentityUser, verifyCustomerSession, now = () => Date.now() } = {}) {
  if (!request || !["GET", "PUT"].includes(request.method)
    || typeof getIdentityUser !== "function") {
    return { ok: false, status: 405, error: "method_not_allowed" };
  }
  let user;
  try {
    user = await getIdentityUser();
  } catch {
    // Identity outage must not fall through to the configuration Blob.
    return { ok: false, status: 503, error: "identity_unavailable" };
  }
  if (hasAdminRole(user)) return { ok: true, principal: "admin" };

  // Non-admin PUT is never authorized by a customer session, including if
  // that session is valid; existing Netlify Identity admin PUT stays intact.
  if (request.method === "PUT") {
    return { ok: false, status: user ? 403 : 401,
      error: user ? "forbidden" : "unauthorized" };
  }
  if (typeof verifyCustomerSession === "function") {
    try {
      const session = await verifyCustomerSession(request);
      if (isVerifiedCustomerReadSession(session, Math.floor(now() / 1000))) {
        return { ok: true, principal: "customer", subject: session.subject };
      }
    } catch {
      return { ok: false, status: 503, error: "session_unavailable" };
    }
  }
  return { ok: false, status: user ? 403 : 401,
    error: user ? "forbidden" : "unauthorized" };
}

module.exports = Object.freeze({ authorize, hasAdminRole, isVerifiedCustomerReadSession });
