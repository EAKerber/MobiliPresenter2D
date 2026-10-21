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
const PRICED_SCHEMA = "PublicModulePresentation2D 0.2";
const PUBLIC_MODULE_KEYS = new Set([
  "id", "referenceLabel", "title", "description", "category", "dimensionLabel",
  "nominalDimensionsMm", "benefits", "components", "requirements", "basePriceCents"
]);
function respond(body, status, extra = {}) {
  return new Response(JSON.stringify(body), { status, headers: { ...headers, ...extra } });
}
function storeFor(context) {
  const options = { name: "configurator-settings", consistency: "strong" };
  return context?.deploy?.context === "production" ? getStore(options) : getDeployStore(options);
}
function isPublicProjection(value) {
  const visibility = value?.publicState?.viewerEntities || value?.publicState?.entities;
  if (![PUBLIC_SCHEMA, PRICED_SCHEMA].includes(value?.schemaVersion) || !Array.isArray(value.modules) || !value.modules.length
    || !value.publicState || typeof value.publicState !== "object"
    || !visibility || typeof visibility !== "object"
    || Array.isArray(visibility)
    || !Array.isArray(value.publicState.availableFinishes)
    || typeof value.publicState.finishId !== "string") return false;

  if (value.modules.some((module) => !module || Object.keys(module).some((key) => !PUBLIC_MODULE_KEYS.has(key))
    || (Object.hasOwn(module, "basePriceCents")
      && (value.schemaVersion !== PRICED_SCHEMA || !Number.isSafeInteger(module.basePriceCents)
        || module.basePriceCents <= 0 || module.basePriceCents > 100000000)))) return false;

  const moduleIds = value.modules.map((module) => module?.id);
  if (moduleIds.some((id) => typeof id !== "string" || !id)
    || new Set(moduleIds).size !== moduleIds.length
    || moduleIds.some((id) => typeof visibility[id] !== "boolean")) return false;

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
  // Schema negotiation is compatibility, never price authorization: it cannot
  // override the administrator's persisted OFF-by-default publication gate.
  // Pre-upgrade cached viewers omit the header and always get the 0.1 DTO.
  // The new Viewer sends X-Public-Modules-Version: 0.2 and handles either.
  if (new URL(request.url).search) return respond({ error: "unsupported_query" }, 400);
  const requestedVersion = request.headers.get("x-public-modules-version") || "0.1";
  if (!["0.1", "0.2"].includes(requestedVersion)) {
    return respond({ error: "unsupported_public_modules_version" }, 406);
  }

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
    return respond(requestedVersion === "0.2" ? result : publicModules.forLegacyViewer(result), 200);
  } catch {
    // Fail closed without publishing internal validation/storage exceptions.
    return respond({ error: "public_modules_unavailable" }, 503);
  }
};
