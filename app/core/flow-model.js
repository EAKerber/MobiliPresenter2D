(function registerConfiguratorFlowModel(global) {
  "use strict";

  const itemCapabilities = typeof module !== "undefined" && module.exports && typeof require === "function"
    ? require("./item-capabilities.js")
    : global?.CasaModulesItemCapabilities;
  if (!itemCapabilities) throw new Error("Item capability registry is required.");

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
    return itemCapabilities.behaviorForKind(kind) || "action";
  }

  function sectionFromTemplate(spec, itemIds, order, registry) {
    const behaviors = new Set(itemIds.map((id) => itemBehavior(registry.get(id))));
    const behavior = spec.behavior || behaviors.values().next().value || "action";
    return {
      id: spec.id,
      label: spec.label || spec.id,
      order,
      behavior,
      keyboard: spec.keyboard !== false,
      presentation: spec.presentation || "auto",
      itemIds: [...itemIds]
    };
  }

  function groupFromTemplate(spec, sections, order, stage) {
    return {
      id: spec.id,
      label: spec.labelFromStage ? stage.label : (spec.label || stage.label || spec.id),
      order,
      presentation: { layout: "stack", span: spec.columnSpan || 1 },
      sections: sections.map((entry, index) => ({ ...entry, order: index }))
    };
  }

  function templateSectionItems(stage, sectionSpec, registry) {
    if (sectionSpec.itemMode === "all") return [...stage.items];
    const explicit = new Set(sectionSpec.itemIds || []);
    const kinds = new Set(sectionSpec.itemKinds || []);
    return stage.items.filter((id) => explicit.has(id) || kinds.has(registry.get(id)));
  }

  function deriveCustomStage(stage, stageOrder, registry, errors, hierarchyDefaults) {
    const custom = hierarchyDefaults?.customStage;
    if (!custom?.group || !custom?.section) {
      errors.push(validationError(
        "missing-custom-hierarchy-default",
        `stages.${stage.id}`,
        `custom stage hierarchy defaults are missing: ${stage.id}`
      ));
      return {
        id: stage.id,
        kind: "custom",
        label: stage.label,
        enabled: Boolean(stage.enabled),
        order: stageOrder,
        groups: []
      };
    }

    const behaviors = new Set(stage.items.map((id) => itemBehavior(registry.get(id))));
    if (behaviors.size > 1) {
      errors.push(validationError(
        "mixed-custom-behavior",
        `stages.${stage.id}.items`,
        `custom stage mixes incompatible interaction behaviors: ${stage.id}`
      ));
    }

    const section = sectionFromTemplate(
      custom.section,
      [...stage.items],
      0,
      registry
    );
    if (!custom.section.behavior) section.behavior = behaviors.values().next().value || "toggle";
    const groups = stage.items.length
      ? [groupFromTemplate(custom.group, [section], 0, stage)]
      : [];

    return {
      id: stage.id,
      kind: "custom",
      label: stage.label,
      enabled: Boolean(stage.enabled),
      order: stageOrder,
      groups
    };
  }

  function deriveStage(stage, stageOrder, registry, errors, hierarchyDefaults) {
    const kind = stage.kind || stage.id;
    if (kind === "custom") return deriveCustomStage(stage, stageOrder, registry, errors, hierarchyDefaults);

    const template = hierarchyDefaults?.stages?.[stage.id] || hierarchyDefaults?.stages?.[kind];
    if (!template || !Array.isArray(template.groups)) {
      errors.push(validationError(
        "missing-legacy-hierarchy-template",
        `stages.${stage.id}`,
        `legacy hierarchy template is missing for stage: ${stage.id}`
      ));
      return {
        id: stage.id,
        kind,
        label: stage.label,
        enabled: Boolean(stage.enabled),
        order: stageOrder,
        groups: []
      };
    }

    const matchedItems = new Set();
    const groups = [];
    template.groups.forEach((groupSpec) => {
      const sections = [];
      (groupSpec.sections || []).forEach((sectionSpec) => {
        const itemIds = templateSectionItems(stage, sectionSpec, registry);
        itemIds.forEach((id) => matchedItems.add(id));
        if (!itemIds.length) return;

        const behaviors = new Set(itemIds.map((id) => itemBehavior(registry.get(id))));
        if (!sectionSpec.behavior && behaviors.size > 1) {
          errors.push(validationError(
            "mixed-template-section-behavior",
            `stages.${stage.id}.groups.${groupSpec.id}.sections.${sectionSpec.id}`,
            `legacy hierarchy template mixes incompatible interaction behaviors: ${stage.id}/${sectionSpec.id}`
          ));
        }
        sections.push(sectionFromTemplate(sectionSpec, itemIds, sections.length, registry));
      });
      if (sections.length) groups.push(groupFromTemplate(groupSpec, sections, groups.length, stage));
    });

    stage.items.forEach((id) => {
      if (!matchedItems.has(id)) {
        errors.push(validationError(
          "unsupported-stage-item",
          `stages.${stage.id}.items.${id}`,
          `legacy hierarchy template does not assign source item: ${stage.id}/${id}`
        ));
      }
    });

    return {
      id: stage.id,
      kind,
      label: stage.label,
      enabled: Boolean(stage.enabled),
      order: stageOrder,
      groups
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
          behavior: sectionEntry.behavior || behaviors.values().next().value || "action",
          keyboard: !["modules", "summary"].includes(kind),
          component: sectionEntry.component || null,
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

  function stageOwns(flow, stageId, itemId) {
    const stage = flow?.stages?.find((entry) => entry.id === stageId);
    if (!stage || !itemId) return false;
    return stage.groups.some((group) =>
      group.sections.some((section) => section.itemIds.includes(itemId))
    );
  }

  function itemAvailable(flow, itemId) {
    if (!itemId) return false;
    return Boolean(flow?.stages?.some((stage) =>
      stage.enabled
      && stage.groups.some((group) =>
        group.sections.some((section) => section.itemIds.includes(itemId))
      )
    ));
  }

  function normalizeFlow(settings, registryInput, hierarchyDefaultsInput = null) {
    const registry = asRegistry(registryInput);
    const hierarchyDefaults = hierarchyDefaultsInput || global?.CASA_EM_MODULOS_HIERARCHY_DEFAULTS || null;
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

    if (!hierarchySource && !hierarchyDefaults) {
      throwValidation([validationError(
        "missing-legacy-hierarchy-template",
        "settings.stages",
        "flat legacy settings require explicit hierarchy defaults"
      )]);
    }

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
          : deriveStage(stage, index, registry, deriveErrors, hierarchyDefaults)
      )
    };

    const validationErrors = [...deriveErrors, ...validateFlow(flow, registry), ...validateSourceCoverage(flow, settings)];
    if (validationErrors.length) throwValidation(validationErrors);
    return deepFreeze(flow);
  }

  const api = Object.freeze({ SCHEMA, normalizeFlow, validateFlow, validateSourceCoverage, stageOwns, itemAvailable });
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  if (global && typeof global === "object") global.CasaModulesFlow = api;
})(typeof globalThis === "undefined" ? this : globalThis);
