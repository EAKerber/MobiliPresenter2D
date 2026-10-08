"use strict";
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const projection = require("../core/buyer-configuration-projection.js");
const previous = require("../core/published-buyer-projection.js");
const configuration = require("../core/configuration.js");
const administrationV5 = require("../core/administration-v5.js");
const flow = require("../core/flow-model.js");
const pricingContract = require("../core/pricing-contract.js");
const presentationCore = require("../core/presentation-contract.js");
const layoutProfiles = require("../core/layout-profiles.js");
const defaults = require("../data/configurator-settings.js");
const catalog = require("../data/catalog-data.js");
const scene = require("../data/scene-data.js");
const priceBook = require("../data/mock-price-book.js");
const hierarchyDefaults = require("../data/hierarchy-defaults.js");
const defaultPresentationPolicy = require("../data/presentation-policy-defaults.js");

const runtime = { configuration, administrationV5, flow, catalog, scene, priceBook,
  hierarchyDefaults, pricingContract, presentationCore, layoutProfiles,
  defaultPresentationPolicy };
const v3 = configuration.normalizeConfiguratorSettings(
  configuration.createDefaultAdministration(defaults, catalog, priceBook, scene),
  catalog, priceBook, scene
);
const v5 = administrationV5.upgrade(
  v3, configuration, flow, catalog, priceBook, scene, hierarchyDefaults
);
assert.deepEqual(administrationV5.validate(v5, configuration, catalog, priceBook, scene), []);

const dto = projection.project(v5, runtime);
const original = previous.prepare(v5, runtime);
const prepared = projection.prepare(JSON.parse(JSON.stringify(dto)), runtime);

assert.equal(dto.schemaVersion, "BuyerConfiguration2D 0.1");
assert.equal(dto.sourceKind, "published-v5");
assert.equal(dto.revision, undefined, "buyer never receives administrative revision");
assert.equal(dto.source, undefined, "buyer does not receive raw v5 source");
assert.equal(dto.etag, undefined, "buyer never receives storage ETag");
assert.equal(dto.administration, undefined);
assert.deepEqual(prepared.flow.stages, original.flow.stages,
  "buyer DTO exactly preserves published hierarchy/order and presentation decisions");
assert.deepEqual(prepared.pricingRules, original.pricingRules,
  "typed customer-visible pricing roles must not change");
assert.deepEqual(prepared.presentationPolicy, original.presentationPolicy,
  "published PiP/shell/stage relation decisions are preserved");
assert.deepEqual(prepared.displaySettings.stages, original.displaySettings.stages,
  "legacy visual components receive identical derived stage items");
assert.deepEqual(prepared.displaySettings.initialState, original.displaySettings.initialState);
assert.deepEqual(prepared.displaySettings.finishes, original.displaySettings.finishes);
assert.deepEqual(prepared.displaySettings.handleProducts, original.displaySettings.handleProducts);
assert.deepEqual(prepared.displaySettings.materialGroups, original.displaySettings.materialGroups);
assert.deepEqual(prepared.displaySettings.dependencies, original.displaySettings.dependencies);
assert.deepEqual(prepared.displaySettings.events, original.displaySettings.events);
for (const [key, item] of Object.entries(dto.objects)) {
  assert.deepEqual(item, original.displaySettings.objects[key],
    "every visible authored editorial record preserves copy: " + key);
}
for (const [key, item] of Object.entries(dto.objectAssets)) {
  assert.deepEqual(item, original.displaySettings.objectAssets[key],
    "every delivered visual asset preserves the authored selection: " + key);
}
for (const material of dto.materials) {
  const source = original.displaySettings.materials.find(entry => entry.id === material.id);
  assert(source && material.label === source.label && material.color === source.color
    && material.textureAsset === source.textureAsset);
  assert.equal(Object.hasOwn(material, "locked"), false,
    "admin material lock flag never crosses the buyer boundary");
}
const stages = dto.stages.flatMap(stage => stage.groups.flatMap(group =>
  group.sections.flatMap(section => section.itemIds)));
assert(stages.length > 5 && new Set(stages).size === stages.length);
assert.deepEqual(dto.stages.map(stage => stage.id), v5.stages.map(stage => stage.id));

const withSecrets = structuredClone(v5);
withSecrets.adminOnlyToken = "ADMIN_SECRET_TOP_LEVEL";
withSecrets.objects["module-01"].adminNotes = "ADMIN_SECRET_EDITORIAL";
withSecrets.stages[0].adminStageMetadata = "ADMIN_SECRET_STAGE";
withSecrets.stages[0].groups[0].sections[0].adminNotes = "ADMIN_SECRET_SECTION";
withSecrets.materialGroups[0].adminPrivateLabel = "ADMIN_SECRET_GROUP";
withSecrets.materials[0].adminCost = "ADMIN_SECRET_MATERIAL";
withSecrets.objectAssets["module-01"].secretUrl = "ADMIN_SECRET_ASSET";
withSecrets.initialState.privateSession = "ADMIN_SECRET_SESSION";
withSecrets.presentationPolicy.shell.bottomDock.internal = "ADMIN_SECRET_POLICY";
const sanitized = projection.project(withSecrets, runtime);
assert.equal(JSON.stringify(sanitized).includes("ADMIN_SECRET"), false,
  "deep unknown administrative fields cannot cross the allowlisted boundary");
assert.deepEqual(sanitized, dto,
  "unknown v5 fields cannot modify or leak into public buyer DTO");
assert.deepEqual(projection.project(v5, runtime), dto,
  "projection is deterministic and does not mutate published v5");
assert.equal(v5.adminOnlyToken, undefined);

const typed = structuredClone(v5);
const frontRateId = Object.keys(typed.pricing.roles.frontFinishAdjustment)[0];
assert(frontRateId);
typed.pricing.roles.frontFinishAdjustment[frontRateId] = { type: "amount", cents: 1485 };
assert.deepEqual(administrationV5.validate(typed, configuration, catalog, priceBook, scene), []);
const typedDto = projection.project(typed, runtime);
assert.deepEqual(typedDto.pricing.roles.frontFinishAdjustment[frontRateId],
  { type: "amount", cents: 1485 }, "typed amount rules are not coerced to percentages");
assert.deepEqual(projection.prepare(typedDto, runtime).pricingRules, pricingContract.normalize(typed.pricing));

const amended = structuredClone(v5);
amended.objects["module-01"].title = "Módulo de atendimento — valor autorado em publicação";
const amendedDto = projection.project(amended, runtime);
assert.equal(amendedDto.objects["module-01"].title, amended.objects["module-01"].title);
assert.notDeepEqual(amendedDto.objects["module-01"], dto.objects["module-01"]);

assert.throws(() => projection.project(v3, runtime), /validated published v5/);
assert.throws(() => projection.project({ ...v5, presentationPolicy: null }, runtime), /invalid published/);
const tamperedDto = { ...dto, adminRaw: v5 };
assert.throws(() => projection.prepare(tamperedDto, runtime), /unexpected buyer read-model fields/);
assert.throws(() => projection.prepare({ ...dto, schemaVersion: v5.schemaVersion }, runtime), /unsupported buyer/);

// A server-side read model must never silently take over the public viewer.
const toml = fs.readFileSync(path.join(__dirname, "../../netlify.toml"), "utf8");
assert.match(toml, /from = "\/api\/buyer-configuration"/);
assert.match(toml, /to = "\/\.netlify\/functions\/buyer-configuration"/);
const func = fs.readFileSync(path.join(__dirname, "../../netlify/functions/buyer-configuration.mjs"), "utf8");
assert.match(func, /@netlify\/identity/);
assert.match(func, /getDeployStore/);
assert.match(func, /getStore/);
assert.match(func, /authorized-buyer-read\.cjs/);
assert(!func.includes("createDefaultAdministration"), "no fallback 200 on missing stored v5");
console.log("CP-PUBLIC-03a2-1 authorized buyer v5 projection: PASS");
