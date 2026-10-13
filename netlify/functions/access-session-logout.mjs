import { cookieValue, hasSameOrigin, jsonResponse } from "../access/http.mjs";
import { revokeSession } from "../access/postgres-store.mjs";
import { ACCESS_COOKIE_NAME, clearSessionCookie } from "../access/tokens.mjs";

export default async (request) => {
  const clearCookie = { "Set-Cookie": clearSessionCookie() };
  if (request.method !== "POST") {
    return jsonResponse({ error: "method_not_allowed" }, 405, { ...clearCookie, Allow: "POST" });
  }
  if (!hasSameOrigin(request)) return jsonResponse({ error: "invalid_request_origin" }, 403, clearCookie);

  const token = cookieValue(request, ACCESS_COOKIE_NAME);
  if (!token) return jsonResponse({ ok: true }, 200, clearCookie);

  try {
    await revokeSession(token);
    return jsonResponse({ ok: true }, 200, clearCookie);
  } catch {
    // Clear the browser cookie even if storage is temporarily unavailable. The gate
    // will fail closed while it cannot validate a session against the database.
    return jsonResponse({ error: "access_store_unavailable" }, 503, clearCookie);
  }
};
