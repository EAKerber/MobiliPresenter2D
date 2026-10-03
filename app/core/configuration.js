(function registerConfiguratorSettingsCore(global) {
  "use strict";

  const SCHEMA = "ConfiguratorAdministration2D 2.0";
  const LEGACY_SCHEMA = "ConfiguratorAdministration2D 1.0";
  const CORE_STAGES = Object.freeze(["modules", "summary"]);
  const STAGE_KINDS = new Set(["modules", "finishes", "services", "summary", "custom"]);

  function itemRegistry(catalog) {
    return new Map([
      ...catalog.modules.map((item) => [item.entityId, "module"]),
      ...catalog.accessories.map((item) => [item.entityId, "object"]),
      ...catalog.services.map((item) => [item.id, "service"]),
      ["fronts-all", "finish-group"], ["handles-all", "finish-group"], ["stone-all", "finish-group"], ["stone-skirting", "service"], ["summary", "summary"],
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
      id: item.id, label: item.label, kind: "texture", color: item.color || item.swatchColor || "#b7b0a7",
      textureAsset: item.textureAsset || "", textureSize: "cover", groupIds: ["stone-all"], locked: true
    }));
    catalog.options.handles.filter((item) => item.id !== "none").forEach((item) => records.push({
      id: item.id, label: item.label, kind: "color", color: item.color || "#b7b0a7", textureAsset: "", textureSize: "cover",
      groupIds: ["handles-all"], locked: true
    }));
    return records;
  }

  function createDefaultAdministration(settings, catalog, priceBook, scene) {
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
        services: ["move-stone", "stone-skirting", "tempered-glass"],
        finishId: catalog.options.finishes[0]?.id || "base-light",
        handleId: "none",
        stonePackageId: "stone-existing"
      },
      materials: defaultMaterials(catalog),
      materialGroups: [
        { id: "fronts-all", label: "Frentes", materialIds: catalog.options.finishes.map((item) => item.id), mode: "finish", scope: "global", moduleIds: [...moduleIds] },
        { id: "handles-all", label: "Puxadores", materialIds: catalog.options.handles.filter((item) => item.id !== "none").map((item) => item.id), mode: "handle", scope: "global", moduleIds: [...moduleIds] },
        { id: "stone-all", label: "Pedra e rodapé", materialIds: catalog.options.stonePackages.map((item) => item.id), mode: "stone", linkedItemIds: ["stone-skirting"] }
      ],
      finishes: catalog.options.finishes.map((item) => ({ id: item.id, enabled: item.status === "published", scope: "global", moduleIds: [...moduleIds] })),
      dependencies: [{ id: "lighting-requires-supports", dependentId: "lighting-08", requires: ["module-04", "module-06"] }],
      events: [{ id: "module-07-depth-without-fridge-side", triggerId: "module-04", when: "disabled", action: "set-depth", targetId: "module-07", valueMm: 400 }],
      pricing: {
        entries: { ...priceBook.entries }, handleEntries: { ...priceBook.handleEntries }, frontFinishRatesBps: { ...priceBook.frontFinishRatesBps },
        localEntries: { ...priceBook.localEntries }, globalEntries: { ...priceBook.globalEntries }, handleFrontTotal: priceBook.handleFrontTotal
      }
    };
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

  function validateConfiguratorSettings(value, catalog, priceBook, scene) {
    const errors = [];
    if (!value || ![SCHEMA, LEGACY_SCHEMA].includes(value.schemaVersion) || !Array.isArray(value.stages)) return ["unsupported settings schema"];
    const registry = itemRegistry(catalog);
    const moduleIds = new Set(catalog.modules.map((item) => item.entityId));
    const entityIds = new Set([
      ...catalog.modules.map((item) => item.entityId),
      ...catalog.accessories.map((item) => item.entityId),
      "tempered-glass", "lighting-08"
    ]);
    const eventTriggerIds = new Set([...entityIds, ...catalog.services.map((item) => item.id), "stone-skirting"]);
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
        else if (kind === "modules" && itemKind !== "module") errors.push(`invalid modules item: ${id}`);
        else if (kind === "summary" && (itemKind !== "summary" || id !== "summary")) errors.push(`invalid summary item: ${id}`);
        else if (kind === "custom" && !["module", "object", "service"].includes(itemKind)) errors.push(`invalid custom-stage item: ${id}`);
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
      const allowedServices = new Set(["move-stone", "stone-skirting", "tempered-glass", "lighting-08"]);
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

    if (!Array.isArray(value.materials) || value.materials.length < 1 || value.materials.length > 100) errors.push("material library must contain 1 to 100 entries");
    else {
      const ids = new Set();
      value.materials.forEach((material) => {
        if (!material || !/^[a-z][a-z0-9-]{1,39}$/.test(material.id) || ids.has(material.id)) { errors.push("invalid or duplicate material id"); return; }
        ids.add(material.id);
        if (typeof material.label !== "string" || !material.label.trim() || material.label.length > 60) errors.push(`invalid material label: ${material.id}`);
        if (!["color", "texture"].includes(material.kind)) errors.push(`invalid material type: ${material.id}`);
        if (!/^(#[0-9a-fA-F]{6})$/.test(material.color || "")) errors.push(`invalid material color: ${material.id}`);
        if (typeof material.textureAsset !== "string" || (material.textureAsset && !validAssetPath(material.textureAsset))) errors.push(`invalid material texture: ${material.id}`);
        if (typeof material.textureSize !== "string" || !["cover", "contain"].includes(material.textureSize) && !/^\d{2,3}px \d{2,3}px$/.test(material.textureSize)) errors.push(`invalid material texture size: ${material.id}`);
        if (!Array.isArray(material.groupIds) || material.groupIds.some((group) => !["fronts-all", "handles-all", "stone-all"].includes(group))) errors.push(`invalid material groups: ${material.id}`);
      });
    }
    const materialIds = new Set((value.materials || []).map((item) => item.id));
    const groups = new Set();
    if (!Array.isArray(value.materialGroups) || value.materialGroups.length !== 3) errors.push("three material groups are required");
    else value.materialGroups.forEach((group) => {
      if (!group || !["fronts-all", "handles-all", "stone-all"].includes(group.id) || groups.has(group.id)) { errors.push("invalid material group"); return; }
      groups.add(group.id);
      if (typeof group.label !== "string" || !group.label.trim() || group.label.length > 60) errors.push(`invalid material group label: ${group.id}`);
      if (!Array.isArray(group.materialIds) || group.materialIds.length < 1 || group.materialIds.length > 100 || group.materialIds.some((id) => !materialIds.has(id)) || new Set(group.materialIds).size !== group.materialIds.length) errors.push(`invalid group materials: ${group.id}`);
      if (group.id === "fronts-all" && (! ["global", "local"].includes(group.scope) || !Array.isArray(group.moduleIds) || group.moduleIds.some((id) => !moduleIds.has(id)))) errors.push("invalid front finish scope");
    });
    const groupById = new Map((value.materialGroups || []).map((group) => [group.id, group]));
    (value.materials || []).forEach((material) => (material.groupIds || []).forEach((groupId) => {
      if (!groupById.get(groupId)?.materialIds?.includes(material.id)) errors.push(`material and group do not match: ${material.id}`);
    }));

    const frontsGroup = groupById.get("fronts-all");
    if (!Array.isArray(value.finishes) || value.finishes.some((item) => !frontsGroup?.materialIds.includes(item.id) || typeof item.enabled !== "boolean" || !["global", "local"].includes(item.scope) || !Array.isArray(item.moduleIds) || item.moduleIds.some((id) => !moduleIds.has(id))) || new Set((value.finishes || []).map((item) => item.id)).size !== (value.finishes || []).length || frontsGroup?.materialIds.some((id) => !value.finishes.some((item) => item.id === id))) errors.push("invalid finish availability");
    else if (!value.finishes.some((item) => item.enabled && item.scope === "global" && frontsGroup?.materialIds.includes(item.id))) errors.push("at least one global front finish must remain available");
    if (defaults && (!value.finishes?.some((item) => item.id === defaults.finishId && item.enabled && item.scope === "global") || !groupById.get("handles-all")?.materialIds.includes(defaults.handleId) && defaults.handleId !== "none" || !groupById.get("stone-all")?.materialIds.includes(defaults.stonePackageId))) errors.push("invalid initial material selection");

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
    if (!Array.isArray(value.events) || value.events.length > 40) errors.push("invalid event list");
    else value.events.forEach((rule) => {
      if (!rule || !/^[a-z][a-z0-9-]{1,39}$/.test(rule.id) || eventIds.has(rule.id)) { errors.push("invalid event id"); return; }
      eventIds.add(rule.id);
      if (!eventTriggerIds.has(rule.triggerId) || !["enabled", "disabled"].includes(rule.when) || rule.action !== "set-depth" || rule.targetId !== "module-07" || !Number.isInteger(rule.valueMm) || rule.valueMm < 300 || rule.valueMm > 700) errors.push(`invalid event: ${rule.id}`);
    });

    const priceSections = ["entries", "handleEntries", "frontFinishRatesBps", "localEntries", "globalEntries"];
    if (!value.pricing || typeof value.pricing !== "object") errors.push("pricing is required");
    else priceSections.forEach((section) => {
      const allowedIds = Object.keys(priceBook?.[section] || {});
      const submitted = value.pricing[section];
      if (!submitted || typeof submitted !== "object" || Array.isArray(submitted)) { errors.push(`invalid pricing section: ${section}`); return; }
      const dynamicGroup = section === "frontFinishRatesBps" ? "fronts-all" : section === "handleEntries" ? "handles-all" : section === "globalEntries" ? "stone-all" : null;
      if (Object.keys(submitted).some((id) => !allowedIds.includes(id) && !(dynamicGroup && groupById.get(dynamicGroup)?.materialIds.includes(id))) || allowedIds.some((id) => !Object.hasOwn(submitted, id))) errors.push(`pricing identifiers must match: ${section}`);
      Object.entries(submitted).forEach(([id, amount]) => {
        const maximum = section === "frontFinishRatesBps" ? 10000 : 100000000;
        if (!Number.isSafeInteger(amount) || amount < 0 || amount > maximum) errors.push(`invalid price value: ${section}.${id}`);
      });
    });
    if (value.pricing?.handleFrontTotal !== priceBook.handleFrontTotal) errors.push("handle front total is fixed");
    return errors;
  }

  function normalizeConfiguratorSettings(input, catalog, priceBook, scene) {
    const value = input?.schemaVersion === LEGACY_SCHEMA ? migrateLegacy(input, catalog, priceBook, scene) : input;
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
      materialGroups: value.materialGroups.map((group) => ({ ...group, materialIds: [...group.materialIds], ...(group.moduleIds ? { moduleIds: [...group.moduleIds] } : {}), ...(group.linkedItemIds ? { linkedItemIds: [...group.linkedItemIds] } : {}) })),
      finishes: value.finishes.map((item) => ({ id: item.id, enabled: item.enabled, scope: item.scope, moduleIds: [...item.moduleIds] })),
      dependencies: value.dependencies.map((item) => ({ id: item.id, dependentId: item.dependentId, requires: [...item.requires] })),
      events: value.events.map((item) => ({ id: item.id, triggerId: item.triggerId, when: item.when, action: item.action, targetId: item.targetId, valueMm: item.valueMm })),
      pricing: Object.fromEntries(["entries", "handleEntries", "frontFinishRatesBps", "localEntries", "globalEntries", "handleFrontTotal"].map((key) => [key, key === "handleFrontTotal" ? value.pricing[key] : { ...value.pricing[key] }]))
    };
  }

  const api = Object.freeze({ createDefaultAdministration, validateConfiguratorSettings, normalizeConfiguratorSettings, itemRegistry, SCHEMA });
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  if (global && typeof global === "object") global.CasaModulesConfiguration = api;
})(typeof globalThis === "undefined" ? this : globalThis);
