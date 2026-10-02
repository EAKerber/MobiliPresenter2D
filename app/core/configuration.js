(function registerConfiguratorSettingsCore(global) {
  "use strict";

  const STAGES = Object.freeze({
    modules: new Set(["modules"]),
    finishes: new Set(["fronts-all", "handles-all", "stone-all", "stone-skirting"]),
    services: new Set(["move-stone", "tempered-glass", "lighting-08"]),
    summary: new Set(["summary"])
  });
  const ORDER = Object.freeze(["modules", "finishes", "services", "summary"]);

  function validateConfiguratorSettings(value, catalog) {
    const errors = [];
    if (!value || value.schemaVersion !== "ConfiguratorSettings2D 1.0" || !Array.isArray(value.stages)) {
      return ["unsupported settings schema"];
    }
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
    return errors;
  }

  function normalizeConfiguratorSettings(value, catalog) {
    const errors = validateConfiguratorSettings(value, catalog);
    if (errors.length) throw new TypeError(errors.join("; "));
    return {
      schemaVersion: "ConfiguratorSettings2D 1.0",
      revision: Number.isSafeInteger(value.revision) && value.revision > 0 ? value.revision : 1,
      stages: value.stages.map((stage) => ({
        id: stage.id,
        label: stage.label.trim(),
        enabled: stage.enabled,
        items: [...new Set(stage.items)]
      }))
    };
  }

  const api = Object.freeze({ validateConfiguratorSettings, normalizeConfiguratorSettings });
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  if (global && typeof global === "object") global.CasaModulesConfiguration = api;
})(typeof globalThis === "undefined" ? this : globalThis);
