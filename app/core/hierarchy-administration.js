(function registerHierarchyAdministration(global) {
  "use strict";

  const SCHEMA = "ConfiguratorAdministration2D 4.0";
  const ID_PATTERN = /^[a-z][a-z0-9-]{1,39}$/;
  const PRESENTATIONS = new Set(["auto", "swatches", "cards", "list", "grid"]);
  const COLUMN_SPANS = new Set([1, 2]);

  function clone(value) {
    return structuredClone(value);
  }

  function itemBehavior(kind) {
    if (["finish-group", "handle", "stone", "finish"].includes(kind)) return "selection";
    if (["module", "object", "service"].includes(kind)) return "toggle";
    if (kind === "summary") return "action";
    return null;
  }

  function flattenStageItems(stage) {
    if (Array.isArray(stage.items)) return [...stage.items];
    return (stage.groups || []).flatMap((group) => (group.sections || []).flatMap((section) => section.itemIds || []));
  }

  function defaultGroupCopy(group, stage) {
    return {
      id: group.id,
      label: group.label || stage.label || group.id,
      columnSpan: group.presentation?.span || 1,
      sections: (group.sections || []).map((section) => ({
        id: section.id,
        label: section.label || section.id,
        presentation: section.presentation || "auto",
        itemIds: [...section.itemIds]
      }))
    };
  }

  function stageHierarchySignature(stage) {
    return JSON.stringify({
      id: stage.id,
      kind: stage.kind || stage.id,
      groups: (stage.groups || []).map((group) => ({
        id: group.id,
        label: group.label,
        columnSpan: group.columnSpan,
        sections: (group.sections || []).map((section) => ({
          id: section.id,
          label: section.label,
          presentation: section.presentation,
          itemIds: [...(section.itemIds || [])]
        }))
      }))
    });
  }

  function compatibilityMetadata(legacy, hierarchyStages) {
    return {
      sourceSchemaVersion: legacy.schemaVersion || null,
      legacyStageItems: Object.fromEntries((legacy.stages || []).map((stage) => [stage.id, [...(stage.items || [])]])),
      legacyStageStructures: Object.fromEntries(hierarchyStages.map((stage) => [stage.id, stageHierarchySignature(stage)]))
    };
  }

  function upgradeToHierarchy(value, configurationCore, flowCore, catalog, priceBook, scene, hierarchyDefaultsInput = null) {
    if (!value) throw new TypeError("configuration is required");
    if (value.schemaVersion === SCHEMA) {
      const errors = validateHierarchyAdministration(value, configurationCore, catalog, priceBook, scene);
      if (errors.length) throw new TypeError(errors.join("; "));
      return normalizeHierarchyAdministration(value);
    }

    const legacy = configurationCore.normalizeConfiguratorSettings(value, catalog, priceBook, scene);
    const hierarchyDefaults = hierarchyDefaultsInput || global?.CASA_EM_MODULOS_HIERARCHY_DEFAULTS || null;
    const flow = flowCore.normalizeFlow(legacy, configurationCore.itemRegistry(catalog), hierarchyDefaults);
    const hierarchyStages = flow.stages.map((flowStage) => {
      const source = legacy.stages.find((stage) => stage.id === flowStage.id);
      return {
        id: flowStage.id,
        kind: flowStage.kind,
        label: source?.label || flowStage.label,
        enabled: Boolean(flowStage.enabled),
        groups: flowStage.groups.map((group) => defaultGroupCopy(group, source || flowStage))
      };
    });
    return {
      ...clone(legacy),
      schemaVersion: SCHEMA,
      stages: hierarchyStages,
      compatibility: compatibilityMetadata(legacy, hierarchyStages)
    };
  }

  function normalizeHierarchyAdministration(value) {
    return {
      ...clone(value),
      schemaVersion: SCHEMA,
      revision: Number.isSafeInteger(value.revision) && value.revision > 0 ? value.revision : 1,
      stages: value.stages.map((stage) => ({
        id: stage.id,
        kind: stage.kind || stage.id,
        label: stage.label.trim(),
        enabled: Boolean(stage.enabled),
        groups: stage.groups.map((group) => ({
          id: group.id,
          label: group.label.trim(),
          columnSpan: group.columnSpan,
          sections: group.sections.map((section) => ({
            id: section.id,
            label: section.label.trim(),
            presentation: section.presentation,
            itemIds: [...section.itemIds]
          }))
        }))
      }))
    };
  }

  function hierarchyToLegacyCandidate(value, configurationCore) {
    const compatibility = value.compatibility || {};
    return {
      ...clone(value),
      schemaVersion: configurationCore.SCHEMA,
      stages: value.stages.map((stage) => {
        const baselineStructure = compatibility.legacyStageStructures?.[stage.id];
        const baselineItems = compatibility.legacyStageItems?.[stage.id];
        const structureUnchanged = baselineStructure && baselineStructure === stageHierarchySignature(stage);
        return {
          id: stage.id,
          kind: stage.kind || stage.id,
          label: stage.label,
          enabled: Boolean(stage.enabled),
          items: structureUnchanged && Array.isArray(baselineItems) ? [...baselineItems] : flattenStageItems(stage)
        };
      })
    };
  }

  function validateHierarchyAdministration(value, configurationCore, catalog, priceBook, scene) {
    const errors = [];
    if (!value || value.schemaVersion !== SCHEMA || !Array.isArray(value.stages)) return ["unsupported hierarchy settings schema"];
    if (value.stages.length < 2 || value.stages.length > 12) errors.push("stage count must be between 2 and 12");

    const registry = configurationCore.itemRegistry(catalog);
    const stageIds = new Set();
    const ownedItems = new Set();
    const coreKinds = new Set();
    let totalGroups = 0;
    let totalSections = 0;

    value.stages.forEach((stage) => {
      const path = `stage ${stage?.id || "?"}`;
      if (!stage || typeof stage.id !== "string" || !ID_PATTERN.test(stage.id)) { errors.push(`invalid stage id: ${stage?.id || "?"}`); return; }
      if (stageIds.has(stage.id)) errors.push(`duplicate stage: ${stage.id}`);
      stageIds.add(stage.id);
      const kind = stage.kind || stage.id;
      if (!["modules", "finishes", "services", "summary", "custom"].includes(kind)) errors.push(`invalid stage type: ${stage.id}`);
      if (kind !== "custom") {
        if (coreKinds.has(kind)) errors.push(`duplicate stage type: ${kind}`);
        coreKinds.add(kind);
      }
      if (typeof stage.label !== "string" || !stage.label.trim() || stage.label.trim().length > 40) errors.push(`invalid label: ${stage.id}`);
      if (typeof stage.enabled !== "boolean") errors.push(`invalid enabled state: ${stage.id}`);
      if (["modules", "summary"].includes(kind) && stage.enabled !== true) errors.push(`${kind} stage must remain enabled`);
      if (!Array.isArray(stage.groups) || stage.groups.length > 12) { errors.push(`invalid group list: ${stage.id}`); return; }
      if (stage.enabled && !stage.groups.length) errors.push(`enabled stage must contain a group: ${stage.id}`);
      totalGroups += stage.groups.length;

      const groupIds = new Set();
      const sectionIds = new Set();
      stage.groups.forEach((group) => {
        if (!group || typeof group.id !== "string" || !ID_PATTERN.test(group.id)) { errors.push(`invalid group id: ${stage.id}`); return; }
        if (groupIds.has(group.id)) errors.push(`duplicate group: ${stage.id}.${group.id}`);
        groupIds.add(group.id);
        if (typeof group.label !== "string" || !group.label.trim() || group.label.trim().length > 40) errors.push(`invalid group label: ${stage.id}.${group.id}`);
        if (!COLUMN_SPANS.has(group.columnSpan)) errors.push(`invalid group column span: ${stage.id}.${group.id}`);
        if (!Array.isArray(group.sections) || !group.sections.length || group.sections.length > 24) { errors.push(`invalid section list: ${stage.id}.${group.id}`); return; }
        totalSections += group.sections.length;

        group.sections.forEach((section) => {
          if (!section || typeof section.id !== "string" || !ID_PATTERN.test(section.id)) { errors.push(`invalid section id: ${stage.id}.${group.id}`); return; }
          if (sectionIds.has(section.id)) errors.push(`duplicate section: ${stage.id}.${section.id}`);
          sectionIds.add(section.id);
          if (typeof section.label !== "string" || !section.label.trim() || section.label.trim().length > 40) errors.push(`invalid section label: ${stage.id}.${section.id}`);
          if (!PRESENTATIONS.has(section.presentation)) errors.push(`invalid section presentation: ${stage.id}.${section.id}`);
          if (!Array.isArray(section.itemIds) || !section.itemIds.length || section.itemIds.length > 80) { errors.push(`invalid item list: ${stage.id}.${section.id}`); return; }

          const behaviors = new Set();
          section.itemIds.forEach((id) => {
            const kindForItem = registry.get(id);
            if (!kindForItem) errors.push(`unknown hierarchy item: ${stage.id}.${section.id}.${id}`);
            else {
              const behavior = itemBehavior(kindForItem);
              if (behavior) behaviors.add(behavior);
              if (kind === "modules" && kindForItem !== "module") errors.push(`invalid modules item: ${id}`);
              if (kind === "summary" && (kindForItem !== "summary" || id !== "summary")) errors.push(`invalid summary item: ${id}`);
              if (kind === "custom" && !["module", "object", "service"].includes(kindForItem)) errors.push(`invalid custom-stage item: ${id}`);
              if (kind === "finishes" && kindForItem !== "finish-group" && id !== "stone-skirting") errors.push(`invalid finishes item: ${id}`);
              if (kind === "services" && !["service", "object"].includes(kindForItem)) errors.push(`invalid services item: ${id}`);
            }
            if (ownedItems.has(id)) errors.push(`item assigned more than once: ${id}`);
            ownedItems.add(id);
          });
          if (behaviors.size > 1) errors.push(`mixed interaction behavior: ${stage.id}.${section.id}`);
        });
      });
    });

    if (totalGroups > 80) errors.push("too many hierarchy groups");
    if (totalSections > 160) errors.push("too many hierarchy sections");
    if (!coreKinds.has("modules")) errors.push("modules stage must remain");
    if (!coreKinds.has("summary")) errors.push("summary stage must remain");

    const legacyCandidate = hierarchyToLegacyCandidate(value, configurationCore);
    const legacyErrors = configurationCore.validateConfiguratorSettings(legacyCandidate, catalog, priceBook, scene);
    legacyErrors.forEach((error) => errors.push(`legacy-compatible validation: ${error}`));
    return [...new Set(errors)];
  }

  function hierarchySignature(value) {
    return JSON.stringify(value.stages.map((stage) => ({
      id: stage.id,
      kind: stage.kind || stage.id,
      label: stage.label,
      enabled: Boolean(stage.enabled),
      groups: stage.groups.map((group) => ({
        id: group.id,
        label: group.label,
        columnSpan: group.columnSpan,
        sections: group.sections.map((section) => ({
          id: section.id,
          label: section.label,
          presentation: section.presentation,
          itemIds: [...section.itemIds]
        }))
      }))
    })));
  }

  function projectHierarchyToLegacy(value, configurationCore, flowCore, catalog, priceBook, scene, hierarchyDefaultsInput = null) {
    const errors = validateHierarchyAdministration(value, configurationCore, catalog, priceBook, scene);
    if (errors.length) return { ok: false, code: "invalid_hierarchy", errors };

    const candidate = hierarchyToLegacyCandidate(value, configurationCore);
    let normalizedLegacy;
    try {
      normalizedLegacy = configurationCore.normalizeConfiguratorSettings(candidate, catalog, priceBook, scene);
    } catch (error) {
      return { ok: false, code: "invalid_legacy_projection", errors: [error.message] };
    }

    const roundTrip = upgradeToHierarchy(normalizedLegacy, configurationCore, flowCore, catalog, priceBook, scene, hierarchyDefaultsInput);
    if (hierarchySignature(roundTrip) !== hierarchySignature(normalizeHierarchyAdministration(value))) {
      return {
        ok: false,
        code: "hierarchy_requires_publication",
        errors: ["A hierarquia foi alterada e não pode ser reduzida ao schema publicado sem perda."]
      };
    }
    return { ok: true, value: normalizedLegacy };
  }

  const api = Object.freeze({
    SCHEMA,
    PRESENTATIONS: Object.freeze([...PRESENTATIONS]),
    COLUMN_SPANS: Object.freeze([...COLUMN_SPANS]),
    flattenStageItems,
    stageHierarchySignature,
    upgradeToHierarchy,
    normalizeHierarchyAdministration,
    validateHierarchyAdministration,
    projectHierarchyToLegacy,
    hierarchySignature
  });

  if (typeof module !== "undefined" && module.exports) module.exports = api;
  if (global && typeof global === "object") global.CasaModulesHierarchyAdministration = api;
})(typeof globalThis === "undefined" ? this : globalThis);
