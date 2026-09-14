const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const projectRoot = path.resolve(__dirname, "..");
const sandbox = { window: {} };
vm.createContext(sandbox);
for (const relativePath of ["data/scene-data.js","data/mask-data.js","core/state.js","core/visibility.js","core/validation.js","core/fingerprint.js","core/finishes.js","core/stone.js"]) {
  vm.runInContext(fs.readFileSync(path.join(projectRoot, relativePath), "utf8"), sandbox, { filename: relativePath });
}
const scene=sandbox.window.CASA_EM_MODULOS_SCENE;
const masks=sandbox.window.CASA_EM_MODULOS_MASK_DATA;
const core=sandbox.window.CasaModulesCore;
const visibility=sandbox.window.CasaModulesVisibility;
const validation=sandbox.window.CasaModulesValidation;
const fingerprints=sandbox.window.CasaModulesFingerprint;
const stone=sandbox.window.CasaStone;
const technical=JSON.parse(fs.readFileSync(path.join(projectRoot,"data/technical-data.json"),"utf8"));
assert.equal(scene.entities.length,16);
assert.deepEqual(Array.from(validation.validateScene(scene)),[]);
for (const entity of scene.entities) {
  assert.equal(fs.existsSync(path.join(projectRoot,entity.asset)),true,entity.asset);
  if(entity.maskAsset){
    assert.equal(fs.existsSync(path.join(projectRoot,entity.maskAsset)),true);
    assert.equal(typeof masks[entity.maskAsset],"string");
  }
  const b=technical.files[entity.asset]?.alphaBounds ?? null;
  const expected=b?{x:b[0],y:b[1],width:b[2]-b[0],height:b[3]-b[1]}:null;
  assert.equal(JSON.stringify(entity.alphaBounds),JSON.stringify(expected),entity.id);
}
const initial=core.createInitialState(scene);
assert.equal(visibility.resolveVisibility(scene,initial)["faucet-approved"].visible,true);
const fp=fingerprints.computeFingerprint(scene,initial);
assert.equal(visibility.getVisibleEntities(scene,initial).length,15);
assert.equal(visibility.resolveVisibility(scene,initial)["stone-02-joint-bridge"].visible,true);
assert.equal(visibility.resolveVisibility(scene,initial)["stone-03-joint-bridge"].visible,true);
const bridgeEntities=scene.entities.filter(entity=>entity.kind==="stone-joint");
assert.deepEqual(Array.from(stone.visibleBridgeAssets(initial,bridgeEntities)),[
  "assets/kitchen/bridges/stone-02-joint-bridge.png",
  "assets/kitchen/bridges/stone-03-joint-bridge.png"
]);
core.setEntityVisibility(initial,"module-03",false);
let r=visibility.resolveVisibility(scene,initial);
assert.equal(r["faucet-approved"].reason,"host-hidden");
assert.equal(r["stone-03"].reason,"host-hidden");
assert.equal(r["stone-02-joint-bridge"].reason,"visible");
assert.equal(r["stone-03-joint-bridge"].reason,"host-hidden");
assert.deepEqual(Array.from(stone.visibleBridgeAssets(initial,bridgeEntities)),[
  "assets/kitchen/bridges/stone-02-joint-bridge.png"
]);
assert.equal(visibility.getVisibleEntities(scene,initial).length,10);
core.setEntityVisibility(initial,"module-03",true);
core.setEntityVisibility(initial,"module-02",false);
r=visibility.resolveVisibility(scene,initial);
assert.equal(r["stone-02"].reason,"host-hidden");
assert.equal(r["range-freestanding"].visible,true);
assert.equal(r["stone-02-joint-bridge"].reason,"host-hidden");
assert.equal(r["stone-03-joint-bridge"].reason,"visible");
assert.deepEqual(Array.from(stone.visibleBridgeAssets(initial,bridgeEntities)),[
  "assets/kitchen/bridges/stone-03-joint-bridge.png"
]);
assert.equal(visibility.getVisibleEntities(scene,initial).length,12);
const patched=new Uint8ClampedArray([0,0,0,0,11,22,33,44]);
const mask=new Uint8ClampedArray([0,0,0,255,255,255,255,255]);
const bridge=new Uint8ClampedArray([180,160,140,255,180,160,140,255]);
stone.patchUncoveredBridge(patched,mask,bridge,"#34383d");
assert(patched[3]>0,"uncovered bridge pixel must be recolored");
assert.deepEqual(Array.from(patched.slice(4,8)),[11,22,33,44],"existing material coverage must not be painted twice");
process.stdout.write(`${JSON.stringify({passed:true,initialFingerprint:fp,entities:16,controllableEntities:8,stoneBridgeCoverage:true})}\n`);
