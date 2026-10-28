(function registerPublishedBuyerProjection(global) {
  "use strict";

  // Pure input boundary for the buyer. No request, DOM, state or fallback.
  // The validated source and normalized hierarchical flow retain semantic
  // authority; a flat stage view is derived only for legacy visual widgets.
  function prepare(value, {
    configuration, administrationV5, flow, catalog, priceBook, scene,
    hierarchyDefaults, pricingContract, defaultPresentationPolicy
  }) {
    if (!value || typeof value !== "object") {
      throw new TypeError("published buyer configuration is required");
    }
    const isV3 = value.schemaVersion === configuration.SCHEMA;
    const isV5 = value.schemaVersion === administrationV5.SCHEMA;
    if (!isV3 && !isV5) throw new TypeError("unsupported published buyer configuration schema");

    let normalized;
    if (isV3) {
      normalized = configuration.normalizeConfiguratorSettings(value, catalog, priceBook, scene);
    } else {
      const errors = administrationV5.validate(value, configuration, catalog, priceBook, scene);
      if (errors.length) throw new TypeError(errors.join("; "));
      normalized = administrationV5.normalize(value);
    }

    const normalizedFlow = flow.normalizeFlow(
      normalized, configuration.itemRegistry(catalog), hierarchyDefaults
    );

    const displaySettings = isV3 ? normalized : {
      ...structuredClone(normalized),
      // This is a strictly derived display projection; it must never be
      // passed to a schema normalizer or used as a second flow authority.
      stages: normalized.stages.map((stage) => {
        const declared = normalizedFlow.stages.find((entry) => entry.id === stage.id);
        if (!declared) throw new TypeError("published stage missing from normalized flow: " + stage.id);
        return {
          id: stage.id,
          kind: stage.kind || stage.id,
          label: stage.label,
          enabled: stage.enabled,
          items: declared.groups.flatMap((group) =>
            group.sections.flatMap((section) => section.itemIds)
          )
        };
      })
    };

    return Object.freeze({
      source: normalized,
      flow: normalizedFlow,
      displaySettings,
      pricingRules: isV5
        ? pricingContract.normalize(normalized.pricing)
        : pricingContract.upgradeLegacy(normalized.pricing),
      presentationPolicy: isV5
        ? structuredClone(normalized.presentationPolicy)
        : structuredClone(defaultPresentationPolicy)
    });
  }

  const BUYER_SCHEMA = "BuyerConfiguratorPayload 1.0";
  const BUYER_SETTING_FIELDS = Object.freeze([
    "stages", "dependencies", "events", "objectAssets", "objects", "initialState",
    "moduleDimensions", "finishes", "materials", "handleProducts", "materialGroups"
  ]);

  // The published V5 document is not the buyer transport schema. Construct
  // allowlisted nested records instead of copying arbitrary administrative
  // fields; preserve authored IDs, materials, geometry, labels and choices.
  const pick = (value, keys) => Object.fromEntries(keys
    .filter((key) => Object.hasOwn(value, key))
    .map((key) => [key, structuredClone(value[key])]));

  function pickRecords(records, keys) {
    return Object.fromEntries(Object.entries(records).map(([id, value]) => [id, pick(value, keys)]));
  }

  function pickItems(items, keys) {
    return items.map((value) => pick(value, keys));
  }

  function buyerPolicy(policy) {
    return {
      schemaVersion: policy.schemaVersion,
      stageViews: Object.fromEntries(Object.entries(policy.stageViews).map(([id, stage]) => [
        id, { views: stage.views.map((view) => ({
          ...pick(view, ["id", "sourceSectionId", "component", "role"]),
          ...(view.relation ? { relation: pick(view.relation, ["kind", "of"]) } : {}),
          ...(view.projectionByProfile
            ? { projectionByProfile: structuredClone(view.projectionByProfile) }
            : {})
        })) }
      ])),
      scene: {
        pip: {
          availableProfiles: [...policy.scene.pip.availableProfiles],
          activationByProfile: structuredClone(policy.scene.pip.activationByProfile)
        }
      },
      shell: {
        bottomDock: pick(policy.shell.bottomDock, ["enabled", "slots"])
      }
    };
  }

  function buyerDisplaySettings(value) {
    return {
      stages: pickItems(value.stages, ["id", "kind", "label", "enabled", "items"]),
      dependencies: pickItems(value.dependencies, ["id", "dependentId", "requires"]),
      events: pickItems(value.events, ["id", "triggerId", "when", "action", "targetId", "enabled", "valueMm"]),
      objectAssets: pickRecords(value.objectAssets, ["imageAsset", "detailImageAsset", "maskAsset"]),
      objects: pickRecords(value.objects, ["title", "description", "benefits", "components", "requirements"]),
      initialState: pick(value.initialState, [
        "entities", "viewerEntities", "services", "finishId", "handleId", "stonePackageId"
      ]),
      ...(value.moduleDimensions != null ? {
        moduleDimensions: pickRecords(value.moduleDimensions, ["width", "height", "depth"])
      } : {}),
      finishes: pickItems(value.finishes, ["id", "enabled", "scope", "moduleIds"]),
      materials: pickItems(value.materials, [
        "id", "label", "kind", "color", "textureAsset", "textureSize", "groupIds"
      ]),
      handleProducts: pickItems(value.handleProducts, [
        "id", "label", "description", "priceEntryId", "materialIds"
      ]),
      materialGroups: pickItems(value.materialGroups, [
        "id", "label", "materialIds", "mode", "scope", "moduleIds", "linkedItemIds"
      ])
    };
  }

  function project(value, dependencies) {
    const prepared = prepare(value, dependencies);
    const flow = structuredClone(prepared.flow);
    // The normalized flow keeps source revision for internal comparisons; the
    // wire DTO must not expose this administrative storage counter.
    flow.source.revision = null;
    return {
      schemaVersion: BUYER_SCHEMA,
      displaySettings: buyerDisplaySettings(prepared.displaySettings),
      flow,
      pricingRules: structuredClone(prepared.pricingRules),
      presentationPolicy: buyerPolicy(prepared.presentationPolicy)
    };
  }

  function consume(payload) {
    if (!payload || payload.schemaVersion !== BUYER_SCHEMA
      || !payload.displaySettings || typeof payload.displaySettings !== "object"
      || !Array.isArray(payload.displaySettings.stages)
      || !Array.isArray(payload.displaySettings.dependencies)
      || !Array.isArray(payload.displaySettings.events)
      || !Array.isArray(payload.displaySettings.finishes)
      || !Array.isArray(payload.displaySettings.materials)
      || !Array.isArray(payload.displaySettings.handleProducts)
      || !Array.isArray(payload.displaySettings.materialGroups)
      || !payload.displaySettings.initialState || typeof payload.displaySettings.initialState !== "object"
      || (payload.displaySettings.moduleDimensions != null && (typeof payload.displaySettings.moduleDimensions !== "object" || Array.isArray(payload.displaySettings.moduleDimensions)))
      || !payload.displaySettings.objectAssets || typeof payload.displaySettings.objectAssets !== "object"
      || !payload.displaySettings.objects || typeof payload.displaySettings.objects !== "object"
      || !payload.flow || !Array.isArray(payload.flow.stages)
      || !payload.pricingRules || typeof payload.pricingRules !== "object"
      || !payload.presentationPolicy || typeof payload.presentationPolicy !== "object") {
      throw new TypeError("invalid published buyer payload");
    }
    const displaySettings = Object.fromEntries(BUYER_SETTING_FIELDS
      .map((key) => [key, structuredClone(payload.displaySettings[key])]));
    return Object.freeze({
      displaySettings,
      flow: structuredClone(payload.flow),
      pricingRules: structuredClone(payload.pricingRules),
      presentationPolicy: structuredClone(payload.presentationPolicy)
    });
  }

  const api = Object.freeze({ BUYER_SCHEMA, prepare, project, consume });
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  if (global && typeof global === "object") global.CasaModulesPublishedBuyerProjection = api;
})(typeof window === "undefined" ? globalThis : window);
