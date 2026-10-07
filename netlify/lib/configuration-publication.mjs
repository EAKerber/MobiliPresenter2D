import crypto from "node:crypto";

export function canonicalValue(value) {
  if (Array.isArray(value)) return value.map(canonicalValue);
  if (!value || typeof value !== "object") return value;
  return Object.fromEntries(
    Object.keys(value)
      .sort()
      .filter((key) => value[key] !== undefined)
      .map((key) => [key, canonicalValue(value[key])])
  );
}

export function canonicalJson(value) {
  return JSON.stringify(canonicalValue(value));
}

export function digestJson(value) {
  return crypto.createHash("sha256").update(canonicalJson(value)).digest("hex");
}

export function digestText(value) {
  return crypto.createHash("sha256").update(String(value)).digest("hex");
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
    stoneOwners: stageItemOwners(source, "stone-all"),
    skirtingOwners: stageItemOwners(source, "stone-skirting"),
    skirtingSelected: Boolean(source?.initialState?.services?.includes("stone-skirting")),
    handlesOwners: stageItemOwners(source, "handles-all")
  };
}

function failure(code, message, status = 422, extra = {}) {
  return { ok: false, code, message, status, ...extra };
}

export async function readRawPublished(store) {
  const entry = await store.getWithMetadata("published", {
    type: "json",
    consistency: "strong"
  });
  if (!entry) return null;
  if (!entry.etag) throw new Error("published blob is missing an ETag");
  return {
    data: structuredClone(entry.data),
    etag: entry.etag
  };
}

function defaultV3(deps) {
  return deps.configCore.createDefaultAdministration(
    deps.defaults,
    deps.catalog,
    deps.priceBook,
    deps.scene
  );
}

export function normalizeStored(value, deps) {
  if (value?.schemaVersion === deps.configCore.SCHEMA) {
    return {
      schema: "v3",
      value: deps.configCore.normalizeConfiguratorSettings(
        value,
        deps.catalog,
        deps.priceBook,
        deps.scene
      )
    };
  }
  if (value?.schemaVersion === deps.v5Core.SCHEMA) {
    const errors = deps.v5Core.validate(
      value,
      deps.configCore,
      deps.catalog,
      deps.priceBook,
      deps.scene
    );
    if (errors.length) throw new TypeError(errors.join("; "));
    return { schema: "v5", value: deps.v5Core.normalize(value) };
  }
  throw new TypeError("unsupported stored configuration schema");
}

export async function readPublishedForGet(store, deps) {
  const raw = await readRawPublished(store);
  if (!raw) return { value: defaultV3(deps), source: "default-v3", etag: null };

  if (raw.data?.schemaVersion === deps.v5Core.SCHEMA) {
    const normalized = normalizeStored(raw.data, deps);
    return { value: normalized.value, source: "stored-v5", etag: raw.etag };
  }

  try {
    const normalized = normalizeStored(raw.data, deps);
    if (normalized.schema === "v3") {
      return { value: normalized.value, source: "stored-v3", etag: raw.etag };
    }
  } catch {
    // Preserve the historical GET resilience for invalid/unknown pre-v5 data.
    // Valid v5 never reaches this fallback branch.
  }

  return { value: defaultV3(deps), source: "fallback-v3", etag: raw.etag };
}

export function validateMigrationSource(source, deps) {
  if (!source || source.schemaVersion !== deps.configCore.SCHEMA) {
    return failure(
      "unexpected_source_schema",
      `Expected source schema ${deps.configCore.SCHEMA}.`,
      409
    );
  }

  let normalized;
  try {
    normalized = deps.configCore.normalizeConfiguratorSettings(
      source,
      deps.catalog,
      deps.priceBook,
      deps.scene
    );
  } catch (error) {
    return failure("invalid_source", error.message || "Invalid source v3.", 409);
  }

  if (canonicalJson(normalized) !== canonicalJson(source)) {
    return failure(
      "source_not_canonical",
      "Stored v3 changes during normalization.",
      409,
      { normalizedDigest: digestJson(normalized) }
    );
  }

  const facts = sourceFacts(normalized);
  if (facts.skirtingOwners.length > 1) {
    return failure("skirting_duplicate_owner", "stone-skirting has multiple stage owners.", 409);
  }
  if (facts.skirtingSelected && facts.skirtingOwners.length === 0) {
    return failure(
      "skirting_repair_required",
      "stone-skirting is selected but has no published stage owner.",
      409
    );
  }
  if (
    facts.skirtingOwners.length === 1
    && facts.stoneOwners.length === 1
    && facts.skirtingOwners[0] !== facts.stoneOwners[0]
  ) {
    return failure(
      "skirting_wrong_owner",
      "stone-skirting is not owned by the stage that owns stone-all.",
      409
    );
  }

  const handles = deps.legacyStageRepair.planHandlesAssignment(
    normalized,
    deps.configCore.SCHEMA
  );
  if (!handles.ok) {
    return failure(
      `handles_${handles.code}`,
      handles.message || "Invalid Puxadores ownership.",
      409
    );
  }
  if (handles.needed) {
    return failure(
      "handles_repair_required",
      "Puxadores must be persisted in v3 before v5 migration.",
      409,
      {
        handlesRepair: {
          beforeItems: handles.beforeItems,
          afterItems: handles.afterItems
        }
      }
    );
  }

  return {
    ok: true,
    source: normalized,
    facts,
    digest: digestJson(normalized)
  };
}

export function deriveMigrationCandidate(source, deps) {
  const sourceCheck = validateMigrationSource(source, deps);
  if (!sourceCheck.ok) return sourceCheck;

  let candidate;
  try {
    candidate = deps.v5Core.upgrade(
      sourceCheck.source,
      deps.configCore,
      deps.flowCore,
      deps.catalog,
      deps.priceBook,
      deps.scene,
      deps.hierarchyDefaults
    );
  } catch (error) {
    return failure("migration_failed", error.message || "v3 -> v5 migration failed.", 422);
  }

  const errors = deps.v5Core.validate(
    candidate,
    deps.configCore,
    deps.catalog,
    deps.priceBook,
    deps.scene
  );
  if (errors.length) {
    return failure("candidate_invalid", "Derived v5 candidate is invalid.", 422, { errors });
  }

  const projection = deps.v5Core.projectToLegacy(
    candidate,
    deps.configCore,
    deps.flowCore,
    deps.catalog,
    deps.priceBook,
    deps.scene,
    deps.hierarchyDefaults
  );
  if (!projection.ok) {
    return failure(
      "candidate_not_lossless",
      "Derived v5 candidate cannot project exactly to its source v3.",
      422,
      { projection }
    );
  }
  if (canonicalJson(projection.value) !== canonicalJson(sourceCheck.source)) {
    return failure(
      "source_equivalence_failed",
      "Derived v5 candidate projects to a different v3 object.",
      422,
      {
        sourceDigest: sourceCheck.digest,
        projectedDigest: digestJson(projection.value)
      }
    );
  }

  return {
    ok: true,
    source: sourceCheck.source,
    sourceDigest: sourceCheck.digest,
    facts: sourceCheck.facts,
    candidate: deps.v5Core.normalize(candidate),
    candidateDigest: digestJson(candidate)
  };
}

export function prepareMigration(raw, payload, declaredSourceDigest, deps) {
  if (!raw) return failure("missing_source", "Published source blob does not exist.", 409);
  if (!raw.etag) return failure("missing_source_etag", "Published source blob has no ETag.", 409);

  const derived = deriveMigrationCandidate(raw.data, deps);
  if (!derived.ok) return derived;

  if (!/^[a-f0-9]{64}$/.test(String(declaredSourceDigest || ""))) {
    return failure("invalid_source_digest", "A canonical source digest is required.", 409);
  }
  if (declaredSourceDigest !== derived.sourceDigest) {
    return failure("source_digest_conflict", "Published source digest changed.", 409, {
      currentDigest: derived.sourceDigest
    });
  }
  if (payload?.revision !== derived.source.revision) {
    return failure("revision_conflict", "Published source revision changed.", 409, {
      currentRevision: derived.source.revision
    });
  }

  let submitted;
  try {
    const errors = deps.v5Core.validate(
      payload,
      deps.configCore,
      deps.catalog,
      deps.priceBook,
      deps.scene
    );
    if (errors.length) {
      return failure("invalid_candidate", errors[0], 422, { errors });
    }
    submitted = deps.v5Core.normalize(payload);
  } catch (error) {
    return failure("invalid_candidate", error.message || "Invalid v5 candidate.", 422);
  }

  if (canonicalJson(submitted) !== canonicalJson(derived.candidate)) {
    return failure(
      "candidate_mismatch",
      "Submitted v5 payload is not the exact server-derived migration candidate.",
      422,
      {
        expectedDigest: derived.candidateDigest,
        submittedDigest: digestJson(submitted)
      }
    );
  }

  const output = deps.v5Core.normalize({
    ...structuredClone(derived.candidate),
    revision: derived.source.revision + 1
  });

  return {
    ok: true,
    source: derived.source,
    sourceDigest: derived.sourceDigest,
    sourceEtag: raw.etag,
    facts: derived.facts,
    candidate: derived.candidate,
    candidateDigest: derived.candidateDigest,
    output,
    outputDigest: digestJson(output),
    outputSignatureDigest: digestText(deps.v5Core.publicationSignature(output))
  };
}

export function verifyMigrationReadback(prepared, raw, deps) {
  if (!prepared?.ok) return failure("migration_not_prepared", "Migration was not prepared.", 500);
  if (!raw) return failure("missing_readback", "Published v5 readback is missing.", 500);

  let normalized;
  try {
    const stored = normalizeStored(raw.data, deps);
    if (stored.schema !== "v5") {
      return failure("unexpected_readback_schema", "Readback is not v5.", 500);
    }
    normalized = stored.value;
  } catch (error) {
    return failure("invalid_readback", error.message || "Invalid v5 readback.", 500);
  }

  if (normalized.revision !== prepared.output.revision) {
    return failure("unexpected_readback_revision", "Readback revision differs.", 500, {
      expected: prepared.output.revision,
      actual: normalized.revision
    });
  }
  const digest = digestJson(normalized);
  if (digest !== prepared.outputDigest) {
    return failure("readback_digest_mismatch", "Readback digest differs.", 500, {
      expected: prepared.outputDigest,
      actual: digest
    });
  }
  const signatureDigest = digestText(deps.v5Core.publicationSignature(normalized));
  if (signatureDigest !== prepared.outputSignatureDigest) {
    return failure("readback_signature_mismatch", "Readback publication signature differs.", 500);
  }

  return {
    ok: true,
    value: normalized,
    digest,
    signatureDigest,
    etag: raw.etag
  };
}

export async function executeV5Migration({
  store,
  payload,
  sourceDigest,
  enabled = false,
  deps
}) {
  if (!enabled) {
    return failure(
      "v5_migration_disabled",
      "v5 migration support is deployed but not activated.",
      422
    );
  }

  let raw;
  try {
    raw = await readRawPublished(store);
  } catch (error) {
    return failure("source_read_failed", error.message || "Could not read source blob.", 500);
  }

  const prepared = prepareMigration(raw, payload, sourceDigest, deps);
  if (!prepared.ok) return prepared;

  let write;
  try {
    write = await store.setJSON("published", prepared.output, {
      onlyIfMatch: prepared.sourceEtag
    });
  } catch (error) {
    return failure("conditional_write_failed", error.message || "Conditional write failed.", 409);
  }
  if (!write?.modified) {
    return failure("source_etag_conflict", "Published blob changed before migration write.", 409);
  }

  let readbackRaw;
  try {
    readbackRaw = await readRawPublished(store);
  } catch (error) {
    return failure("readback_failed", error.message || "Could not read v5 after migration.", 500);
  }
  const verified = verifyMigrationReadback(prepared, readbackRaw, deps);
  if (!verified.ok) return verified;

  return {
    ok: true,
    status: 200,
    value: verified.value,
    evidence: {
      source: {
        schemaVersion: prepared.source.schemaVersion,
        revision: prepared.source.revision,
        digest: prepared.sourceDigest,
        facts: prepared.facts
      },
      candidate: {
        schemaVersion: prepared.candidate.schemaVersion,
        revision: prepared.candidate.revision,
        digest: prepared.candidateDigest
      },
      readback: {
        schemaVersion: verified.value.schemaVersion,
        revision: verified.value.revision,
        digest: verified.digest,
        publicationSignatureDigest: verified.signatureDigest
      }
    }
  };
}
