(function registerLandingBenefitStrip(global) {
  "use strict";
  const core = global.CasaPageComposition
    || (typeof module !== "undefined" && module.exports && typeof require === "function"
      ? require("../core/page-composition.js") : null);
  if (!core) throw new Error("Page composition contract is required");

  const definition = Object.freeze({
    type: "landing/benefit-strip@1",
    variants: Object.freeze(["standard"]),
    validate(values) {
      return Array.isArray(values) && values.length > 0 && values.length <= 12
        && values.every((item) => item && Object.getPrototypeOf(item) === Object.prototype
          && Object.keys(item).length === 2
          && typeof item.label === "string" && item.label.trim().length > 0 && item.label.length <= 160
          && typeof item.icon === "string"
          && /^\/landing\/assets\/icons\/ui\/white\/[a-z0-9-]+\.svg$/.test(item.icon));
    },
    render(values, doc) {
      const fragment = doc.createDocumentFragment();
      values.forEach((item) => {
        const node = doc.createElement("div");
        node.className = "benefit-item";
        const icon = doc.createElement("img");
        icon.src = item.icon;
        icon.alt = "";
        const label = doc.createElement("span");
        label.textContent = item.label;
        node.append(icon, label);
        fragment.append(node);
      });
      return fragment;
    }
  });

  const manifest = Object.freeze({
    schemaVersion: core.SCHEMA,
    route: "/",
    sections: Object.freeze([
      Object.freeze({
        id: "benefits",
        type: definition.type,
        variant: "standard",
        dataRef: "landing.benefits"
      })
    ])
  });
  const registry = core.createRegistry([definition]);

  function mount(container, landingData, doc) {
    const compiled = core.compilePage(manifest, { landing: landingData }, registry);
    core.mountSection(compiled, "benefits", container, doc);
  }

  const api = Object.freeze({ definition, manifest, mount });
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  if (global && typeof global === "object") global.CasaLandingBenefitStrip = api;
})(typeof window === "undefined" ? globalThis : window);
