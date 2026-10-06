import { createHash } from "node:crypto";
import configCore from "../../app/core/configuration.js";
import flowCore from "../../app/core/flow-model.js";
import hierarchyCore from "../../app/core/hierarchy-administration.js";

export const V3_SCHEMA = configCore.SCHEMA;
export const V4_SCHEMA = hierarchyCore.SCHEMA;

function canonicalize(value) {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (!value || typeof value !== "object") return value;
  return Object.fromEntries(
    Object.keys(value)
      .filter((key) => value[key] !== undefined)
      .sort()
      .map((key) => [key, canonicalize(value[key])])
  );
}

export function stableStringify(value) {
  return JSON.stringify(canonicalize(value));
}

export function canonicalDigest(value) {
  return createHash("sha256").update(stableStringify(value)).digest("hex");
}

function failure(code, errors, extra = {}) {
  return {
    ok: false,
    code,
    errors: Array.isArray(errors) ? errors : [String(errors)],
    ...extra
  };
}

function normalizeSource(source, catalog, priceBook) {
  if (!source || source.schemaVersion !== V3_SCHEMA) {
    return failure("unsupported_source_schema", [
      `Hierarchy publication preparation requires ${V3_SCHEMA} as the source schema.`
    ]);
  }
  try {
    return {
      ok: true,
      value: configCore.normalizeConfiguratorSettings(source, catalog, priceBook)
    };
  } catch (error) {
    return failure("invalid_source", [error instanceof Error ? error.message : "Invalid v3 source."]);
  }
}

export function prepareHierarchyPublication(source, catalog, priceBook) {
  const normalized = normalizeSource(source, catalog, priceBook);
  if (!normalized.ok) return normalized;

  const normalizedSource = normalized.value;
  let candidate;
  try {
    candidate = hierarchyCore.upgradeToHierarchy(
      normalizedSource,
      configCore,
      flowCore,
      catalog,
      priceBook
    );
  } catch (error) {
    return failure("upgrade_failed", [error instanceof Error ? error.message : "Hierarchy upgrade failed."]);
  }

  const hierarchyErrors = hierarchyCore.validateHierarchyAdministration(
    candidate,
    configCore,
    catalog,
    priceBook
  );
  if (hierarchyErrors.length) return failure("invalid_hierarchy", hierarchyErrors);

  const projection = hierarchyCore.projectHierarchyToLegacy(
    candidate,
    configCore,
    flowCore,
    catalog,
    priceBook
  );
  if (!projection.ok) {
    return failure(projection.code || "projection_failed", projection.errors || ["Hierarchy projection failed."]);
  }

  const sourceDigest = canonicalDigest(normalizedSource);
  const projectedDigest = canonicalDigest(projection.value);
  if (sourceDigest !== projectedDigest) {
    return failure("semantic_mismatch", [
      "Deterministic v4 candidate does not project back to the exact normalized v3 source."
    ], { sourceDigest, projectedDigest });
  }

  return {
    ok: true,
    code: "hierarchy_publication_ready",
    source: normalizedSource,
    candidate,
    sourceSchemaVersion: normalizedSource.schemaVersion,
    sourceRevision: normalizedSource.revision,
    sourceDigest,
    candidateSchemaVersion: candidate.schemaVersion,
    candidateDigest,
    hierarchySignature: hierarchyCore.hierarchySignature(candidate),
    projectedDigest
  };
}

export function validateHierarchyCandidateForSource(source, candidate, catalog, priceBook) {
  const plan = prepareHierarchyPublication(source, catalog, priceBook);
  if (!plan.ok) return plan;

  if (!candidate || candidate.schemaVersion !== V4_SCHEMA) {
    return failure("unsupported_candidate_schema", [
      `Hierarchy candidate must use ${V4_SCHEMA}.`
    ], { sourceDigest: plan.sourceDigest });
  }

  const errors = hierarchyCore.validateHierarchyAdministration(
    candidate,
    configCore,
    catalog,
    priceBook
  );
  if (errors.length) {
    return failure("invalid_hierarchy", errors, { sourceDigest: plan.sourceDigest });
  }

  const candidateSignature = hierarchyCore.hierarchySignature(candidate);
  if (candidateSignature !== plan.hierarchySignature) {
    return failure("non_deterministic_hierarchy", [
      "Hierarchy candidate differs from the deterministic migration of the current v3 source."
    ], {
      sourceDigest: plan.sourceDigest,
      expectedCandidateDigest: plan.candidateDigest,
      candidateDigest: canonicalDigest(candidate)
    });
  }

  const projection = hierarchyCore.projectHierarchyToLegacy(
    candidate,
    configCore,
    flowCore,
    catalog,
    priceBook
  );
  if (!projection.ok) {
    return failure(projection.code || "projection_failed", projection.errors || ["Hierarchy projection failed."], {
      sourceDigest: plan.sourceDigest
    });
  }

  const candidateDigest = canonicalDigest(candidate);
  const projectedDigest = canonicalDigest(projection.value);
  if (projectedDigest !== plan.sourceDigest) {
    return failure("semantic_mismatch", [
      "Hierarchy candidate changes non-hierarchy administration semantics."
    ], {
      sourceDigest: plan.sourceDigest,
      projectedDigest,
      candidateDigest
    });
  }

  if (candidateDigest !== plan.candidateDigest) {
    return failure("non_deterministic_candidate", [
      "Hierarchy candidate contains data outside the exact deterministic migration of the current v3 source."
    ], {
      sourceDigest: plan.sourceDigest,
      expectedCandidateDigest: plan.candidateDigest,
      candidateDigest
    });
  }

  return {
    ok: true,
    code: "hierarchy_candidate_valid",
    sourceSchemaVersion: plan.sourceSchemaVersion,
    sourceRevision: plan.sourceRevision,
    sourceDigest: plan.sourceDigest,
    candidateSchemaVersion: V4_SCHEMA,
    candidateDigest: canonicalDigest(candidate),
    hierarchySignature: candidateSignature,
    projectedDigest
  };
}

export function publicationPlanSummary(plan) {
  if (!plan?.ok) {
    return {
      ok: false,
      code: plan?.code || "invalid_plan",
      errors: [...(plan?.errors || ["Invalid hierarchy publication plan."])],
      ...(plan?.sourceDigest ? { sourceDigest: plan.sourceDigest } : {})
    };
  }
  return {
    ok: true,
    code: plan.code,
    publicationEnabled: false,
    source: {
      schemaVersion: plan.sourceSchemaVersion,
      revision: plan.sourceRevision,
      digest: plan.sourceDigest
    },
    candidate: {
      schemaVersion: plan.candidateSchemaVersion,
      digest: plan.candidateDigest,
      hierarchySignature: plan.hierarchySignature
    },
    equivalence: {
      ok: true,
      projectedDigest: plan.projectedDigest
    }
  };
}
