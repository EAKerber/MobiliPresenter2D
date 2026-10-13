import { env, cookieValue, internalSecretMatches, jsonResponse } from "../access/http.mjs";
import { findActiveSession } from "../access/postgres-store.mjs";
import { ACCESS_COOKIE_NAME } from "../access/tokens.mjs";

export default async (request) => {
  if (request.method !== "POST") return jsonResponse({ error: "method_not_allowed" }, 405, { Allow: "POST" });
  const expectedSecret = env("ACCESS_GATE_SECRET");
  if (!internalSecretMatches(request.headers.get("x-access-gate-secret"), expectedSecret)) {
    return jsonResponse({ error: "not_found" }, 404);
  }

  const token = cookieValue(request, ACCESS_COOKIE_NAME);
  if (!token) return jsonResponse({ authorized: false }, 200);
  try {
    const session = await findActiveSession(token);
    return jsonResponse({ authorized: Boolean(session) }, 200);
  } catch {
    return jsonResponse({ error: "access_service_unavailable" }, 503);
  }
};
