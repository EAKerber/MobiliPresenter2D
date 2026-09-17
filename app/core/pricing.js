(function registerPricingCore(global) {
  "use strict";

  function selectedHandleCents(catalog, state, priceBook) {
    const selectedHandle = catalog.options?.handles?.find((handle) => handle.id === state.handlePresetId);
    if (!selectedHandle || selectedHandle.id === "none") return 0;
    const value = priceBook?.handleEntries?.[selectedHandle.id];
    return Number.isSafeInteger(value) ? value : 0;
  }

  function safeEntry(entries, id) {
    const value = entries?.[id];
    return Number.isSafeInteger(value) ? value : 0;
  }

  function sharedAdjustments(catalog, state, priceBook) {
    const frontCents = safeEntry(priceBook?.frontFinishEntries, state.frontFinishId);
    const stoneCents = safeEntry(priceBook?.stoneEntries, state.stoneFinishId);
    const serviceCents = (catalog.services || [])
      .filter((service) => service.status === "included")
      .reduce((total, service) => total + safeEntry(priceBook?.serviceEntries, service.id), 0);
    return Object.freeze({
      frontCents,
      stoneCents,
      serviceCents,
      totalCents: frontCents + stoneCents + serviceCents
    });
  }

  function itemEstimate(item, catalog, state, priceBook) {
    const entries = priceBook?.entries || null;
    const directPrice = entries?.[item.entityId];
    const baseCents = Number.isSafeInteger(directPrice) ? directPrice : null;
    if (!Number.isSafeInteger(baseCents)) return Object.freeze({ status: "unavailable", totalCents: null, baseCents: null, handleCents: 0 });
    const handleCents = item.category && item.category !== "Estrutural" ? selectedHandleCents(catalog, state, priceBook) : 0;
    return Object.freeze({ status: "ready", baseCents, handleCents, totalCents: baseCents + handleCents });
  }

  function calculatePublicEstimate(scene, state, catalog, resolvedVisibility, priceBook) {
    const visibleIds = new Set(
      scene.entities
        .filter((entity) => resolvedVisibility?.[entity.id]?.visible)
        .map((entity) => entity.id)
    );
    const sellables = [...catalog.modules, ...catalog.accessories]
      .filter((item) => visibleIds.has(item.entityId));
    const estimates = sellables.map((item) => ({ item, estimate: itemEstimate(item, catalog, state, priceBook) }));
    const missingPriceIds = estimates.filter(({ estimate }) => estimate.status === "unavailable").map(({ item }) => item.entityId);
    if (missingPriceIds.length) {
      return Object.freeze({ status: "unavailable", totalCents: null, missingPriceIds });
    }
    const adjustments = sharedAdjustments(catalog, state, priceBook);
    const moduleEntityIds = new Set((catalog.modules || []).map((item) => item.entityId));
    const moduleCents = estimates
      .filter(({ item }) => moduleEntityIds.has(item.entityId))
      .reduce((total, { estimate }) => total + estimate.baseCents, 0);
    const accessoryCents = estimates
      .filter(({ item }) => !moduleEntityIds.has(item.entityId))
      .reduce((total, { estimate }) => total + estimate.baseCents, 0);
    const handleCents = estimates.reduce((total, { estimate }) => total + estimate.handleCents, 0);
    return Object.freeze({
      status: priceBook?.mode === "demo" ? "demo" : "ready",
      totalCents: moduleCents + accessoryCents + handleCents + adjustments.totalCents,
      missingPriceIds: [],
      label: priceBook?.label || "Valor estimado",
      disclaimer: priceBook?.disclaimer || "",
      adjustments,
      breakdown: Object.freeze({ moduleCents, accessoryCents, handleCents, ...adjustments })
    });
  }

  global.CasaModulesPricing = Object.freeze({ calculatePublicEstimate, itemEstimate, selectedHandleCents, sharedAdjustments });
})(window);
