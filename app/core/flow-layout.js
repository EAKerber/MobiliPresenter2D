(function registerFlowLayout(global) {
  "use strict";

  const presentationCore = typeof module !== "undefined" && module.exports && typeof require === "function"
    ? require("./presentation-contract.js")
    : global?.CasaModulesPresentation;
  if (!presentationCore) throw new Error("Presentation contract is required.");

  function stageLayout(flow, stageId) {
    const stage = flow?.stages?.find((entry) => entry.id === stageId);
    if (!stage) return null;
    return {
      id: stage.id,
      kind: stage.kind,
      groups: stage.groups.map((group) => ({
        id: group.id,
        span: Math.max(1, Math.min(2, Number(group.presentation?.span) || 1)),
        sections: group.sections.map((section) => ({
          id: section.id,
          itemIds: [...section.itemIds],
          keyboard: Boolean(section.keyboard),
          behavior: section.behavior,
          presentation: section.presentation || "auto",
          component: presentationCore.resolveSectionComponent(section)
        }))
      }))
    };
  }

  function stageLayouts(flow) {
    return (flow?.stages || []).map((stage) => stageLayout(flow, stage.id));
  }

  function semanticSectionIds(layout) {
    return (layout?.groups || []).flatMap((group) => group.sections.map((section) => section.id));
  }

  function semanticItemIds(layout) {
    return (layout?.groups || []).flatMap((group) => group.sections.flatMap((section) => section.itemIds));
  }

  function validateBindings(layout, binding) {
    if (!layout) return [{ code: "missing-stage-layout", message: "stage layout is missing" }];
    const errors = [];
    const groupIds = new Set(binding?.groupIds || []);
    const sectionIds = new Set(binding?.sectionIds || []);
    const sectionComponents = binding?.sectionComponents instanceof Map
      ? binding.sectionComponents
      : new Map(Object.entries(binding?.sectionComponents || {}));

    layout.groups.forEach((group) => {
      if (!groupIds.has(group.id)) {
        errors.push({ code: "missing-group-binding", groupId: group.id, message: `missing renderer group: ${layout.id}/${group.id}` });
      }
      group.sections.forEach((section) => {
        if (!sectionIds.has(section.id)) {
          errors.push({ code: "missing-section-binding", groupId: group.id, sectionId: section.id, message: `missing renderer section: ${layout.id}/${section.id}` });
        }
        if (binding && Object.hasOwn(binding, "sectionComponents")) {
          const boundComponent = sectionComponents.get(section.id);
          if (!boundComponent) {
            errors.push({ code: "missing-component-binding", groupId: group.id, sectionId: section.id, component: section.component, message: `missing renderer component: ${layout.id}/${section.id}` });
          } else if (boundComponent !== section.component) {
            errors.push({ code: "component-binding-mismatch", groupId: group.id, sectionId: section.id, component: section.component, boundComponent, message: `renderer component mismatch: ${layout.id}/${section.id} expected ${section.component} but found ${boundComponent}` });
          }
        }
      });
    });

    (binding?.groupIds || []).forEach((id) => {
      if (!layout.groups.some((group) => group.id === id)) {
        errors.push({ code: "unexpected-group-binding", groupId: id, message: `unexpected renderer group: ${layout.id}/${id}` });
      }
    });
    (binding?.sectionIds || []).forEach((id) => {
      if (!semanticSectionIds(layout).includes(id)) {
        errors.push({ code: "unexpected-section-binding", sectionId: id, message: `unexpected renderer section: ${layout.id}/${id}` });
      }
    });
    return errors;
  }

  function moduleViewLayout(flow) {
    const layout = stageLayout(flow, "modules");
    if (!layout) return null;
    const sections = layout.groups.flatMap((group) => group.sections);
    if (sections.length !== 1) {
      return {
        stageId: "modules",
        semanticSectionIds: sections.map((section) => section.id),
        itemIds: semanticItemIds(layout),
        panes: [],
        error: "modules-view-requires-one-semantic-section"
      };
    }
    return {
      stageId: "modules",
      semanticSectionIds: [sections[0].id],
      itemIds: [...sections[0].itemIds],
      panes: [
        { id: "detail", role: "context", sourceSectionId: sections[0].id },
        { id: "list", role: "items", sourceSectionId: sections[0].id, component: sections[0].component }
      ],
      error: null
    };
  }

  const api = Object.freeze({
    stageLayout,
    stageLayouts,
    semanticSectionIds,
    semanticItemIds,
    validateBindings,
    moduleViewLayout
  });

  if (typeof module !== "undefined" && module.exports) module.exports = api;
  if (global && typeof global === "object") global.CasaModulesFlowLayout = api;
})(typeof globalThis === "undefined" ? this : globalThis);
