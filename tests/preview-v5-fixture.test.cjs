"use strict";
const assert = require("node:assert/strict");
const { shouldSeed, createFixture } = require("../scripts/seed-public-preview-v5.cjs");
const { project } = require("../app/core/public-module-projection.js");
const catalog = require("../app/data/catalog-data.js");
const scene = require("../app/data/scene-data.js");

const allowed = {
  NETLIFY: "true", CONTEXT: "deploy-preview",
  BRANCH: "work/cp-public-02c-integrated-preview-20261008",
  REVIEW_ID: "180",
  DEPLOY_PRIME_URL: "https://deploy-preview-180--mobilipresenter2d.netlify.app"
};
assert.equal(shouldSeed(allowed), true);
assert.equal(shouldSeed({ ...allowed, BRANCH: "synthetic-deploy-preview-ref" }), true,
  "Netlify BRANCH may be a synthetic checkout ref, while REVIEW_ID + preview host identify the PR");
for (const override of [
  { CONTEXT: "production" }, { NETLIFY: "false" },
  { REVIEW_ID: "179" },
  { DEPLOY_PRIME_URL: "https://casaemmodulos.casa" },
  { DEPLOY_PRIME_URL: "https://deploy-preview-180--evil.example" },
  { DEPLOY_PRIME_URL: "not-a-url" }
]) {
  assert.equal(shouldSeed({ ...allowed, ...override }), false);
}
const fixture = createFixture();
assert.equal(fixture.schemaVersion, "ConfiguratorAdministration2D 5.0");
assert.match(fixture.objects["module-01"].title, /homologação PR 180/);
const projection = project(fixture, catalog, scene);
assert.equal(projection.schemaVersion, "PublicModulePresentation2D 0.1");
assert(projection.modules.some((mod) => mod.title === "Módulo 01 — homologação PR 180"));
assert.deepEqual(projection.modules[0].benefits,
  ["Destaque exclusivo do preview 180", "Informações fictícias para homologação"]);
assert.equal(JSON.stringify(projection).includes("pricing"), false);
console.log("CP-PUBLIC-02c deploy-scoped preview fixture guard + projection: PASS");
