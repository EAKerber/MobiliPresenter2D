"use strict";
const assert = require("node:assert/strict");
const { test } = require("node:test");
const configuration = require("../app/core/configuration.js");
const v5Core = require("../app/core/administration-v5.js");
const flow = require("../app/core/flow-model.js");
const defaults = require("../app/data/configurator-settings.js");
const hierarchyDefaults = require("../app/data/hierarchy-defaults.js");
const catalog = require("../app/data/catalog-data.js");
const priceBook = require("../app/data/mock-price-book.js");
const scene = require("../app/data/scene-data.js");
const { savePublishedV5 } = require("../app/core/v5-normal-save.js");
const publicProjection = require("../app/core/public-module-projection.js");
const runtime = { configuration, v5Core, catalog, priceBook, scene };
function original() {
  const v3 = configuration.createDefaultAdministration(defaults, catalog, priceBook, scene);
  return v5Core.upgrade(v3, configuration, flow, catalog, priceBook, scene, hierarchyDefaults);
}
function store(value) {
  let current = structuredClone(value), etag = '"base"', writes = 0;
  return {
    get writes() { return writes; },
    get current() { return structuredClone(current); },
    async getWithMetadata() { return { data: JSON.stringify(current), etag }; },
    async setJSON(_key, next, options) {
      assert.equal(options.onlyIfMatch, etag);
      current = structuredClone(next); etag = '"next-' + (++writes) + '"';
      return { modified: true, etag };
    }
  };
}
test("V5 accepts absent flag and preserves explicit OFF/ON across normalization", () => {
  const base = original();
  assert.equal(v5Core.validate(base,configuration,catalog,priceBook,scene).length,0);
  assert.equal(Object.hasOwn(v5Core.normalize(base),"viewerPricePublication"),false);
  for (const state of [true,false]) {
    const candidate={...base,viewerPricePublication:{enabled:state}};
    assert.deepEqual(v5Core.validate(candidate,configuration,catalog,priceBook,scene),[]);
    assert.deepEqual(v5Core.normalize(candidate).viewerPricePublication,{enabled:state});
    if (state) assert.notEqual(v5Core.publicationSignature(base),v5Core.publicationSignature(candidate), "ON changes publication authority");
    else assert.equal(v5Core.publicationSignature(base),v5Core.publicationSignature(candidate), "OFF is the legacy default");
  }
  for (const flag of [null,{enabled:1},{enabled:true,debug:true},"yes",[]]) {
    assert.ok(v5Core.validate({...base,viewerPricePublication:flag},configuration,catalog,priceBook,scene).some((e)=>e.includes("viewer price publication")), "reject "+JSON.stringify(flag));
  }
});
test("V5 publish ON then OFF — conditional write, readback and public response", async () => {
  const initial=original(), s=store(initial);
  const enabled={...structuredClone(initial),viewerPricePublication:{enabled:true}};
  const saved=await savePublishedV5({store:s,payload:enabled,runtime});
  assert.equal(saved.ok,true,JSON.stringify(saved));
  assert.equal(s.writes,1);
  assert.equal(s.current.viewerPricePublication.enabled,true);
  const publicOn=publicProjection.project(s.current,catalog,scene);
  assert.equal(publicOn.schemaVersion,publicProjection.PRICED_SCHEMA);
  const expected=priceBook.pricing.roles.itemBase["module-01"].cents;
  assert.equal(publicOn.modules.find(m=>m.id==="module-01").basePriceCents,expected);
  assert.equal(JSON.stringify(publicOn).includes("handleChoiceTotal"),false);
  const disabled={...structuredClone(s.current),viewerPricePublication:{enabled:false}};
  const savedOff=await savePublishedV5({store:s,payload:disabled,runtime});
  assert.equal(savedOff.ok,true,JSON.stringify(savedOff));
  const publicOff=publicProjection.project(s.current,catalog,scene);
  assert.equal(publicOff.schemaVersion,publicProjection.SCHEMA);
  assert.equal(JSON.stringify(publicOff).includes("basePriceCents"),false);
});
test("invalid flag cannot be saved with an otherwise-valid V5 document",async()=>{
 const initial=original(), s=store(initial);
 const payload={...structuredClone(initial),viewerPricePublication:{enabled:"true"}};
 const result=await savePublishedV5({store:s,payload,runtime});
 assert.equal(result.ok,false);
 assert.equal(result.code,"invalid_v5_configuration");
 assert.equal(s.writes,0);
});
