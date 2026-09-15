const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const projectRoot = path.resolve(__dirname, "..");
const sandbox = { window: {} };
vm.createContext(sandbox);
for (const relativePath of ["data/scene-data.js","data/mask-data.js","core/state.js","core/visibility.js","core/validation.js","core/fingerprint.js","core/finishes.js"]) {
  vm.runInContext(fs.readFileSync(path.join(projectRoot, relativePath), "utf8"), sandbox, { filename: relativePath });
}
const scene=sandbox.window.CASA_EM_MODULOS_SCENE;
const masks=sandbox.window.CASA_EM_MODULOS_MASK_DATA;
const core=sandbox.window.CasaModulesCore;
const visibility=sandbox.window.CasaModulesVisibility;
const validation=sandbox.window.CasaModulesValidation;
const fingerprints=sandbox.window.CasaModulesFingerprint;
const finishes=sandbox.window.CasaModulesFinishes;
const technical=JSON.parse(fs.readFileSync(path.join(projectRoot,"data/technical-data.json"),"utf8"));
assert.equal(scene.entities.length,17);
assert.deepEqual(Array.from(validation.validateScene(scene)),[]);
for (const entity of scene.entities) {
  assert.equal(fs.existsSync(path.join(projectRoot,entity.asset)),true,entity.asset);
  if(entity.maskAsset){
    assert.equal(fs.existsSync(path.join(projectRoot,entity.maskAsset)),true);
    assert.equal(typeof masks[entity.maskAsset],"string");
  }
  for (const variant of entity.finishMaskVariants || []) {
    assert.equal(fs.existsSync(path.join(projectRoot,variant.maskAsset)),true,variant.maskAsset);
    assert.equal(typeof masks[variant.maskAsset],"string");
    if (variant.sourceBridgeMaskAsset) {
      assert.equal(fs.existsSync(path.join(projectRoot,variant.sourceBridgeMaskAsset)),true,variant.sourceBridgeMaskAsset);
      assert.equal(typeof masks[variant.sourceBridgeMaskAsset],"string");
    }
  }
  const b=technical.files[entity.asset]?.alphaBounds ?? null;
  const expected=b?{x:b[0],y:b[1],width:b[2]-b[0],height:b[3]-b[1]}:null;
  assert.equal(JSON.stringify(entity.alphaBounds),JSON.stringify(expected),entity.id);
}
const occlusionProbeScene = {
  entities: [
    { id: "probe-host", zIndex: 1, asset: "host.png", defaultVisible: true },
    { id: "probe-occluder", zIndex: 2, asset: "occluder.png", defaultVisible: true },
    {
      id: "probe-exposed-face",
      zIndex: 3,
      asset: "face.png",
      defaultVisible: true,
      hostId: "probe-host",
      occludedByIds: ["probe-occluder"]
    }
  ],
  defaultConfiguration: { visible: ["probe-host", "probe-occluder", "probe-exposed-face"] },
  substitutionGroups: [],
  finishGroups: []
};
assert.deepEqual(Array.from(validation.validateScene(occlusionProbeScene)), []);
const occlusionProbeState = {
  visibilityByEntity: {
    "probe-host": true,
    "probe-occluder": true,
    "probe-exposed-face": true
  }
};
let probeVisibility = visibility.resolveVisibility(occlusionProbeScene, occlusionProbeState);
assert.equal(probeVisibility["probe-exposed-face"].reason, "occluded");
occlusionProbeState.visibilityByEntity["probe-occluder"] = false;
probeVisibility = visibility.resolveVisibility(occlusionProbeScene, occlusionProbeState);
assert.equal(probeVisibility["probe-exposed-face"].reason, "visible");
occlusionProbeState.visibilityByEntity["probe-host"] = false;
probeVisibility = visibility.resolveVisibility(occlusionProbeScene, occlusionProbeState);
assert.equal(probeVisibility["probe-exposed-face"].reason, "host-hidden");
const invalidOcclusionProbeScene = {
  ...occlusionProbeScene,
  entities: occlusionProbeScene.entities.map((entity) =>
    entity.id === "probe-exposed-face" ? { ...entity, occludedByIds: ["missing-neighbor"] } : entity
  )
};
assert.equal(
  Array.from(validation.validateScene(invalidOcclusionProbeScene)).some((error) => error.code === "occluder-missing"),
  true
);
const initial=core.createInitialState(scene);
assert.equal(visibility.resolveVisibility(scene,initial)["faucet-approved"].visible,true);
const fp=fingerprints.computeFingerprint(scene,initial);
assert.equal(visibility.getVisibleEntities(scene,initial).length,15);
assert.equal(visibility.resolveVisibility(scene,initial)["stone-02-joint-bridge"].visible,true);
assert.equal(visibility.resolveVisibility(scene,initial)["stone-03-joint-bridge"].visible,true);
assert.deepEqual(Array.from(scene.entities.find((entity)=>entity.id==="stone-02-joint-bridge").hostIds),["module-02","module-03"]);
assert.deepEqual(Array.from(scene.entities.find((entity)=>entity.id==="stone-03-joint-bridge").hostIds),["module-02","module-03"]);
assert.equal(visibility.resolveVisibility(scene,initial)["module-02-right-exposed-face"].reason,"occluded");
const module04=scene.entities.find((entity)=>entity.id==="module-04");
let finishVisibility=visibility.resolveVisibility(scene,initial);
assert.equal(finishes.resolveMaskAsset(module04,finishVisibility),"assets/kitchen/masks/04-with-06-seam.png");
core.setEntityVisibility(initial,"module-06",false);
finishVisibility=visibility.resolveVisibility(scene,initial);
assert.equal(finishes.resolveMaskAsset(module04,finishVisibility),"assets/kitchen/masks/04.png");
core.setEntityVisibility(initial,"module-06",true);
assert.equal(finishes.resolveMaskAsset(module04,visibility.resolveVisibility(scene,initial)),"assets/kitchen/masks/04-with-06-seam.png");
core.setEntityVisibility(initial,"module-03",false);
let r=visibility.resolveVisibility(scene,initial);
assert.equal(r["faucet-approved"].reason,"host-hidden");
assert.equal(r["stone-03"].reason,"host-hidden");
assert.equal(r["stone-02-joint-bridge"].reason,"host-hidden");
assert.equal(r["stone-03-joint-bridge"].reason,"host-hidden");
assert.equal(r["module-02-right-exposed-face"].reason,"visible");
assert.equal(visibility.getVisibleEntities(scene,initial).length,10);
core.setEntityVisibility(initial,"module-03",true);
core.setEntityVisibility(initial,"module-02",false);
r=visibility.resolveVisibility(scene,initial);
assert.equal(r["stone-02"].reason,"host-hidden");
assert.equal(r["range-freestanding"].visible,true);
assert.equal(r["stone-02-joint-bridge"].reason,"host-hidden");
assert.equal(r["stone-03-joint-bridge"].reason,"host-hidden");
assert.equal(r["module-02-right-exposed-face"].reason,"host-hidden");
assert.equal(visibility.getVisibleEntities(scene,initial).length,11);
process.stdout.write(`${JSON.stringify({passed:true,initialFingerprint:fp,entities:17,controllableEntities:8})}\n`);
