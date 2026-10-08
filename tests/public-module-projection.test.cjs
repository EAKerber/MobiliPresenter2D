"use strict";
const assert = require("node:assert/strict");
const { test } = require("node:test");
const { project, SCHEMA } = require("../app/core/public-module-projection.js");
const catalog = require("../app/data/catalog-data.js");
const scene = require("../app/data/scene-data.js");

function published(ids = catalog.modules.map((item) => item.entityId)) {
  return {
    schemaVersion: "ConfiguratorAdministration2D 5.0",
    revision: 7,
    pricing: { secret: "must-not-leak" },
    etag: "private-etag",
    draft: { secret: true },
    finishes: catalog.options.finishes.map((finish) => ({
      id: finish.id, enabled: finish.status === "published", scope: "global"
    })),
    initialState: {
      entities: Object.fromEntries(catalog.modules.map((item) => [item.entityId, true])),
      finishId: "base-light",
      privateSession: "must-not-leak"
    },
    objects: Object.fromEntries(catalog.modules.map((item) => [item.entityId, {
      title: item.title, description: "",
      benefits: [...item.benefits], components: [...item.components], requirements: [...item.requirements]
    }])),
    stages: [{
      id: "modules-renamed", kind: "modules", enabled: true,
      groups: [{ sections: [{ itemIds: ids }] }]
    }]
  };
}
test("CP-PUBLIC-02a: all seven public modules in published order", () => {
  const source = published();
  source.objects["module-03"].title = "Título publicado";
  source.objects["module-03"].description = "Descrição publicada";
  source.objects["module-03"].benefits = ["Destaque A", "Destaque B"];
  const result = project(source, catalog, scene);
  assert.equal(result.schemaVersion, SCHEMA);
  assert.deepEqual(result.modules.map((entry) => entry.id), catalog.modules.map((item) => item.entityId));
  assert.equal(result.modules.length, 7);
  assert.equal(result.modules[2].title, "Título publicado");
  assert.equal(result.modules[2].description, "Descrição publicada");
  assert.deepEqual(result.modules[2].benefits, ["Destaque A", "Destaque B"]);
  assert.equal(result.modules[2].dimensionLabel, catalog.modules[2].dimensions.display);
  assert.equal(result.publicState.finishId, "base-light");
  assert.deepEqual(result.publicState.availableFinishIds, catalog.options.finishes.map((f) => f.id));
  assert.deepEqual(Object.keys(result.publicState.entities), catalog.modules.map((m) => m.entityId));
  assert.ok(result.modules[2].components.length);
});
test("CP-PUBLIC-02a: allowlist excludes pricing, private state and donor fields", () => {
  const modified = structuredClone(catalog);
  modified.modules[0].price = 1234;
  modified.modules[0].privateToken = "secret-extra";
  modified.modules[0].publicPresentation = { description: "unapproved" };
  const source = published();
  source.objects["module-01"].privateToken = "private-object-value";
  source.objects["module-01"].publicPresentation = { carcass: "unapproved" };
  const result = project(source, modified, scene);
  for (const item of result.modules) {
    assert.ok(Object.keys(item).every((key) => [
      "id", "referenceLabel", "title", "description", "category", "dimensionLabel",
      "benefits", "components", "requirements"
    ].includes(key)));
  }
  const wire = JSON.stringify(result);
  for (const secret of ["pricing", "price", "etag", "draft", "revision", "secret", "unapproved", "publicPresentation", "commercial", "geometryMm", "privateSession"]) {
    assert.ok(!wire.includes(secret), secret);
  }
});
test("CP-PUBLIC-02a: published membership controls omissions and order", () => {
  const result = project(published(["module-07", "module-02"]), catalog, scene);
  assert.deepEqual(result.modules.map((item) => item.id), ["module-07", "module-02"]);
});
test("CP-PUBLIC-02a: invalid sources and foreign memberships fail closed", () => {
  assert.throws(() => project(null, catalog, scene));
  assert.throws(() => project({ ...published(), schemaVersion: "ConfiguratorAdministration2D 3.0" }, catalog, scene));
  assert.throws(() => project(published(["module-99"]), catalog, scene));
  assert.throws(() => project(published(["lighting-08"]), catalog, scene));
  assert.throws(() => project(published(["module-01", "module-01"]), catalog, scene));
  assert.throws(() => project(published([]), catalog, scene));
  const disabled = published(); disabled.stages[0].enabled = false;
  assert.throws(() => project(disabled, catalog, scene));
  const missingObject = published(); delete missingObject.objects["module-01"];
  assert.throws(() => project(missingObject, catalog, scene));
  const invalidList = published(); invalidList.objects["module-01"].components = null;
  assert.throws(() => project(invalidList, catalog, scene));
});
test("CP-PUBLIC-02a: blank description and lists are omitted without fallback", () => {
  const source = published(["module-01"]);
  source.objects["module-01"].benefits = [];
  source.objects["module-01"].components = ["", "   "];
  source.objects["module-01"].requirements = [];
  const item = project(source, catalog, scene).modules[0];
  for (const key of ["description", "benefits", "components", "requirements", "summary", "carcass"]) {
    assert.equal(Object.hasOwn(item, key), false, key);
  }
});

test("CP-PUBLIC-02a: visible-state subset and selected finish come from publication", () => {
  const source = published(["module-07", "module-03"]);
  source.initialState.entities["module-07"] = false;
  source.initialState.finishId = "cocoa";
  const result = project(source, catalog, scene);
  assert.deepEqual(Object.keys(result.publicState.entities), ["module-07", "module-03"]);
  assert.equal(result.publicState.entities["module-07"], false);
  assert.equal(result.publicState.finishId, "cocoa");
  assert.equal(result.publicState.availableFinishIds.includes("cocoa"), true);
  source.finishes.find((finish) => finish.id === "cocoa").enabled = false;
  assert.throws(() => project(source, catalog, scene), /published initial finish/);
  source.finishes.find((finish) => finish.id === "cocoa").enabled = true;
  assert.throws(() => project({ ...source, initialState: null }, catalog, scene));
  source.initialState.entities["module-03"] = undefined;
  assert.throws(() => project(source, catalog, scene), /missing published module visibility/);
});
