(function registerLegacyStageRepair(global) {
  "use strict";

  const HANDLES_ITEM_ID = "handles-all";
  const FINISHES_KIND = "finishes";

  function clone(value) {
    return structuredClone(value);
  }

  function stageKind(stage) {
    return stage?.kind || stage?.id;
  }

  function findStageByKind(value, kind) {
    return value?.stages?.find((stage) => stageKind(stage) === kind) || null;
  }

  function itemOwners(value, itemId) {
    return (value?.stages || []).filter((stage) => Array.isArray(stage.items) && stage.items.includes(itemId));
  }

  function insertHandlesItem(items) {
    const next = [...items];
    if (next.includes(HANDLES_ITEM_ID)) return next;

    const frontsIndex = next.indexOf("fronts-all");
    if (frontsIndex >= 0) {
      next.splice(frontsIndex + 1, 0, HANDLES_ITEM_ID);
      return next;
    }

    const stoneIndexes = ["stone-all", "stone-skirting"]
      .map((id) => next.indexOf(id))
      .filter((index) => index >= 0);
    const beforeStone = stoneIndexes.length ? Math.min(...stoneIndexes) : -1;
    if (beforeStone >= 0) next.splice(beforeStone, 0, HANDLES_ITEM_ID);
    else next.push(HANDLES_ITEM_ID);
    return next;
  }

  function removeOneHandlesAssignment(value) {
    const copy = clone(value);
    const finishes = findStageByKind(copy, FINISHES_KIND);
    if (finishes && Array.isArray(finishes.items)) {
      const index = finishes.items.indexOf(HANDLES_ITEM_ID);
      if (index >= 0) finishes.items.splice(index, 1);
    }
    return copy;
  }

  function planHandlesAssignment(source, expectedSchema = "ConfiguratorAdministration2D 3.0") {
    if (!source || source.schemaVersion !== expectedSchema || !Array.isArray(source.stages)) {
      return { ok: false, code: "unsupported_source", message: "A origem publicada precisa estar no schema v3 atual." };
    }

    const owners = itemOwners(source, HANDLES_ITEM_ID);
    if (owners.length > 1) {
      return { ok: false, code: "duplicate_owner", message: "Puxadores está atribuído a mais de uma etapa." };
    }
    if (owners.length === 1) {
      if (stageKind(owners[0]) === FINISHES_KIND) {
        return { ok: true, needed: false, candidate: clone(source), message: "Puxadores já está persistido em Acabamentos." };
      }
      return { ok: false, code: "wrong_owner", message: "Puxadores já está atribuído a outra etapa; não é seguro movê-lo automaticamente." };
    }

    const finishes = findStageByKind(source, FINISHES_KIND);
    if (!finishes || !Array.isArray(finishes.items)) {
      return { ok: false, code: "missing_finishes", message: "A etapa Acabamentos não existe ou não possui lista de itens v3." };
    }

    const candidate = clone(source);
    const candidateFinishes = findStageByKind(candidate, FINISHES_KIND);
    candidateFinishes.items = insertHandlesItem(candidateFinishes.items);

    return {
      ok: true,
      needed: true,
      candidate,
      beforeItems: [...finishes.items],
      afterItems: [...candidateFinishes.items],
      message: "Puxadores será adicionado à etapa Acabamentos no v3 publicado."
    };
  }

  function verifyHandlesOnlyDelta(source, candidate, expectedSchema = "ConfiguratorAdministration2D 3.0") {
    const plan = planHandlesAssignment(source, expectedSchema);
    if (!plan.ok) return plan;
    if (!plan.needed) {
      return { ok: false, code: "not_needed", message: "Puxadores já está persistido; nenhuma alteração é necessária." };
    }
    if (!candidate || candidate.schemaVersion !== expectedSchema) {
      return { ok: false, code: "wrong_candidate_schema", message: "A gravação de Puxadores deve permanecer em v3." };
    }

    const owners = itemOwners(candidate, HANDLES_ITEM_ID);
    if (owners.length !== 1 || stageKind(owners[0]) !== FINISHES_KIND) {
      return { ok: false, code: "invalid_candidate_owner", message: "O candidato deve atribuir Puxadores apenas a Acabamentos." };
    }

    const stripped = removeOneHandlesAssignment(candidate);
    if (JSON.stringify(stripped) !== JSON.stringify(source)) {
      return { ok: false, code: "unexpected_delta", message: "A gravação proposta altera campos além da atribuição de Puxadores." };
    }

    const candidateFinishes = findStageByKind(candidate, FINISHES_KIND);
    if (candidateFinishes.items.length !== plan.afterItems.length
      || JSON.stringify(candidateFinishes.items) !== JSON.stringify(plan.afterItems)) {
      return { ok: false, code: "unexpected_item_order", message: "A ordem proposta de Acabamentos não corresponde à inserção canônica de Puxadores." };
    }

    return { ok: true, needed: true, candidate: clone(candidate) };
  }

  const api = Object.freeze({
    HANDLES_ITEM_ID,
    FINISHES_KIND,
    findStageByKind,
    itemOwners,
    insertHandlesItem,
    planHandlesAssignment,
    verifyHandlesOnlyDelta
  });

  if (typeof module !== "undefined" && module.exports) module.exports = api;
  if (global && typeof global === "object") global.CasaModulesLegacyStageRepair = api;
})(typeof globalThis === "undefined" ? this : globalThis);
