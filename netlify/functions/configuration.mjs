import { getStore } from "@netlify/blobs";
import { getUser } from "@netlify/identity";
import configCore from "../../app/core/configuration.js";
import defaults from "../../app/data/configurator-settings.js";

const cacheHeaders = {
  "Cache-Control": "no-store, max-age=0",
  "Content-Type": "application/json; charset=utf-8",
  "X-Content-Type-Options": "nosniff"
};
const store = getStore({ name: "configurator-settings", consistency: "strong" });
const catalog = {
  modules: defaults.stages.find((stage) => stage.id === "modules").items.map((entityId) => ({ entityId }))
};
const respond = (body, status = 200) => new Response(JSON.stringify(body), { status, headers: cacheHeaders });

async function readPublished() {
  return await store.get("published", { type: "json" }) || defaults;
}

export default async (request) => {
  if (request.method !== "GET" && request.method !== "PUT") {
    return respond({ error: "method_not_allowed" }, 405);
  }

  if (request.method === "GET") return respond(await readPublished());

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

  const current = await readPublished();
  if (payload?.revision !== current.revision) return respond({ error: "revision_conflict", currentRevision: current.revision }, 409);

  try {
    const normalized = configCore.normalizeConfiguratorSettings(payload, catalog);
    normalized.revision = current.revision + 1;
    await store.setJSON("published", normalized);
    return respond(normalized);
  } catch (error) {
    return respond({ error: "invalid_configuration", message: error instanceof TypeError ? error.message : "Invalid configuration" }, 422);
  }
};
