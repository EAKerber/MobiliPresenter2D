(function registerAuthorizedBuyerConfiguration(global) {
  "use strict";

  // CP-PUBLIC-03a2-1. Server-only projection is a CONSTRUCTIVE field allowlist.
  // An authorized customer may see these commercial data to configure a quote.
  // It is NEVER an anonymous/public catalog projection.
  const SCHEMA = "BuyerConfiguration2D 0.1";
  const SOURCE = "ConfiguratorAdministration2D 5.0";
  const LOCAL_ASSET = /^assets\/(?!.*(?:^|\/)\.\.?\/)[A-Za-z0-9_./-]+\.(?:png|jpe?g|webp)$/i;
  const record = value => Boolean(value && typeof value === "object" && !Array.isArray(value));
  const list = value => {
    if (!Array.isArray(value)) throw new TypeError("buyer list is required");
    return value.map(item => {
      if (typeof item !== "string") throw new TypeError("invalid buyer list entry");
      return item;
    });
  };
  const id = value => {
    if (typeof value !== "string" || !/^[a-zA-Z0-9][a-zA-Z0-9_-]*$/.test(value)) {
      throw new TypeError("invalid buyer identifier");
    }
    return value;
  };
  const entries = value => {
    if (!record(value)) throw new TypeError("buyer map is required");
    return Object.entries(value);
  };
  const asset = value => {
    if (value === "") return "";
    if (typeof value !== "string" || !LOCAL_ASSET.test(value) || value.includes("..")) {
      throw new TypeError("unsafe buyer asset");
    }
    return value;
  };
  function projectPolicy(policy) {
    if (!record(policy) || !record(policy.stageViews)) throw new TypeError("presentation policy required");
    return {
      schemaVersion: policy.schemaVersion,
      stageViews: Object.fromEntries(entries(policy.stageViews).map(([stageId, stage]) => [
        id(stageId), { views: stage.views.map(view => ({
          id: view.id,
          sourceSectionId: view.sourceSectionId,
          component: view.component,
          role: view.role,
          ...(view.relation ? { relation: { kind: view.relation.kind, of: view.relation.of } } : {}),
          ...(view.projectionByProfile ? {
            projectionByProfile: Object.fromEntries(entries(view.projectionByProfile))
          } : {})
        })) }
      ])),
      scene: { pip: {
        availableProfiles: list(policy.scene.pip.availableProfiles),
        activationByProfile: Object.fromEntries(entries(policy.scene.pip.activationByProfile))
      } },
      shell: { bottomDock: {
        enabled: policy.shell.bottomDock.enabled,
        slots: list(policy.shell.bottomDock.slots)
      } }
    };
  }
  function project(published, { administrationV5, configuration, catalog, priceBook, scene,
    pricingContract } = {}) {
    if (!published || published.schemaVersion !== SOURCE || !administrationV5
      || !configuration || !catalog || !priceBook || !scene || !pricingContract) {
      throw new TypeError("validated published v5 and dependencies required");
    }
    const errors = administrationV5.validate(published, configuration, catalog, priceBook, scene);
    if (errors.length) throw new TypeError("invalid published v5");
    const v5 = administrationV5.normalize(published);
    // All stage memberships retain the exact published order; no default stages.
    const stages = v5.stages.map(stage => ({
      id: id(stage.id), kind: id(stage.kind), label: stage.label, enabled: stage.enabled,
      groups: stage.groups.map(group => ({
        id: id(group.id), label: group.label, columnSpan: group.columnSpan,
        sections: group.sections.map(section => ({
          id: id(section.id), label: section.label,
          behavior: section.behavior, component: section.component,
          itemIds: list(section.itemIds).map(id)
        }))
      }))
    }));
    const itemIds = new Set(stages.flatMap(stage =>
      stage.groups.flatMap(group => group.sections.flatMap(section => section.itemIds))));
    const groups = v5.materialGroups.map(group => ({
      id: id(group.id), label: group.label,
      materialIds: list(group.materialIds).map(id),
      ...(group.mode != null ? { mode: group.mode } : {}),
      ...(group.scope != null ? { scope: group.scope } : {}),
      ...(group.moduleIds ? { moduleIds: list(group.moduleIds).map(id) } : {}),
      ...(group.linkedItemIds ? { linkedItemIds: list(group.linkedItemIds).map(id) } : {})
    }));
    const handlesGroup = groups.find(group => group.id === "handles-all");
    const stoneGroup = groups.find(group => group.id === "stone-all");
    const frontsGroup = groups.find(group => group.id === "fronts-all");
    if (!handlesGroup || !stoneGroup || !frontsGroup) throw new TypeError("required buyer material groups missing");
    const handleProductIds = new Set(handlesGroup.materialIds);
    const handleProducts = v5.handleProducts.filter(product => handleProductIds.has(product.id))
      .map(product => ({
        id: id(product.id), label: product.label, description: product.description,
        priceEntryId: id(product.priceEntryId), materialIds: list(product.materialIds).map(id)
      }));
    if (handleProducts.length !== handleProductIds.size) throw new TypeError("handle product coverage missing");
    // `handles-all.materialIds` refers to handle PRODUCT ids, not materials;
    // pulling them into the material set would incorrectly assert missing
    // material records and tempt fallback to the full admin inventory.
    const allowedMaterials = new Set(groups.filter(group => group.id !== "handles-all")
      .flatMap(group => group.materialIds));
    handleProducts.forEach(product => product.materialIds.forEach(value => allowedMaterials.add(value)));
    const materials = v5.materials.filter(item => allowedMaterials.has(item.id)).map(item => ({
      id: id(item.id), label: item.label, kind: item.kind,
      color: item.color, textureAsset: asset(item.textureAsset),
      textureSize: item.textureSize, groupIds: list(item.groupIds).map(id)
    }));
    if (materials.length !== allowedMaterials.size) throw new TypeError("material coverage missing");
    const finishes = v5.finishes.filter(item => frontsGroup.materialIds.includes(item.id))
      .map(item => ({
        id: id(item.id), enabled: item.enabled, scope: item.scope,
        moduleIds: list(item.moduleIds).map(id)
      }));
    if (finishes.length !== frontsGroup.materialIds.length) throw new TypeError("front finish coverage missing");
    // Editorial and scene artwork for only configured items/visible choices.
    // Other admin inventory records are neither needed nor returned.
    const editorialIds = new Set([...itemIds, ...stoneGroup.materialIds,
      ...handleProducts.map(product => product.priceEntryId)]);
    const objects = Object.fromEntries(entries(v5.objects)
      .filter(([key]) => editorialIds.has(key))
      .map(([key, item]) => [id(key), {
        title: item.title, description: item.description,
        benefits: list(item.benefits), components: list(item.components),
        requirements: list(item.requirements)
      }]));
    const objectAssets = Object.fromEntries(entries(v5.objectAssets)
      .filter(([key]) => itemIds.has(key))
      .map(([key, value]) => [id(key), {
        imageAsset: asset(value.imageAsset),
        detailImageAsset: asset(value.detailImageAsset),
        maskAsset: asset(value.maskAsset)
      }]));
    const initial = v5.initialState;
    const validEntityIds = new Set(scene.entities.map(entity => entity.id));
    const entities = Object.fromEntries(entries(initial.entities)
      .filter(([key]) => validEntityIds.has(key))
      .map(([key, value]) => [id(key), value]));
    const pricing = pricingContract.normalize(v5.pricing);
    return {
      schemaVersion: SCHEMA,
      sourceKind: "published-v5",
      stages,
      presentationPolicy: projectPolicy(v5.presentationPolicy),
      objects, objectAssets,
      initialState: {
        entities, services: list(initial.services).map(id),
        finishId: id(initial.finishId), handleId: id(initial.handleId),
        stonePackageId: id(initial.stonePackageId)
      },
      materials, materialGroups: groups, handleProducts, finishes,
      dependencies: v5.dependencies.map(entry => ({
        id: id(entry.id), dependentId: id(entry.dependentId),
        requires: list(entry.requires).map(id)
      })),
      events: v5.events.map(entry => ({
        id: id(entry.id), triggerId: id(entry.triggerId), when: entry.when,
        action: entry.action, targetId: id(entry.targetId),
        ...(entry.enabled !== undefined ? { enabled: entry.enabled } : {}),
        ...(entry.valueMm !== undefined ? { valueMm: entry.valueMm } : {})
      })),
      pricing
    };
  }

  // Browser adapter for the next checkpoint. A buyer DTO is NOT a v5 document.
  // Never reintroduce a raw administrative `source` as a transport contract.
  function prepare(dto, { flow, configuration, catalog, hierarchyDefaults,
    pricingContract, presentationCore, layoutProfiles } = {}) {
    if (!record(dto) || dto.schemaVersion !== SCHEMA || dto.sourceKind !== "published-v5") {
      throw new TypeError("unsupported buyer read model");
    }
    const expectedKeys = ["schemaVersion", "sourceKind", "stages", "presentationPolicy",
      "objects", "objectAssets", "initialState", "materials", "materialGroups",
      "handleProducts", "finishes", "dependencies", "events", "pricing"].sort();
    if (Object.keys(dto).sort().join("|") !== expectedKeys.join("|")) {
      throw new TypeError("unexpected buyer read-model fields");
    }
    const model = flow.normalizeFlow(dto, configuration.itemRegistry(catalog), hierarchyDefaults);
    presentationCore.assertValidPolicy(dto.presentationPolicy, layoutProfiles.PROFILES, model);
    const rules = pricingContract.normalize(dto.pricing);
    const displaySettings = {
      ...dto,
      stages: dto.stages.map(stage => {
        const declared = model.stages.find(item => item.id === stage.id);
        if (!declared) throw new TypeError("buyer stage missing from model");
        return {
          id: stage.id, kind: stage.kind, label: stage.label, enabled: stage.enabled,
          items: declared.groups.flatMap(group => group.sections.flatMap(section => section.itemIds))
        };
      })
    };
    return Object.freeze({
      flow: model, displaySettings,
      pricingRules: rules,
      presentationPolicy: structuredClone(dto.presentationPolicy)
    });
  }
  const api = Object.freeze({ SCHEMA, SOURCE, project, prepare });
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  if (global && typeof global === "object") global.CasaModulesAuthorizedBuyerConfiguration = api;
})(typeof globalThis === "undefined" ? this : globalThis);
