const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const projectRoot = path.resolve(__dirname, "..");

function canonicalValue(value) {
  if (Array.isArray(value)) return value.map(canonicalValue);
  if (!value || typeof value !== "object") return value;
  return Object.fromEntries(
    Object.keys(value)
      .sort()
      .filter((key) => value[key] !== undefined)
      .map((key) => [key, canonicalValue(value[key])])
  );
}

function canonicalJson(value) {
  return JSON.stringify(canonicalValue(value));
}

function digestJson(value) {
  return crypto.createHash("sha256").update(canonicalJson(value)).digest("hex");
}

function loadRuntime() {
  const sandbox = { window: {} };
  vm.createContext(sandbox);
  [
    "data/scene-data.js",
    "data/catalog-data.js",
    "data/mock-price-book.js"
  ].forEach((relativePath) => {
    vm.runInContext(
      fs.readFileSync(path.join(projectRoot, relativePath), "utf8"),
      sandbox,
      { filename: relativePath }
    );
  });

  return {
    catalog: sandbox.window.CASA_EM_MODULOS_CATALOG,
    priceBook: sandbox.window.CASA_EM_MODULOS_PRICE_BOOK,
    scene: sandbox.window.CASA_EM_MODULOS_SCENE,
    hierarchyDefaults: require(path.join(projectRoot, "data/hierarchy-defaults.js")),
    configuration: require(path.join(projectRoot, "core/configuration.js")),
    flow: require(path.join(projectRoot, "core/flow-model.js")),
    v5Core: require(path.join(projectRoot, "core/administration-v5.js")),
    legacyStageRepair: require(path.join(projectRoot, "core/legacy-stage-repair.js"))
  };
}

function stageItemOwners(value, itemId) {
  return (value?.stages || [])
    .filter((stage) => Array.isArray(stage.items) && stage.items.includes(itemId))
    .map((stage) => stage.kind || stage.id);
}

function sourceFacts(source) {
  return {
    schemaVersion: source?.schemaVersion || null,
    revision: Number.isSafeInteger(source?.revision) ? source.revision : null,
    stageIds: Array.isArray(source?.stages) ? source.stages.map((stage) => stage.id) : [],
    handlesOwners: stageItemOwners(source, "handles-all"),
    stoneOwners: stageItemOwners(source, "stone-all"),
    skirtingOwners: stageItemOwners(source, "stone-skirting"),
    skirtingSelected: Boolean(source?.initialState?.services?.includes("stone-skirting"))
  };
}

function failedReport(source, code, message, extra = {}) {
  return {
    schemaVersion: "V5PublicationPreflight 1.0",
    ok: false,
    code,
    message,
    source: {
      ...sourceFacts(source),
      digest: source && typeof source === "object" ? digestJson(source) : null
    },
    ...extra
  };
}

function createPreflight(source, runtime = loadRuntime()) {
  const { configuration, flow, catalog, priceBook, scene, hierarchyDefaults, v5Core, legacyStageRepair } = runtime;

  if (!source || source.schemaVersion !== configuration.SCHEMA || !Array.isArray(source.stages)) {
    return failedReport(
      source,
      "unexpected_source_schema",
      `Expected current production source schema ${configuration.SCHEMA}.`
    );
  }

  let normalizedSource;
  try {
    normalizedSource = configuration.normalizeConfiguratorSettings(source, catalog, priceBook, scene);
  } catch (error) {
    return failedReport(source, "invalid_source", error.message || "Source v3 failed validation.");
  }

  if (canonicalJson(normalizedSource) !== canonicalJson(source)) {
    return failedReport(
      source,
      "source_not_canonical",
      "Source v3 changes during normalization; publication must use a canonical freshly read record.",
      { normalizedSourceDigest: digestJson(normalizedSource) }
    );
  }

  const facts = sourceFacts(normalizedSource);
  if (facts.skirtingOwners.length > 1) {
    return failedReport(
      normalizedSource,
      "skirting_duplicate_owner",
      "stone-skirting is assigned to more than one stage."
    );
  }
  if (facts.skirtingSelected && facts.skirtingOwners.length === 0) {
    return failedReport(
      normalizedSource,
      "skirting_repair_required",
      "stone-skirting is selected but has no published stage owner. Execute and verify the isolated v3 consistency repair before v5 publication."
    );
  }
  if (facts.skirtingOwners.length === 1 && facts.stoneOwners.length === 1
    && facts.skirtingOwners[0] !== facts.stoneOwners[0]) {
    return failedReport(
      normalizedSource,
      "skirting_wrong_owner",
      "stone-skirting is assigned outside the stage that owns stone-all; do not move it automatically."
    );
  }

  const handlesPlan = legacyStageRepair.planHandlesAssignment(normalizedSource, configuration.SCHEMA);
  if (!handlesPlan.ok) {
    return failedReport(
      normalizedSource,
      `handles_${handlesPlan.code}`,
      handlesPlan.message || "Puxadores ownership is not publication-safe."
    );
  }
  if (handlesPlan.needed) {
    return failedReport(
      normalizedSource,
      "handles_repair_required",
      "Puxadores is absent from the published v3 source. Execute and verify the isolated v3 repair before v5 publication.",
      {
        handlesRepair: {
          needed: true,
          beforeItems: handlesPlan.beforeItems,
          afterItems: handlesPlan.afterItems
        }
      }
    );
  }

  let candidate;
  try {
    candidate = v5Core.upgrade(
      normalizedSource,
      configuration,
      flow,
      catalog,
      priceBook,
      scene,
      hierarchyDefaults
    );
  } catch (error) {
    return failedReport(normalizedSource, "migration_failed", error.message || "v3 -> v5 migration failed.");
  }

  const candidateErrors = v5Core.validate(candidate, configuration, catalog, priceBook, scene);
  if (candidateErrors.length) {
    return failedReport(
      normalizedSource,
      "candidate_invalid",
      "Derived v5 candidate failed validation.",
      { errors: candidateErrors }
    );
  }

  const projection = v5Core.projectToLegacy(
    candidate,
    configuration,
    flow,
    catalog,
    priceBook,
    scene,
    hierarchyDefaults
  );
  if (!projection.ok) {
    return failedReport(
      normalizedSource,
      "candidate_not_lossless",
      "Derived v5 candidate does not project losslessly to the exact v3 source.",
      { projection }
    );
  }
  if (canonicalJson(projection.value) !== canonicalJson(normalizedSource)) {
    return failedReport(
      normalizedSource,
      "source_equivalence_failed",
      "v5 candidate projects to a v3 payload different from the freshly read source.",
      {
        projectedDigest: digestJson(projection.value),
        normalizedSourceDigest: digestJson(normalizedSource)
      }
    );
  }

  const expectedReadback = v5Core.normalize({
    ...structuredClone(candidate),
    revision: normalizedSource.revision + 1
  });

  return {
    schemaVersion: "V5PublicationPreflight 1.0",
    ok: true,
    code: "ready",
    source: {
      ...sourceFacts(normalizedSource),
      digest: digestJson(normalizedSource)
    },
    candidate: {
      schemaVersion: candidate.schemaVersion,
      revision: candidate.revision,
      digest: digestJson(candidate),
      publicationSignatureDigest: crypto
        .createHash("sha256")
        .update(v5Core.publicationSignature(candidate))
        .digest("hex")
    },
    expectedReadback: {
      schemaVersion: expectedReadback.schemaVersion,
      revision: expectedReadback.revision,
      digest: digestJson(expectedReadback),
      publicationSignatureDigest: crypto
        .createHash("sha256")
        .update(v5Core.publicationSignature(expectedReadback))
        .digest("hex")
    },
    candidatePayload: candidate
  };
}

function verifyReadback(preflight, readback, runtime = loadRuntime()) {
  const { configuration, catalog, priceBook, scene, v5Core } = runtime;
  if (!preflight?.ok || !preflight?.candidatePayload) {
    return { ok: false, code: "preflight_not_ready" };
  }

  const errors = v5Core.validate(readback, configuration, catalog, priceBook, scene);
  if (errors.length) return { ok: false, code: "invalid_readback", errors };

  const normalized = v5Core.normalize(readback);
  if (normalized.revision !== preflight.expectedReadback.revision) {
    return {
      ok: false,
      code: "unexpected_revision",
      expected: preflight.expectedReadback.revision,
      actual: normalized.revision
    };
  }

  const digest = digestJson(normalized);
  if (digest !== preflight.expectedReadback.digest) {
    return {
      ok: false,
      code: "readback_digest_mismatch",
      expected: preflight.expectedReadback.digest,
      actual: digest
    };
  }

  const signatureDigest = crypto
    .createHash("sha256")
    .update(v5Core.publicationSignature(normalized))
    .digest("hex");
  if (signatureDigest !== preflight.expectedReadback.publicationSignatureDigest) {
    return {
      ok: false,
      code: "readback_signature_mismatch",
      expected: preflight.expectedReadback.publicationSignatureDigest,
      actual: signatureDigest
    };
  }

  return { ok: true, code: "verified", digest, signatureDigest };
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(path.resolve(filePath), "utf8"));
}

function main(argv) {
  const sourcePath = argv[2];
  if (!sourcePath) {
    process.stderr.write("Usage: node app/tools/v5-publication-preflight.js <source-v3.json> [readback-v5.json]\n");
    return 64;
  }

  const preflight = createPreflight(readJson(sourcePath));
  const output = { preflight };

  if (argv[3]) {
    output.readback = verifyReadback(preflight, readJson(argv[3]));
  }

  process.stdout.write(JSON.stringify(output, null, 2) + "\n");
  if (!preflight.ok) return 2;
  if (output.readback && !output.readback.ok) return 3;
  return 0;
}

if (require.main === module) process.exitCode = main(process.argv);

module.exports = Object.freeze({
  canonicalJson,
  digestJson,
  loadRuntime,
  sourceFacts,
  createPreflight,
  verifyReadback
});
