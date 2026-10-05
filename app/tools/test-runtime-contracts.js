const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const projectRoot = path.resolve(__dirname, "..");
const sandbox = {
  structuredClone,
  console,
  CasaModulesConfiguration: Object.freeze({
    createDefaultAdministration(settings) { return structuredClone(settings); },
    normalizeConfiguratorSettings(settings) { return structuredClone(settings); },
    validateConfiguratorSettings() { return []; },
    resolveEventState() { return null; }
  })
};
vm.createContext(sandbox);
vm.runInContext(
  fs.readFileSync(path.join(projectRoot, "core/runtime-contracts.js"), "utf8"),
  sandbox,
  { filename: "core/runtime-contracts.js" }
);

const contracts = sandbox.CASA_RUNTIME_CONTRACTS;
assert(contracts, "runtime contracts must register");

const defaultStages = {
  stages: [
    { id: "finishes", enabled: true, items: ["fronts-all", "stone-all"] },
    { id: "services", enabled: true, items: ["move-stone"] }
  ]
};
const repairedDefaults = contracts.repairDefaultStageSettings(defaultStages);
assert.deepEqual(
  Array.from(repairedDefaults.stages[0].items),
  ["fronts-all", "stone-all", "handles-all", "stone-skirting"],
  "canonical defaults expose handles and skirting beside finishes"
);
assert.deepEqual(Array.from(defaultStages.stages[0].items), ["fronts-all", "stone-all"], "repairs do not mutate callers");

const publishedLegacy = {
  schemaVersion: "ConfiguratorAdministration2D 3.0",
  stages: [
    { id: "finishes", kind: "finishes", enabled: true, items: ["fronts-all", "stone-all"] },
    { id: "services", kind: "services", enabled: true, items: ["move-stone", "tempered-glass"] }
  ],
  initialState: { services: ["move-stone", "stone-skirting", "tempered-glass"] }
};
const repairedPublished = contracts.repairSkirtingStageContract(publishedLegacy);
assert.equal(repairedPublished.stages[0].items.includes("stone-skirting"), true, "active orphaned skirting is restored beside stone-all");
assert.equal(publishedLegacy.stages[0].items.includes("stone-skirting"), false, "published input stays immutable");

const intentionalRemoval = {
  ...publishedLegacy,
  stages: publishedLegacy.stages.map((stage) => ({ ...stage, items: [...stage.items] })),
  initialState: { services: ["move-stone", "tempered-glass"] }
};
const preservedRemoval = contracts.repairSkirtingStageContract(intentionalRemoval);
assert.equal(preservedRemoval.stages[0].items.includes("stone-skirting"), false, "removing both control and initial service remains an explicit admin choice");

const alreadyAssigned = {
  ...publishedLegacy,
  stages: [
    { id: "finishes", kind: "finishes", enabled: true, items: ["fronts-all", "stone-all"] },
    { id: "custom", kind: "custom", enabled: true, items: ["stone-skirting"] }
  ]
};
const preservedAssignment = contracts.repairSkirtingStageContract(alreadyAssigned);
assert.equal(preservedAssignment.stages[0].items.includes("stone-skirting"), false, "existing admin placement is not moved");
assert.equal(preservedAssignment.stages[1].items.filter((id) => id === "stone-skirting").length, 1, "skirting is never duplicated");

const wrappedDefault = sandbox.CasaModulesConfiguration.createDefaultAdministration(defaultStages);
assert.equal(wrappedDefault.stages[0].items.includes("handles-all"), true);
assert.equal(wrappedDefault.stages[0].items.includes("stone-skirting"), true);
const wrappedPublished = sandbox.CasaModulesConfiguration.normalizeConfiguratorSettings(publishedLegacy);
assert.equal(wrappedPublished.stages[0].items.includes("stone-skirting"), true, "the public normalization path self-heals the legacy published shape");

console.log("runtime contracts: PASS");
