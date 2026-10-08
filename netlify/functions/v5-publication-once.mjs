import { getStore } from "@netlify/blobs";
import { getUser } from "@netlify/identity";
import configCore from "../../app/core/configuration.js";
import administrationV5 from "../../app/core/administration-v5.js";
import v5Migration from "../../app/core/v5-publication-migration.js";
import flow from "../../app/core/flow-model.js";
import hierarchyDefaults from "../../app/data/hierarchy-defaults.js";
import legacyStageRepair from "../../app/core/legacy-stage-repair.js";
import catalog from "../../app/data/catalog-data.js";
import priceBook from "../../app/data/mock-price-book.js";
import scene from "../../app/data/scene-data.js";

// TEMPORARY production-only operator endpoint, to be deleted immediately
// after verified cutover. Does not change the permanently disabled normal
// /api/configuration migration endpoint.
const EXPECTED_SOURCE_REVISION = 6;
const EXPECTED_SOURCE_DIGEST = "1bdee1066214fb097486b1b412899db751d4a1942b89c0721fb79e12fbcd7317";
const EXPIRES_AT = Date.parse("2026-10-09T03:00:00.000Z"); // 2026-10-09 00:00 -03
const respond = (body, status = 200) => new Response(JSON.stringify(body), {
  status, headers: {
    "Cache-Control": "no-store, max-age=0",
    "Content-Type": "application/json; charset=utf-8",
    "X-Content-Type-Options": "nosniff"
  }
});

export default async (request, context) => {
  if (request.method !== "PUT") return respond({ error: "method_not_allowed" }, 405);
  if (context?.deploy?.context !== "production") {
    return respond({ error: "production_only" }, 403);
  }
  if (Date.now() >= EXPIRES_AT) return respond({ error: "activation_window_expired" }, 403);

  // Fail closed before inspecting the site-wide blob or parsing a candidate.
  const user = await getUser();
  if (!user) return respond({ error: "unauthorized" }, 401);
  const roles = [...(user.roles || []), ...(user.app_metadata?.roles || [])];
  if (!roles.includes("admin")) return respond({ error: "forbidden" }, 403);

  const origin = request.headers.get("origin");
  if (origin && origin !== new URL(request.url).origin) {
    return respond({ error: "invalid_origin" }, 403);
  }
  const sourceDigest = request.headers.get("x-configuration-source-digest");
  if (sourceDigest !== EXPECTED_SOURCE_DIGEST) {
    return respond({ error: "source_digest_conflict" }, 409);
  }

  const declaredLength = Number(request.headers.get("content-length") || 0);
  if (declaredLength > 64 * 1024) return respond({ error: "payload_too_large" }, 413);
  let payload;
  try {
    const json = await request.text();
    if (new TextEncoder().encode(json).byteLength > 64 * 1024) {
      return respond({ error: "payload_too_large" }, 413);
    }
    payload = JSON.parse(json);
  } catch {
    return respond({ error: "invalid_json" }, 400);
  }
  if (payload?.schemaVersion !== administrationV5.SCHEMA ||
      payload?.revision !== EXPECTED_SOURCE_REVISION) {
    return respond({ error: "unexpected_candidate_version" }, 409);
  }

  // The shared migration service enforces raw v3 revision, source digest,
  // exact canonical candidate, conditional ETag write, strong readback and
  // publication signature. A failed/ambiguous write must never be retried.
  try {
    const store = getStore({ name: "configurator-settings", consistency: "strong" });
    const result = await v5Migration.publishV5Migration({
      store, payload, sourceDigest,
      runtime: {
        configuration: configCore,
        v5Core: administrationV5,
        flow, catalog, priceBook, scene, hierarchyDefaults, legacyStageRepair
      }
    });
    return result.ok
      ? respond(result)
      : respond({ error: result.code }, result.status);
  } catch {
    return respond({ error: "publication_status_unknown_check_raw_before_retry" }, 502);
  }
};

export const config = { path: "/api/publish-v5-once", method: "PUT" };
