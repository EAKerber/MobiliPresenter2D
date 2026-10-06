(function registerHierarchyEditor(global) {
  "use strict";

  function clone(value) {
    return structuredClone(value);
  }

  function findStage(model, stageId) {
    return model.stages.find((stage) => stage.id === stageId) || null;
  }

  function findGroup(stage, groupId) {
    return stage?.groups?.find((group) => group.id === groupId) || null;
  }

  function findSection(group, sectionId) {
    return group?.sections?.find((section) => section.id === sectionId) || null;
  }

  function itemIds(stage) {
    return (stage?.groups || []).flatMap((group) => group.sections.flatMap((section) => section.itemIds));
  }

  function findItemOwner(model, itemId) {
    for (const stage of model.stages) {
      for (const group of stage.groups || []) {
        for (const section of group.sections || []) {
          const itemIndex = section.itemIds.indexOf(itemId);
          if (itemIndex >= 0) return { stage, group, section, itemIndex };
        }
      }
    }
    return null;
  }

  function moveAt(array, index, direction) {
    const target = index + direction;
    if (index < 0 || target < 0 || target >= array.length) return false;
    [array[index], array[target]] = [array[target], array[index]];
    return true;
  }

  function update(model, mutator) {
    const next = clone(model);
    const changed = mutator(next);
    return changed === false ? model : next;
  }

  function moveStage(model, stageId, direction) {
    return update(model, (next) => moveAt(next.stages, next.stages.findIndex((stage) => stage.id === stageId), direction));
  }

  function moveGroup(model, stageId, groupId, direction) {
    return update(model, (next) => {
      const stage = findStage(next, stageId);
      return stage ? moveAt(stage.groups, stage.groups.findIndex((group) => group.id === groupId), direction) : false;
    });
  }

  function moveSection(model, stageId, groupId, sectionId, direction) {
    return update(model, (next) => {
      const group = findGroup(findStage(next, stageId), groupId);
      return group ? moveAt(group.sections, group.sections.findIndex((section) => section.id === sectionId), direction) : false;
    });
  }

  function moveItem(model, itemId, destination) {
    return update(model, (next) => {
      const source = findItemOwner(next, itemId);
      const stage = findStage(next, destination.stageId);
      const group = findGroup(stage, destination.groupId);
      const section = findSection(group, destination.sectionId);
      if (!section) return false;

      if (source) source.section.itemIds.splice(source.itemIndex, 1);
      const index = Number.isInteger(destination.index)
        ? Math.max(0, Math.min(destination.index, section.itemIds.length))
        : section.itemIds.length;
      section.itemIds.splice(index, 0, itemId);

      if (source && source.section.itemIds.length === 0) {
        source.group.sections = source.group.sections.filter((entry) => entry !== source.section);
        if (source.group.sections.length === 0) source.stage.groups = source.stage.groups.filter((entry) => entry !== source.group);
      }
      return true;
    });
  }

  function reorderItem(model, itemId, direction) {
    return update(model, (next) => {
      const owner = findItemOwner(next, itemId);
      return owner ? moveAt(owner.section.itemIds, owner.itemIndex, direction) : false;
    });
  }

  function splitItemToSection(model, itemId, { sectionId, label, presentation = "auto" }) {
    return update(model, (next) => {
      const owner = findItemOwner(next, itemId);
      if (!owner || owner.section.itemIds.length <= 1 || owner.group.sections.some((section) => section.id === sectionId)) return false;
      owner.section.itemIds.splice(owner.itemIndex, 1);
      const sourceIndex = owner.group.sections.indexOf(owner.section);
      owner.group.sections.splice(sourceIndex + 1, 0, {
        id: sectionId,
        label,
        presentation,
        itemIds: [itemId]
      });
      return true;
    });
  }

  function splitSectionToGroup(model, stageId, groupId, sectionId, { groupId: nextGroupId, label, columnSpan = 1 }) {
    return update(model, (next) => {
      const stage = findStage(next, stageId);
      const group = findGroup(stage, groupId);
      const section = findSection(group, sectionId);
      if (!stage || !group || !section || group.sections.length <= 1 || stage.groups.some((entry) => entry.id === nextGroupId)) return false;
      group.sections = group.sections.filter((entry) => entry !== section);
      const groupIndex = stage.groups.indexOf(group);
      stage.groups.splice(groupIndex + 1, 0, {
        id: nextGroupId,
        label,
        columnSpan,
        sections: [section]
      });
      return true;
    });
  }

  function mergeSectionIntoPrevious(model, stageId, groupId, sectionId) {
    return update(model, (next) => {
      const group = findGroup(findStage(next, stageId), groupId);
      if (!group) return false;
      const index = group.sections.findIndex((section) => section.id === sectionId);
      if (index <= 0) return false;
      const source = group.sections[index];
      const target = group.sections[index - 1];
      target.itemIds.push(...source.itemIds);
      group.sections.splice(index, 1);
      return true;
    });
  }

  function mergeGroupIntoPrevious(model, stageId, groupId) {
    return update(model, (next) => {
      const stage = findStage(next, stageId);
      if (!stage) return false;
      const index = stage.groups.findIndex((group) => group.id === groupId);
      if (index <= 0) return false;
      const source = stage.groups[index];
      stage.groups[index - 1].sections.push(...source.sections);
      stage.groups.splice(index, 1);
      return true;
    });
  }

  function moveSectionToGroup(model, stageId, sourceGroupId, sectionId, destinationGroupId, index = null) {
    return update(model, (next) => {
      const stage = findStage(next, stageId);
      const sourceGroup = findGroup(stage, sourceGroupId);
      const destinationGroup = findGroup(stage, destinationGroupId);
      const section = findSection(sourceGroup, sectionId);
      if (!stage || !sourceGroup || !destinationGroup || !section || sourceGroup === destinationGroup) return false;
      sourceGroup.sections = sourceGroup.sections.filter((entry) => entry !== section);
      const targetIndex = Number.isInteger(index)
        ? Math.max(0, Math.min(index, destinationGroup.sections.length))
        : destinationGroup.sections.length;
      destinationGroup.sections.splice(targetIndex, 0, section);
      if (!sourceGroup.sections.length) stage.groups = stage.groups.filter((entry) => entry !== sourceGroup);
      return true;
    });
  }

  function mergeSectionIntoNext(model, stageId, groupId, sectionId) {
    return update(model, (next) => {
      const group = findGroup(findStage(next, stageId), groupId);
      if (!group) return false;
      const index = group.sections.findIndex((section) => section.id === sectionId);
      if (index < 0 || index >= group.sections.length - 1) return false;
      const source = group.sections[index];
      const target = group.sections[index + 1];
      target.itemIds.unshift(...source.itemIds);
      group.sections.splice(index, 1);
      return true;
    });
  }

  function mergeGroupIntoNext(model, stageId, groupId) {
    return update(model, (next) => {
      const stage = findStage(next, stageId);
      if (!stage) return false;
      const index = stage.groups.findIndex((group) => group.id === groupId);
      if (index < 0 || index >= stage.groups.length - 1) return false;
      const source = stage.groups[index];
      stage.groups[index + 1].sections.unshift(...source.sections);
      stage.groups.splice(index, 1);
      return true;
    });
  }

  function placeItemInEmptyStage(model, itemId, stageId, { groupId, groupLabel, sectionId, sectionLabel, presentation = "auto", columnSpan = 2 } = {}) {
    return update(model, (next) => {
      const stage = findStage(next, stageId);
      if (!stage || stage.groups.length || findItemOwner(next, itemId)) return false;
      stage.groups.push({
        id: groupId || uniqueId(new Set(), `${stage.id}-group`, "group"),
        label: groupLabel || stage.label || "Grupo",
        columnSpan,
        sections: [{
          id: sectionId || uniqueId(new Set(), `${stage.id}-items`, "items"),
          label: sectionLabel || "Itens",
          presentation,
          itemIds: [itemId]
        }]
      });
      return true;
    });
  }

  function removeItem(model, itemId) {
    return update(model, (next) => {
      const owner = findItemOwner(next, itemId);
      if (!owner) return false;
      owner.section.itemIds.splice(owner.itemIndex, 1);
      if (!owner.section.itemIds.length) {
        owner.group.sections = owner.group.sections.filter((entry) => entry !== owner.section);
        if (!owner.group.sections.length) owner.stage.groups = owner.stage.groups.filter((entry) => entry !== owner.group);
      }
      return true;
    });
  }

  function sectionDestinations(model) {
    return model.stages.flatMap((stage) => (stage.groups || []).flatMap((group) =>
      group.sections.flatMap((section) => ({
        stageId: stage.id,
        stageLabel: stage.label,
        groupId: group.id,
        groupLabel: group.label,
        sectionId: section.id,
        sectionLabel: section.label
      }))
    ));
  }

  function slug(value, fallback) {
    const result = String(value || "").trim().toLocaleLowerCase("pt-BR").normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 32);
    return result || fallback;
  }

  function uniqueId(existing, label, fallback) {
    const base = slug(label, fallback);
    let id = base;
    let suffix = 2;
    while (existing.has(id)) id = `${base}-${suffix++}`;
    return id;
  }

  const api = Object.freeze({
    itemIds,
    findItemOwner,
    sectionDestinations,
    uniqueId,
    moveStage,
    moveGroup,
    moveSection,
    moveItem,
    reorderItem,
    splitItemToSection,
    splitSectionToGroup,
    moveSectionToGroup,
    mergeSectionIntoPrevious,
    mergeSectionIntoNext,
    mergeGroupIntoPrevious,
    mergeGroupIntoNext,
    placeItemInEmptyStage,
    removeItem
  });

  if (typeof module !== "undefined" && module.exports) module.exports = api;
  if (global && typeof global === "object") global.CasaModulesHierarchyEditor = api;
})(typeof globalThis === "undefined" ? this : globalThis);
