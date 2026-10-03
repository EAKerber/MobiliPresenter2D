import { getDeployStore, getStore } from "@netlify/blobs";
import { getUser } from "@netlify/identity";
import configCore from "../../app/core/configuration.js";
import defaults from "../../app/data/configurator-settings.js";
import catalog from "../../app/data/catalog-data.js";
import priceBook from "../../app/data/mock-price-book.js";

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
  const base = configCore.createDefaultAdministration(defaults, catalog, priceBook);
  const published = await store.get("published", { type: "json" });
  if (!published) return base;
  const candidate = published.schemaVersion === "ConfiguratorAdministration2D 1.0"
    ? published
    : { ...base, revision: published.revision || base.revision, stages: published.stages || base.stages };
  try { return configCore.normalizeConfiguratorSettings(candidate, catalog, priceBook); }
  catch { return base; }
}

export default async (request, context) => {
  if (request.method !== "GET" && request.method !== "PUT") {
    return respond({ error: "method_not_allowed" }, 405);
  }

  const store = getConfigurationStore(context);
  if (request.method === "GET") return respond(await readPublished(store));

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

  const current = await readPublished(store);
  if (payload?.revision !== current.revision) return respond({ error: "revision_conflict", currentRevision: current.revision }, 409);

  try {
    const normalized = configCore.normalizeConfiguratorSettings(payload, catalog, priceBook);
    normalized.revision = current.revision + 1;
    await store.setJSON("published", normalized);
    return respond(normalized);
  } catch (error) {
    return respond({ error: "invalid_configuration", message: error instanceof TypeError ? error.message : "Invalid configuration" }, 422);
  }
};
