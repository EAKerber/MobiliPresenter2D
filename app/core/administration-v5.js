(function registerAdministrationV5(global) {
  "use strict";

  const hierarchyV4 = typeof module !== "undefined" && module.exports && typeof require === "function"
    ? require("./hierarchy-administration.js")
    : global?.CasaModulesHierarchyAdministration;
  const itemCapabilities = typeof module !== "undefined" && module.exports && typeof require === "function"
    ? require("./item-capabilities.js")
    : global?.CasaModulesItemCapabilities;
  const presentationCore = typeof module !== "undefined" && module.exports && typeof require === "function"
    ? require("./presentation-contract.js")
    : global?.CasaModulesPresentation;
  const layoutProfiles = typeof module !== "undefined" && module.exports && typeof require === "function"
    ? require("./layout-profiles.js")
    : global?.CasaModulesLayoutProfiles;
  const defaultPresentationPolicy = typeof module !== "undefined" && module.exports && typeof require === "function"
    ? require("../data/presentation-policy-defaults.js")
    : global?.CASA_EM_MODULOS_PRESENTATION_POLICY;

  if (!hierarchyV4) throw new Error("Hierarchy v4 compatibility core is required.");
  if (!itemCapabilities) throw new Error("Item capability registry is required.");
  if (!presentationCore) throw new Error("Presentation contract is required.");
  if (!layoutProfiles) throw new Error("Layout profile contract is required.");
  if (!defaultPresentationPolicy) throw new Error("Default presentation policy is required.");

  const SCHEMA = "ConfiguratorAdministration2D 5.0";
  const PREVIOUS_SCHEMA = hierarchyV4.SCHEMA;
  const COMPONENTS = Object.freeze([...presentationCore.COMPONENTS]);

  function clone(value) {
    return structuredClone(value);
  }

  function sectionBehavior(section, registry) {
    const behaviors = new Set(
      (section?.itemIds || [])
        .map((id) => itemCapabilities.behaviorForKind(registry.get(id)))
        .filter(Boolean)
    );
    return behaviors.size === 1 ? [...behaviors][0] : null;
  }

  function migrationBehavior(stage, section, registry, hierarchyDefaults) {
    const kind = stage.kind || stage.id;
    const template = hierarchyDefaults?.stages?.[stage.id] || hierarchyDefaults?.stages?.[kind];
    const templateSection = template?.groups
      ?.flatMap((group) => group.sections || [])
      .find((entry) => entry.id === section.id);
    if (templateSection?.behavior) return templateSection.behavior;
    if (kind === "custom" && hierarchyDefaults?.customStage?.section?.behavior) {
      return hierarchyDefaults.customStage.section.behavior;
    }
    return sectionBehavior(section, registry);
  }

  function stageToV4(stage) {
    return {
      id: stage.id,
      kind: stage.kind || stage.id,
      label: stage.label,
      enabled: Boolean(stage.enabled),
      groups: (stage.groups || []).map((group) => ({
        id: group.id,
        label: group.label,
        columnSpan: group.columnSpan,
        sections: (group.sections || []).map((section) => ({
          id: section.id,
          label: section.label,
          presentation: presentationCore.legacyPresentationForComponent(section.component),
          itemIds: [...(section.itemIds || [])]
        }))
      }))
    };
  }

  function currentStageFromV4(stage, registry, hierarchyDefaults) {
    return {
      id: stage.id,
      kind: stage.kind || stage.id,
      label: stage.label,
      enabled: Boolean(stage.enabled),
      groups: (stage.groups || []).map((group) => ({
        id: group.id,
        label: group.label,
        columnSpan: group.columnSpan,
        sections: (group.sections || []).map((section) => {
          const behavior = migrationBehavior(stage, section, registry, hierarchyDefaults);
          if (!behavior) throw new TypeError(`cannot resolve section behavior: ${stage.id}/${section.id}`);
          return {
            id: section.id,
            label: section.label,
            behavior,
            component: presentationCore.resolveSectionComponent({
              presentation: section.presentation,
              behavior
            }),
            itemIds: [...section.itemIds]
          };
        })
      }))
    };
  }

  function flowShape(value) {
    return {
      stages: (value.stages || []).map((stage) => ({
        id: stage.id,
        groups: (stage.groups || []).map((group) => ({
          id: group.id,
          sections: (group.sections || []).map((section) => ({ id: section.id }))
        }))
      }))
    };
  }

  function normalize(value) {
    return {
      ...clone(value),
      schemaVersion: SCHEMA,
      revision: Number.isSafeInteger(value.revision) && value.revision > 0 ? value.revision : 1,
      presentationPolicy: clone(value.presentationPolicy),
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
            component: section.component,
            itemIds: [...section.itemIds]
          }))
        }))
      }))
    };
  }

  function toV4(value) {
    const { presentationPolicy: _presentationPolicy, ...rest } = clone(value);
    return {
      ...rest,
      schemaVersion: PREVIOUS_SCHEMA,
      stages: value.stages.map(stageToV4)
    };
  }

  function publicationSignature(value) {
    return JSON.stringify({
      stages: value.stages.map((stage) => ({
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
            component: section.component,
            itemIds: [...section.itemIds]
          }))
        }))
      })),
      presentationPolicy: value.presentationPolicy
    });
  }

  function validate(value, configurationCore, catalog, priceBook, scene) {
    const errors = [];
    if (!value || value.schemaVersion !== SCHEMA || !Array.isArray(value.stages)) {
      return ["unsupported current administration schema"];
    }
    if (!value.presentationPolicy) errors.push("presentation policy is required");

    let v4;
    try {
      v4 = toV4(value);
    } catch (error) {
      errors.push(error.message);
      return [...new Set(errors)];
    }

    hierarchyV4.validateHierarchyAdministration(v4, configurationCore, catalog, priceBook, scene)
      .forEach((error) => errors.push(`v4-compatible validation: ${error}`));

    const registry = configurationCore.itemRegistry(catalog);
    value.stages.forEach((stage) => {
      (stage.groups || []).forEach((group) => {
        (group.sections || []).forEach((section) => {
          const path = `${stage.id}.${section.id}`;
          if (Object.hasOwn(section, "presentation")) errors.push(`legacy section presentation is not allowed: ${path}`);
          try {
            presentationCore.assertComponent(section.component);
          } catch {
            errors.push(`invalid section component: ${path}`);
            return;
          }
          const behavior = sectionBehavior(section, registry);
          if (!behavior) return;
          if (!presentationCore.componentSupportsBehavior(section.component, behavior)) {
            errors.push(`component behavior mismatch: ${path}`);
          }
        });
      });
    });

    if (value.presentationPolicy) {
      presentationCore.validatePolicy(value.presentationPolicy, layoutProfiles.PROFILES, flowShape(value))
        .forEach((error) => errors.push(`presentation policy: ${error.path}: ${error.message}`));
    }
    return [...new Set(errors)];
  }

  function fromV4(value, configurationCore, catalog, priceBook, scene) {
    const v4Errors = hierarchyV4.validateHierarchyAdministration(value, configurationCore, catalog, priceBook, scene);
    if (v4Errors.length) throw new TypeError(v4Errors.join("; "));
    const registry = configurationCore.itemRegistry(catalog);
    const candidate = {
      ...clone(value),
      schemaVersion: SCHEMA,
      stages: value.stages.map((stage) => currentStageFromV4(stage, registry)),
      presentationPolicy: clone(defaultPresentationPolicy)
    };
    const errors = validate(candidate, configurationCore, catalog, priceBook, scene);
    if (errors.length) throw new TypeError(errors.join("; "));
    return normalize(candidate);
  }

  function upgrade(value, configurationCore, flowCore, catalog, priceBook, scene, hierarchyDefaults = null) {
    if (!value) throw new TypeError("configuration is required");
    if (value.schemaVersion === SCHEMA) {
      const errors = validate(value, configurationCore, catalog, priceBook, scene);
      if (errors.length) throw new TypeError(errors.join("; "));
      return normalize(value);
    }
    const v4 = value.schemaVersion === PREVIOUS_SCHEMA
      ? value
      : hierarchyV4.upgradeToHierarchy(value, configurationCore, flowCore, catalog, priceBook, scene, hierarchyDefaults);
    return fromV4(v4, configurationCore, catalog, priceBook, scene);
  }

  function projectToLegacy(value, configurationCore, flowCore, catalog, priceBook, scene, hierarchyDefaults = null) {
    const errors = validate(value, configurationCore, catalog, priceBook, scene);
    if (errors.length) return { ok: false, code: "invalid_hierarchy", errors };

    const v4 = toV4(value);
    const projected = hierarchyV4.projectHierarchyToLegacy(
      v4,
      configurationCore,
      flowCore,
      catalog,
      priceBook,
      scene,
      hierarchyDefaults
    );
    if (!projected.ok) return projected;

    const roundTrip = upgrade(
      projected.value,
      configurationCore,
      flowCore,
      catalog,
      priceBook,
      scene,
      hierarchyDefaults
    );
    if (publicationSignature(roundTrip) !== publicationSignature(normalize(value))) {
      return {
        ok: false,
        code: "hierarchy_requires_publication",
        errors: ["A hierarquia ou apresentação foi alterada e não pode ser reduzida ao schema publicado sem perda."]
      };
    }
    return projected;
  }

  const api = Object.freeze({
    SCHEMA,
    PREVIOUS_SCHEMA,
    COMPONENTS,
    COLUMN_SPANS: hierarchyV4.COLUMN_SPANS,
    upgrade,
    fromV4,
    normalize,
    validate,
    toV4,
    projectToLegacy,
    publicationSignature
  });

  if (typeof module !== "undefined" && module.exports) module.exports = api;
  if (global && typeof global === "object") global.CasaModulesAdministrationV5 = api;
})(typeof globalThis === "undefined" ? this : globalThis);
