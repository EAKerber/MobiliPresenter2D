(function registerVisibilityCore(global) {
  "use strict";

  function resolveVisibility(scene, state) {
    const entitiesById = new Map(scene.entities.map((entity) => [entity.id, entity]));
    const substitutionsByReplacement = new Map(
      scene.substitutionGroups.map((group) => [group.replacementEntityId, group])
    );
    const resolved = {};
    const resolving = new Set();

    function resolveEntity(entityId) {
      if (resolved[entityId]) return resolved[entityId];
      if (resolving.has(entityId)) throw new Error(`Ciclo de visibilidade detectado em ${entityId}.`);

      const entity = entitiesById.get(entityId);
      if (!entity) return { visible: false, reason: "host-missing" };
      resolving.add(entityId);

      let result;
      const substitution = substitutionsByReplacement.get(entityId);
      if (substitution) {
        const primary = resolveEntity(substitution.primaryEntityId);
        result = primary.visible
          ? { visible: false, reason: "substitution-primary-visible" }
          : { visible: true, reason: "visible" };
      } else {
        const hasIntent = Object.prototype.hasOwnProperty.call(state.visibilityByEntity, entityId);
        const isVisible = hasIntent ? Boolean(state.visibilityByEntity[entityId]) : Boolean(entity.defaultVisible);
        result = isVisible
          ? { visible: true, reason: "visible" }
          : { visible: false, reason: hasIntent ? "intent-off" : "default-hidden" };
      }

      if (entity.hostId) {
        const host = entitiesById.get(entity.hostId);
        if (!host) {
          result = { visible: false, reason: "host-missing" };
        } else if (!resolveEntity(host.id).visible) {
          result = { visible: false, reason: "host-hidden" };
        }
      }

      resolving.delete(entityId);
      resolved[entityId] = Object.freeze(result);
      return resolved[entityId];
    }

    scene.entities.forEach((entity) => resolveEntity(entity.id));
    return Object.freeze(resolved);
  }

  function getVisibleEntities(scene, state) {
    const visibility = resolveVisibility(scene, state);
    return scene.entities
      .filter((entity) => visibility[entity.id].visible)
      .slice()
      .sort((left, right) => left.zIndex - right.zIndex || left.id.localeCompare(right.id));
  }

  function getVisibleControllableEntities(scene, state) {
    return getVisibleEntities(scene, state).filter((entity) => entity.controllable);
  }

  global.CasaModulesVisibility = Object.freeze({
    getVisibleControllableEntities,
    getVisibleEntities,
    resolveVisibility
  });
})(window);
