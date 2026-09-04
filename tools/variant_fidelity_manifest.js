#!/usr/bin/env node
"use strict";

const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const repoRoot = path.resolve(__dirname, "..");
const appRoot = path.join(repoRoot, "app");

function parseArgs(argv) {
  const result = {};
  for (let index = 2; index < argv.length; index += 2) {
    const key = argv[index];
    const value = argv[index + 1];
    if (!key || !key.startsWith("--") || value === undefined) {
      throw new Error("arguments must be --key value pairs");
    }
    result[key.slice(2)] = value;
  }
  if (!result.cases || !result.output) throw new Error("--cases and --output are required");
  return result;
}

function loadRuntime() {
  const sandbox = { window: {} };
  vm.createContext(sandbox);
  for (const relativePath of [
    "data/scene-data.js",
    "core/state.js",
    "core/visibility.js",
    "core/validation.js",
    "core/fingerprint.js"
  ]) {
    const source = fs.readFileSync(path.join(appRoot, relativePath), "utf8");
    vm.runInContext(source, sandbox, { filename: relativePath });
  }
  return sandbox.window;
}

function applyActions(scene, core, state, actions) {
  for (const action of actions) {
    if (action.type === "set-visibility") {
      if (!scene.entities.some((entity) => entity.id === action.entityId)) {
        throw new Error(`unknown entity in variant action: ${action.entityId}`);
      }
      if (!core.setEntityVisibility(state, action.entityId, action.visible)) {
        throw new Error(`unable to set visibility for ${action.entityId}`);
      }
      continue;
    }
    if (action.type === "set-all-controllable") {
      core.setAllControllableVisibility(scene, state, action.visible);
      continue;
    }
    throw new Error(`unsupported variant action: ${action.type}`);
  }
}

function main() {
  const args = parseArgs(process.argv);
  const casesPath = path.resolve(repoRoot, args.cases);
  const outputPath = path.resolve(repoRoot, args.output);
  const casesDoc = JSON.parse(fs.readFileSync(casesPath, "utf8"));
  if (casesDoc.schemaVersion !== "VariantFidelityCases 0.1") {
    throw new Error("unsupported variant cases schema");
  }

  const runtime = loadRuntime();
  const scene = runtime.CASA_EM_MODULOS_SCENE;
  const core = runtime.CasaModulesCore;
  const visibility = runtime.CasaModulesVisibility;
  const validation = runtime.CasaModulesValidation;
  const fingerprints = runtime.CasaModulesFingerprint;
  const sceneErrors = Array.from(validation.validateScene(scene));
  if (sceneErrors.length) throw new Error(`scene validation failed: ${JSON.stringify(sceneErrors)}`);
  if (casesDoc.sceneId !== scene.id) throw new Error(`scene mismatch: ${casesDoc.sceneId} != ${scene.id}`);

  const ids = new Set();
  const renderedCases = casesDoc.cases.map((variantCase) => {
    if (!variantCase.id || ids.has(variantCase.id)) {
      throw new Error(`invalid or duplicate case id: ${variantCase.id}`);
    }
    ids.add(variantCase.id);
    const state = core.createInitialState(scene);
    applyActions(scene, core, state, variantCase.actions || []);
    const resolved = visibility.resolveVisibility(scene, state);
    const visibleEntities = Array.from(visibility.getVisibleEntities(scene, state)).map((entity) => ({
      id: entity.id,
      asset: entity.asset,
      zIndex: entity.zIndex,
      tags: Array.from(entity.tags || []),
      placeholder: Array.from(entity.tags || []).includes("placeholder")
    }));

    for (const [entityId, reason] of Object.entries(variantCase.expectedVisibilityReasons || {})) {
      if (!resolved[entityId] || resolved[entityId].reason !== reason) {
        throw new Error(`${variantCase.id}: visibility reason mismatch for ${entityId}: ${resolved[entityId]?.reason} != ${reason}`);
      }
    }

    const placeholderVisible = visibleEntities.some((entity) => entity.placeholder);
    const expectsPlaceholderDebt = (variantCase.expectedDebtCodes || []).includes("replacement-placeholder");
    if (placeholderVisible !== expectsPlaceholderDebt) {
      throw new Error(`${variantCase.id}: placeholder debt expectation mismatch`);
    }

    return {
      id: variantCase.id,
      label: variantCase.label,
      fingerprint: fingerprints.computeFingerprint(scene, state),
      expectedVisualStatus: variantCase.expectedVisualStatus,
      expectedDebtCodes: variantCase.expectedDebtCodes || [],
      visibilityReasons: Object.fromEntries(scene.entities.map((entity) => [entity.id, resolved[entity.id]])),
      visibleEntities
    };
  });

  const payload = {
    schemaVersion: "VariantRenderManifest 0.1",
    sceneId: scene.id,
    sceneManifestVersion: scene.manifestVersion,
    canvas: scene.canvas,
    baseAsset: scene.baseAsset,
    goldenAsset: scene.goldenAsset,
    cases: renderedCases
  };
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
  process.stdout.write(`${JSON.stringify({
    status: "PASS",
    cases: renderedCases.map((item) => ({ id: item.id, fingerprint: item.fingerprint, debts: item.expectedDebtCodes }))
  })}\n`);
}

main();
