import { getUser } from "@netlify/identity";
import { canIssueOrRevokeGrants } from "../access/identity-policy.mjs";
import { env, hasSameOrigin, jsonResponse, readJson } from "../access/http.mjs";
import { accessMailIsConfigured, sendAccessLink } from "../access/gmail.mjs";
import {
  issueGrant,
  listRecentGrants,
  revokeGrant,
} from "../access/postgres-store.mjs";
import {
  ACCESS_TTL_SECONDS,
  createId,
  createOpaqueToken,
  hashOpaqueToken,
  normalizeRecipientEmail,
} from "../access/tokens.mjs";

export default async (request) => {
  if (!["GET", "POST", "DELETE"].includes(request.method)) {
    return jsonResponse({ error: "method_not_allowed" }, 405, { Allow: "GET, POST, DELETE" });
  }

  const actor = await getUser();
  if (!canIssueOrRevokeGrants(actor)) return jsonResponse({ error: actor ? "forbidden" : "unauthorized" }, actor ? 403 : 401);

  if (request.method === "GET") {
    try {
      const grants = await listRecentGrants({ limit: 100 });
      return jsonResponse({ grants });
    } catch {
      return jsonResponse({ error: "access_store_unavailable" }, 503);
    }
  }

  if (!hasSameOrigin(request)) return jsonResponse({ error: "invalid_request_origin" }, 403);
  const parsed = await readJson(request);
  if (!parsed.ok) return jsonResponse({ error: parsed.status === 413 ? "payload_too_large" : "invalid_json" }, parsed.status);

  if (request.method === "DELETE") {
    const grantId = typeof parsed.value.grantId === "string" ? parsed.value.grantId : "";
    try {
      const revoked = await revokeGrant({ grantId, revokedBy: actor.id });
      return revoked
        ? jsonResponse({ ok: true })
        : jsonResponse({ error: "grant_not_active" }, 404);
    } catch {
      return jsonResponse({ error: "access_store_unavailable" }, 503);
    }
  }

  const recipientEmail = normalizeRecipientEmail(parsed.value.email);
  if (!recipientEmail) return jsonResponse({ error: "invalid_email" }, 400);
  if (!env("DATABASE_URL") || !accessMailIsConfigured()) {
    return jsonResponse({ error: "access_service_not_configured" }, 503);
  }

  const token = createOpaqueToken();
  const grantId = createId();
  const expiresAt = new Date(Date.now() + ACCESS_TTL_SECONDS * 1000);
  try {
    await issueGrant({
      id: grantId,
      recipientEmail,
      tokenHash: hashOpaqueToken(token),
      issuedBy: actor.id,
      expiresAt,
    });
  } catch {
    return jsonResponse({ error: "access_store_unavailable" }, 503);
  }

  try {
    await sendAccessLink({ recipientEmail, token });
  } catch {
    try { await revokeGrant({ grantId, revokedBy: actor.id }); } catch { /* fail closed; grant expires in 3 hours */ }
    return jsonResponse({ error: "access_email_delivery_failed" }, 502);
  }

  return jsonResponse({ ok: true, grantId, expiresAt: expiresAt.toISOString() }, 201);
};

export const config = { path: "/api/access/grants" };
