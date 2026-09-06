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
const technical=JSON.parse(fs.readFileSync(path.join(projectRoot,"data/technical-data.json"),"utf8"));
assert.equal(scene.entities.length,13);
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
const fp=fingerprints.computeFingerprint(scene,initial);
assert.equal(visibility.getVisibleEntities(scene,initial).length,12);
assert.equal(visibility.resolveVisibility(scene,initial)["stone-02-joint-bridge"].visible,true);
assert.equal(visibility.resolveVisibility(scene,initial)["stone-03-joint-bridge"].visible,true);
core.setEntityVisibility(initial,"module-03",false);
let r=visibility.resolveVisibility(scene,initial);
assert.equal(r["stone-03"].reason,"host-hidden");
assert.equal(r["stone-02-joint-bridge"].reason,"host-hidden");
assert.equal(r["stone-03-joint-bridge"].reason,"host-hidden");
assert.equal(visibility.getVisibleEntities(scene,initial).length,8);
core.setEntityVisibility(initial,"module-03",true);
core.setEntityVisibility(initial,"module-02",false);
r=visibility.resolveVisibility(scene,initial);
assert.equal(r["stone-02"].reason,"host-hidden");
assert.equal(r["range-freestanding"].visible,true);
assert.equal(r["stone-02-joint-bridge"].reason,"host-hidden");
assert.equal(r["stone-03-joint-bridge"].reason,"host-hidden");
assert.equal(visibility.getVisibleEntities(scene,initial).length,9);
process.stdout.write(`${JSON.stringify({passed:true,initialFingerprint:fp,entities:13,controllableEntities:8})}\n`);
