(function registerConfiguratorSettingsCore(global) {
  "use strict";

  const STAGES = Object.freeze({
    modules: new Set(["modules"]),
    finishes: new Set(["fronts-all", "handles-all", "stone-all", "stone-skirting"]),
    services: new Set(["move-stone", "tempered-glass", "lighting-08"]),
    summary: new Set(["summary"])
  });
  const ORDER = Object.freeze(["modules", "finishes", "services", "summary"]);

  function createDefaultAdministration(settings, catalog, priceBook) {
    const objects = {};
    [...catalog.modules, ...catalog.accessories].forEach((item) => {
      objects[item.entityId] = {
        title: item.title,
        description: item.description || "",
        benefits: [...(item.benefits || [])],
        components: [...(item.components || [])],
        requirements: [...(item.requirements || [])]
      };
    });
    catalog.services.forEach((item) => {
      objects[item.id] = { title: item.title, description: item.description || "", benefits: [], components: [], requirements: [] };
    });
    [...catalog.options.handles, ...catalog.options.stonePackages].forEach((item) => {
      const id = item.id;
      objects[id] = { title: item.label, description: item.description || "", benefits: [], components: [], requirements: [] };
    });
    const modules = catalog.modules.map((item) => item.entityId);
    return {
      schemaVersion: "ConfiguratorAdministration2D 1.0",
      revision: 1,
      stages: structuredClone(settings.stages),
      objects,
      finishes: catalog.options.finishes.map((item) => ({
        id: item.id,
        enabled: item.status === "published",
        scope: "global",
        moduleIds: [...modules]
      })),
      pricing: {
        entries: { ...priceBook.entries },
        handleEntries: { ...priceBook.handleEntries },
        frontFinishRatesBps: { ...priceBook.frontFinishRatesBps },
        localEntries: { ...priceBook.localEntries },
        globalEntries: { ...priceBook.globalEntries },
        handleFrontTotal: priceBook.handleFrontTotal
      }
    };
  }

  function validateConfiguratorSettings(value, catalog, priceBook) {
    const errors = [];
    if (!value || value.schemaVersion !== "ConfiguratorAdministration2D 1.0" || !Array.isArray(value.stages)) return ["unsupported settings schema"];
    if (value.stages.length !== ORDER.length) errors.push("exactly four known stages are required");
    const seenStages = new Set();
    const seenItems = new Set();
    const moduleIds = new Set((catalog?.modules || []).map((item) => item.entityId));
    const allowed = { ...STAGES, modules: moduleIds };
    for (const stage of value.stages) {
      if (!stage || !ORDER.includes(stage.id)) { errors.push("unknown stage"); continue; }
      if (seenStages.has(stage.id)) errors.push(`duplicate stage: ${stage.id}`);
      seenStages.add(stage.id);
      if (typeof stage.label !== "string" || !stage.label.trim() || stage.label.trim().length > 32) errors.push(`invalid label: ${stage.id}`);
      if (typeof stage.enabled !== "boolean") errors.push(`invalid enabled state: ${stage.id}`);
      if (stage.id === "summary" && stage.enabled !== true) errors.push("summary stage must remain enabled");
      if (!Array.isArray(stage.items) || stage.items.length > 40) { errors.push(`invalid item list: ${stage.id}`); continue; }
      for (const item of stage.items) {
        if (typeof item !== "string" || !allowed[stage.id].has(item)) errors.push(`unknown ${stage.id} item: ${item}`);
        if (seenItems.has(item)) errors.push(`item assigned more than once: ${item}`);
        seenItems.add(item);
      }
      if (stage.id === "modules" && stage.enabled && stage.items.length === 0) errors.push("modules stage must contain an item");
      if (stage.enabled && stage.items.length === 0) errors.push(`enabled stage must contain an item: ${stage.id}`);
    }
    for (const id of ORDER) if (!seenStages.has(id)) errors.push(`missing stage: ${id}`);
    if (!value.stages.some((stage) => stage.id === "modules" && stage.enabled)) errors.push("modules stage must remain enabled");
    const finishItems = value.stages.find((stage) => stage.id === "finishes")?.items || [];
    if (finishItems.includes("stone-skirting") && !finishItems.includes("stone-all")) errors.push("stone skirting requires the stone item");

    const defaultModel = createDefaultAdministration({ stages: [] }, catalog, priceBook);
    const editableIds = new Set(Object.keys(defaultModel.objects));
    if (!value.objects || typeof value.objects !== "object" || Array.isArray(value.objects)) errors.push("object data is required");
    else {
      for (const id of editableIds) {
        const item = value.objects[id];
        if (!item || typeof item !== "object") { errors.push(`missing object data: ${id}`); continue; }
        if (typeof item.title !== "string" || !item.title.trim() || item.title.length > 100) errors.push(`invalid title: ${id}`);
        if (typeof item.description !== "string" || item.description.length > 240) errors.push(`invalid description: ${id}`);
        for (const field of ["benefits", "components", "requirements"]) {
          if (!Array.isArray(item[field]) || item[field].length > 12 || item[field].some((entry) => typeof entry !== "string" || entry.length > 180)) errors.push(`invalid ${field}: ${id}`);
        }
      }
      if (Object.keys(value.objects).some((id) => !editableIds.has(id))) errors.push("unknown object data");
    }

    const finishes = new Map((catalog.options?.finishes || []).map((item) => [item.id, item]));
    if (!Array.isArray(value.finishes) || value.finishes.length !== finishes.size) errors.push("invalid finish list");
    else {
      const seen = new Set();
      value.finishes.forEach((finish) => {
        if (!finish || !finishes.has(finish.id) || seen.has(finish.id)) { errors.push("unknown or duplicate finish"); return; }
        seen.add(finish.id);
        if (typeof finish.enabled !== "boolean" || !["global", "local"].includes(finish.scope)) errors.push(`invalid finish settings: ${finish.id}`);
        if (!Array.isArray(finish.moduleIds) || finish.moduleIds.some((id) => !moduleIds.has(id)) || new Set(finish.moduleIds).size !== finish.moduleIds.length) errors.push(`invalid finish modules: ${finish.id}`);
        if (finish.scope === "local" && finish.moduleIds.length === 0) errors.push(`local finish needs a module: ${finish.id}`);
      });
    }
    if (Array.isArray(value.finishes) && !value.finishes.some((finish) => finish?.enabled === true && finish.scope === "global")) errors.push("at least one global finish must remain available");

    const priceSections = ["entries", "handleEntries", "frontFinishRatesBps", "localEntries", "globalEntries"];
    if (!value.pricing || typeof value.pricing !== "object") errors.push("pricing is required");
    else {
      priceSections.forEach((section) => {
        const allowedIds = Object.keys(priceBook?.[section] || {});
        const submitted = value.pricing[section];
        if (!submitted || typeof submitted !== "object" || Array.isArray(submitted)) { errors.push(`invalid pricing section: ${section}`); return; }
        if (Object.keys(submitted).some((id) => !allowedIds.includes(id)) || allowedIds.some((id) => !Object.hasOwn(submitted, id))) errors.push(`pricing identifiers must match: ${section}`);
        Object.entries(submitted).forEach(([id, amount]) => {
          const maximum = section === "frontFinishRatesBps" ? 10000 : 100000000;
          if (!Number.isSafeInteger(amount) || amount < 0 || amount > maximum) errors.push(`invalid price value: ${section}.${id}`);
        });
      });
      if (value.pricing.handleFrontTotal !== priceBook.handleFrontTotal) errors.push("handle front total is fixed");
    }
    return errors;
  }

  function normalizeConfiguratorSettings(value, catalog, priceBook) {
    const errors = validateConfiguratorSettings(value, catalog, priceBook);
    if (errors.length) throw new TypeError(errors.join("; "));
    return {
      schemaVersion: "ConfiguratorAdministration2D 1.0",
      revision: Number.isSafeInteger(value.revision) && value.revision > 0 ? value.revision : 1,
      stages: value.stages.map((stage) => ({ id: stage.id, label: stage.label.trim(), enabled: stage.enabled, items: [...new Set(stage.items)] })),
      objects: Object.fromEntries(Object.entries(value.objects).map(([id, item]) => [id, {
        title: item.title.trim(), description: item.description.trim(),
        benefits: item.benefits.map((entry) => entry.trim()).filter(Boolean),
        components: item.components.map((entry) => entry.trim()).filter(Boolean),
        requirements: item.requirements.map((entry) => entry.trim()).filter(Boolean)
      }])),
      finishes: value.finishes.map((item) => ({ id: item.id, enabled: item.enabled, scope: item.scope, moduleIds: [...item.moduleIds] })),
      pricing: Object.fromEntries(["entries", "handleEntries", "frontFinishRatesBps", "localEntries", "globalEntries", "handleFrontTotal"].map((key) => [key, key === "handleFrontTotal" ? value.pricing[key] : { ...value.pricing[key] }]))
    };
  }

  const api = Object.freeze({ createDefaultAdministration, validateConfiguratorSettings, normalizeConfiguratorSettings });
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  if (global && typeof global === "object") global.CasaModulesConfiguration = api;
})(typeof globalThis === "undefined" ? this : globalThis);
