(function registerPresentationContract(global) {
  "use strict";

  const SCHEMA = "ConfiguratorPresentation2D 1.0";
  const COMPONENTS = Object.freeze([
    "choice-swatches",
    "choice-grid",
    "choice-cards",
    "selection-list",
    "toggle-list",
    "action-list"
  ]);
  const COMPONENT_SET = new Set(COMPONENTS);
  const LEGACY_PRESENTATIONS = Object.freeze(["auto", "swatches", "cards", "list", "grid"]);
  const LEGACY_SET = new Set(LEGACY_PRESENTATIONS);

  const DIRECT_LEGACY_COMPONENT = Object.freeze({
    swatches: "choice-swatches",
    grid: "choice-grid",
    cards: "choice-cards"
  });

  const LIST_COMPONENT_BY_BEHAVIOR = Object.freeze({
    selection: "selection-list",
    toggle: "toggle-list",
    action: "action-list"
  });

  function assertComponent(component) {
    if (!COMPONENT_SET.has(component)) {
      throw new TypeError(`unsupported presentation component: ${component || "(empty)"}`);
    }
    return component;
  }

  function componentForBehavior(behavior) {
    const component = LIST_COMPONENT_BY_BEHAVIOR[behavior];
    if (!component) throw new TypeError(`unsupported presentation behavior: ${behavior || "(empty)"}`);
    return component;
  }

  function resolveSectionComponent(section) {
    if (!section || typeof section !== "object") throw new TypeError("section presentation is required");

    if (section.component != null) return assertComponent(section.component);

    const legacy = section.presentation || "auto";
    if (!LEGACY_SET.has(legacy)) throw new TypeError(`unsupported legacy presentation: ${legacy}`);

    const direct = DIRECT_LEGACY_COMPONENT[legacy];
    if (direct) return direct;

    return componentForBehavior(section.behavior);
  }

  function normalizeSectionPresentation(section) {
    return Object.freeze({
      schemaVersion: SCHEMA,
      component: resolveSectionComponent(section)
    });
  }

  const api = Object.freeze({
    SCHEMA,
    COMPONENTS,
    LEGACY_PRESENTATIONS,
    assertComponent,
    componentForBehavior,
    resolveSectionComponent,
    normalizeSectionPresentation
  });

  if (typeof module !== "undefined" && module.exports) module.exports = api;
  if (global && typeof global === "object") global.CasaModulesPresentation = api;
})(typeof globalThis === "undefined" ? this : globalThis);
