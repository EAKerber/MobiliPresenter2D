"use strict";

const fs = require("node:fs/promises");
const path = require("node:path");

const REMOVE_FROM_PUBLISH = Object.freeze([
  "docs",
  "reports",
  "tools",
  "scripts",
  "drizzle",
  "README.md",
  "HOT_SWAP_VALIDATION.json"
]);

module.exports = {
  async onPostBuild({ constants }) {
    const publishDir = path.resolve(constants.PUBLISH_DIR);
    const expectedPublishDir = path.resolve("app");
    if (publishDir !== expectedPublishDir) {
      throw new Error(`Refusing publish cleanup outside ${expectedPublishDir}: ${publishDir}`);
    }

    for (const relativePath of REMOVE_FROM_PUBLISH) {
      const target = path.resolve(publishDir, relativePath);
      if (!target.startsWith(`${publishDir}${path.sep}`)) {
        throw new Error(`Refusing publish cleanup outside ${publishDir}: ${target}`);
      }
      await fs.rm(target, { recursive: true, force: true });
      console.log(`[publish-cleanup] Removed ${relativePath} from the published files.`);
    }
  }
};
