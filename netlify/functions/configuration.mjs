import { getDeployStore, getStore } from "@netlify/blobs";
import { getUser } from "@netlify/identity";
import configCore from "../../app/core/configuration.js";
import flowCore from "../../app/core/flow-model.js";
import v5Core from "../../app/core/administration-v5.js";
import legacyStageRepair from "../../app/core/legacy-stage-repair.js";
import defaults from "../../app/data/configurator-settings.js";
import hierarchyDefaults from "../../app/data/hierarchy-defaults.js";
import catalog from "../../app/data/catalog-data.js";
import priceBook from "../../app/data/mock-price-book.js";
import scene from "../../app/data/scene-data.js";
import {
  executeV5Migration,
  readPublishedForGet
} from "../lib/configuration-publication.mjs";

const V5_MIGRATION_ENABLED = false;

const publicationDeps = Object.freeze({
  configCore,
  flowCore,
  v5Core,
  legacyStageRepair,
  defaults,
  hierarchyDefaults,
  catalog,
  priceBook,
  scene
});

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

async function readPublished(store) {
  return (await readPublishedForGet(store, publicationDeps)).value;
}

export default async (request, context) => {
  if (request.method !== "GET" && request.method !== "PUT") {
    return respond({ error: "method_not_allowed" }, 405);
  }

  const store = getConfigurationStore(context);
  if (request.method === "GET") {
    try {
      return respond(await readPublished(store));
    } catch (error) {
      return respond({
        error: "invalid_stored_configuration",
        message: error instanceof TypeError ? error.message : "Stored configuration is invalid"
      }, 500);
    }
  }

  const user = await getUser();
  const roles = [...(user?.roles || []), ...(user?.app_metadata?.roles || [])];
  if (!user) return respond({ error: "unauthorized" }, 401);
  if (!roles.includes("admin")) return respond({ error: "forbidden" }, 403);

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

  const operation = request.headers.get("x-configuration-operation") || "";
  if (operation === "publish-v5-migration") {
    const result = await executeV5Migration({
      store,
      payload,
      sourceDigest: request.headers.get("x-configuration-source-digest") || "",
      enabled: V5_MIGRATION_ENABLED,
      deps: publicationDeps
    });
    if (!result.ok) {
      return respond({
        error: result.code,
        message: result.message,
        ...(result.currentRevision == null ? {} : { currentRevision: result.currentRevision }),
        ...(result.currentDigest == null ? {} : { currentDigest: result.currentDigest })
      }, result.status || 422);
    }
    return respond({ configuration: result.value, evidence: result.evidence });
  }

  const current = await readPublished(store);
  if (current?.schemaVersion === v5Core.SCHEMA) {
    return respond({
      error: "v5_normal_publication_disabled",
      message: "Stored v5 is read-only until the normal v5 publication checkpoint is activated."
    }, 422);
  }
  if (payload?.revision !== current.revision) return respond({ error: "revision_conflict", currentRevision: current.revision }, 409);

  if (operation === "persist-handles-all") {
    const delta = legacyStageRepair.verifyHandlesOnlyDelta(current, payload, configCore.SCHEMA);
    if (!delta.ok) {
      return respond({
        error: "invalid_handles_assignment",
        code: delta.code,
        message: delta.message || "Only the handles-all assignment to finishes is allowed for this operation."
      }, 422);
    }
  } else if (operation) {
    return respond({ error: "unsupported_configuration_operation" }, 422);
  }

  if (["ConfiguratorAdministration2D 4.0", "ConfiguratorAdministration2D 5.0"].includes(payload?.schemaVersion)) {
    return respond({
      error: "hierarchy_publication_required",
      message: "Hierarchy publication is disabled until the authenticated hierarchy migration checkpoint."
    }, 422);
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
