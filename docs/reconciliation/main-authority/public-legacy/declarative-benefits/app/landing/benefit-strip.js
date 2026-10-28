(function registerLandingBenefits(global) {
  "use strict";
  const core = global.CasaPageComposition
    || (typeof module !== "undefined" && module.exports && typeof require === "function"
      ? require("../core/page-composition.js") : null);
  if (!core) throw new Error("Page composition contract is required");

  // One editorial content shape, two presentational variants. CSS remains feature-owned.
  const definition = Object.freeze({
    type: "landing/benefits@1",
    variants: Object.freeze(["standard", "compact"]),
    validate(values, variant) {
      const palette = variant === "compact" ? "gold" : variant === "standard" ? "white" : null;
      return Boolean(palette) && Array.isArray(values) && values.length > 0 && values.length <= 12
        && values.every((item) => item && Object.getPrototypeOf(item) === Object.prototype
          && Object.keys(item).length === 2
          && typeof item.label === "string" && item.label.trim().length > 0 && item.label.length <= 160
          && typeof item.icon === "string"
          && new RegExp("^/landing/assets/icons/ui/" + palette + "/[a-z0-9-]+\\.svg$").test(item.icon));
    },
    render(values, doc, variant) {
      if (variant !== "standard" && variant !== "compact") throw new Error("unsupported benefits variant");
      const compact = variant === "compact";
      const fragment = doc.createDocumentFragment();
      values.forEach((item) => {
        const node = doc.createElement("div");
        node.className = compact ? "mini-benefit" : "benefit-item";
        const icon = doc.createElement("img");
        icon.src = item.icon;
        icon.alt = "";
        const label = doc.createElement(compact ? "strong" : "span");
        label.textContent = item.label;
        node.append(icon, label);
        fragment.append(node);
      });
      return fragment;
    }
  });

  function makeManifest(id, variant, dataRef) {
    return Object.freeze({
      schemaVersion: core.SCHEMA,
      route: "/",
      sections: Object.freeze([
        Object.freeze({ id, type: definition.type, variant, dataRef })
      ])
    });
  }
  const manifest = makeManifest("benefits", "standard", "landing.benefits");
  const compactManifest = makeManifest("mini-benefits", "compact", "landing.miniBenefits");
  const registry = core.createRegistry([definition]);

  function mountOne(target, source, doc, selectedManifest, id) {
    const compiled = core.compilePage(selectedManifest, { landing: source }, registry);
    core.mountSection(compiled, id, target, doc);
  }
  function mount(container, landingData, doc) {
    mountOne(container, landingData, doc, manifest, "benefits");
  }
  function mountCompact(container, landingData, doc) {
    mountOne(container, landingData, doc, compactManifest, "mini-benefits");
  }

  const api = Object.freeze({ definition, manifest, compactManifest, mount, mountCompact });
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  if (global && typeof global === "object") global.CasaLandingBenefitStrip = api;
})(typeof window === "undefined" ? globalThis : window);
