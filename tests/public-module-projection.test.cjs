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
    stages: [{
      id: "modules-renamed", kind: "modules", enabled: true,
      groups: [{ sections: [{ itemIds: ids }] }]
    }]
  };
}
test("CP-PUBLIC-02a: all seven source-backed public modules in published order", () => {
  const result = project(published(), catalog, scene);
  assert.equal(result.schemaVersion, SCHEMA);
  assert.deepEqual(result.modules.map((entry) => entry.id), catalog.modules.map((item) => item.entityId));
  assert.equal(result.modules.length, 7);
  assert.equal(result.modules[2].title, catalog.modules[2].title);
  assert.equal(result.modules[2].dimensionLabel, catalog.modules[2].dimensions.display);
  assert.ok(result.modules[2].components.length);
});
test("CP-PUBLIC-02a: explicit shape excludes administration, pricing and unsanctioned extras", () => {
  const modified = structuredClone(catalog);
  modified.modules[0].price = 1234;
  modified.modules[0].privateToken = "secret-extra";
  modified.modules[0].publicPresentation = { description: "unapproved" };
  const result = project(published(), modified, scene);
  for (const item of result.modules) {
    assert.ok(Object.keys(item).every((key) => [
      "id", "referenceLabel", "title", "category", "dimensionLabel",
      "benefits", "components", "requirements"
    ].includes(key)));
  }
  const wire = JSON.stringify(result);
  for (const secret of ["pricing", "price", "etag", "draft", "revision", "secret", "unapproved", "publicPresentation", "commercial", "geometryMm"]) {
    assert.ok(!wire.includes(secret), secret);
  }
});
test("CP-PUBLIC-02a: published membership controls omission and order", () => {
  const result = project(published(["module-07", "module-02"]), catalog, scene);
  assert.deepEqual(result.modules.map((item) => item.id), ["module-07", "module-02"]);
});
test("CP-PUBLIC-02a: invalid/missing/disabled publication fails closed", () => {
  assert.throws(() => project(null, catalog, scene));
  assert.throws(() => project({ ...published(), schemaVersion: "ConfiguratorAdministration2D 3.0" }, catalog, scene));
  assert.throws(() => project(published(["module-99"]), catalog, scene));
  assert.throws(() => project(published(["module-01", "module-01"]), catalog, scene));
  assert.throws(() => project(published([]), catalog, scene));
  const disabled = published();
  disabled.stages[0].enabled = false;
  assert.throws(() => project(disabled, catalog, scene));
});
test("CP-PUBLIC-02a: missing optional editorial data stays absent", () => {
  const modified = structuredClone(catalog);
  modified.modules[0].benefits = [];
  modified.modules[0].requirements = [];
  modified.modules[0].title = null;
  const item = project(published(["module-01"]), modified, scene).modules[0];
  assert.equal(Object.hasOwn(item, "title"), false);
  assert.equal(Object.hasOwn(item, "benefits"), false);
  assert.equal(Object.hasOwn(item, "requirements"), false);
  assert.equal(Object.hasOwn(item, "summary"), false);
});
