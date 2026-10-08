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
function respond(body, status, extra = {}) {
  return new Response(JSON.stringify(body), { status, headers: { ...headers, ...extra } });
}
function storeFor(context) {
  const options = { name: "configurator-settings", consistency: "strong" };
  // Preview stores are deploy-isolated: never fall back to production data
  // when a preview has no published configuration of its own.
  return context?.deploy?.context === "production" ? getStore(options) : getDeployStore(options);
}

export default async (request, context) => {
  if (request.method !== "GET") return respond({ error: "method_not_allowed" }, 405, { Allow: "GET" });
  // Inspection, filtering and unrecognized parameters are not public APIs.
  if (new URL(request.url).search) return respond({ error: "unsupported_query" }, 400);

  try {
    const raw = await publishedReader.readRawPublished(storeFor(context));
    // Do not replace a missing, invalid, or legacy-v3 publication with fixtures.
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
