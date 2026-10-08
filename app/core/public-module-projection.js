(function registerPublicModuleProjection(global) {
  "use strict";

  // CP-PUBLIC-02a: pure, intentionally narrow fixture boundary. Neither
  // pricing nor a complete administration document crosses this boundary.
  const SCHEMA = "PublicModulePresentation2D 0.1";
  const SOURCE_SCHEMA = "ConfiguratorAdministration2D 5.0";

  function text(value) {
    return typeof value === "string" && value.trim() ? value.trim() : null;
  }
  function strings(values) {
    return Array.isArray(values) ? values.map(text).filter(Boolean) : [];
  }
  function project(published, catalog, scene) {
    if (published?.schemaVersion !== SOURCE_SCHEMA || !Array.isArray(published.stages) || !published.objects || typeof published.objects !== "object" || Array.isArray(published.objects)) {
      throw new TypeError("published v5 configuration required");
    }
    if (!Array.isArray(catalog?.modules) || !Array.isArray(scene?.entities)) {
      throw new TypeError("catalog and scene required");
    }

    // A disabled Modules stage must never leak items. No legacy fallback to
    // all catalog records, and no reliance on stage display names or order.
    const stages = published.stages.filter((stage) => stage?.enabled === true && stage.kind === "modules");
    if (stages.length !== 1) throw new TypeError("one enabled modules stage required");
    const ids = stages[0].groups?.flatMap((group) =>
      group.sections?.flatMap((section) => section.itemIds || []) || []
    ) || [];
    if (!ids.length || !ids.every((id) => typeof id === "string") || new Set(ids).size !== ids.length) {
      throw new TypeError("invalid published module membership");
    }
    const byProduct = new Map(catalog.modules.map((product) => [product.entityId, product]));
    const byEntity = new Map(scene.entities.map((entity) => [entity.id, entity]));
    const modules = ids.map((id) => {
      const product = byProduct.get(id);
      const entity = byEntity.get(id);
      if (!product || !entity) throw new TypeError("published module missing from catalog/scene: " + id);
      const authored = published.objects[id];
      if (!authored || typeof authored !== "object" || !text(authored.title)) {
        throw new TypeError("published module editorial record missing or invalid: " + id);
      }
      for (const key of ["benefits", "components", "requirements"]) {
        if (!Array.isArray(authored[key])) throw new TypeError("invalid published list: " + id + "." + key);
      }
      // Explicit allowlist; omit unknown and missing fields. In particular:
      // no pricing, raw geometry assets, administration state or revision.
      const result = { id };
      const fields = {
        referenceLabel: text(product.referenceLabel),
        title: text(authored.title),
        description: text(authored.description),
        category: text(product.category),
        dimensionLabel: text(product.dimensions?.display)
      };
      for (const [key, value] of Object.entries(fields)) if (value) result[key] = value;
      for (const key of ["benefits", "components", "requirements"]) {
        const values = strings(authored[key]);
        if (values.length) result[key] = values;
      }
      return result;
    });
    // Allowlisted scene state: module presence and selected global finish only.
    // A viewer should never invent its initial selection or reveal the entire
    // administration initialState. These keys are sufficient to initialize the
    // current public scene and keep future finish controllers synchronized.
    const initial = published.initialState;
    if (!initial || !initial.entities || typeof initial.entities !== "object"
      || typeof initial.finishId !== "string"
      || !catalog.options?.finishes?.some((finish) => finish.id === initial.finishId)) {
      throw new TypeError("published initial module/finish state missing or invalid");
    }
    const entities = {};
    for (const module of modules) {
      if (typeof initial.entities[module.id] !== "boolean") {
        throw new TypeError("missing published module visibility: " + module.id);
      }
      entities[module.id] = initial.entities[module.id];
    }
    // v5 owns published membership and editorial lists/text. Physical catalog
    // owns measurements and category. No benefit-to-summary or carcass guess.
    return { schemaVersion: SCHEMA, modules, publicState: {
      entities, finishId: initial.finishId
    } };
  }
  const api = Object.freeze({ SCHEMA, project });
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  if (global && typeof global === "object") global.CasaModulesPublicModuleProjection = api;
})(typeof globalThis === "undefined" ? this : globalThis);
