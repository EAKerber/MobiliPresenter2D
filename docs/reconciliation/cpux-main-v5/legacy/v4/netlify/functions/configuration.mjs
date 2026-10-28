import { createHash } from "node:crypto";
import { getDeployStore, getStore } from "@netlify/blobs";
import { getUser } from "@netlify/identity";
import configCore from "../../app/core/configuration.js";
import flowCore from "../../app/core/flow-model.js";
import hierarchyCore from "../../app/core/hierarchy-administration.js";
import defaults from "../../app/data/configurator-settings.js";
import catalog from "../../app/data/catalog-data.js";
import priceBook from "../../app/data/mock-price-book.js";

const cacheHeaders = {
  "Cache-Control": "no-store, max-age=0",
  "Content-Type": "application/json; charset=utf-8",
  "X-Content-Type-Options": "nosniff"
};

const respond = (body, status = 200, headers = {}) => new Response(JSON.stringify(body), {
  status,
  headers: { ...cacheHeaders, ...headers }
});

function getConfigurationStore(context) {
  const options = { name: "configurator-settings", consistency: "strong" };
  return context?.deploy?.context === "production" ? getStore(options) : getDeployStore(options);
}

function etagFor(value) {
  const digest = createHash("sha256").update(hierarchyCore.canonicalStringify(value)).digest("hex");
  return `"sha256-${digest}"`;
}

function normalizePublished(value) {
  return hierarchyCore.normalizePublishedAdministration(value, configCore, catalog, priceBook);
}

async function readPublished(store) {
  const published = await store.get("published", { type: "json" });
  if (!published) return configCore.createDefaultAdministration(defaults, catalog, priceBook);
  return normalizePublished(published);
}

function writeHeaders(value) {
  return { ETag: etagFor(value) };
}

function matchesIfMatch(request, current) {
  const supplied = request.headers.get("if-match");
  return Boolean(supplied && supplied === etagFor(current));
}

async function readPayload(request) {
  const declaredLength = Number(request.headers.get("content-length") || 0);
  if (declaredLength > 64 * 1024) return { error: respond({ error: "payload_too_large" }, 413) };
  try {
    const text = await request.text();
    if (new TextEncoder().encode(text).byteLength > 64 * 1024) return { error: respond({ error: "payload_too_large" }, 413) };
    return { payload: text ? JSON.parse(text) : {} };
  } catch {
    return { error: respond({ error: "invalid_json" }, 400) };
  }
}

async function requireAdmin() {
  const user = await getUser();
  const roles = [...(user?.roles || []), ...(user?.app_metadata?.roles || [])];
  if (!user) return { error: respond({ error: "unauthorized" }, 401) };
  if (!roles.includes("admin")) return { error: respond({ error: "forbidden" }, 403) };
  return { user };
}

async function handleMigration(request, store) {
  const { payload, error } = await readPayload(request);
  if (error) return error;

  const current = await readPublished(store);
  if (current.schemaVersion === hierarchyCore.SCHEMA) {
    return respond({ error: "hierarchy_already_published", revision: current.revision }, 409, writeHeaders(current));
  }
  if (current.schemaVersion !== configCore.SCHEMA) {
    return respond({ error: "unsupported_migration_source", schemaVersion: current.schemaVersion }, 422);
  }
  if (payload?.revision !== current.revision) {
    return respond({ error: "revision_conflict", currentRevision: current.revision }, 409, writeHeaders(current));
  }
  if (!matchesIfMatch(request, current)) {
    return respond({ error: "content_precondition_failed", currentRevision: current.revision }, 412, writeHeaders(current));
  }

  const candidate = hierarchyCore.upgradeToHierarchy(current, configCore, flowCore, catalog, priceBook);
  if (hierarchyCore.migrationSemanticSignature(candidate) !== hierarchyCore.migrationSemanticSignature(current)) {
    return respond({ error: "migration_semantic_mismatch" }, 422, writeHeaders(current));
  }

  const errors = hierarchyCore.validateHierarchyAdministration(candidate, configCore, catalog, priceBook);
  if (errors.length) return respond({ error: "invalid_hierarchy", errors }, 422, writeHeaders(current));

  const normalized = hierarchyCore.normalizeHierarchyAdministration(candidate);
  normalized.revision = current.revision + 1;
  await store.setJSON("published", normalized);
  return respond(normalized, 200, writeHeaders(normalized));
}

async function handlePut(request, store) {
  const { payload, error } = await readPayload(request);
  if (error) return error;

  const current = await readPublished(store);
  if (payload?.revision !== current.revision) {
    return respond({ error: "revision_conflict", currentRevision: current.revision }, 409, writeHeaders(current));
  }

  const payloadIsHierarchy = payload?.schemaVersion === hierarchyCore.SCHEMA;
  const currentIsHierarchy = current.schemaVersion === hierarchyCore.SCHEMA;

  if (payloadIsHierarchy && !currentIsHierarchy) {
    return respond({
      error: "hierarchy_migration_required",
      message: "Use the explicit authenticated hierarchy migration before publishing v4 edits."
    }, 409, writeHeaders(current));
  }
  if (!payloadIsHierarchy && currentIsHierarchy) {
    return respond({ error: "schema_downgrade_forbidden" }, 409, writeHeaders(current));
  }

  if (currentIsHierarchy && !matchesIfMatch(request, current)) {
    return respond({ error: "content_precondition_failed", currentRevision: current.revision }, 412, writeHeaders(current));
  }

  try {
    const normalized = payloadIsHierarchy
      ? hierarchyCore.normalizePublishedAdministration(payload, configCore, catalog, priceBook)
      : configCore.normalizeConfiguratorSettings(payload, catalog, priceBook);
    normalized.revision = current.revision + 1;
    await store.setJSON("published", normalized);
    return respond(normalized, 200, writeHeaders(normalized));
  } catch (validationError) {
    return respond({
      error: payloadIsHierarchy ? "invalid_hierarchy" : "invalid_configuration",
      message: validationError instanceof TypeError ? validationError.message : "Invalid configuration"
    }, 422, writeHeaders(current));
  }
}

export default async (request, context) => {
  if (!["GET", "PUT", "POST"].includes(request.method)) {
    return respond({ error: "method_not_allowed" }, 405);
  }

  const store = getConfigurationStore(context);

  if (request.method === "GET") {
    try {
      const current = await readPublished(store);
      return respond(current, 200, writeHeaders(current));
    } catch (error) {
      return respond({
        error: "invalid_published_configuration",
        message: error instanceof Error ? error.message : "Published configuration is invalid"
      }, 500);
    }
  }

  const auth = await requireAdmin();
  if (auth.error) return auth.error;

  try {
    if (request.method === "POST") {
      const operation = new URL(request.url).searchParams.get("operation");
      if (operation !== "migrate-hierarchy") return respond({ error: "unknown_operation" }, 404);
      return await handleMigration(request, store);
    }
    return await handlePut(request, store);
  } catch (error) {
    return respond({
      error: "configuration_operation_failed",
      message: error instanceof Error ? error.message : "Configuration operation failed"
    }, 500);
  }
};
