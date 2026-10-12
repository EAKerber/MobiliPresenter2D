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

function logAccessDiagnostic(stage, error, details = {}) {
  const diagnostic = { component: "access-grants", stage, ...details };
  if (error) {
    diagnostic.errorClass = safeLogValue(error.name, /^[A-Za-z][A-Za-z0-9_]{0,63}$/);
    diagnostic.errorCode = safeLogValue(error.code, /^(?:[0-9A-Z]{5}|E[A-Z0-9_]{1,31})$/);
    diagnostic.causeClass = safeLogValue(error.cause?.name, /^[A-Za-z][A-Za-z0-9_]{0,63}$/);
    diagnostic.causeCode = safeLogValue(error.cause?.code, /^(?:[0-9A-Z]{5}|E[A-Z0-9_]{1,31})$/);
    diagnostic.errorCategory = classifyAccessError(error);
  }
  console.error("[access-diagnostic]", JSON.stringify(diagnostic));
}

function classifyAccessError(error) {
  const messages = [];
  let current = error;
  for (let depth = 0; current && depth < 3; depth += 1, current = current.cause) {
    if (typeof current.message === "string") messages.push(current.message.toLowerCase());
    if (typeof current.code === "string") messages.push(current.code.toLowerCase());
  }
  const message = messages.join(" ");
  if (/enotfound|eai_again|getaddrinfo/.test(message)) return "dns_resolution";
  if (/econnrefused|connection refused/.test(message)) return "connection_refused";
  if (/etimedout|timeout|timed out/.test(message)) return "connection_timeout";
  if (/certificate|tls|ssl/.test(message)) return "tls";
  if (/password authentication|authentication failed|sasl/.test(message)) return "database_authentication";
  if (/permission denied|insufficient privilege/.test(message)) return "database_permission";
  if (/does not exist/.test(message) && /database|role/.test(message)) return "database_or_role_missing";
  if (/connect|connection terminated|socket/.test(message)) return "connection";
  return "unclassified";
}

function safeLogValue(value, pattern) {
  return typeof value === "string" && pattern.test(value) ? value : undefined;
}

export default async (request) => {
  if (!["GET", "POST", "DELETE"].includes(request.method)) {
    return jsonResponse({ error: "method_not_allowed" }, 405, { Allow: "GET, POST, DELETE" });
  }

  let actor;
  try {
    actor = await getUser();
  } catch (error) {
    logAccessDiagnostic("identity_lookup_failed", error, { method: request.method });
    return jsonResponse({ error: "identity_unavailable" }, 503);
  }
  if (!canIssueOrRevokeGrants(actor)) {
    logAccessDiagnostic("authorization_denied", null, {
      method: request.method,
      authenticated: Boolean(actor),
    });
    return jsonResponse({ error: actor ? "forbidden" : "unauthorized" }, actor ? 403 : 401);
  }

  if (request.method === "GET") {
    try {
      const grants = await listRecentGrants({ limit: 100 });
      console.info("[access-diagnostic]", JSON.stringify({
        component: "access-grants",
        stage: "grant_list_succeeded",
        count: grants.length,
      }));
      return jsonResponse({ grants });
    } catch (error) {
      logAccessDiagnostic("grant_list_failed", error);
      return jsonResponse({ error: "access_store_unavailable" }, 503);
    }
  }

  if (!hasSameOrigin(request)) {
    logAccessDiagnostic("origin_check_failed", null, { method: request.method });
    return jsonResponse({ error: "invalid_request_origin" }, 403);
  }
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
  const databaseConfigured = Boolean(env("DATABASE_URL"));
  const mailConfigured = accessMailIsConfigured();
  if (!databaseConfigured || !mailConfigured) {
    logAccessDiagnostic("configuration_incomplete", null, { databaseConfigured, mailConfigured });
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
    console.info("[access-diagnostic]", JSON.stringify({ component: "access-grants", stage: "grant_insert_succeeded" }));
  } catch (error) {
    logAccessDiagnostic("grant_insert_failed", error);
    return jsonResponse({ error: "access_store_unavailable" }, 503);
  }

  try {
    await sendAccessLink({ recipientEmail, token });
    console.info("[access-diagnostic]", JSON.stringify({ component: "access-grants", stage: "email_delivery_succeeded" }));
  } catch (error) {
    logAccessDiagnostic("email_delivery_failed", error);
    try {
      await revokeGrant({ grantId, revokedBy: actor.id });
      console.info("[access-diagnostic]", JSON.stringify({ component: "access-grants", stage: "grant_rollback_succeeded" }));
    } catch (rollbackError) {
      logAccessDiagnostic("grant_rollback_failed", rollbackError);
    }
    return jsonResponse({ error: "access_email_delivery_failed" }, 502);
  }

  return jsonResponse({ ok: true, grantId, expiresAt: expiresAt.toISOString() }, 201);
};

export const config = { path: "/api/access/grants" };
