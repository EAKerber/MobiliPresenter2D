"use strict";
const assert = require("node:assert/strict");
const { test } = require("node:test");
const { project, SCHEMA, PRICED_SCHEMA } = require("../app/core/public-module-projection.js");
const catalog = require("../app/data/catalog-data.js");
const scene = require("../app/data/scene-data.js");

function fixture() {
  const ids = catalog.modules.map((m) => m.entityId);
  const finishing = catalog.options.finishes;
  return {
    schemaVersion: "ConfiguratorAdministration2D 5.0",
    stages: [{ kind: "modules", enabled: true, groups: [{ sections: [{ itemIds: ids }] }] }],
    objects: Object.fromEntries(catalog.modules.map((m) => [m.entityId, {
      title: m.title, description: "", benefits: [], components: [], requirements: []
    }])),
    moduleDimensions: Object.fromEntries(catalog.modules.map((m) => [m.entityId, m.dimensions.nominalMm])),
    initialState: {
      entities: Object.fromEntries(ids.map((id) => [id, true])),
      viewerEntities: Object.fromEntries(ids.map((id) => [id, true])),
      finishId: finishing[0].id
    },
    materialGroups: [{ id: "fronts-all", materialIds: finishing.map((f) => f.id) }],
    finishes: finishing.map((f) => ({ id: f.id, enabled: f.status === "published", scope: "global" })),
    materials: finishing.map((f) => ({
      id: f.id, label: f.publicLabel, kind: f.textureAsset ? "texture" : "color",
      color: f.color, textureAsset: f.textureAsset || "", textureSize: f.textureSize || "cover"
    })),
    pricing: { secret: "private-marker", roles: {
      itemBase: Object.fromEntries(ids.map((id,i) => [id, { type: "amount", cents: 10000 + i * 1000 }])),
      globalAdjustment: { secret: { cents: 12345 } }
    }}
  };
}
function serialized(value) { return JSON.stringify(project(value, catalog, scene)); }

test("legacy absence and explicit OFF return 0.1, no price, no flag, no private data", () => {
  const f = fixture();
  for (const permission of [undefined, { enabled: false }]) {
    if (permission !== undefined) f.viewerPricePublication = permission;
    const result = project(f, catalog, scene);
    assert.equal(result.schemaVersion, SCHEMA);
    assert.equal(result.modules.length, catalog.modules.length);
    const wire = JSON.stringify(result);
    for (const forbidden of ["basePriceCents", "pricing", "private-marker", "globalAdjustment", "viewerPricePublication", "secret"])
      assert.equal(wire.includes(forbidden), false, forbidden);
  }
});
test("ON returns only positive amount cents for visible published modules in 0.2", () => {
  const f = fixture(); f.viewerPricePublication = { enabled: true };
  f.pricing.roles.itemBase["module-01"].cents = 45200;
  f.pricing.roles.itemBase["module-02"].cents = 0;
  f.pricing.roles.itemBase["module-03"] = { type: "percentage", bps: 800 };
  f.initialState.viewerEntities["module-04"] = false;
  f.pricing.roles.itemBase["module-05"] = { type: "amount", cents: 100000001 };
  delete f.pricing.roles.itemBase["module-06"];
  const result = project(f, catalog, scene);
  assert.equal(result.schemaVersion, PRICED_SCHEMA);
  assert.equal(result.modules[0].basePriceCents, 45200);
  for (const id of ["module-02", "module-03", "module-04", "module-05", "module-06"])
    assert.equal(Object.hasOwn(result.modules.find((m) => m.id === id), "basePriceCents"), false, id);
  assert.equal(result.modules.find((m) => m.id === "module-07").basePriceCents, 16000);
  assert.equal(serialized(f).includes("private-marker"), false);
});
test("disabling and republishing revokes all projected prices", () => {
  const f = fixture(); f.viewerPricePublication = { enabled: true };
  assert.equal(project(f, catalog, scene).schemaVersion, PRICED_SCHEMA);
  f.viewerPricePublication.enabled = false;
  assert.equal(project(f, catalog, scene).schemaVersion, SCHEMA);
  assert.equal(serialized(f).includes("basePriceCents"), false);
});
test("invalid authorization shapes fail closed", () => {
  for (const viewerPricePublication of [true, null, { enabled: "true" }, { enabled: true, debug: true }, []]) {
    assert.throws(() => project({ ...fixture(), viewerPricePublication }, catalog, scene), /invalid viewer price/);
  }
});
test("unknown membership and disabled modules stage do not expose prices", () => {
  const f = fixture(); f.viewerPricePublication = { enabled: true };
  f.stages[0].groups[0].sections[0].itemIds = ["module-99"];
  assert.throws(() => project(f, catalog, scene));
  const g = fixture(); g.viewerPricePublication = { enabled: true }; g.stages[0].enabled = false;
  assert.throws(() => project(g, catalog, scene));
});
