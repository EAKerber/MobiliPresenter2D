(function registerPricingCore(global) {
  "use strict";

  function safeEntry(entries, id) {
    const value = entries?.[id];
    return Number.isSafeInteger(value) ? value : 0;
  }

  function moduleSelection(state, entityId) {
    return state.moduleSelections?.[entityId] || { finishId: "base-light", handleId: "none" };
  }

  function handleForItem(item, state, priceBook) {
    if (!item.commercial?.handleEligible) return { id: "none", cents: 0, frontCount: 0 };
    const id = moduleSelection(state, item.entityId).handleId || "none";
    return {
      id,
      cents: safeEntry(priceBook?.handleEntries, id),
      frontCount: Number.isInteger(item.commercial?.handleFrontCount) ? item.commercial.handleFrontCount : 0
    };
  }

  function finishForItem(item, state, priceBook) {
    if (!item.commercial?.finishEligible) return { id: "base-light", rateBps: 0, cents: 0 };
    const id = moduleSelection(state, item.entityId).finishId || "base-light";
    return { id, rateBps: safeEntry(priceBook?.frontFinishRatesBps, id), cents: 0 };
  }

  function itemEstimate(item, catalog, state, priceBook) {
    const baseCents = safeEntry(priceBook?.entries, item.entityId);
    if (!baseCents) return Object.freeze({ status: "unavailable", totalCents: null, baseCents: null, handleCents: 0, finishCents: 0, localCents: 0 });

    const finish = finishForItem(item, state, priceBook);
    const finishCents = Math.round((baseCents * finish.rateBps) / 10000);
    const handle = handleForItem(item, state, priceBook);
    const localIds = item.commercial?.mandatoryLocalChargeIds || [];
    const localCents = localIds.reduce((total, id) => total + safeEntry(priceBook?.localEntries, item.entityId + ":" + id), 0);
    return Object.freeze({
      status: "ready",
      baseCents,
      finishId: finish.id,
      finishRateBps: finish.rateBps,
      finishCents,
      handleId: handle.id,
      handleCents: handle.cents,
      handleFrontCount: handle.frontCount,
      localCents,
      localChargeIds: Object.freeze([...localIds]),
      totalCents: baseCents + finishCents + handle.cents + localCents
    });
  }

  function globalAdjustments(state, priceBook) {
    const selected = state.globalSelections || {};
    const items = [];
    const stoneId = selected.stonePackageId || "stone-existing";
    items.push({ id: stoneId, scope: "stone", cents: safeEntry(priceBook?.globalEntries, stoneId) });
    (selected.serviceIds || []).forEach((id) => items.push({ id, scope: "service", cents: safeEntry(priceBook?.globalEntries, id) }));
    return Object.freeze({ items: Object.freeze(items), totalCents: items.reduce((total, item) => total + item.cents, 0) });
  }

  function calculatePublicEstimate(scene, state, catalog, resolvedVisibility, priceBook) {
    const visibleIds = new Set(scene.entities.filter((entity) => resolvedVisibility?.[entity.id]?.visible).map((entity) => entity.id));
    const sellables = [...catalog.modules, ...catalog.accessories].filter((item) => visibleIds.has(item.entityId));
    const estimates = sellables.map((item) => ({ item, estimate: itemEstimate(item, catalog, state, priceBook) }));
    const missingPriceIds = estimates.filter(({ estimate }) => estimate.status === "unavailable").map(({ item }) => item.entityId);
    if (missingPriceIds.length) return Object.freeze({ status: "unavailable", totalCents: null, missingPriceIds });

    const moduleIds = new Set((catalog.modules || []).map((item) => item.entityId));
    const moduleEstimates = estimates.filter(({ item }) => moduleIds.has(item.entityId));
    const lightingEstimate = estimates.find(({ item }) => item.entityId === "lighting-08")?.estimate || null;
    const modulesCents = moduleEstimates.reduce((total, entry) => total + entry.estimate.baseCents, 0);
    const finishesCents = moduleEstimates.reduce((total, entry) => total + entry.estimate.finishCents, 0);
    const handlesCents = moduleEstimates.reduce((total, entry) => total + entry.estimate.handleCents, 0);
    const localCents = moduleEstimates.reduce((total, entry) => total + entry.estimate.localCents, 0);
    const global = globalAdjustments(state, priceBook);
    const lightingCents = lightingEstimate?.baseCents || 0;

    return Object.freeze({
      status: "estimate",
      totalCents: modulesCents + finishesCents + handlesCents + localCents + lightingCents + global.totalCents,
      label: priceBook?.label || "Estimativa da composição",
      disclaimer: priceBook?.disclaimer || "",
      missingPriceIds: [],
      moduleEstimates: Object.freeze(moduleEstimates),
      global,
      breakdown: Object.freeze({ modulesCents, finishesCents, handlesCents, localCents, lightingCents, globalCents: global.totalCents })
    });
  }

  function distributeCents(totalCents, count) {
    if (!Number.isSafeInteger(totalCents) || !Number.isInteger(count) || count < 1) return Object.freeze([]);
    const base = Math.trunc(totalCents / count);
    const remainder = totalCents - base * count;
    return Object.freeze(Array.from({ length: count }, (_, index) => base + (index < remainder ? 1 : 0)));
  }

  global.CasaModulesPricing = Object.freeze({ calculatePublicEstimate, distributeCents, globalAdjustments, itemEstimate });
})(window);
