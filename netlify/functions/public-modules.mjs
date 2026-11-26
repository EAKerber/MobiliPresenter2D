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
// A preview reads the primary site's PUBLIC 0.1 DTO only. This is a trust
// boundary: reject additional nested fields rather than forwarding unknown
// values (notably administrative metadata or priced 0.2 DTOs) to the viewer.
function isRecord(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}
function onlyKeys(value, names) {
  return isRecord(value) && Object.keys(value).every((key) => names.has(key));
}
function isPublicProjection(value) {
  const topKeys = new Set(["schemaVersion", "modules", "publicState"]);
  const stateKeys = new Set(["viewerEntities", "entities", "finishId", "availableFinishes"]);
  const moduleKeys = new Set([
    "id", "referenceLabel", "title", "description", "category", "dimensionLabel",
    "nominalDimensionsMm", "benefits", "components", "requirements"
  ]);
  const finishKeys = new Set(["id", "label", "color", "textureAsset", "textureSize"]);
  const dims = new Set(["width", "height", "depth"]);
  if (!onlyKeys(value, topKeys) || value.schemaVersion !== PUBLIC_SCHEMA
    || !Array.isArray(value.modules) || value.modules.length === 0
    || !onlyKeys(value.publicState, stateKeys)) return false;

  const state = value.publicState;
  const hasViewer = Object.hasOwn(state, "viewerEntities");
  const hasLegacy = Object.hasOwn(state, "entities");
  // Only one explicit visibility authority per DTO.
  if (hasViewer === hasLegacy || typeof state.finishId !== "string"
    || !Array.isArray(state.availableFinishes) || !state.availableFinishes.length) return false;
  const visibility = hasViewer ? state.viewerEntities : state.entities;
  if (!isRecord(visibility)) return false;

  const ids = [];
  for (const module of value.modules) {
    if (!onlyKeys(module, moduleKeys)
      || typeof module.id !== "string" || !module.id
      || typeof module.title !== "string" || !module.title.trim()) return false;
    for (const key of ["referenceLabel", "description", "category", "dimensionLabel"]) {
      if (Object.hasOwn(module, key) && typeof module[key] !== "string") return false;
    }
    for (const key of ["benefits", "components", "requirements"]) {
      if (Object.hasOwn(module, key) && (!Array.isArray(module[key])
        || module[key].some((text) => typeof text !== "string"))) return false;
    }
    if (Object.hasOwn(module, "nominalDimensionsMm")) {
      const mm = module.nominalDimensionsMm;
      if (!onlyKeys(mm, dims) || Object.keys(mm).length !== 3
        || ["width", "height", "depth"].some((axis) =>
          !Number.isFinite(mm[axis]) || mm[axis] < 1 || mm[axis] > 5000)) return false;
    }
    ids.push(module.id);
  }
  if (new Set(ids).size !== ids.length
    || Object.keys(visibility).length !== ids.length
    || ids.some((id) => typeof visibility[id] !== "boolean")) return false;

  const finishIds = [];
  for (const finish of state.availableFinishes) {
    if (!onlyKeys(finish, finishKeys) || typeof finish.id !== "string" || !finish.id
      || typeof finish.label !== "string" || !finish.label.trim()
      || typeof finish.textureAsset !== "string"
      || typeof finish.textureSize !== "string"
      || !(finish.color === null || typeof finish.color === "string"
        && /^#[0-9a-fA-F]{6}$/.test(finish.color))) return false;
    finishIds.push(finish.id);
  }
  return new Set(finishIds).size === finishIds.length
    && finishIds.includes(state.finishId);
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
