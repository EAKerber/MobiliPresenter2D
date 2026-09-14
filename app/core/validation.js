(function registerValidationCore(global) {
  "use strict";

  function validateScene(scene) {
    const errors = [];
    const entitiesById = new Map();

    scene.entities.forEach((entity) => {
      if (entitiesById.has(entity.id)) errors.push({ code: "duplicate-entity-id", entityId: entity.id });
      entitiesById.set(entity.id, entity);
      if (!Number.isInteger(entity.zIndex)) errors.push({ code: "invalid-z-index", entityId: entity.id });
      if (typeof entity.asset !== "string" || !entity.asset) errors.push({ code: "missing-asset", entityId: entity.id });
      const hostIds = entity.hostIds || (entity.hostId ? [entity.hostId] : []);
      hostIds.forEach((hostId) => {
        if (!scene.entities.some((candidate) => candidate.id === hostId)) {
          errors.push({ code: "host-missing", entityId: entity.id, hostId });
        }
      });
    });

    const defaultIds = new Set();
    scene.defaultConfiguration.visible.forEach((entityId) => {
      if (defaultIds.has(entityId)) errors.push({ code: "duplicate-default-visible", entityId });
      defaultIds.add(entityId);
      if (!entitiesById.has(entityId)) errors.push({ code: "default-visible-missing", entityId });
    });

    const replacementIds = new Set();
    scene.substitutionGroups.forEach((group) => {
      if (!entitiesById.has(group.primaryEntityId)) errors.push({ code: "substitution-primary-missing", groupId: group.id });
      if (!entitiesById.has(group.replacementEntityId)) errors.push({ code: "substitution-replacement-missing", groupId: group.id });
      if (group.primaryEntityId === group.replacementEntityId) errors.push({ code: "substitution-self-reference", groupId: group.id });
      if (replacementIds.has(group.replacementEntityId)) errors.push({ code: "duplicate-substitution-replacement", groupId: group.id });
      replacementIds.add(group.replacementEntityId);
    });

    scene.finishGroups.forEach((group) => {
      group.targets.forEach((entityId) => {
        if (!entitiesById.has(entityId)) errors.push({ code: "finish-target-missing", groupId: group.id, entityId });
      });
    });

    const visited = new Set();
    const visiting = new Set();
    function visitHost(entity) {
      if (visited.has(entity.id)) return;
      if (visiting.has(entity.id)) {
        errors.push({ code: "host-cycle", entityId: entity.id });
        return;
      }
      visiting.add(entity.id);
      const hostIds = entity.hostIds || (entity.hostId ? [entity.hostId] : []);
      hostIds.forEach((hostId) => {
        if (entitiesById.has(hostId)) visitHost(entitiesById.get(hostId));
      });
      visiting.delete(entity.id);
      visited.add(entity.id);
    }
    scene.entities.forEach(visitHost);

    const substitutionByReplacement = new Map(
      scene.substitutionGroups.map((group) => [group.replacementEntityId, group.primaryEntityId])
    );
    const dependencyVisited = new Set();
    const dependencyVisiting = new Set();
    function visitVisibilityDependencies(entity) {
      if (dependencyVisited.has(entity.id)) return;
      if (dependencyVisiting.has(entity.id)) {
        errors.push({ code: "visibility-cycle", entityId: entity.id });
        return;
      }

      dependencyVisiting.add(entity.id);
      const dependencyIds = [...(entity.hostIds || (entity.hostId ? [entity.hostId] : [])), substitutionByReplacement.get(entity.id)].filter(Boolean);
      dependencyIds.forEach((dependencyId) => {
        const dependency = entitiesById.get(dependencyId);
        if (dependency) visitVisibilityDependencies(dependency);
      });
      dependencyVisiting.delete(entity.id);
      dependencyVisited.add(entity.id);
    }
    scene.entities.forEach(visitVisibilityDependencies);

    return errors;
  }

  function assertValidScene(scene) {
    const errors = validateScene(scene);
    if (errors.length) throw new Error(`Cena 2D inválida: ${JSON.stringify(errors)}`);
    return true;
  }

  global.CasaModulesValidation = Object.freeze({ assertValidScene, validateScene });
})(window);
