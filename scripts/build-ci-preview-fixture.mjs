// CI-BASELINE-01: synthetic V5 fixture for exactly Deploy Preview #238.
// Derived from checked-in defaults; no customer data or runtime fallback.
import assert from "node:assert/strict";
import {createHash} from "node:crypto";
import configCore from "../app/core/configuration.js";
import adminV5 from "../app/core/administration-v5.js";
import publishedReader from "../app/core/published-configuration.js";
import buyerProjection from "../app/core/published-buyer-projection.js";
import flow from "../app/core/flow-model.js";
import hierarchy from "../app/data/hierarchy-defaults.js";
import defaults from "../app/data/configurator-settings.js";
import catalog from "../app/data/catalog-data.js";
import priceBook from "../app/data/mock-price-book.js";
import scene from "../app/data/scene-data.js";
import pricingContract from "../app/core/pricing-contract.js";
import presentationPolicy from "../app/data/presentation-policy-defaults.js";

export const PREVIEW_TARGETS = Object.freeze({
  "ci/ci-baseline-01-isolated-auth-extraction-20261024": "238",
  "fix/config-stage-nav-grid-track-20261025": "245"
});
export const TARGET_SITE_ID = "d92799b1-9afc-4b52-9eee-22824bba7925";
export const STORE = "configurator-settings";
export const KEY = "published";
const digest = value => createHash("sha256").update(value).digest("hex");

export function previewTarget(env) {
  const sourceBranch = env.HEAD || env.BRANCH;
  const reviewId = PREVIEW_TARGETS[sourceBranch];
  if (env.CONTEXT !== "deploy-preview" || !reviewId || env.REVIEW_ID !== reviewId) return null;
  return {sourceBranch, reviewId: Number(reviewId)};
}

export function shouldSeed(env) {
  const target = previewTarget(env);
  if (!target) return false;
  const siteId = env.SITE_ID || env.NETLIFY_SITE_ID;
  if (!siteId) throw new Error("CI_PREVIEW_SITE_ID_REQUIRED");
  // This config also builds the public Netlify site; it must skip that site.
  if (siteId !== TARGET_SITE_ID) return false;
  assert.equal(env.NETLIFY, "true", "CI_PREVIEW_NETLIFY_CONTEXT_REQUIRED");
  assert.match(String(env.REVIEW_ID), /^[1-9]\d{0,5}$/, "CI_PREVIEW_REVIEW_ID_REQUIRED");
  assert.match(String(env.DEPLOY_ID || ""), /^[a-zA-Z0-9_-]{8,}$/, "CI_PREVIEW_DEPLOY_ID_REQUIRED");
  return true;
}

export function prepareExplicitFixture() {
  const v3 = configCore.normalizeConfiguratorSettings(
    configCore.createDefaultAdministration(defaults, catalog, priceBook, scene),
    catalog, priceBook, scene
  );
  const v5 = adminV5.upgrade(v3, configCore, flow, catalog, priceBook, scene, hierarchy);
  assert.equal(v5.schemaVersion, adminV5.SCHEMA);
  assert.deepEqual(adminV5.validate(v5, configCore, catalog, priceBook, scene), [],
    "CI_PREVIEW_FIXTURE_FAILED_SCHEMA_VALIDATION");
  const deps = {configuration: configCore, administrationV5: adminV5, catalog, priceBook, scene};
  const inspection = publishedReader.inspectPublishedRaw({
    kind: "stored", value: v5, etag: '"in-memory-verification"'
  }, deps);
  assert.equal(inspection.kind, "valid");
  const payload = buyerProjection.project(inspection.value, {
    ...deps, flow, hierarchyDefaults: hierarchy, pricingContract,
    defaultPresentationPolicy: presentationPolicy
  });
  assert.equal(payload.schemaVersion, buyerProjection.BUYER_SCHEMA);
  buyerProjection.consume(payload);
  const bytes = JSON.stringify(v5);
  assert.ok(Buffer.byteLength(bytes, "utf8") < 65536, "CI_PREVIEW_FIXTURE_OVERSIZED");
  return {
    value: v5, sha256: digest(bytes), schema: v5.schemaVersion, revision: v5.revision,
    bytes, provenance: "repository defaults > normalized V3 > upgraded V5 > validated projections"
  };
}

export async function writeDeployFixture({env, store}) {
  const target = previewTarget(env);
  if (!target || !shouldSeed(env)) return {status: "SKIPPED_NOT_DEDICATED_PREVIEW"};
  assert.ok(store && typeof store.getWithMetadata === "function" && typeof store.setJSON === "function",
    "CI_PREVIEW_NAMED_STORE_REQUIRED");
  const before = await store.getWithMetadata(KEY, {type: "text", consistency: "strong"});
  assert.equal(before, null, "CI_PREVIEW_REFUSES_EXISTING_PUBLISHED_RECORD");
  const data = prepareExplicitFixture();
  const write = await store.setJSON(KEY, data.value, {onlyIfNew: true});
  assert.equal(write?.modified, true, "CI_PREVIEW_CONDITIONAL_BLOB_WRITE_REJECTED");
  const after = await publishedReader.readRawPublished(store);
  const inspected = publishedReader.inspectPublishedRaw(after, {
    configuration: configCore, administrationV5: adminV5, catalog, priceBook, scene
  });
  assert.equal(inspected.kind, "valid", "CI_PREVIEW_BLOB_READBACK_NOT_VALID");
  assert.equal(digest(JSON.stringify(after.value)), data.sha256, "CI_PREVIEW_BLOB_READBACK_DIGEST_MISMATCH");
  return {
    status: "CI_DEPLOY_STORE_V5_VERIFIED", store: STORE, key: KEY, sha256: data.sha256,
    schema: data.schema, revision: data.revision, reviewID: target.reviewId,
    sourceBranch: target.sourceBranch, provenance: data.provenance
  };
}
