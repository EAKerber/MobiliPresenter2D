const assert = require("node:assert/strict");
const repair = require("../core/legacy-stage-repair.js");

const source = {
  schemaVersion: "ConfiguratorAdministration2D 3.0",
  revision: 7,
  stages: [
    { id: "modules", kind: "modules", label: "Módulos", enabled: true, items: ["module-01"] },
    { id: "finishes", kind: "finishes", label: "Acabamentos", enabled: true, items: ["fronts-all", "stone-all", "stone-skirting"] },
    { id: "summary", kind: "summary", label: "Resumo", enabled: true, items: ["summary"] }
  ],
  untouched: { nested: ["a", "b"] }
};

const plan = repair.planHandlesAssignment(source);
assert.equal(plan.ok, true);
assert.equal(plan.needed, true);
assert.deepEqual(plan.beforeItems, ["fronts-all", "stone-all", "stone-skirting"]);
assert.deepEqual(plan.afterItems, ["fronts-all", "handles-all", "stone-all", "stone-skirting"]);
assert.deepEqual(source.stages[1].items, ["fronts-all", "stone-all", "stone-skirting"], "planner must be pure");
assert.equal(repair.verifyHandlesOnlyDelta(source, plan.candidate).ok, true);

const unrelated = structuredClone(plan.candidate);
unrelated.untouched.nested.push("c");
assert.equal(repair.verifyHandlesOnlyDelta(source, unrelated).code, "unexpected_delta");

const reordered = structuredClone(plan.candidate);
reordered.stages[1].items = ["handles-all", "fronts-all", "stone-all", "stone-skirting"];
assert.equal(repair.verifyHandlesOnlyDelta(source, reordered).code, "unexpected_delta");

const wrongOwner = structuredClone(source);
wrongOwner.stages[0].items.push("handles-all");
assert.equal(repair.planHandlesAssignment(wrongOwner).code, "wrong_owner");

const already = structuredClone(source);
already.stages[1].items.splice(1, 0, "handles-all");
const alreadyPlan = repair.planHandlesAssignment(already);
assert.equal(alreadyPlan.ok, true);
assert.equal(alreadyPlan.needed, false);

console.log("legacy handles assignment repair: PASS");
