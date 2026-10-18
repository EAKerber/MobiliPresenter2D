import { cookieValue, hasSameOrigin, jsonResponse } from "../access/http.mjs";
import { findActiveSession } from "../access/postgres-store.mjs";
import { ACCESS_COOKIE_NAME } from "../access/tokens.mjs";

export default async (request) => {
  if (request.method !== "POST") return jsonResponse({ error: "method_not_allowed" }, 405, { Allow: "POST" });
  if (!hasSameOrigin(request)) return jsonResponse({ error: "invalid_request_origin" }, 403);

  const token = cookieValue(request, ACCESS_COOKIE_NAME);
  if (!token) return jsonResponse({ authenticated: false });

  try {
    const session = await findActiveSession(token);
    if (!session) return jsonResponse({ authenticated: false });
    return jsonResponse({
      authenticated: true,
      email: session.recipient_email,
      accessType: "temporary",
    });
  } catch {
    return jsonResponse({ error: "access_service_unavailable" }, 503);
  }
};

export const config = { path: "/api/access/session" };
