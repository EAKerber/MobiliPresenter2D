(function registerConfiguratorFlowModel(global) {
  "use strict";

  const SCHEMA = "NormalizedConfiguratorFlow 1.0";
  const BEHAVIORS = new Set(["selection", "toggle", "action"]);

  function deepFreeze(value) {
    if (!value || typeof value !== "object" || Object.isFrozen(value)) return value;
    Object.values(value).forEach(deepFreeze);
    return Object.freeze(value);
  }

  function asRegistry(input) {
    if (input instanceof Map) return input;
    if (input && typeof input === "object") return new Map(Object.entries(input));
    return new Map();
  }

  function validationError(code, path, message) {
    return { code, path, message };
  }

  function throwValidation(errors) {
    const error = new TypeError(errors.map((item) => item.message).join("; "));
    error.name = "FlowModelValidationError";
    error.validationErrors = errors;
    throw error;
  }

  function itemBehavior(kind) {
    if (["finish-group", "handle", "stone", "finish"].includes(kind)) return "selection";
    if (["module", "object", "service"].includes(kind)) return "toggle";
    return "action";
  }

  function section(id, behavior, itemIds, order, keyboard = true) {
    return { id, order, behavior, keyboard, itemIds: [...itemIds] };
  }

  function group(id, sections, order, span = 1) {
    return {
      id,
      order,
      presentation: { layout: "stack", span },
      sections: sections.map((entry, index) => ({ ...entry, order: index }))
    };
  }

  function finishGroups(stage, errors) {
    const allowed = new Set(["fronts-all", "handles-all", "stone-all", "stone-skirting"]);
    const unsupported = stage.items.filter((id) => !allowed.has(id));
    unsupported.forEach((id) => errors.push(validationError(
      "unsupported-stage-item",
      `stages.${stage.id}.items.${id}`,
      `unsupported finishes item in normalized v3 compatibility mapping: ${id}`
    )));

    const cabinet = [];
    const stone = [];
    if (stage.items.includes("fronts-all")) cabinet.push(section("fronts", "selection", ["fronts-all"], 0));
    if (stage.items.includes("handles-all")) cabinet.push(section("handles", "selection", ["handles-all"], 0));
    if (stage.items.includes("stone-all")) stone.push(section("stone-packages", "selection", ["stone-all"], 0));
    if (stage.items.includes("stone-skirting")) stone.push(section("stone-skirting", "toggle", ["stone-skirting"], 0));

    const groups = [];
    if (cabinet.length) groups.push(group("cabinet-finishes", cabinet, groups.length));
    if (stone.length) groups.push(group("stone", stone, groups.length));
    return groups;
  }

  function serviceGroups(stage, registry, errors) {
    const serviceItems = [];
    let hasLighting = false;

    stage.items.forEach((id) => {
      if (id === "lighting-08") {
        hasLighting = true;
        return;
      }
      if (registry.get(id) === "service") {
        serviceItems.push(id);
        return;
      }
      errors.push(validationError(
        "unsupported-stage-item",
        `stages.${stage.id}.items.${id}`,
        `unsupported services item in normalized v3 compatibility mapping: ${id}`
      ));
    });

    const sections = [];
    if (hasLighting) sections.push(section("lighting", "toggle", ["lighting-08"], 0));
    if (serviceItems.length) sections.push(section("additional-services", "toggle", serviceItems, 0));
    return sections.length ? [group("services", sections, 0, 2)] : [];
  }

  function deriveStage(stage, stageOrder, registry, errors) {
    const kind = stage.kind || stage.id;
    let groups = [];

    if (kind === "modules") {
      groups = stage.items.length
        ? [group("modules-main", [section("modules", "selection", stage.items, 0, false)], 0, 2)]
        : [];
    } else if (kind === "finishes") {
      groups = finishGroups(stage, errors);
    } else if (kind === "services") {
      groups = serviceGroups(stage, registry, errors);
    } else if (kind === "summary") {
      groups = stage.items.length
        ? [group("summary-main", [section("summary", "action", stage.items, 0, false)], 0, 2)]
        : [];
    } else if (kind === "custom") {
      const behaviors = new Set(stage.items.map((id) => itemBehavior(registry.get(id))));
      if (behaviors.size > 1) {
        errors.push(validationError(
          "mixed-custom-behavior",
          `stages.${stage.id}.items`,
          `custom stage mixes incompatible interaction behaviors: ${stage.id}`
        ));
      }
      groups = stage.items.length
        ? [group("custom-content", [section("items", behaviors.values().next().value || "toggle", stage.items, 0, true)], 0, 2)]
        : [];
    } else {
      errors.push(validationError("unsupported-stage-kind", `stages.${stage.id}.kind`, `unsupported stage kind: ${kind}`));
    }

    return {
      id: stage.id,
      kind,
      label: stage.label,
      enabled: Boolean(stage.enabled),
      order: stageOrder,
      groups: groups.map((entry, index) => ({ ...entry, order: index }))
    };
  }

  function sourceStageItems(stage) {
    if (Array.isArray(stage?.items)) return [...stage.items];
    if (!Array.isArray(stage?.groups)) return null;
    return stage.groups.flatMap((groupEntry) =>
      Array.isArray(groupEntry?.sections)
        ? groupEntry.sections.flatMap((sectionEntry) => Array.isArray(sectionEntry?.itemIds) ? sectionEntry.itemIds : [])
        : []
    );
  }

  function deriveHierarchyStage(stage, stageOrder, registry, errors) {
    const kind = stage.kind || stage.id;
    const groups = (stage.groups || []).map((groupEntry, groupIndex) => ({
      id: groupEntry.id,
      label: groupEntry.label,
      order: groupIndex,
      presentation: { layout: "stack", span: groupEntry.columnSpan || 1 },
      sections: (groupEntry.sections || []).map((sectionEntry, sectionIndex) => {
        const behaviors = new Set((sectionEntry.itemIds || []).map((id) => itemBehavior(registry.get(id))));
        if (behaviors.size > 1) {
          errors.push(validationError(
            "mixed-section-behavior",
            `stages.${stage.id}.groups.${groupEntry.id}.sections.${sectionEntry.id}`,
            `hierarchy section mixes incompatible interaction behaviors: ${stage.id}/${sectionEntry.id}`
          ));
        }
        return {
          id: sectionEntry.id,
          label: sectionEntry.label,
          order: sectionIndex,
          behavior: behaviors.values().next().value || "action",
          keyboard: !["modules", "summary"].includes(kind),
          presentation: sectionEntry.presentation || "auto",
          itemIds: [...(sectionEntry.itemIds || [])]
        };
      })
    }));

    return {
      id: stage.id,
      kind,
      label: stage.label,
      enabled: Boolean(stage.enabled),
      order: stageOrder,
      groups
    };
  }

  function validateFlow(flow, registryInput) {
    const registry = asRegistry(registryInput);
    const errors = [];
    if (!flow || flow.schemaVersion !== SCHEMA || !Array.isArray(flow.stages)) {
      return [validationError("invalid-flow", "flow", "invalid normalized flow")];
    }

    const stageIds = new Set();
    const globalItemOwners = new Map();

    flow.stages.forEach((stage, stageIndex) => {
      const stagePath = `stages.${stage.id || stageIndex}`;
      if (!stage.id || stageIds.has(stage.id)) errors.push(validationError("duplicate-stage", stagePath, `duplicate or missing stage id: ${stage.id || stageIndex}`));
      stageIds.add(stage.id);
      if (!Number.isInteger(stage.order) || stage.order !== stageIndex) errors.push(validationError("invalid-order", stagePath, `non-deterministic stage order: ${stage.id}`));
      if (!Array.isArray(stage.groups)) errors.push(validationError("invalid-groups", stagePath, `stage groups must be an array: ${stage.id}`));

      const groupIds = new Set();
      const sectionIds = new Set();
      (stage.groups || []).forEach((groupEntry, groupIndex) => {
        const groupPath = `${stagePath}.groups.${groupEntry.id || groupIndex}`;
        if (!groupEntry.id || groupIds.has(groupEntry.id)) errors.push(validationError("duplicate-group", groupPath, `duplicate or missing group id: ${groupEntry.id || groupIndex}`));
        groupIds.add(groupEntry.id);
        if (!Number.isInteger(groupEntry.order) || groupEntry.order !== groupIndex) errors.push(validationError("invalid-order", groupPath, `non-deterministic group order: ${groupEntry.id}`));
        if (!Array.isArray(groupEntry.sections)) errors.push(validationError("invalid-sections", groupPath, `group sections must be an array: ${groupEntry.id}`));

        (groupEntry.sections || []).forEach((sectionEntry, sectionIndex) => {
          const sectionPath = `${groupPath}.sections.${sectionEntry.id || sectionIndex}`;
          if (!sectionEntry.id || sectionIds.has(sectionEntry.id)) errors.push(validationError("duplicate-section", sectionPath, `duplicate or missing section id in stage ${stage.id}: ${sectionEntry.id || sectionIndex}`));
          sectionIds.add(sectionEntry.id);
          if (!Number.isInteger(sectionEntry.order) || sectionEntry.order !== sectionIndex) errors.push(validationError("invalid-order", sectionPath, `non-deterministic section order: ${sectionEntry.id}`));
          if (!BEHAVIORS.has(sectionEntry.behavior)) errors.push(validationError("invalid-behavior", sectionPath, `invalid section behavior: ${sectionEntry.behavior}`));
          if (typeof sectionEntry.keyboard !== "boolean") errors.push(validationError("invalid-keyboard-state", sectionPath, `section keyboard state must be boolean: ${sectionEntry.id}`));
          if (!Array.isArray(sectionEntry.itemIds) || !sectionEntry.itemIds.length) {
            errors.push(validationError("empty-section", sectionPath, `section must own at least one item: ${sectionEntry.id}`));
            return;
          }

          const localItems = new Set();
          sectionEntry.itemIds.forEach((itemId) => {
            if (!registry.has(itemId)) errors.push(validationError("unknown-item", `${sectionPath}.itemIds.${itemId}`, `unknown flow item: ${itemId}`));
            if (localItems.has(itemId)) errors.push(validationError("duplicate-item", sectionPath, `item repeated in section: ${itemId}`));
            localItems.add(itemId);
            if (globalItemOwners.has(itemId)) errors.push(validationError("duplicate-item-owner", sectionPath, `item owned by multiple flow sections: ${itemId}`));
            else globalItemOwners.set(itemId, `${stage.id}/${sectionEntry.id}`);
          });
        });
      });
    });

    return errors;
  }

  function validateSourceCoverage(flow, settings) {
    const errors = [];
    const byStage = new Map(flow.stages.map((stage) => [stage.id, stage]));
    (settings.stages || []).forEach((sourceStage) => {
      const stage = byStage.get(sourceStage.id);
      if (!stage) {
        errors.push(validationError("missing-stage", `stages.${sourceStage.id}`, `source stage missing from normalized flow: ${sourceStage.id}`));
        return;
      }
      const actual = stage.groups.flatMap((groupEntry) => groupEntry.sections.flatMap((sectionEntry) => sectionEntry.itemIds));
      const expected = sourceStageItems(sourceStage) || [];
      const actualSet = new Set(actual);
      const expectedSet = new Set(expected);
      expected.forEach((id) => {
        if (!actualSet.has(id)) errors.push(validationError("missing-source-item", `stages.${sourceStage.id}.items.${id}`, `source item missing from normalized flow: ${id}`));
      });
      actual.forEach((id) => {
        if (!expectedSet.has(id)) errors.push(validationError("unexpected-flow-item", `stages.${sourceStage.id}.items.${id}`, `normalized flow invented an item: ${id}`));
      });
    });
    return errors;
  }

  function normalizeFlow(settings, registryInput) {
    const registry = asRegistry(registryInput);
    const errors = [];
    if (!settings || !Array.isArray(settings.stages)) throwValidation([validationError("invalid-settings", "settings", "settings with stages are required")]);

    const hierarchySource = settings.stages.some((stage) => Array.isArray(stage?.groups));
    if (hierarchySource && settings.stages.some((stage) => !Array.isArray(stage?.groups) || Object.hasOwn(stage, "items"))) {
      throwValidation([validationError("mixed-source-shape", "settings.stages", "flow source cannot mix flat items with hierarchy groups")]);
    }

    const sourceStageIds = new Set();
    const sourceItems = new Set();
    settings.stages.forEach((stage, index) => {
      const items = sourceStageItems(stage);
      if (!stage || typeof stage.id !== "string" || !items) {
        errors.push(validationError("invalid-source-stage", `stages.${index}`, `invalid source stage at index ${index}`));
        return;
      }
      if (sourceStageIds.has(stage.id)) errors.push(validationError("duplicate-source-stage", `stages.${stage.id}`, `duplicate source stage: ${stage.id}`));
      sourceStageIds.add(stage.id);
      items.forEach((id) => {
        if (!registry.has(id)) errors.push(validationError("unknown-source-item", `stages.${stage.id}.items.${id}`, `unknown source item: ${id}`));
        if (sourceItems.has(id)) errors.push(validationError("duplicate-source-item", `stages.${stage.id}.items.${id}`, `source item assigned more than once: ${id}`));
        sourceItems.add(id);
      });
    });
    if (errors.length) throwValidation(errors);

    const deriveErrors = [];
    const flow = {
      schemaVersion: SCHEMA,
      source: {
        schemaVersion: settings.schemaVersion || null,
        revision: Number.isSafeInteger(settings.revision) ? settings.revision : null
      },
      stages: settings.stages.map((stage, index) =>
        hierarchySource
          ? deriveHierarchyStage(stage, index, registry, deriveErrors)
          : deriveStage(stage, index, registry, deriveErrors)
      )
    };

    const validationErrors = [...deriveErrors, ...validateFlow(flow, registry), ...validateSourceCoverage(flow, settings)];
    if (validationErrors.length) throwValidation(validationErrors);
    return deepFreeze(flow);
  }

  const api = Object.freeze({ SCHEMA, normalizeFlow, validateFlow, validateSourceCoverage });
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  if (global && typeof global === "object") global.CasaModulesFlow = api;
})(typeof globalThis === "undefined" ? this : globalThis);
