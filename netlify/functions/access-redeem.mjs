import { cookieForSession } from "../access/tokens.mjs";
import { hasSameOrigin, jsonResponse, readJson } from "../access/http.mjs";
import { redeemGrant } from "../access/postgres-store.mjs";

export default async (request) => {
  if (request.method !== "POST") return jsonResponse({ error: "method_not_allowed" }, 405, { Allow: "POST" });
  if (!hasSameOrigin(request)) return jsonResponse({ error: "invalid_request_origin" }, 403);

  const parsed = await readJson(request);
  if (!parsed.ok) return jsonResponse({ error: parsed.status === 413 ? "payload_too_large" : "invalid_json" }, parsed.status);
  if (typeof parsed.value.token !== "string") return jsonResponse({ error: "invalid_or_expired_link" }, 400);

  try {
    const result = await redeemGrant({ grantToken: parsed.value.token });
    if (!result.ok) {
      return jsonResponse({ error: result.code }, 400);
    }
    const maxAge = Math.floor((new Date(result.expiresAt).getTime() - Date.now()) / 1000);
    if (maxAge <= 0) return jsonResponse({ error: "invalid_or_expired_link" }, 400);
    return jsonResponse(
      { ok: true, expiresAt: new Date(result.expiresAt).toISOString() },
      200,
      { "Set-Cookie": cookieForSession(result.sessionToken, maxAge) },
    );
  } catch {
    return jsonResponse({ error: "access_service_unavailable" }, 503);
  }
};

export const config = { path: "/api/access/redeem" };
