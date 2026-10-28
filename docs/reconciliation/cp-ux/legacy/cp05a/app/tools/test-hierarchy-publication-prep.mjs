import assert from "node:assert/strict";
import configCore from "../core/configuration.js";
import defaults from "../data/configurator-settings.js";
import catalog from "../data/catalog-data.js";
import priceBook from "../data/mock-price-book.js";
import {
  V3_SCHEMA,
  V4_SCHEMA,
  stableStringify,
  canonicalDigest,
  prepareHierarchyPublication,
  validateHierarchyCandidateForSource,
  publicationPlanSummary
} from "../../netlify/lib/hierarchy-publication.mjs";

const source = configCore.createDefaultAdministration(defaults, catalog, priceBook);

assert.equal(source.schemaVersion, V3_SCHEMA);

const orderedA = { z: 1, a: { y: 2, x: [3, { b: 4, a: 5 }] } };
const orderedB = { a: { x: [3, { a: 5, b: 4 }], y: 2 }, z: 1 };
assert.equal(stableStringify(orderedA), stableStringify(orderedB), "canonical serialization ignores object insertion order");
assert.equal(canonicalDigest(orderedA), canonicalDigest(orderedB), "canonical digest ignores object insertion order");

const first = prepareHierarchyPublication(source, catalog, priceBook);
assert.equal(first.ok, true);
assert.equal(first.code, "hierarchy_publication_ready");
assert.equal(first.sourceSchemaVersion, V3_SCHEMA);
assert.equal(first.candidateSchemaVersion, V4_SCHEMA);
assert.equal(first.sourceDigest, first.projectedDigest, "deterministic candidate round-trips to the exact normalized source");

const second = prepareHierarchyPublication(structuredClone(source), catalog, priceBook);
assert.equal(second.ok, true);
assert.equal(second.sourceDigest, first.sourceDigest, "source digest is deterministic");
assert.equal(second.candidateDigest, first.candidateDigest, "candidate digest is deterministic");
assert.equal(second.hierarchySignature, first.hierarchySignature, "hierarchy signature is deterministic");

const summary = publicationPlanSummary(first);
assert.deepEqual(summary, {
  ok: true,
  code: "hierarchy_publication_ready",
  publicationEnabled: false,
  source: {
    schemaVersion: V3_SCHEMA,
    revision: source.revision,
    digest: first.sourceDigest
  },
  candidate: {
    schemaVersion: V4_SCHEMA,
    digest: first.candidateDigest,
    hierarchySignature: first.hierarchySignature
  },
  equivalence: {
    ok: true,
    projectedDigest: first.projectedDigest
  }
});

const exactCandidate = validateHierarchyCandidateForSource(source, first.candidate, catalog, priceBook);
assert.equal(exactCandidate.ok, true);
assert.equal(exactCandidate.code, "hierarchy_candidate_valid");
assert.equal(exactCandidate.sourceDigest, first.sourceDigest);

const changedCopy = structuredClone(first.candidate);
changedCopy.objects["module-01"].title = "Mudança semântica indevida";
const changedCopyResult = validateHierarchyCandidateForSource(source, changedCopy, catalog, priceBook);
assert.equal(changedCopyResult.ok, false);
assert.equal(changedCopyResult.code, "semantic_mismatch", "non-hierarchy mutation is rejected");

const extraMetadata = structuredClone(first.candidate);
extraMetadata.migrationNote = "not part of deterministic migration";
const extraMetadataResult = validateHierarchyCandidateForSource(source, extraMetadata, catalog, priceBook);
assert.equal(extraMetadataResult.ok, false);
assert.equal(extraMetadataResult.code, "non_deterministic_candidate", "extra candidate data outside the deterministic migration is rejected");

const changedHierarchy = structuredClone(first.candidate);
changedHierarchy.stages.find((stage) => stage.id === "finishes").groups.reverse();
const changedHierarchyResult = validateHierarchyCandidateForSource(source, changedHierarchy, catalog, priceBook);
assert.equal(changedHierarchyResult.ok, false);
assert.equal(changedHierarchyResult.code, "non_deterministic_hierarchy", "migration candidate cannot contain unreviewed hierarchy edits");

const invalidHierarchy = structuredClone(first.candidate);
invalidHierarchy.stages.find((stage) => stage.id === "services").groups[0].sections[0].itemIds.push("move-stone");
const invalidHierarchyResult = validateHierarchyCandidateForSource(source, invalidHierarchy, catalog, priceBook);
assert.equal(invalidHierarchyResult.ok, false);
assert.equal(invalidHierarchyResult.code, "invalid_hierarchy", "closed hierarchy validation runs before publication");

const changedSource = structuredClone(source);
changedSource.revision += 1;
const staleCandidate = validateHierarchyCandidateForSource(changedSource, first.candidate, catalog, priceBook);
assert.equal(staleCandidate.ok, false);
assert.equal(staleCandidate.code, "semantic_mismatch", "candidate prepared for a different source revision cannot pass");

const unsupportedSource = prepareHierarchyPublication(first.candidate, catalog, priceBook);
assert.equal(unsupportedSource.ok, false);
assert.equal(unsupportedSource.code, "unsupported_source_schema");

const functionSource = await (await import("node:fs/promises")).readFile(
  new URL("../../netlify/functions/configuration.mjs", import.meta.url),
  "utf8"
);
assert.equal(
  functionSource.includes('request.method === "POST"') && functionSource.includes('"prepare-hierarchy"'),
  true,
  "configuration endpoint exposes an explicit authenticated read-only hierarchy preparation action"
);
assert.equal(
  (functionSource.match(/store\.setJSON\(/g) || []).length,
  1,
  "configuration endpoint has exactly one storage write site"
);
const postStart = functionSource.indexOf('if (request.method === "POST")');
const putBodyStart = functionSource.indexOf('const declaredLength', postStart);
assert.ok(postStart >= 0 && putBodyStart > postStart, "POST preparation branch is structurally isolated");
assert.equal(
  functionSource.slice(postStart, putBodyStart).includes("store.setJSON"),
  false,
  "hierarchy preparation branch performs no storage write"
);
assert.equal(
  functionSource.slice(postStart, putBodyStart).includes("readStoredOrDefault(store)"),
  true,
  "hierarchy preparation reads the stored source without the public-read fallback"
);
const v4Guard = functionSource.indexOf("payload?.schemaVersion === V4_SCHEMA");
const writeSite = functionSource.indexOf('await store.setJSON("published"');
assert.ok(v4Guard >= 0 && writeSite > v4Guard, "v4 validation gate precedes the only write site");
assert.equal(
  functionSource.slice(v4Guard, writeSite).includes('error: "hierarchy_publication_required"'),
  true,
  "valid v4 candidates remain publication-blocked before the write site"
);

console.log("hierarchy publication prep: PASS");
