(function registerPricingCore(global) {
  "use strict";

  function safeEntry(entries, id) {
    const value = entries?.[id];
    return Number.isSafeInteger(value) ? value : 0;
  }

  function distributeCents(totalCents, count) {
    if (!Number.isSafeInteger(totalCents) || !Number.isInteger(count) || count < 1) return Object.freeze([]);
    const base = Math.trunc(totalCents / count);
    const remainder = totalCents - base * count;
    return Object.freeze(Array.from({ length: count }, (_, index) => base + (index < remainder ? 1 : 0)));
  }

  function distributeByBase(totalCents, entries) {
    if (!totalCents || !entries.length) return new Map(entries.map(({ item }) => [item.entityId, 0]));
    const totalBase = entries.reduce((sum, { estimate }) => sum + estimate.baseCents, 0);
    if (!totalBase) return new Map(entries.map(({ item }) => [item.entityId, 0]));
    const provisional = entries.map(({ item, estimate }, index) => {
      const exact = (totalCents * estimate.baseCents) / totalBase;
      return { id: item.entityId, index, cents: Math.floor(exact), fraction: exact - Math.floor(exact) };
    });
    const remainder = totalCents - provisional.reduce((sum, entry) => sum + entry.cents, 0);
    provisional.slice().sort((left, right) => right.fraction - left.fraction || left.index - right.index)
      .slice(0, remainder).forEach((entry) => { provisional[entry.index].cents += 1; });
    return new Map(provisional.map((entry) => [entry.id, entry.cents]));
  }

  function globalFinishId(state) {
    return state.globalSelections?.finishId || "base-light";
  }

  function globalHandleId(state) {
    return state.globalSelections?.handleId || "none";
  }

  function itemEstimate(item, catalog, state, priceBook) {
    const baseCents = safeEntry(priceBook?.entries, item.entityId);
    if (!baseCents) {
      return Object.freeze({ status: "unavailable", totalCents: null, baseCents: null, handleCents: 0, finishCents: 0, localCents: 0 });
    }
    const finishId = globalFinishId(state);
    const finishRateBps = item.commercial?.finishEligible ? safeEntry(priceBook?.frontFinishRatesBps, finishId) : 0;
    const finishCents = Math.round((baseCents * finishRateBps) / 10000);
    const localIds = item.commercial?.mandatoryLocalChargeIds || [];
    const localCents = localIds.reduce((total, id) => total + safeEntry(priceBook?.localEntries, item.entityId + ":" + id), 0);
    return Object.freeze({
      status: "ready",
      baseCents,
      finishId,
      finishRateBps,
      finishCents,
      handleId: globalHandleId(state),
      handleCents: 0,
      handleFrontCount: Number.isInteger(item.commercial?.handleFrontCount) ? item.commercial.handleFrontCount : 0,
      localCents,
      localChargeIds: Object.freeze([...localIds]),
      globalShareCents: 0,
      totalCents: baseCents + finishCents + localCents
    });
  }

  function globalAdjustments(state, priceBook, lightingEnabled) {
    const selected = state.globalSelections || {};
    const items = [];
    const stoneId = selected.stonePackageId || "stone-existing";
    items.push({ id: stoneId, scope: "stone", cents: safeEntry(priceBook?.globalEntries, stoneId) });
    (selected.serviceIds || []).forEach((id) => items.push({ id, scope: id === "stone-skirting" ? "stone" : "service", cents: safeEntry(priceBook?.globalEntries, id) }));
    if (lightingEnabled) items.push({ id: "lighting-08", scope: "service", cents: safeEntry(priceBook?.entries, "lighting-08") });
    return Object.freeze({ items: Object.freeze(items), totalCents: items.reduce((total, item) => total + item.cents, 0) });
  }

  function handleAllocations(catalog, state, priceBook) {
    const id = globalHandleId(state);
    const totalCents = safeEntry(priceBook?.handleEntries, id);
    const frontTotal = safeEntry(priceBook, "handleFrontTotal") || 14;
    const perFront = distributeCents(totalCents, frontTotal);
    let cursor = 0;
    const result = new Map();
    catalog.modules.forEach((item) => {
      const count = item.commercial?.handleEligible ? Number(item.commercial?.handleFrontCount) || 0 : 0;
      result.set(item.entityId, perFront.slice(cursor, cursor + count).reduce((sum, cents) => sum + cents, 0));
      cursor += count;
    });
    return result;
  }

  function calculatePublicEstimate(scene, state, catalog, resolvedVisibility, priceBook) {
    const visibleIds = new Set(scene.entities.filter((entity) => resolvedVisibility?.[entity.id]?.visible).map((entity) => entity.id));
    const moduleEntries = catalog.modules.filter((item) => visibleIds.has(item.entityId))
      .map((item) => ({ item, estimate: itemEstimate(item, catalog, state, priceBook) }));
    const missingPriceIds = moduleEntries.filter(({ estimate }) => estimate.status === "unavailable").map(({ item }) => item.entityId);
    if (missingPriceIds.length) return Object.freeze({ status: "unavailable", totalCents: null, missingPriceIds });

    const global = globalAdjustments(state, priceBook, Boolean(resolvedVisibility?.["lighting-08"]?.visible));
    const handlesByItem = handleAllocations(catalog, state, priceBook);
    const globalShareByItem = distributeByBase(global.totalCents, moduleEntries);
    const moduleEstimates = moduleEntries.map(({ item, estimate }) => {
      const handleCents = handlesByItem.get(item.entityId) || 0;
      const globalShareCents = globalShareByItem.get(item.entityId) || 0;
      return Object.freeze({
        item,
        estimate: Object.freeze({
          ...estimate,
          handleCents,
          globalShareCents,
          totalCents: estimate.baseCents + estimate.finishCents + estimate.localCents + handleCents + globalShareCents
        })
      });
    });
    const modulesCents = moduleEstimates.reduce((total, entry) => total + entry.estimate.baseCents, 0);
    const finishesCents = moduleEstimates.reduce((total, entry) => total + entry.estimate.finishCents, 0);
    const handlesCents = moduleEstimates.reduce((total, entry) => total + entry.estimate.handleCents, 0);
    const localCents = moduleEstimates.reduce((total, entry) => total + entry.estimate.localCents, 0);
    const allocatedGlobalCents = moduleEstimates.reduce((total, entry) => total + entry.estimate.globalShareCents, 0);
    const unallocatedGlobalCents = global.totalCents - allocatedGlobalCents;
    // A configuration with no modules is unusual, but it must never silently
    // drop global choices that are still selected. With modules present this is
    // zero because every global impact is allocated exactly once.
    const totalCents = modulesCents + finishesCents + handlesCents + localCents + global.totalCents;

    return Object.freeze({
      status: "estimate",
      totalCents,
      label: priceBook?.label || "Estimativa da composição",
      disclaimer: priceBook?.disclaimer || "",
      missingPriceIds: [],
      moduleEstimates: Object.freeze(moduleEstimates),
      global,
      breakdown: Object.freeze({
        modulesCents,
        finishesCents,
        handlesCents,
        localCents,
        globalCents: global.totalCents,
        allocatedGlobalCents,
        unallocatedGlobalCents
      })
    });
  }

  global.CasaModulesPricing = Object.freeze({ calculatePublicEstimate, distributeCents, globalAdjustments, itemEstimate });
})(window);
