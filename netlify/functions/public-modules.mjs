import { getDeployStore, getStore } from "@netlify/blobs";
import configCore from "../../app/core/configuration.js";
import administrationV5 from "../../app/core/administration-v5.js";
import publishedReader from "../../app/core/published-configuration.js";
import publicModules from "../../app/core/public-module-projection.js";
import catalog from "../../app/data/catalog-data.js";
import priceBook from "../../app/data/mock-price-book.js";
import scene from "../../app/data/scene-data.js";

// CP-PUBLIC-02b. Public READ ONLY, not a redirect to /api/configuration.
// Only the validated v5 snapshot is projected. Never send raw source,
// priceBook, pricing, revision, opaque ETag, objectAssets or admin metadata.
const headers = {
  "Content-Type": "application/json; charset=utf-8",
  "Cache-Control": "no-store, max-age=0",
  "X-Content-Type-Options": "nosniff",
  "Referrer-Policy": "no-referrer",
  "Content-Security-Policy": "default-src 'none'",
};
const PUBLIC_SCHEMA = "PublicModulePresentation2D 0.1";
function respond(body, status, extra = {}) {
  return new Response(JSON.stringify(body), { status, headers: { ...headers, ...extra } });
}
function storeFor(context) {
  const options = { name: "configurator-settings", consistency: "strong" };
  return context?.deploy?.context === "production" ? getStore(options) : getDeployStore(options);
}
function isPublicProjection(value) {
  if (value?.schemaVersion !== PUBLIC_SCHEMA || !Array.isArray(value.modules) || !value.modules.length
    || !value.publicState || typeof value.publicState !== "object"
    || !value.publicState.entities || typeof value.publicState.entities !== "object"
    || Array.isArray(value.publicState.entities)
    || !Array.isArray(value.publicState.availableFinishes)
    || typeof value.publicState.finishId !== "string") return false;

  const moduleIds = value.modules.map((module) => module?.id);
  if (moduleIds.some((id) => typeof id !== "string" || !id)
    || new Set(moduleIds).size !== moduleIds.length
    || moduleIds.some((id) => typeof value.publicState.entities[id] !== "boolean")) return false;

  const finishIds = value.publicState.availableFinishes.map((finish) => finish?.id);
  return finishIds.length > 0
    && finishIds.every((id) => typeof id === "string" && id)
    && new Set(finishIds).size === finishIds.length
    && finishIds.includes(value.publicState.finishId);
}
async function readPrimaryPublicProjection(context, request) {
  const siteUrl = context?.site?.url;
  if (typeof siteUrl !== "string") return null;

  const primaryOrigin = new URL(siteUrl).origin;
  const requestOrigin = new URL(request.url).origin;
  // Avoid recursion if this request is already using the site's primary host.
  if (!primaryOrigin.startsWith("https://") || primaryOrigin === requestOrigin) return null;

  const upstream = await fetch(new URL("/api/public-modules", primaryOrigin), {
    method: "GET",
    headers: { Accept: "application/json" },
    redirect: "error",
    signal: AbortSignal.timeout(5000)
  });
  if (!upstream.ok) return null;

  const projection = await upstream.json();
  return isPublicProjection(projection) ? projection : null;
}

export default async (request, context) => {
  if (request.method !== "GET") return respond({ error: "method_not_allowed" }, 405, { Allow: "GET" });
  // Inspection, filtering and unrecognized parameters are not public APIs.
  if (new URL(request.url).search) return respond({ error: "unsupported_query" }, 400);

  try {
    const raw = await publishedReader.readRawPublished(storeFor(context));
    if (raw.kind === "missing" && context?.deploy?.context === "deploy-preview") {
      const projection = await readPrimaryPublicProjection(context, request);
      return projection
        ? respond(projection, 200, { "X-Public-Modules-Source": "primary-public-projection" })
        : respond({ error: "public_modules_unavailable" }, 503);
    }
    // A missing Deploy Preview snapshot may use only the primary site's
    // already-public, allowlisted projection. Invalid snapshots stay fail-closed.
    if (raw.kind !== "stored") return respond({ error: "public_modules_unavailable" }, 503);
    const inspected = publishedReader.inspectPublishedRaw(raw, {
      configuration: configCore, administrationV5, catalog, priceBook, scene
    });
    if (inspected.kind !== "valid" || inspected.schema !== administrationV5.SCHEMA) {
      return respond({ error: "public_modules_unavailable" }, 503);
    }
    const result = publicModules.project(inspected.value, catalog, scene);
    return respond(result, 200);
  } catch {
    // Fail closed without publishing internal validation/storage exceptions.
    return respond({ error: "public_modules_unavailable" }, 503);
  }
};
