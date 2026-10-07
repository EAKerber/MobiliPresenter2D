const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const { pathToFileURL } = require("node:url");

const projectRoot = path.resolve(__dirname, "..");
const repoRoot = path.resolve(projectRoot, "..");

function clone(value) {
  return value == null ? value : structuredClone(value);
}

class MockStore {
  constructor(value = null) {
    this.value = clone(value);
    this.etag = value == null ? null : '"mock-1"';
    this.version = value == null ? 0 : 1;
    this.writes = [];
    this.forceConflict = false;
  }

  async getWithMetadata(key, options) {
    assert.equal(key, "published");
    assert.equal(options?.type, "json");
    assert.equal(options?.consistency, "strong");
    if (this.value == null) return null;
    return { data: clone(this.value), etag: this.etag, metadata: {} };
  }

  async setJSON(key, value, options) {
    assert.equal(key, "published");
    const record = { value: clone(value), options: { ...options } };
    this.writes.push(record);
    if (this.forceConflict || !this.etag || options?.onlyIfMatch !== this.etag) {
      return { modified: false };
    }
    this.value = clone(value);
    this.version += 1;
    this.etag = `"mock-${this.version}"`;
    return { modified: true, etag: this.etag };
  }
}

(async () => {
  const publication = await import(
    pathToFileURL(path.join(repoRoot, "netlify/lib/configuration-publication.mjs")).href
  );

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

  const deps = {
    defaults: require(path.join(projectRoot, "data/configurator-settings.js")),
    hierarchyDefaults: require(path.join(projectRoot, "data/hierarchy-defaults.js")),
    catalog: sandbox.window.CASA_EM_MODULOS_CATALOG,
    priceBook: sandbox.window.CASA_EM_MODULOS_PRICE_BOOK,
    scene: sandbox.window.CASA_EM_MODULOS_SCENE,
    configCore: require(path.join(projectRoot, "core/configuration.js")),
    flowCore: require(path.join(projectRoot, "core/flow-model.js")),
    v5Core: require(path.join(projectRoot, "core/administration-v5.js")),
    legacyStageRepair: require(path.join(projectRoot, "core/legacy-stage-repair.js"))
  };

  const v3 = deps.configCore.createDefaultAdministration(
    deps.defaults,
    deps.catalog,
    deps.priceBook,
    deps.scene
  );
  const derived = publication.deriveMigrationCandidate(v3, deps);
  assert.equal(derived.ok, true, "default canonical v3 derives a deterministic v5 candidate");

  const missingStore = new MockStore();
  const missingGet = await publication.readPublishedForGet(missingStore, deps);
  assert.equal(missingGet.source, "default-v3");
  assert.equal(missingGet.value.schemaVersion, deps.configCore.SCHEMA);

  const v3Store = new MockStore(v3);
  const v3Get = await publication.readPublishedForGet(v3Store, deps);
  assert.equal(v3Get.source, "stored-v3");
  assert.deepEqual(v3Get.value, v3);

  const storedV5 = deps.v5Core.normalize({
    ...clone(derived.candidate),
    revision: v3.revision + 1
  });
  const v5Store = new MockStore(storedV5);
  const v5Get = await publication.readPublishedForGet(v5Store, deps);
  assert.equal(v5Get.source, "stored-v5");
  assert.deepEqual(v5Get.value, storedV5, "valid stored v5 is returned as v5, never downgraded");

  const invalidStoredV5 = clone(storedV5);
  invalidStoredV5.pricing.roles.itemBase["module-01"].cents = -1;
  await assert.rejects(
    () => publication.readPublishedForGet(new MockStore(invalidStoredV5), deps),
    /invalid amount cents/,
    "invalid v5 fails closed instead of falling back to v3 defaults"
  );

  const invalidV3 = clone(v3);
  invalidV3.pricing.entries["module-01"] = -1;
  const invalidV3Get = await publication.readPublishedForGet(new MockStore(invalidV3), deps);
  assert.equal(invalidV3Get.source, "fallback-v3", "legacy invalid-v3 GET fallback remains unchanged");

  const unexpected = clone(v3);
  unexpected.schemaVersion = "ConfiguratorAdministration2D 99.0";
  const unexpectedGet = await publication.readPublishedForGet(new MockStore(unexpected), deps);
  assert.equal(unexpectedGet.source, "fallback-v3", "unknown historical GET data retains the legacy fallback behavior");

  const disabledStore = new MockStore(v3);
  const disabled = await publication.executeV5Migration({
    store: disabledStore,
    payload: derived.candidate,
    sourceDigest: publication.digestJson(v3),
    enabled: false,
    deps
  });
  assert.equal(disabled.code, "v5_migration_disabled");
  assert.equal(disabledStore.writes.length, 0);

  const digestConflictStore = new MockStore(v3);
  const digestConflict = await publication.executeV5Migration({
    store: digestConflictStore,
    payload: derived.candidate,
    sourceDigest: "0".repeat(64),
    enabled: true,
    deps
  });
  assert.equal(digestConflict.code, "source_digest_conflict");
  assert.equal(digestConflictStore.writes.length, 0);

  const stalePayload = clone(derived.candidate);
  stalePayload.revision = v3.revision + 1;
  const stale = await publication.executeV5Migration({
    store: new MockStore(v3),
    payload: stalePayload,
    sourceDigest: publication.digestJson(v3),
    enabled: true,
    deps
  });
  assert.equal(stale.code, "revision_conflict");

  const tamperedCandidate = clone(derived.candidate);
  tamperedCandidate.objects["module-01"].title += " alterado";
  const tampered = await publication.executeV5Migration({
    store: new MockStore(v3),
    payload: tamperedCandidate,
    sourceDigest: publication.digestJson(v3),
    enabled: true,
    deps
  });
  assert.equal(tampered.code, "candidate_mismatch", "migration accepts only the server-derived v5 candidate");

  const skirtingSource = clone(v3);
  skirtingSource.stages.find((stage) => (stage.kind || stage.id) === "finishes").items =
    skirtingSource.stages.find((stage) => (stage.kind || stage.id) === "finishes").items
      .filter((id) => id !== "stone-skirting");
  const skirtingDerived = deps.v5Core.upgrade(
    skirtingSource,
    deps.configCore,
    deps.flowCore,
    deps.catalog,
    deps.priceBook,
    deps.scene,
    deps.hierarchyDefaults
  );
  const skirtingBlocked = await publication.executeV5Migration({
    store: new MockStore(skirtingSource),
    payload: skirtingDerived,
    sourceDigest: publication.digestJson(skirtingSource),
    enabled: true,
    deps
  });
  assert.equal(skirtingBlocked.code, "skirting_repair_required");

  const handlesSource = clone(v3);
  handlesSource.stages.find((stage) => (stage.kind || stage.id) === "finishes").items =
    handlesSource.stages.find((stage) => (stage.kind || stage.id) === "finishes").items
      .filter((id) => id !== "handles-all");
  const handlesCandidate = deps.v5Core.upgrade(
    handlesSource,
    deps.configCore,
    deps.flowCore,
    deps.catalog,
    deps.priceBook,
    deps.scene,
    deps.hierarchyDefaults
  );
  const handlesBlocked = await publication.executeV5Migration({
    store: new MockStore(handlesSource),
    payload: handlesCandidate,
    sourceDigest: publication.digestJson(handlesSource),
    enabled: true,
    deps
  });
  assert.equal(handlesBlocked.code, "handles_repair_required");

  const conflictStore = new MockStore(v3);
  conflictStore.forceConflict = true;
  const etagConflict = await publication.executeV5Migration({
    store: conflictStore,
    payload: derived.candidate,
    sourceDigest: publication.digestJson(v3),
    enabled: true,
    deps
  });
  assert.equal(etagConflict.code, "source_etag_conflict");
  assert.equal(conflictStore.value.schemaVersion, deps.configCore.SCHEMA, "failed CAS leaves the source unchanged");

  const successStore = new MockStore(v3);
  const success = await publication.executeV5Migration({
    store: successStore,
    payload: derived.candidate,
    sourceDigest: publication.digestJson(v3),
    enabled: true,
    deps
  });
  assert.equal(success.ok, true);
  assert.equal(success.value.schemaVersion, deps.v5Core.SCHEMA);
  assert.equal(success.value.revision, v3.revision + 1);
  assert.equal(successStore.writes.length, 1);
  assert.equal(successStore.writes[0].options.onlyIfMatch, '"mock-1"', "migration writes with the exact source ETag");
  assert.equal(success.evidence.source.digest, publication.digestJson(v3));
  assert.equal(success.evidence.readback.digest, publication.digestJson(success.value));
  assert.equal(
    success.evidence.readback.publicationSignatureDigest,
    publication.digestText(deps.v5Core.publicationSignature(success.value))
  );

  const wrongReadback = clone(success.value);
  wrongReadback.pricing.roles.itemBase["module-01"].cents += 1;
  const prepared = publication.prepareMigration(
    { data: v3, etag: '"mock-source"' },
    derived.candidate,
    publication.digestJson(v3),
    deps
  );
  const wrongReadbackResult = publication.verifyMigrationReadback(
    prepared,
    { data: wrongReadback, etag: '"mock-readback"' },
    deps
  );
  assert.equal(wrongReadbackResult.code, "readback_digest_mismatch");

  const endpointSource = fs.readFileSync(path.join(repoRoot, "netlify/functions/configuration.mjs"), "utf8");
  assert.equal(
    endpointSource.includes("V5_MIGRATION_ENABLED = false"),
    true,
    "repository support must ship with live v5 migration disabled"
  );

  console.log("configuration publication support: PASS");
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
