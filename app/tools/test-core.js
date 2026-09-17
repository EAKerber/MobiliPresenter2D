const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const projectRoot = path.resolve(__dirname, "..");
const sandbox = { window: {} };
vm.createContext(sandbox);
for (const relativePath of ["data/scene-data.js","data/catalog-data.js","data/mock-price-book.js","data/mask-data.js","core/state.js","core/visibility.js","core/validation.js","core/fingerprint.js","core/finishes.js","core/pricing.js"]) {
  vm.runInContext(fs.readFileSync(path.join(projectRoot, relativePath), "utf8"), sandbox, { filename: relativePath });
}
const scene=sandbox.window.CASA_EM_MODULOS_SCENE;
const masks=sandbox.window.CASA_EM_MODULOS_MASK_DATA;
const core=sandbox.window.CasaModulesCore;
const visibility=sandbox.window.CasaModulesVisibility;
const validation=sandbox.window.CasaModulesValidation;
const fingerprints=sandbox.window.CasaModulesFingerprint;
const finishes=sandbox.window.CasaModulesFinishes;
const catalog=sandbox.window.CASA_EM_MODULOS_CATALOG;
const demoPriceBook=sandbox.window.CASA_EM_MODULOS_PRICE_BOOK;
const pricing=sandbox.window.CasaModulesPricing;
const technical=JSON.parse(fs.readFileSync(path.join(projectRoot,"data/technical-data.json"),"utf8"));
assert.equal(scene.entities.length,17);
assert.deepEqual(Array.from(validation.validateScene(scene)),[]);
assert.equal(catalog.modules.length,7);
assert.equal(catalog.technicalSource.rawSourceAvailability,"profile-only-in-this-checkout");
assert.equal(catalog.modules[2].frontLayout.status,"confirmed");
assert.equal(catalog.modules[2].frontLayout.innerWidthMm,1190);
assert.deepEqual(Array.from(catalog.modules[2].frontLayout.segments.map((segment)=>segment.spanMm)),[390,400,400]);
assert.equal(catalog.modules[3].drawingSpec.kind,"panel");
assert.equal(catalog.modules[3].drawingSpec.thicknessMm,18);
for (const product of catalog.modules) {
  const entity=scene.entities.find((candidate)=>candidate.id===product.entityId);
  assert.equal(entity?.kind,"module",product.entityId);
  assert.equal(entity?.controllable,true,product.entityId);
  assert.equal(product.dimensions.displayPolicy,"nominal",product.entityId);
  assert.equal(product.dimensions.evidence.some((entry)=>entry.source==="promob-dxf" && entry.status==="confirmed"),true,product.entityId);
}
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
core.setEntityVisibility(initial,"module-04",false);
let dependencyVisibility=visibility.resolveVisibility(scene,initial);
assert.equal(dependencyVisibility["module-07"].visible,true);
assert.equal(dependencyVisibility["lighting-08"].reason,"requirement-hidden");
core.setEntityVisibility(initial,"module-04",true);
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
const unavailableEstimate=pricing.calculatePublicEstimate(scene,initial,catalog,visibility.resolveVisibility(scene,initial));
assert.equal(unavailableEstimate.status,"unavailable");
assert.equal(demoPriceBook.mode,"demo");
assert.equal(Object.keys(demoPriceBook.entries).length,8);
assert.match(demoPriceBook.disclaimer,/Não são orçamento/);
assert.equal(demoPriceBook.compositionBaseReferenceCents,300000);
assert.equal(demoPriceBook.entries["module-01"],47980);
assert.equal(demoPriceBook.entries["module-07"],37980);
assert.equal(demoPriceBook.handleEntries["tango-chrome"],17985);
assert.equal(demoPriceBook.handleEntries.ponto,14985);
assert.equal(demoPriceBook.handleEntries["alca-colors"],32850);
assert.equal(catalog.services.length,1);
assert.equal(catalog.services[0].id,"base-stone");
assert.equal(catalog.services[0].status,"included");
const pricedEstimate=pricing.calculatePublicEstimate(scene,initial,catalog,visibility.resolveVisibility(scene,initial),demoPriceBook);
assert.equal(pricedEstimate.status,"demo");
assert.equal(pricedEstimate.totalCents,403780);
assert.equal(pricedEstimate.breakdown.moduleCents,313880);
assert.equal(pricedEstimate.breakdown.accessoryCents,89900);
assert.equal(pricedEstimate.breakdown.handleCents,0);
assert.equal(pricedEstimate.adjustments.totalCents,0);
const demoInitial=core.createInitialState(scene);
const demoFullEstimate=pricing.calculatePublicEstimate(scene,demoInitial,catalog,visibility.resolveVisibility(scene,demoInitial),demoPriceBook);
assert.equal(demoFullEstimate.totalCents,473760);
assert.equal(demoFullEstimate.breakdown.moduleCents,383860);
assert.equal(demoFullEstimate.breakdown.accessoryCents,89900);
demoInitial.handlePresetId="ponto";
const demoPontoEstimate=pricing.calculatePublicEstimate(scene,demoInitial,catalog,visibility.resolveVisibility(scene,demoInitial),demoPriceBook);
assert.equal(demoPontoEstimate.totalCents,563670);
assert.equal(demoPontoEstimate.breakdown.handleCents,89910);
assert.equal(pricing.itemEstimate(catalog.modules[3],catalog,demoInitial,demoPriceBook).handleCents,0);
demoInitial.handlePresetId="none";
core.setEntityVisibility(demoInitial,"module-01",false);
const demoWithoutLaundryEstimate=pricing.calculatePublicEstimate(scene,demoInitial,catalog,visibility.resolveVisibility(scene,demoInitial),demoPriceBook);
assert.equal(demoWithoutLaundryEstimate.totalCents,425780);
process.stdout.write(`${JSON.stringify({passed:true,initialFingerprint:fp,entities:17,controllableEntities:8})}\n`);
