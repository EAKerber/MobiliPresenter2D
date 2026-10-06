const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const projectRoot = path.resolve(__dirname, "..");
const sandbox = { window: {} };
vm.createContext(sandbox);
vm.runInContext(
  fs.readFileSync(path.join(projectRoot, "data/catalog-data.js"), "utf8"),
  sandbox,
  { filename: "data/catalog-data.js" }
);

const catalog = sandbox.window.CASA_EM_MODULOS_CATALOG;
const capabilities = require(path.join(projectRoot, "core/item-capabilities.js"));

assert.deepEqual(capabilities.STAGE_KINDS, ["modules", "finishes", "services", "summary", "custom"]);
assert.deepEqual(capabilities.CORE_STAGE_KINDS, ["modules", "summary"]);

assert.equal(capabilities.behaviorForKind("finish-group"), "selection");
assert.equal(capabilities.behaviorForKind("handle"), "selection");
assert.equal(capabilities.behaviorForKind("module"), "toggle");
assert.equal(capabilities.behaviorForKind("service"), "toggle");
assert.equal(capabilities.behaviorForKind("summary"), "action");
assert.equal(capabilities.behaviorForKind("unknown"), null);

assert.equal(capabilities.stageAllowsItem("modules", "module-01", "module", catalog), true);
assert.equal(capabilities.stageAllowsItem("custom", "module-01", "module", catalog), true);
assert.equal(capabilities.stageAllowsItem("services", "module-01", "module", catalog), false);

assert.equal(capabilities.stageAllowsItem("services", "move-stone", "service", catalog), true);
assert.equal(capabilities.stageAllowsItem("custom", "move-stone", "service", catalog), true);
assert.equal(capabilities.stageAllowsItem("finishes", "move-stone", "service", catalog), false);

assert.deepEqual(
  capabilities.allowedStageKindsForItem("stone-skirting", "service", catalog),
  ["finishes", "services", "custom"],
  "catalog stageKinds overrides the default service placement policy"
);
assert.equal(capabilities.stageAllowsItem("finishes", "stone-skirting", "service", catalog), true);

assert.equal(capabilities.stageAllowsItem("finishes", "fronts-all", "finish-group", catalog), true);
assert.equal(capabilities.stageAllowsItem("services", "fronts-all", "finish-group", catalog), false);
assert.equal(capabilities.stageAllowsItem("finishes", "tango-chrome", "handle", catalog), false);

assert.equal(capabilities.itemCapabilities("fronts-all", "finish-group", catalog).optionSource, "finishes");
assert.equal(capabilities.itemCapabilities("handles-all", "finish-group", catalog).optionSource, "handles");
assert.equal(capabilities.itemCapabilities("handles-all", "finish-group", catalog).optionsOpenByDefault, true);
assert.equal(capabilities.itemCapabilities("stone-all", "finish-group", catalog).optionSource, "stonePackages");

const hierarchyDefaults = require(path.join(projectRoot, "data/hierarchy-defaults.js"));
assert.equal("aggregateOptions" in hierarchyDefaults, false, "option sources no longer live in hierarchy defaults");
Object.values(hierarchyDefaults.stages).forEach((stage) => {
  assert.equal("allowedItemKinds" in stage, false, "stage item policy no longer lives in hierarchy defaults");
});
assert.equal("allowedItemKinds" in hierarchyDefaults.customStage, false);

console.log("item capabilities: PASS");
