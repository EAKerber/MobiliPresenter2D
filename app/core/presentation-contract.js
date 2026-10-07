(function registerPresentationContract(global) {
  "use strict";

  const SCHEMA = "ConfiguratorPresentation2D 1.1";
  const COMPONENTS = Object.freeze([
    "choice-swatches",
    "choice-grid",
    "choice-cards",
    "selection-list",
    "toggle-list",
    "action-list"
  ]);
  const COMPONENT_SET = new Set(COMPONENTS);
  const VIEW_COMPONENTS = Object.freeze([...COMPONENTS, "detail-panel"]);
  const VIEW_COMPONENT_SET = new Set(VIEW_COMPONENTS);
  const RELATIONS = Object.freeze(["companion"]);
  const PROJECTIONS = Object.freeze(["inline", "side-panel", "replace"]);
  const PIP_ACTIVATIONS = Object.freeze(["manual", "auto-after-anchor"]);
  const SHELL_SLOTS = Object.freeze(["estimate", "primary-action"]);
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

  const BEHAVIOR_BY_COMPONENT = Object.freeze({
    "choice-swatches": "selection",
    "choice-grid": "selection",
    "choice-cards": "selection",
    "selection-list": "selection",
    "toggle-list": "toggle",
    "action-list": "action"
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

  function policyError(code, path, message) {
    return Object.freeze({ code, path, message });
  }

  function validatePolicy(policy, knownProfiles = [], flow = null) {
    const errors = [];
    const profileSet = new Set(knownProfiles);
    if (!policy || policy.schemaVersion !== SCHEMA) {
      return [policyError("invalid-presentation-policy", "presentation", "invalid presentation policy schema")];
    }

    const stageViews = policy.stageViews && typeof policy.stageViews === "object" ? policy.stageViews : {};
    Object.entries(stageViews).forEach(([stageId, stagePolicy]) => {
      const views = Array.isArray(stagePolicy?.views) ? stagePolicy.views : [];
      if (!views.length) {
        errors.push(policyError("empty-stage-views", `stageViews.${stageId}`, `stage views are required: ${stageId}`));
        return;
      }
      const viewIds = new Set();
      const byId = new Map();
      views.forEach((view, index) => {
        const path = `stageViews.${stageId}.views.${view?.id || index}`;
        if (!view?.id || viewIds.has(view.id)) {
          errors.push(policyError("invalid-view-id", path, `duplicate or missing view id: ${view?.id || index}`));
          return;
        }
        viewIds.add(view.id);
        byId.set(view.id, view);
        if (!view.sourceSectionId || typeof view.sourceSectionId !== "string") {
          errors.push(policyError("missing-view-source", path, `view source section is required: ${view.id}`));
        }
        if (!VIEW_COMPONENT_SET.has(view.component)) {
          errors.push(policyError("invalid-view-component", path, `unsupported view component: ${view.component || "(empty)"}`));
        }
        Object.entries(view.projectionByProfile || {}).forEach(([profile, projection]) => {
          if (!profileSet.has(profile)) errors.push(policyError("invalid-layout-profile", `${path}.projectionByProfile.${profile}`, `unsupported layout profile: ${profile}`));
          if (!PROJECTIONS.includes(projection)) errors.push(policyError("invalid-view-projection", `${path}.projectionByProfile.${profile}`, `unsupported view projection: ${projection}`));
        });
      });

      views.forEach((view) => {
        if (!view?.relation) return;
        const path = `stageViews.${stageId}.views.${view.id}.relation`;
        if (!RELATIONS.includes(view.relation.kind)) errors.push(policyError("invalid-view-relation", path, `unsupported view relation: ${view.relation.kind}`));
        if (!view.relation.of || !byId.has(view.relation.of)) errors.push(policyError("broken-view-relation", path, `view relation target is missing: ${view.relation.of || "(empty)"}`));
        if (view.relation.of === view.id) errors.push(policyError("cyclic-view-relation", path, `view cannot relate to itself: ${view.id}`));
      });

      const visiting = new Set();
      const visited = new Set();
      function hasCycle(id) {
        if (visiting.has(id)) return true;
        if (visited.has(id)) return false;
        visiting.add(id);
        const target = byId.get(id)?.relation?.of;
        if (target && byId.has(target) && hasCycle(target)) return true;
        visiting.delete(id);
        visited.add(id);
        return false;
      }
      if ([...viewIds].some(hasCycle)) {
        errors.push(policyError("cyclic-view-relation", `stageViews.${stageId}`, `view relations contain a cycle: ${stageId}`));
      }

      if (flow) {
        const stage = flow.stages?.find((entry) => entry.id === stageId);
        if (!stage) {
          errors.push(policyError("unknown-view-stage", `stageViews.${stageId}`, `presentation stage is missing from flow: ${stageId}`));
        } else {
          const sectionIds = new Set(stage.groups.flatMap((group) => group.sections.map((section) => section.id)));
          views.forEach((view) => {
            if (view?.sourceSectionId && !sectionIds.has(view.sourceSectionId)) {
              errors.push(policyError("unknown-view-source", `stageViews.${stageId}.views.${view.id}`, `presentation source section is missing: ${stageId}/${view.sourceSectionId}`));
            }
          });
        }
      }
    });

    const pip = policy.scene?.pip;
    if (!pip || !Array.isArray(pip.availableProfiles)) {
      errors.push(policyError("invalid-pip-policy", "scene.pip", "scene PiP policy is required"));
    } else {
      const available = new Set();
      pip.availableProfiles.forEach((profile) => {
        if (!profileSet.has(profile)) errors.push(policyError("invalid-layout-profile", `scene.pip.availableProfiles.${profile}`, `unsupported layout profile: ${profile}`));
        if (available.has(profile)) errors.push(policyError("duplicate-pip-profile", "scene.pip.availableProfiles", `duplicate PiP profile: ${profile}`));
        available.add(profile);
      });
      Object.entries(pip.activationByProfile || {}).forEach(([profile, activation]) => {
        if (!profileSet.has(profile)) errors.push(policyError("invalid-layout-profile", `scene.pip.activationByProfile.${profile}`, `unsupported layout profile: ${profile}`));
        if (!available.has(profile)) errors.push(policyError("inactive-pip-profile", `scene.pip.activationByProfile.${profile}`, `PiP activation references unavailable profile: ${profile}`));
        if (!PIP_ACTIVATIONS.includes(activation)) errors.push(policyError("invalid-pip-activation", `scene.pip.activationByProfile.${profile}`, `unsupported PiP activation: ${activation}`));
      });
      available.forEach((profile) => {
        if (!Object.hasOwn(pip.activationByProfile || {}, profile)) {
          errors.push(policyError("missing-pip-activation", `scene.pip.activationByProfile.${profile}`, `PiP activation is required for profile: ${profile}`));
        }
      });
    }

    const dock = policy.shell?.bottomDock;
    if (!dock || typeof dock.enabled !== "boolean" || !Array.isArray(dock.slots)) {
      errors.push(policyError("invalid-bottom-dock", "shell.bottomDock", "bottom dock policy is required"));
    } else {
      const slots = new Set();
      dock.slots.forEach((slot) => {
        if (!SHELL_SLOTS.includes(slot)) errors.push(policyError("invalid-shell-slot", `shell.bottomDock.slots.${slot}`, `unsupported shell slot: ${slot}`));
        if (slots.has(slot)) errors.push(policyError("duplicate-shell-slot", "shell.bottomDock.slots", `duplicate shell slot: ${slot}`));
        slots.add(slot);
      });
      if (dock.enabled && !dock.slots.length) errors.push(policyError("empty-bottom-dock", "shell.bottomDock.slots", "enabled bottom dock requires at least one slot"));
    }

    return errors;
  }

  function assertValidPolicy(policy, knownProfiles = [], flow = null) {
    const errors = validatePolicy(policy, knownProfiles, flow);
    if (errors.length) {
      const error = new TypeError(errors.map((entry) => `${entry.path}: ${entry.message}`).join("; "));
      error.validationErrors = errors;
      throw error;
    }
    return policy;
  }

  const api = Object.freeze({
    SCHEMA,
    COMPONENTS,
    VIEW_COMPONENTS,
    RELATIONS,
    PROJECTIONS,
    PIP_ACTIVATIONS,
    SHELL_SLOTS,
    LEGACY_PRESENTATIONS,
    assertComponent,
    componentForBehavior,
    resolveSectionComponent,
    normalizeSectionPresentation,
    validatePolicy,
    assertValidPolicy
  });

  if (typeof module !== "undefined" && module.exports) module.exports = api;
  if (global && typeof global === "object") global.CasaModulesPresentation = api;
})(typeof globalThis === "undefined" ? this : globalThis);
