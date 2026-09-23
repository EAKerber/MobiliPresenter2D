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
    const moduleEstimates = moduleEntries.map(({ item, estimate }) => {
      const handleCents = handlesByItem.get(item.entityId) || 0;
      return Object.freeze({
        item,
        estimate: Object.freeze({
          ...estimate,
          handleCents,
          // Global choices belong to the composition, never to a module.
          totalCents: estimate.baseCents + estimate.finishCents + estimate.localCents + handleCents
        })
      });
    });
    const modulesCents = moduleEstimates.reduce((total, entry) => total + entry.estimate.baseCents, 0);
    const finishesCents = moduleEstimates.reduce((total, entry) => total + entry.estimate.finishCents, 0);
    const handlesCents = moduleEstimates.reduce((total, entry) => total + entry.estimate.handleCents, 0);
    const localCents = moduleEstimates.reduce((total, entry) => total + entry.estimate.localCents, 0);
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
        globalCents: global.totalCents
      })
    });
  }

  global.CasaModulesPricing = Object.freeze({ calculatePublicEstimate, distributeCents, globalAdjustments, itemEstimate });
})(window);
