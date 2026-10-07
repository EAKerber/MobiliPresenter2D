(function registerConfiguratorSettingsCore(global) {
  "use strict";

  const itemCapabilities = typeof module !== "undefined" && module.exports && typeof require === "function"
    ? require("./item-capabilities.js")
    : global?.CasaModulesItemCapabilities;
  const pricingContract = typeof module !== "undefined" && module.exports && typeof require === "function"
    ? require("./pricing-contract.js")
    : global?.CasaModulesPricingContract;
  if (!itemCapabilities) throw new Error("Item capability registry is required.");
  if (!pricingContract) throw new Error("Typed pricing contract is required.");

  const SCHEMA = "ConfiguratorAdministration2D 3.0";
  const PREVIOUS_SCHEMA = "ConfiguratorAdministration2D 2.0";
  const LEGACY_SCHEMA = "ConfiguratorAdministration2D 1.0";
  const CORE_STAGES = Object.freeze([...itemCapabilities.CORE_STAGE_KINDS]);
  const STAGE_KINDS = new Set(itemCapabilities.STAGE_KINDS);

  function legacyPriceBookPricing(priceBook) {
    if (priceBook?.pricing) {
      const projected = pricingContract.projectToLegacy(priceBook.pricing);
      if (!projected.ok) {
        throw new TypeError(`price book pricing is not v3-compatible: ${projected.errors?.[0] || projected.code}`);
      }
      return projected.value;
    }

    // Historical PriceBook 1.x input remains accepted only at this v3
    // compatibility boundary so old fixtures/imports can still be normalized.
    const legacy = {
      entries: { ...(priceBook?.entries || {}) },
      handleEntries: { ...(priceBook?.handleEntries || {}) },
      frontFinishRatesBps: { ...(priceBook?.frontFinishRatesBps || {}) },
      localEntries: { ...(priceBook?.localEntries || {}) },
      globalEntries: { ...(priceBook?.globalEntries || {}) },
      handleFrontTotal: priceBook?.handleFrontTotal
    };
    pricingContract.upgradeLegacy(legacy);
    return legacy;
  }

  function itemRegistry(catalog) {
    return new Map([
      ...catalog.modules.map((item) => [item.entityId, "module"]),
      ...catalog.accessories.map((item) => [item.entityId, "object"]),
      ...catalog.services.map((item) => [item.id, "service"]),
      ["fronts-all", "finish-group"], ["handles-all", "finish-group"], ["stone-all", "finish-group"], ["summary", "summary"],
      ...catalog.options.handles.map((item) => [item.id, "handle"]),
      ...catalog.options.stonePackages.map((item) => [item.id, "stone"]),
      ...catalog.options.finishes.map((item) => [item.id, "finish"])
    ]);
  }

  function defaultMaterials(catalog) {
    const records = [];
    catalog.options.finishes.forEach((item) => records.push({
      id: item.id, label: item.publicLabel, kind: "color", color: item.color,
      textureAsset: item.textureAsset || "", textureSize: item.textureSize || "cover", groupIds: ["fronts-all"],
      locked: true
    }));
    catalog.options.stonePackages.forEach((item) => records.push({
      id: item.id, label: item.label, kind: "texture", color: item.color ?? null,
      textureAsset: item.textureAsset || "", textureSize: "cover", groupIds: ["stone-all"], locked: true
    }));
    records.push({ id: "handle-chrome", label: "Cromado", kind: "color", color: "#b7b0a7", textureAsset: "", textureSize: "cover", groupIds: [], locked: true });
    return records;
  }

  function defaultHandleProducts(catalog) {
    return catalog.options.handles.filter((item) => item.id !== "none" && !item.isAbsence).map((item) => ({
      id: item.id === "tango-chrome" ? "tango-iris" : item.id,
      label: item.label,
      description: item.description || "",
      priceEntryId: item.id,
      materialIds: item.id === "tango-chrome" ? ["handle-chrome"] : []
    }));
  }

  function createDefaultAdministration(settings, catalog, priceBook, scene) {
    const legacyPricing = legacyPriceBookPricing(priceBook);
    const objects = {};
    [...catalog.modules, ...catalog.accessories].forEach((item) => {
      objects[item.entityId] = { title: item.title, description: item.description || "", benefits: [...(item.benefits || [])], components: [...(item.components || [])], requirements: [...(item.requirements || [])] };
    });
    catalog.services.forEach((item) => { objects[item.id] = { title: item.title, description: item.description || "", benefits: [], components: [], requirements: [] }; });
    [...catalog.options.handles, ...catalog.options.stonePackages].forEach((item) => {
      objects[item.id] = { title: item.label, description: item.description || "", benefits: [], components: [], requirements: [] };
    });
    const stages = structuredClone(settings.stages).map((stage) => ({ ...stage, kind: stage.id }));
    const sceneEntities = new Map((scene?.entities || []).map((entity) => [entity.id, entity]));
    const objectAssets = Object.fromEntries(Object.keys(objects).map((id) => {
      const entity = sceneEntities.get(id);
      return [id, { imageAsset: entity?.asset || "", detailImageAsset: entity?.asset || "", maskAsset: entity?.maskAsset || "" }];
    }));
    const moduleIds = catalog.modules.map((item) => item.entityId);
    return {
      schemaVersion: SCHEMA,
      revision: 1,
      stages,
      objects,
      objectAssets,
      initialState: {
        entities: Object.fromEntries([...moduleIds, ...catalog.accessories.map((item) => item.entityId)].map((id) => [id, true])),
        services: catalog.services.filter((item) => item.defaultSelected).map((item) => item.id),
        finishId: catalog.options.finishes[0]?.id || "base-light",
        handleId: "none",
        stonePackageId: "stone-existing"
      },
      materials: defaultMaterials(catalog),
      materialGroups: [
        { id: "fronts-all", label: "Frentes", materialIds: catalog.options.finishes.map((item) => item.id), mode: "finish", scope: "global", moduleIds: [...moduleIds] },
        { id: "handles-all", label: "Modelos de puxador", materialIds: defaultHandleProducts(catalog).map((item) => item.id), mode: "handle", scope: "global", moduleIds: [...moduleIds] },
        { id: "stone-all", label: "Pedra e rodapé", materialIds: catalog.options.stonePackages.map((item) => item.id), mode: "stone", linkedItemIds: ["stone-skirting"] }
      ],
      handleProducts: defaultHandleProducts(catalog),
      finishes: catalog.options.finishes.map((item) => ({ id: item.id, enabled: item.status === "published", scope: "global", moduleIds: [...moduleIds] })),
      dependencies: [{ id: "lighting-requires-supports", dependentId: "lighting-08", requires: ["module-04", "module-06"] }],
      events: [{ id: "module-07-depth-without-fridge-side", triggerId: "module-04", when: "disabled", action: "set-depth", targetId: "module-07", valueMm: 400 }],
      pricing: {
        entries: { ...legacyPricing.entries },
        handleEntries: { ...legacyPricing.handleEntries },
        frontFinishRatesBps: { ...legacyPricing.frontFinishRatesBps },
        localEntries: { ...legacyPricing.localEntries },
        globalEntries: { ...legacyPricing.globalEntries },
        handleFrontTotal: legacyPricing.handleFrontTotal
      }
    };
  }

  function resolveEventState(scene, state, events = [], dependencies = []) {
    const effective = {
      ...state,
      visibilityByEntity: { ...state.visibilityByEntity },
      globalSelections: { ...state.globalSelections, serviceIds: [...(state.globalSelections?.serviceIds || [])] }
    };
    const rawIsActive = (id) => Object.hasOwn(state.visibilityByEntity, id) ? Boolean(state.visibilityByEntity[id]) : Boolean(state.globalSelections?.serviceIds?.includes(id));
    const requirements = (id) => [...new Set([
      ...(scene.entities.find((entity) => entity.id === id)?.requiresVisibleIds || []),
      ...dependencies.filter((rule) => rule.dependentId === id).flatMap((rule) => rule.requires)
    ])];
    const forcedOff = new Set();
    const forcedOn = new Set();
    events.filter((rule) => rule.action === "set-enabled" && rawIsActive(rule.triggerId) === (rule.when === "enabled")).forEach((rule) => {
      if (Object.hasOwn(effective.visibilityByEntity, rule.targetId)) effective.visibilityByEntity[rule.targetId] = rule.enabled;
      else {
        const services = new Set(effective.globalSelections.serviceIds);
        if (rule.enabled) services.add(rule.targetId);
        else services.delete(rule.targetId);
        effective.globalSelections.serviceIds = [...services];
      }
      (rule.enabled ? forcedOn : forcedOff).add(rule.targetId);
    });
    const setSelected = (id, enabled) => {
      if (Object.hasOwn(effective.visibilityByEntity, id)) effective.visibilityByEntity[id] = enabled;
      else {
        const services = new Set(effective.globalSelections.serviceIds);
        if (enabled) services.add(id);
        else services.delete(id);
        effective.globalSelections.serviceIds = [...services];
      }
    };
    const visiting = new Set();
    const enableRequirements = (id) => {
      if (visiting.has(id)) return;
      visiting.add(id);
      requirements(id).forEach((required) => { setSelected(required, true); enableRequirements(required); });
      visiting.delete(id);
    };
    forcedOn.forEach(enableRequirements);
    const disableDependents = (id, visited = new Set()) => {
      if (visited.has(id)) return;
      visited.add(id);
      scene.entities.filter((entity) => requirements(entity.id).includes(id)).forEach((entity) => {
        if (rawIsActive(entity.id) || forcedOn.has(entity.id)) setSelected(entity.id, false);
        disableDependents(entity.id, visited);
      });
    };
    forcedOff.forEach((id) => disableDependents(id));
    return effective;
  }

  function migrateLegacy(value, catalog, priceBook, scene) {
    const base = createDefaultAdministration({ stages: value.stages || [] }, catalog, priceBook, scene);
    const sections = ["entries", "handleEntries", "frontFinishRatesBps", "localEntries", "globalEntries"];
    return {
      ...base,
      revision: value.revision || 1,
      stages: (value.stages || base.stages).map((stage) => ({ ...stage, kind: stage.kind || stage.id })),
      objects: { ...base.objects, ...(value.objects || {}) },
      finishes: base.finishes.map((finish) => ({ ...finish, ...(value.finishes || []).find((item) => item.id === finish.id) })),
      pricing: { ...base.pricing, ...(value.pricing || {}), ...Object.fromEntries(sections.map((key) => [key, { ...base.pricing[key], ...(value.pricing?.[key] || {}) }])) }
    };
  }

  function migrateCurrentHandleModel(value, catalog, priceBook, scene) {
    if (!value) return value;
    if (value.schemaVersion === SCHEMA) {
      const base = createDefaultAdministration({ stages: value.stages || [] }, catalog, priceBook, scene);
      return {
        ...value,
        objects: { ...base.objects, ...(value.objects || {}) },
        objectAssets: { ...base.objectAssets, ...(value.objectAssets || {}) }
      };
    }
    if (![PREVIOUS_SCHEMA, LEGACY_SCHEMA].includes(value.schemaVersion)) return value;
    if (value.schemaVersion === LEGACY_SCHEMA) return migrateLegacy(value, catalog, priceBook, scene);
    const base = createDefaultAdministration({ stages: value.stages || [] }, catalog, priceBook, scene);
    const previousProducts = value.handleProducts || [];
    const handleProducts = defaultHandleProducts(catalog).map((item) => {
      const previous = previousProducts.find((product) => product.priceEntryId === item.priceEntryId);
      return { ...item, label: previous?.label || item.label, description: previous?.description || item.description, materialIds: [...item.materialIds] };
    });
    const productByPriceId = new Map(handleProducts.map((item) => [item.priceEntryId, item]));
    const oldHandles = value.materialGroups?.find((group) => group.id === "handles-all");
    const oldMaterials = value.materials || base.materials;
    const materials = oldMaterials.filter((item) => !item.groupIds?.includes("handles-all") && !productByPriceId.has(item.id)).map((item) => ({ ...item, groupIds: (item.groupIds || []).filter((id) => ["fronts-all", "stone-all"].includes(id)) }));
    const materialById = new Map(materials.map((item) => [item.id, item]));
    handleProducts.forEach((product) => {
      const previous = previousProducts.find((item) => item.priceEntryId === product.priceEntryId);
      const fromOldColors = (previous?.colors || []).map((color) => ({ id: `handle-${product.id}-${color.id}`.slice(0, 40), label: color.label, kind: "color", color: color.color, textureAsset: "", textureSize: "cover", groupIds: [], locked: false }));
      fromOldColors.forEach((material) => { if (!materialById.has(material.id)) { materials.push(material); materialById.set(material.id, material); } });
      product.materialIds = [...new Set([...(previous?.materialIds || []), ...fromOldColors.map((item) => item.id)])].filter((id) => materialById.has(id));
      if (product.priceEntryId === "tango-chrome" && materialById.has("handle-chrome")) product.materialIds = [...new Set(["handle-chrome", ...product.materialIds])];
    });
    const materialGroups = base.materialGroups.map((group) => {
      const oldGroup = value.materialGroups?.find((item) => item.id === group.id);
      if (!oldGroup) return group;
      const ids = group.id === "handles-all"
        ? oldGroup.materialIds.map((id) => productByPriceId.get(id)?.id || handleProducts.find((item) => item.id === id)?.id).filter(Boolean)
        : oldGroup.materialIds.filter((id) => materialById.has(id));
      return { ...group, ...oldGroup, materialIds: ids.length ? ids : [...group.materialIds] };
    });
    const initialHandle = value.initialState?.handleId;
    const migratedInitialHandle = initialHandle === "none" ? "none" : productByPriceId.get(initialHandle)?.priceEntryId || "none";
    const validPriceIds = new Set(["none", ...handleProducts.map((item) => item.priceEntryId)]);
    const handleEntries = Object.fromEntries(Object.entries(value.pricing?.handleEntries || {}).filter(([id]) => validPriceIds.has(id)));
    return {
      ...base, ...value, schemaVersion: SCHEMA,
      stages: (value.stages || base.stages).map((stage) => ({ ...stage, kind: stage.kind || stage.id })),
      objects: { ...base.objects, ...(value.objects || {}) }, objectAssets: { ...base.objectAssets, ...(value.objectAssets || {}) },
      materials, materialGroups, handleProducts,
      initialState: { ...base.initialState, ...(value.initialState || {}), handleId: migratedInitialHandle },
      finishes: base.finishes.map((finish) => ({ ...finish, ...(value.finishes || []).find((item) => item.id === finish.id) })).filter((finish) => materialGroups.find((item) => item.id === "fronts-all")?.materialIds.includes(finish.id)),
      pricing: { ...base.pricing, ...(value.pricing || {}), handleEntries, frontFinishRatesBps: { ...base.pricing.frontFinishRatesBps, ...(value.pricing?.frontFinishRatesBps || {}) }, localEntries: { ...base.pricing.localEntries, ...(value.pricing?.localEntries || {}) }, globalEntries: { ...base.pricing.globalEntries, ...(value.pricing?.globalEntries || {}) } },
      dependencies: value.dependencies || base.dependencies, events: value.events || base.events
    };
  }

  function validateConfiguratorSettings(value, catalog, priceBook, scene) {
    const errors = [];
    let legacyPriceBook;
    try {
      legacyPriceBook = legacyPriceBookPricing(priceBook);
    } catch (error) {
      return [error.message || "price book pricing is not v3-compatible"];
    }
    if (!value || ![SCHEMA, LEGACY_SCHEMA].includes(value.schemaVersion) || !Array.isArray(value.stages)) return ["unsupported settings schema"];
    const registry = itemRegistry(catalog);
    const moduleIds = new Set(catalog.modules.map((item) => item.entityId));
    const entityIds = new Set([
      ...catalog.modules.map((item) => item.entityId),
      ...catalog.accessories.map((item) => item.entityId),
      "tempered-glass", "lighting-08"
    ]);
    const eventTriggerIds = new Set([...entityIds, ...catalog.services.map((item) => item.id)]);
    const stageIds = new Set();
    const stageKinds = new Set();
    const assignedItems = new Set();
    if (!value.stages.some((stage) => stage?.kind === "modules" || stage?.id === "modules")) errors.push("modules stage must remain");
    if (!value.stages.some((stage) => stage?.kind === "summary" || stage?.id === "summary")) errors.push("summary stage must remain");
    if (value.stages.length < 2 || value.stages.length > 12) errors.push("stage count must be between 2 and 12");
    for (const stage of value.stages) {
      if (!stage || typeof stage.id !== "string" || !/^[a-z][a-z0-9-]{1,39}$/.test(stage.id)) { errors.push("invalid stage id"); continue; }
      if (stageIds.has(stage.id)) errors.push(`duplicate stage: ${stage.id}`);
      stageIds.add(stage.id);
      const kind = stage.kind || stage.id;
      if (!STAGE_KINDS.has(kind)) errors.push(`invalid stage type: ${stage.id}`);
      if (kind !== "custom" && stageKinds.has(kind)) errors.push(`duplicate stage type: ${kind}`);
      if (kind !== "custom") stageKinds.add(kind);
      if (typeof stage.label !== "string" || !stage.label.trim() || stage.label.trim().length > 40) errors.push(`invalid label: ${stage.id}`);
      if (typeof stage.enabled !== "boolean") errors.push(`invalid enabled state: ${stage.id}`);
      if (kind === "modules" && stage.enabled !== true) errors.push("modules stage must remain enabled");
      if (kind === "summary" && stage.enabled !== true) errors.push("summary stage must remain enabled");
      if (!Array.isArray(stage.items) || stage.items.length > 80) { errors.push(`invalid item list: ${stage.id}`); continue; }
      for (const id of stage.items) {
        const itemKind = registry.get(id);
        if (!itemKind) errors.push(`unknown stage item: ${id}`);
        else if (!itemCapabilities.stageAllowsItem(kind, id, itemKind, catalog)) errors.push(`invalid ${kind} item: ${id}`);
        if (assignedItems.has(id)) errors.push(`item assigned more than once: ${id}`);
        assignedItems.add(id);
      }
      if (stage.enabled && stage.items.length === 0) errors.push(`enabled stage must contain an item: ${stage.id}`);
    }
    const moduleStage = value.stages.find((stage) => (stage.kind || stage.id) === "modules");
    if (moduleStage && !moduleStage.items.some((id) => moduleIds.has(id))) errors.push("modules stage must contain a module");
    const activeItems = new Set(value.stages.filter((stage) => stage.enabled).flatMap((stage) => stage.items));
    if (activeItems.has("stone-skirting") && !activeItems.has("stone-all")) errors.push("stone skirting requires the stone item");

    const defaults = value.initialState;
    if (!defaults || typeof defaults !== "object") errors.push("initial state is required");
    else {
      if (!defaults.entities || Object.keys(defaults.entities).some((id) => !entityIds.has(id)) || Object.values(defaults.entities).some((enabled) => typeof enabled !== "boolean")) errors.push("invalid initial entity state");
      // lighting-08 is retained here only for backwards-compatible published states;
      // canonical service identifiers come from the public catalog.
      const allowedServices = new Set([...catalog.services.map((item) => item.id), "lighting-08"]);
      if (!Array.isArray(defaults.services) || defaults.services.some((id) => !allowedServices.has(id)) || new Set(defaults.services).size !== defaults.services.length) errors.push("invalid initial services");
    }

    const validAssetPath = (asset) => /^assets\/[A-Za-z0-9_./-]+\.(png|webp|jpe?g)$/i.test(asset) && !asset.includes("..") && !asset.includes("//");
    const objectIds = new Set(Object.keys(createDefaultAdministration({ stages: [] }, catalog, priceBook, scene).objects));
    if (!value.objects || typeof value.objects !== "object" || Array.isArray(value.objects)) errors.push("object data is required");
    else {
      for (const id of objectIds) {
        const item = value.objects[id];
        if (!item || typeof item !== "object") { errors.push(`missing object data: ${id}`); continue; }
        if (typeof item.title !== "string" || !item.title.trim() || item.title.length > 100) errors.push(`invalid title: ${id}`);
        if (typeof item.description !== "string" || item.description.length > 240) errors.push(`invalid description: ${id}`);
        for (const field of ["benefits", "components", "requirements"]) if (!Array.isArray(item[field]) || item[field].length > 12 || item[field].some((entry) => typeof entry !== "string" || entry.length > 180)) errors.push(`invalid ${field}: ${id}`);
      }
      if (Object.keys(value.objects).some((id) => !objectIds.has(id))) errors.push("unknown object data");
    }
    if (!value.objectAssets || typeof value.objectAssets !== "object") errors.push("object assets are required");
    else Object.entries(value.objectAssets).forEach(([id, assets]) => {
      if (!objectIds.has(id) || !assets || typeof assets !== "object") { errors.push(`invalid object assets: ${id}`); return; }
      for (const field of ["imageAsset", "detailImageAsset", "maskAsset"]) if (typeof assets[field] !== "string" || (assets[field] && !validAssetPath(assets[field]))) errors.push(`invalid asset path: ${id}.${field}`);
    });

    const materialIds = new Set((value.materials || []).map((item) => item.id));
    const handleProductIds = new Set((value.handleProducts || []).map((item) => item.id));
    if (!Array.isArray(value.handleProducts) || value.handleProducts.length !== catalog.options.handles.filter((item) => item.id !== "none" && !item.isAbsence).length) errors.push("handle products must match the catalog");
    else {
      const ids = new Set(); const priceIds = new Set();
      value.handleProducts.forEach((product) => {
        if (!product || !/^[a-z][a-z0-9-]{1,39}$/.test(product.id) || ids.has(product.id) || !/^[a-z][a-z0-9-]{1,39}$/.test(product.priceEntryId) || priceIds.has(product.priceEntryId)) { errors.push("invalid or duplicate handle product"); return; }
        ids.add(product.id); priceIds.add(product.priceEntryId);
        if (!catalog.options.handles.some((item) => item.id === product.priceEntryId && !item.isAbsence && item.id !== "none") || typeof product.label !== "string" || !product.label.trim() || product.label.length > 60 || typeof product.description !== "string" || product.description.length > 180) errors.push(`invalid handle product data: ${product.id}`);
        if (!Array.isArray(product.materialIds) || product.materialIds.length > 100 || product.materialIds.some((id) => !materialIds.has(id)) || new Set(product.materialIds).size !== product.materialIds.length) errors.push(`invalid handle materials: ${product.id}`);
      });
    }

    if (!Array.isArray(value.materials) || value.materials.length < 1 || value.materials.length > 100) errors.push("material library must contain 1 to 100 entries");
    else {
      const ids = new Set();
      value.materials.forEach((material) => {
        if (!material || !/^[a-z][a-z0-9-]{1,39}$/.test(material.id) || ids.has(material.id)) { errors.push("invalid or duplicate material id"); return; }
        ids.add(material.id);
        if (typeof material.label !== "string" || !material.label.trim() || material.label.length > 60) errors.push(`invalid material label: ${material.id}`);
        if (!["color", "texture"].includes(material.kind)) errors.push(`invalid material type: ${material.id}`);
        const hasAuthoredColor = Object.hasOwn(material, "color");
        const validAuthoredColor = material.color === null || /^(#[0-9a-fA-F]{6})$/.test(material.color || "");
        if (!hasAuthoredColor || !validAuthoredColor || (material.kind === "color" && material.color === null)) errors.push(`invalid material color: ${material.id}`);
        if (typeof material.textureAsset !== "string" || (material.textureAsset && !validAssetPath(material.textureAsset))) errors.push(`invalid material texture: ${material.id}`);
        if (typeof material.textureSize !== "string" || !["cover", "contain"].includes(material.textureSize) && !/^\d{2,3}px \d{2,3}px$/.test(material.textureSize)) errors.push(`invalid material texture size: ${material.id}`);
        if (!Array.isArray(material.groupIds) || material.groupIds.some((group) => !["fronts-all", "stone-all"].includes(group))) errors.push(`invalid material groups: ${material.id}`);
      });
    }
    const groups = new Set();
    if (!Array.isArray(value.materialGroups) || value.materialGroups.length !== 3) errors.push("three material groups are required");
    else value.materialGroups.forEach((group) => {
      if (!group || !["fronts-all", "handles-all", "stone-all"].includes(group.id) || groups.has(group.id)) { errors.push("invalid material group"); return; }
      groups.add(group.id);
      if (typeof group.label !== "string" || !group.label.trim() || group.label.length > 60) errors.push(`invalid material group label: ${group.id}`);
      const validIds = group.id === "handles-all" ? handleProductIds : materialIds;
      if (!Array.isArray(group.materialIds) || group.materialIds.length < 1 || group.materialIds.length > 100 || group.materialIds.some((id) => !validIds.has(id)) || new Set(group.materialIds).size !== group.materialIds.length) errors.push(`invalid group materials: ${group.id}`);
      if (group.id === "fronts-all" && (! ["global", "local"].includes(group.scope) || !Array.isArray(group.moduleIds) || group.moduleIds.some((id) => !moduleIds.has(id)))) errors.push("invalid front finish scope");
    });
    const groupById = new Map((value.materialGroups || []).map((group) => [group.id, group]));
    (value.materials || []).forEach((material) => (material.groupIds || []).forEach((groupId) => {
      if (!groupById.get(groupId)?.materialIds?.includes(material.id)) errors.push(`material and group do not match: ${material.id}`);
    }));

    const frontsGroup = groupById.get("fronts-all");
    if (!Array.isArray(value.finishes) || value.finishes.some((item) => !frontsGroup?.materialIds.includes(item.id) || typeof item.enabled !== "boolean" || !["global", "local"].includes(item.scope) || !Array.isArray(item.moduleIds) || item.moduleIds.some((id) => !moduleIds.has(id))) || new Set((value.finishes || []).map((item) => item.id)).size !== (value.finishes || []).length || frontsGroup?.materialIds.some((id) => !value.finishes.some((item) => item.id === id))) errors.push("invalid finish availability");
    else if (!value.finishes.some((item) => item.enabled && item.scope === "global" && frontsGroup?.materialIds.includes(item.id))) errors.push("at least one global front finish must remain available");
    if (defaults && (!value.finishes?.some((item) => item.id === defaults.finishId && item.enabled && item.scope === "global") || !value.handleProducts?.some((item) => item.priceEntryId === defaults.handleId && groupById.get("handles-all")?.materialIds.includes(item.id)) && defaults.handleId !== "none" || !groupById.get("stone-all")?.materialIds.includes(defaults.stonePackageId))) errors.push("invalid initial material selection");

    const dependencyIds = new Set();
    if (!Array.isArray(value.dependencies) || value.dependencies.length > 80) errors.push("invalid dependency list");
    else value.dependencies.forEach((rule) => {
      if (!rule || !/^[a-z][a-z0-9-]{1,39}$/.test(rule.id) || dependencyIds.has(rule.id)) { errors.push("invalid dependency id"); return; }
      dependencyIds.add(rule.id);
      if (!entityIds.has(rule.dependentId) || !Array.isArray(rule.requires) || rule.requires.length < 1 || rule.requires.length > 8 || rule.requires.some((id) => !entityIds.has(id) || id === rule.dependentId) || new Set(rule.requires).size !== rule.requires.length) errors.push(`invalid dependency: ${rule.id}`);
    });
    if (Array.isArray(value.dependencies)) {
      const graph = new Map();
      value.dependencies.forEach((rule) => graph.set(rule.dependentId, [...(graph.get(rule.dependentId) || []), ...rule.requires]));
      const visiting = new Set(); const visited = new Set();
      const hasCycle = (id) => {
        if (visiting.has(id)) return true;
        if (visited.has(id)) return false;
        visiting.add(id);
        for (const required of graph.get(id) || []) if (hasCycle(required)) return true;
        visiting.delete(id); visited.add(id); return false;
      };
      if ([...graph.keys()].some(hasCycle)) errors.push("dependency cycle is not allowed");
    }
    const eventIds = new Set();
    const eventDimensionTargets = new Set();
    const eventStateTargets = new Set();
    if (!Array.isArray(value.events) || value.events.length > 40) errors.push("invalid event list");
    else value.events.forEach((rule) => {
      if (!rule || !/^[a-z][a-z0-9-]{1,39}$/.test(rule.id) || eventIds.has(rule.id)) { errors.push("invalid event id"); return; }
      eventIds.add(rule.id);
      const validTrigger = eventTriggerIds.has(rule.triggerId) && ["enabled", "disabled"].includes(rule.when);
      const legacyDepth = rule.action === "set-depth" && rule.targetId === "module-07" && Number.isInteger(rule.valueMm) && rule.valueMm >= 300 && rule.valueMm <= 700;
      const targetModule = catalog.modules.find((item) => item.entityId === rule.targetId);
      const dimensions = ["width", "height", "depth"];
      const dimension = rule.action === "set-dimension" && targetModule && dimensions.includes(rule.dimension)
        && Number.isFinite(targetModule.dimensions?.nominalMm?.[rule.dimension])
        && Number.isInteger(rule.valueMm) && rule.valueMm >= 1 && rule.valueMm <= 5000;
      const stateChange = rule.action === "set-enabled" && eventTriggerIds.has(rule.targetId)
        && rule.targetId !== rule.triggerId && typeof rule.enabled === "boolean";
      if (!validTrigger || !(legacyDepth || dimension || stateChange)) errors.push(`invalid event: ${rule.id}`);
      else {
        if (stateChange) {
          if (eventStateTargets.has(rule.targetId)) errors.push(`conflicting event target: ${rule.id}`);
          eventStateTargets.add(rule.targetId);
        } else {
          const key = `${rule.targetId}:${legacyDepth ? "depth" : rule.dimension}`;
          if (eventDimensionTargets.has(key)) errors.push(`conflicting event target: ${rule.id}`);
          eventDimensionTargets.add(key);
        }
      }
    });

    const priceSections = ["entries", "handleEntries", "frontFinishRatesBps", "localEntries", "globalEntries"];
    if (!value.pricing || typeof value.pricing !== "object") errors.push("pricing is required");
    else priceSections.forEach((section) => {
      const allowedIds = Object.keys(legacyPriceBook[section] || {});
      const submitted = value.pricing[section];
      if (!submitted || typeof submitted !== "object" || Array.isArray(submitted)) { errors.push(`invalid pricing section: ${section}`); return; }
      const dynamicGroup = section === "frontFinishRatesBps" ? "fronts-all" : section === "handleEntries" ? "handles-all" : section === "globalEntries" ? "stone-all" : null;
      const dynamicIds = dynamicGroup === "handles-all" ? (value.handleProducts || []).filter((item) => groupById.get(dynamicGroup)?.materialIds.includes(item.id)).map((item) => item.priceEntryId) : groupById.get(dynamicGroup)?.materialIds || [];
      if (Object.keys(submitted).some((id) => !allowedIds.includes(id) && !dynamicIds.includes(id)) || allowedIds.some((id) => !Object.hasOwn(submitted, id))) errors.push(`pricing identifiers must match: ${section}`);
      Object.entries(submitted).forEach(([id, amount]) => {
        const maximum = section === "frontFinishRatesBps" ? 10000 : 100000000;
        if (!Number.isSafeInteger(amount) || amount < 0 || amount > maximum) errors.push(`invalid price value: ${section}.${id}`);
      });
    });
    if (value.pricing?.handleFrontTotal !== legacyPriceBook.handleFrontTotal) errors.push("handle front total is fixed");
    return errors;
  }

  function normalizeConfiguratorSettings(input, catalog, priceBook, scene) {
    const value = migrateCurrentHandleModel(input, catalog, priceBook, scene);
    const errors = validateConfiguratorSettings(value, catalog, priceBook, scene);
    if (errors.length) throw new TypeError(errors.join("; "));
    return {
      schemaVersion: SCHEMA,
      revision: Number.isSafeInteger(value.revision) && value.revision > 0 ? value.revision : 1,
      stages: value.stages.map((stage) => ({ id: stage.id, kind: stage.kind || stage.id, label: stage.label.trim(), enabled: stage.enabled, items: [...new Set(stage.items)] })),
      objects: Object.fromEntries(Object.entries(value.objects).map(([id, item]) => [id, { title: item.title.trim(), description: item.description.trim(), benefits: item.benefits.map((entry) => entry.trim()).filter(Boolean), components: item.components.map((entry) => entry.trim()).filter(Boolean), requirements: item.requirements.map((entry) => entry.trim()).filter(Boolean) }])),
      objectAssets: Object.fromEntries(Object.entries(value.objectAssets).map(([id, assets]) => [id, { imageAsset: assets.imageAsset, detailImageAsset: assets.detailImageAsset || assets.imageAsset, maskAsset: assets.maskAsset }])),
      initialState: { entities: { ...value.initialState.entities }, services: [...value.initialState.services], finishId: value.initialState.finishId, handleId: value.initialState.handleId, stonePackageId: value.initialState.stonePackageId },
      materials: value.materials.map((item) => ({ id: item.id, label: item.label.trim(), kind: item.kind === "texture" ? "texture" : "color", color: item.color, textureAsset: item.textureAsset, textureSize: item.textureSize || "cover", groupIds: [...item.groupIds], locked: Boolean(item.locked) })),
      handleProducts: value.handleProducts.map((item) => ({ id: item.id, label: item.label.trim(), description: item.description.trim(), priceEntryId: item.priceEntryId, materialIds: [...item.materialIds] })),
      materialGroups: value.materialGroups.map((group) => ({ ...group, materialIds: [...group.materialIds], ...(group.moduleIds ? { moduleIds: [...group.moduleIds] } : {}), ...(group.linkedItemIds ? { linkedItemIds: [...group.linkedItemIds] } : {}) })),
      finishes: value.finishes.map((item) => ({ id: item.id, enabled: item.enabled, scope: item.scope, moduleIds: [...item.moduleIds] })),
      dependencies: value.dependencies.map((item) => ({ id: item.id, dependentId: item.dependentId, requires: [...item.requires] })),
      events: value.events.map((item) => ({ id: item.id, triggerId: item.triggerId, when: item.when, action: item.action, targetId: item.targetId, valueMm: item.valueMm })),
      pricing: Object.fromEntries(["entries", "handleEntries", "frontFinishRatesBps", "localEntries", "globalEntries", "handleFrontTotal"].map((key) => [key, key === "handleFrontTotal" ? value.pricing[key] : { ...value.pricing[key] }]))
    };
  }

  const api = Object.freeze({ createDefaultAdministration, validateConfiguratorSettings, normalizeConfiguratorSettings, resolveEventState, itemRegistry, SCHEMA });
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  if (global && typeof global === "object") global.CasaModulesConfiguration = api;
})(typeof globalThis === "undefined" ? this : globalThis);
