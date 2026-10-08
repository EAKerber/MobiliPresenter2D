"use strict";

// Explicitly temporary CP-PUBLIC-02c preview fixture. NEVER writes to a
// site-wide Blob; Netlify deploys the generated file into getDeployStore.
const fs = require("node:fs");
const path = require("node:path");
const PREVIEW_BRANCH = "work/cp-public-02c-integrated-preview-20261008";
const PREVIEW_HOST = "deploy-preview-180--mobilipresenter2d.netlify.app";
const PREVIEW_REVIEW_ID = "180";

function shouldSeed(e) {
  try {
    const origin = new URL(e.DEPLOY_PRIME_URL || "");
    return e.NETLIFY === "true"
      && e.CONTEXT === "deploy-preview"
      // Netlify's BRANCH can be the synthetic Deploy Preview ref.
      // REVIEW_ID plus the canonical preview host identify PR #180 exactly.
      && e.REVIEW_ID === PREVIEW_REVIEW_ID
      && origin.protocol === "https:"
      && origin.hostname === PREVIEW_HOST;
  } catch { return false; }
}

function createFixture() {
  const configuration = require("../app/core/configuration.js");
  const administrationV5 = require("../app/core/administration-v5.js");
  const flow = require("../app/core/flow-model.js");
  const defaults = require("../app/data/configurator-settings.js");
  const hierarchyDefaults = require("../app/data/hierarchy-defaults.js");
  const catalog = require("../app/data/catalog-data.js");
  const priceBook = require("../app/data/mock-price-book.js");
  const scene = require("../app/data/scene-data.js");

  const v3 = configuration.normalizeConfiguratorSettings(
    configuration.createDefaultAdministration(defaults, catalog, priceBook, scene),
    catalog, priceBook, scene
  );
  const v5 = administrationV5.upgrade(v3, configuration, flow, catalog, priceBook, scene, hierarchyDefaults);
  // The sentinel confirms the browser did not render copied static editorial data.
  v5.objects["module-01"].title = "Módulo 01 — homologação PR 180";
  v5.objects["module-01"].benefits = ["Destaque exclusivo do preview 180", "Informações fictícias para homologação"];
  const errors = administrationV5.validate(v5, configuration, catalog, priceBook, scene);
  if (errors.length) throw new Error("Invalid isolated preview v5 fixture: " + errors.join("; "));
  return v5;
}

function seed(e = process.env) {
  // A temporary public diagnostic exposes only boolean checks, never the
  // environment variable values, tokens, or private publication data.
  const permitted = shouldSeed(e);
  const diagnostic = {
    netlify: e.NETLIFY === "true",
    preview: e.CONTEXT === "deploy-preview",
    branch: e.BRANCH === PREVIEW_BRANCH,
    review: e.REVIEW_ID === PREVIEW_REVIEW_ID,
    primeUrl: (() => { try {
      const u = new URL(e.DEPLOY_PRIME_URL || "");
      return u.protocol === "https:" && u.hostname === PREVIEW_HOST;
    } catch { return false; } })(),
    prepared: false
  };
  if (permitted) {
    const fixture = createFixture();
    const destination = path.join(__dirname, "..", ".netlify", "blobs", "deploy",
      "configurator-settings", "published");
    fs.mkdirSync(path.dirname(destination), { recursive: true });
    fs.writeFileSync(destination, JSON.stringify(fixture), { flag: "wx", mode: 0o600 });
    diagnostic.prepared = fs.statSync(destination).size > 0;
    console.log("CP-PUBLIC-02c preview-only v5 fixture prepared for Netlify deploy-scoped Blob.");
  } else console.log("CP-PUBLIC-02c preview v5 fixture disabled outside isolated PR #180.");
  const output = path.join(__dirname, "..", "app", "__cp-public-02c-seed-checks.json");
  fs.writeFileSync(output, JSON.stringify(diagnostic));
  return permitted;
}
if (require.main === module) seed();
module.exports = Object.freeze({ shouldSeed, createFixture, seed });
