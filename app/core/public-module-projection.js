(function registerPublicModuleProjection(global) {
  "use strict";

  // CP-PUBLIC-02a: pure, intentionally narrow fixture boundary. Neither
  // pricing nor a complete administration document crosses this boundary.
  const SCHEMA = "PublicModulePresentation2D 0.1";
  const SOURCE_SCHEMA = "ConfiguratorAdministration2D 5.0";
  const ID = /^module-[0-9]{2}$/;

  function text(value) {
    return typeof value === "string" && value.trim() ? value.trim() : null;
  }
  function strings(values) {
    return Array.isArray(values) ? values.map(text).filter(Boolean) : [];
  }
  function project(published, catalog, scene) {
    if (published?.schemaVersion !== SOURCE_SCHEMA || !Array.isArray(published.stages)) {
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
    const modules = ids.filter((id) => ID.test(id)).map((id) => {
      const product = byProduct.get(id);
      const entity = byEntity.get(id);
      if (!product || !entity) throw new TypeError("published module missing from catalog/scene: " + id);
      // Explicit allowlist; omit unknown and missing fields. In particular:
      // no pricing, raw geometry assets, administration state or revision.
      const result = { id };
      const fields = {
        referenceLabel: text(product.referenceLabel),
        title: text(product.title),
        category: text(product.category),
        dimensionLabel: text(product.dimensions?.display)
      };
      for (const [key, value] of Object.entries(fields)) if (value) result[key] = value;
      for (const key of ["benefits", "components", "requirements"]) {
        const values = strings(product[key]);
        if (values.length) result[key] = values;
      }
      return result;
    });
    // v5 currently owns published membership, not per-module editorial copy.
    // No fabricated description, benefit-derived summary, or carcass fallback.
    return { schemaVersion: SCHEMA, modules };
  }
  const api = Object.freeze({ SCHEMA, project });
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  if (global && typeof global === "object") global.CasaModulesPublicModuleProjection = api;
})(typeof globalThis === "undefined" ? this : globalThis);
