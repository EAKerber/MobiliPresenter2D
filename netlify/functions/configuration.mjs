import { getDeployStore, getStore } from "@netlify/blobs";
import { getUser } from "@netlify/identity";
import accessGuard from "../lib/configuration-access.cjs";
import configCore from "../../app/core/configuration.js";
import administrationV5 from "../../app/core/administration-v5.js";
import publishedReader from "../../app/core/published-configuration.js";
import v5NormalSave from "../../app/core/v5-normal-save.js";
import legacyStageRepair from "../../app/core/legacy-stage-repair.js";
import defaults from "../../app/data/configurator-settings.js";
import catalog from "../../app/data/catalog-data.js";
import priceBook from "../../app/data/mock-price-book.js";
import scene from "../../app/data/scene-data.js";

// CP-SD-06L1b: publication already occurred; the live API no longer has an activation flag.
// The deterministic migration service remains available in offline replay only.

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
  const raw = await publishedReader.readRawPublished(store);
  const inspected = publishedReader.inspectPublishedRaw(raw, {
    configuration: configCore, administrationV5, catalog, priceBook, scene
  });
  if (inspected.kind === "valid") return inspected;
  // Preserve the pre-v5 missing/invalid-v3 resilience only. Never turn an
  // unrecognized or invalid v5 blob into plausible default product data.
  if (inspected.kind === "missing" || inspected.code === "invalid_v3") {
    return {
      kind: "fallback", schema: configCore.SCHEMA,
      value: configCore.createDefaultAdministration(defaults, catalog, priceBook)
    };
  }
  return { kind: "invalid", code: inspected.code };
}

export default async (request, context) => {
  if (request.method !== "GET" && request.method !== "PUT") {
    return respond({ error: "method_not_allowed" }, 405);
  }

  // CP-SD-06L1a: the one-time v3 production preflight is retired following
  // verified v5 cutover. Explicitly reject even authenticated old requests
  // before opening a site-wide store; never reinterpret these URLs as
  // public configuration GETs or leak historical raw source ETags.
  if (request.method === "GET") {
    const inspection = new URL(request.url).searchParams.get("inspection");
    if (inspection) {
      return inspection === "v5-preflight"
        ? respond({ error: "v5_preflight_retired" }, 410)
        : respond({ error: "unsupported_inspection" }, 422);
    }
  }

  // Authorization precedes store selection/read on both URL aliases.
  // Customers cannot consume the raw administrative document: CP-PUBLIC-03a2
  // will provide a verified-session transport and a restricted buyer projection.
  // No customer session verifier is connected here, so all non-admin reads
  // fail closed rather than trust cookies/roles supplied in HTTP headers.
  const access = await accessGuard.authorize(request, { getIdentityUser: getUser });
  if (!access.ok) return respond({ error: access.error }, access.status);
  if (request.method === "GET" && access.principal !== "admin") {
    return respond({ error: "buyer_projection_unavailable" }, 503);
  }

  const store = getConfigurationStore(context);
  if (request.method === "GET") {
    const published = await readPublished(store);
    return published.kind === "invalid"
      ? respond({ error: "stored_configuration_invalid", code: published.code }, 422)
      : respond(published.value);
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

  const operation = request.headers.get("x-configuration-operation") || "";
  // The authenticated one-time migration finished in production at v5 rev7.
  // Reject its historical operation rather than keeping an activatable switch.
  if (operation === "publish-v5-migration") {
    return respond({ error: "v5_migration_retired" }, 410);
  }

  const currentRead = await readPublished(store);
  if (currentRead.kind === "invalid") {
    return respond({ error: "stored_configuration_invalid", code: currentRead.code }, 409);
  }
  // Existing v5 is editable by an admin with native v5 validation and
  // conditional storage; this does not enable an initial v3->v5 migration.
  if (currentRead.schema === administrationV5.SCHEMA) {
    if (operation) return respond({ error: "unsupported_configuration_operation" }, 422);
    const saved = await v5NormalSave.savePublishedV5({
      store, payload,
      runtime: { configuration: configCore, v5Core: administrationV5, catalog, priceBook, scene }
    });
    if (!saved.ok) return respond({ error: saved.code }, saved.status);
    return respond(saved.value);
  }
  const current = currentRead.value;
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
