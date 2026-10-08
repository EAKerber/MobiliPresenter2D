"use strict";
// Temporary CP-PUBLIC-02c build-only fixture writer. Never serves writes over HTTP.
// getDeployStore() is scoped by Netlify to the exact deploy and cannot mutate
// the site-wide published configuration used by production.
const fs = require("node:fs");
const path = require("node:path");
const { shouldSeed, createFixture } = require("../../../scripts/seed-public-preview-v5.cjs");

module.exports = {
  onPostBuild: async () => {
    const env = process.env;
    const checks = {
      netlify: env.NETLIFY === "true",
      preview: env.CONTEXT === "deploy-preview",
      branch: env.BRANCH === "work/cp-public-02c-integrated-preview-20261008",
      review: env.REVIEW_ID === "180",
      primeUrl: (() => { try {
        return new URL(env.DEPLOY_PRIME_URL || "").hostname
          === "deploy-preview-180--mobilipresenter2d.netlify.app";
      } catch { return false; } })(),
      prepared: false, readback: false
    };
    if (shouldSeed(env)) {
      const { getDeployStore } = require("@netlify/blobs");
      const store = getDeployStore({ name: "configurator-settings", consistency: "strong" });
      const fixture = createFixture();
      const result = await store.setJSON("published", fixture, { onlyIfNew: true });
      if (!result.modified) throw new Error("CP-PUBLIC-02c isolated fixture key was already occupied");
      checks.prepared = true;
      const loaded = await store.get("published", { type: "json", consistency: "strong" });
      checks.readback = loaded?.schemaVersion === "ConfiguratorAdministration2D 5.0"
        && loaded?.objects?.["module-01"]?.title === "Módulo 01 — homologação PR 180";
      if (!checks.readback) throw new Error("CP-PUBLIC-02c isolated fixture readback mismatch");
      console.log("CP-PUBLIC-02c v5 deployed to isolated getDeployStore: readback PASS");
    } else console.log("CP-PUBLIC-02c v5 fixture disabled: not PR #180 Deploy Preview");

    // Only non-sensitive booleans; this path exists only in the temporary PR.
    const diagnostic = path.resolve(__dirname, "../../../app/__cp-public-02c-seed-checks.json");
    fs.writeFileSync(diagnostic, JSON.stringify(checks));
  }
};
