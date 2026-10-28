import { getDeployStore, getStore } from "@netlify/blobs";
import { getUser } from "@netlify/identity";
import configCore from "../../app/core/configuration.js";
import defaults from "../../app/data/configurator-settings.js";
import catalog from "../../app/data/catalog-data.js";
import priceBook from "../../app/data/mock-price-book.js";
import {
  V4_SCHEMA,
  prepareHierarchyPublication,
  validateHierarchyCandidateForSource,
  publicationPlanSummary
} from "../lib/hierarchy-publication.mjs";

const cacheHeaders = {
  "Cache-Control": "no-store, max-age=0",
  "Content-Type": "application/json; charset=utf-8",
  "X-Content-Type-Options": "nosniff"
};
const respond = (body, status = 200) => new Response(JSON.stringify(body), { status, headers: cacheHeaders });

function getConfigurationStore(context) {
  const options = { name: "configurator-settings", consistency: "strong" };
  return context?.deploy?.context === "production" ? getStore(options) : getDeployStore(options);
}

async function readStoredOrDefault(store) {
  const published = await store.get("published", { type: "json" });
  return published || configCore.createDefaultAdministration(defaults, catalog, priceBook);
}

async function readPublished(store) {
  const base = configCore.createDefaultAdministration(defaults, catalog, priceBook);
  const published = await readStoredOrDefault(store);
  try { return configCore.normalizeConfiguratorSettings(published, catalog, priceBook); }
  catch { return base; }
}

export default async (request, context) => {
  if (!["GET", "POST", "PUT"].includes(request.method)) {
    return respond({ error: "method_not_allowed" }, 405);
  }

  const store = getConfigurationStore(context);
  if (request.method === "GET") return respond(await readPublished(store));

  const user = await getUser();
  const roles = [...(user?.roles || []), ...(user?.app_metadata?.roles || [])];
  if (!user) return respond({ error: "unauthorized" }, 401);
  if (!roles.includes("admin")) return respond({ error: "forbidden" }, 403);

  if (request.method === "POST") {
    const action = new URL(request.url).searchParams.get("action");
    if (action !== "prepare-hierarchy") return respond({ error: "unsupported_action" }, 400);
    const current = await readStoredOrDefault(store);
    const plan = prepareHierarchyPublication(current, catalog, priceBook);
    const summary = publicationPlanSummary(plan);
    return respond(summary, plan.ok ? 200 : 422);
  }

  const declaredLength = Number(request.headers.get("content-length") || 0);
  if (declaredLength > 64 * 1024) return respond({ error: "payload_too_large" }, 413);

  let payload;
  try {
    const text = await request.text();
    if (new TextEncoder().encode(text).byteLength > 64 * 1024) return respond({ error: "payload_too_large" }, 413);
    payload = JSON.parse(text);
  } catch {
    return respond({ error: "invalid_json" }, 400);
  }

  const current = await readPublished(store);
  if (payload?.revision !== current.revision) return respond({ error: "revision_conflict", currentRevision: current.revision }, 409);

  if (payload?.schemaVersion === V4_SCHEMA) {
    const validation = validateHierarchyCandidateForSource(current, payload, catalog, priceBook);
    if (!validation.ok) {
      return respond({
        error: validation.code,
        message: validation.errors?.[0] || "Hierarchy candidate is invalid.",
        errors: validation.errors || [],
        ...(validation.sourceDigest ? { sourceDigest: validation.sourceDigest } : {})
      }, 422);
    }
    return respond({
      error: "hierarchy_publication_required",
      message: "Hierarchy candidate passed server validation, but v4 publication remains disabled until the authenticated execution checkpoint.",
      publicationEnabled: false,
      preflight: {
        sourceSchemaVersion: validation.sourceSchemaVersion,
        sourceRevision: validation.sourceRevision,
        sourceDigest: validation.sourceDigest,
        candidateSchemaVersion: validation.candidateSchemaVersion,
        candidateDigest: validation.candidateDigest,
        projectedDigest: validation.projectedDigest
      }
    }, 422);
  }

  if (payload?.schemaVersion !== configCore.SCHEMA) {
    return respond({ error: "unsupported_schema", message: "Unsupported configuration schema." }, 422);
  }

  try {
    const normalized = configCore.normalizeConfiguratorSettings(payload, catalog, priceBook);
    normalized.revision = current.revision + 1;
    await store.setJSON("published", normalized);
    return respond(normalized);
  } catch (error) {
    return respond({ error: "invalid_configuration", message: error instanceof TypeError ? error.message : "Invalid configuration" }, 422);
  }
};
