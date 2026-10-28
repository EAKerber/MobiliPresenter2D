"use strict";

// CP-PUBLIC-03a2-1 — server-only read boundary, deliberately admin-only
// until the transactional customer-session verifier (CP-PUBLIC-03a2-2).
const HEADERS = Object.freeze({
  "Cache-Control": "private, no-store, max-age=0",
  "Content-Type": "application/json; charset=utf-8",
  "X-Content-Type-Options": "nosniff",
  "Referrer-Policy": "no-referrer",
  "Vary": "Cookie, Authorization"
});
const reply = (body, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: HEADERS });
function hasVerifiedAdminRole(user) {
  if (!user || typeof user !== "object") return false;
  const direct = Array.isArray(user.roles) ? user.roles : [];
  const claims = Array.isArray(user.app_metadata?.roles) ? user.app_metadata.roles : [];
  return direct.includes("admin") || claims.includes("admin");
}

async function handle(request, context, { getIdentityUser, selectStore, reader, projection,
  runtime } = {}) {
  if (request?.method !== "GET") return reply({ error: "method_not_allowed" }, 405);
  if (new URL(request.url).search) return reply({ error: "unsupported_query" }, 400);
  if (typeof getIdentityUser !== "function" || typeof selectStore !== "function"
    || !reader || !projection || !runtime) return reply({ error: "service_unavailable" }, 503);
  let user;
  try {
    user = await getIdentityUser();
  } catch {
    return reply({ error: "identity_unavailable" }, 503);
  }
  // No caller-supplied HTTP role, JWT text or cookie is accepted as proof.
  if (!user) return reply({ error: "unauthorized" }, 401);
  if (!hasVerifiedAdminRole(user)) return reply({ error: "forbidden" }, 403);

  try {
    const store = selectStore(context);
    const raw = await reader.readRawPublished(store);
    if (raw.kind !== "stored") return reply({ error: "published_configuration_unavailable" }, 503);
    // Strict v5 only. No legacy fallback, guessed published state or ETag response.
    if (raw.value.schemaVersion !== projection.SOURCE) {
      return reply({ error: "published_configuration_unavailable" }, 503);
    }
    const checked = reader.inspectPublishedRaw(raw, {
      configuration: runtime.configuration, administrationV5: runtime.administrationV5,
      catalog: runtime.catalog, priceBook: runtime.priceBook, scene: runtime.scene
    });
    if (checked.kind !== "valid" || checked.schema !== projection.SOURCE) {
      return reply({ error: "published_configuration_unavailable" }, 503);
    }
    return reply(projection.project(checked.value, runtime));
  } catch {
    // Don't log confidential source, v5 validation paths, ETags or subject.
    return reply({ error: "published_configuration_unavailable" }, 503);
  }
}

module.exports = Object.freeze({ handle, HEADERS, hasVerifiedAdminRole });
