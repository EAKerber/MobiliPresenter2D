const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const projectRoot = path.resolve(__dirname, "..");
const sandbox = { window: {} };
vm.createContext(sandbox);

for (const relativePath of [
  "data/scene-data.js",
  "data/mask-data.js",
  "core/state.js",
  "core/visibility.js",
  "core/validation.js",
  "core/fingerprint.js",
  "core/finishes.js"
]) {
  const source = fs.readFileSync(path.join(projectRoot, relativePath), "utf8");
  vm.runInContext(source, sandbox, { filename: relativePath });
}

const scene = sandbox.window.CASA_EM_MODULOS_SCENE;
const inlineMasks = sandbox.window.CASA_EM_MODULOS_MASK_DATA;
const core = sandbox.window.CasaModulesCore;
const visibility = sandbox.window.CasaModulesVisibility;
const validation = sandbox.window.CasaModulesValidation;
const fingerprints = sandbox.window.CasaModulesFingerprint;
const finishes = sandbox.window.CasaModulesFinishes;
const technical = JSON.parse(fs.readFileSync(path.join(projectRoot, "data/technical-data.json"), "utf8"));

assert.equal(scene.schemaVersion, "Scene2D 1.0");
assert.equal(scene.entities.length, 11);
assert.equal(new Set(scene.entities.map((entity) => entity.id)).size, 11);
assert.equal(Object.isFrozen(scene), true);
assert.equal(Object.isFrozen(scene.entities), true);
assert.deepEqual(
  Array.from(scene.entities.filter((entity) => entity.controllable).map((entity) => entity.alias)),
  ["01", "02", "03", "04", "05", "06", "07", "08"]
);
assert.deepEqual(Array.from(validation.validateScene(scene)), []);

for (const entity of scene.entities.filter((item) => item.maskAsset)) {
  const dataUrl = inlineMasks[entity.maskAsset];
  assert.equal(typeof dataUrl, "string");
  assert.equal(dataUrl.startsWith("data:image/png;base64,"), true);
  const embeddedBytes = Buffer.from(dataUrl.slice("data:image/png;base64,".length), "base64");
  const sourceBytes = fs.readFileSync(path.join(projectRoot, entity.maskAsset));
  assert.equal(embeddedBytes.equals(sourceBytes), true);
}
assert.equal(Object.keys(inlineMasks).length, scene.entities.filter((item) => item.maskAsset).length);

const frontFinishGroup = scene.finishGroups.find((group) => group.id === "fronts-all");
const whitePreset = frontFinishGroup.presets.find((preset) => preset.id === "white-tx");
const blackPreset = frontFinishGroup.presets.find((preset) => preset.id === "black");
assert.equal(finishes.resolveOverlayOpacity(whitePreset, whitePreset.color), 0.84);
assert.equal(finishes.resolveOverlayOpacity(blackPreset, blackPreset.color), 0.78);
assert.equal(finishes.adaptiveOverlayOpacity("#ffffff"), 0.84);
assert.equal(finishes.adaptiveOverlayOpacity("#000000"), 0.78);
assert.equal(finishes.parseHexColor("invalid"), null);

const defaultVisibleIds = new Set(scene.defaultConfiguration.visible);
const frontFinishTargets = new Set(frontFinishGroup.targets);
for (const entity of scene.entities) {
  assert.equal(defaultVisibleIds.has(entity.id), entity.defaultVisible);
  assert.equal(fs.existsSync(path.join(projectRoot, entity.asset)), true);
  assert.equal(frontFinishTargets.has(entity.id), Boolean(entity.maskAsset));
  if (entity.maskAsset) assert.equal(fs.existsSync(path.join(projectRoot, entity.maskAsset)), true);

  const baselineBounds = technical.files[entity.asset].alphaBounds;
  const expectedBounds = baselineBounds
    ? {
        x: baselineBounds[0],
        y: baselineBounds[1],
        width: baselineBounds[2] - baselineBounds[0],
        height: baselineBounds[3] - baselineBounds[1]
      }
    : null;
  assert.equal(JSON.stringify(entity.alphaBounds), JSON.stringify(expectedBounds));
}

const initialA = core.createInitialState(scene);
const initialB = core.createInitialState(scene);
const initialFingerprint = fingerprints.computeFingerprint(scene, initialA);

assert.equal(fingerprints.computeFingerprint(scene, initialB), initialFingerprint);
assert.equal(visibility.getVisibleEntities(scene, initialA).length, 10);
assert.equal(visibility.resolveVisibility(scene, initialA)["range-freestanding"].reason, "substitution-primary-visible");
assert.equal(visibility.resolveVisibility(scene, initialA)["stone-02"].visible, true);
assert.equal(visibility.resolveVisibility(scene, initialA)["stone-03"].visible, true);

core.setEntityVisibility(initialA, "module-03", false);
assert.equal(visibility.getVisibleEntities(scene, initialA).length, 8);
assert.equal(visibility.resolveVisibility(scene, initialA)["stone-03"].reason, "host-hidden");
assert.notEqual(fingerprints.computeFingerprint(scene, initialA), initialFingerprint);

core.setEntityVisibility(initialA, "module-03", true);
core.setEntityVisibility(initialA, "module-02", false);
const replacementVisibility = visibility.resolveVisibility(scene, initialA);
assert.equal(replacementVisibility["module-02"].reason, "intent-off");
assert.equal(replacementVisibility["stone-02"].reason, "host-hidden");
assert.equal(replacementVisibility["range-freestanding"].visible, true);
assert.equal(visibility.getVisibleEntities(scene, initialA).length, 9);

core.setEntityVisibility(initialA, "module-02", true);
assert.equal(fingerprints.computeFingerprint(scene, initialA), initialFingerprint);

core.setAllControllableVisibility(scene, initialA, false);
assert.equal(visibility.getVisibleControllableEntities(scene, initialA).length, 0);
assert.equal(visibility.resolveVisibility(scene, initialA)["range-freestanding"].visible, true);
core.setAllControllableVisibility(scene, initialA, true);
assert.equal(fingerprints.computeFingerprint(scene, initialA), initialFingerprint);

const decorOrderA = core.createInitialState(scene);
decorOrderA.decorVisibility = { vase: true, board: false };
const decorOrderB = core.createInitialState(scene);
decorOrderB.decorVisibility = { board: false, vase: true };
assert.equal(fingerprints.computeFingerprint(scene, decorOrderA), fingerprints.computeFingerprint(scene, decorOrderB));

const hostedFixture = JSON.parse(JSON.stringify(scene));
hostedFixture.entities.push({
  id: "hosted-test",
  alias: "T",
  label: "Hosted test",
  kind: "decor",
  zIndex: 900,
  asset: "assets/kitchen/substitutions/range-freestanding-placeholder.png",
  maskAsset: null,
  alphaBounds: null,
  defaultVisible: true,
  controllable: false,
  hostId: "module-01",
  finishGroups: [],
  tags: ["fixture"]
});
hostedFixture.defaultConfiguration.visible.push("hosted-test");
assert.deepEqual(Array.from(validation.validateScene(hostedFixture)), []);
const hostedState = core.createInitialState(hostedFixture);
core.setEntityVisibility(hostedState, "module-01", false);
assert.equal(visibility.resolveVisibility(hostedFixture, hostedState)["hosted-test"].reason, "host-hidden");

const cycleFixture = JSON.parse(JSON.stringify(hostedFixture));
cycleFixture.entities.find((entity) => entity.id === "module-01").hostId = "hosted-test";
assert.equal(validation.validateScene(cycleFixture).some((error) => error.code === "host-cycle"), true);

const missingHostFixture = JSON.parse(JSON.stringify(hostedFixture));
missingHostFixture.entities.find((entity) => entity.id === "hosted-test").hostId = "missing-host";
assert.equal(validation.validateScene(missingHostFixture).some((error) => error.code === "host-missing"), true);
assert.equal(visibility.resolveVisibility(missingHostFixture, core.createInitialState(missingHostFixture))["hosted-test"].reason, "host-missing");

const substitutionCycleFixture = JSON.parse(JSON.stringify(scene));
substitutionCycleFixture.substitutionGroups.push({
  id: "cycle-test",
  primaryEntityId: "range-freestanding",
  replacementEntityId: "module-02",
  policy: "replacement-when-primary-hidden"
});
assert.equal(
  validation.validateScene(substitutionCycleFixture).some((error) => error.code === "visibility-cycle"),
  true
);

process.stdout.write(`${JSON.stringify({ passed: true, initialFingerprint, entities: 11, controllableEntities: 8 })}\n`);
