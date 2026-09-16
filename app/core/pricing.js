(function registerPricingCore(global) {
  "use strict";

  function selectedHandleCents(catalog, state, priceBook) {
    const selectedHandle = catalog.options?.handles?.find((handle) => handle.id === state.handlePresetId);
    if (!selectedHandle || selectedHandle.id === "none") return 0;
    const value = priceBook?.handleEntries?.[selectedHandle.id];
    return Number.isSafeInteger(value) ? value : 0;
  }

  function itemEstimate(item, catalog, state, priceBook) {
    const entries = priceBook?.entries || null;
    const directPrice = entries?.[item.entityId];
    const baseCents = Number.isSafeInteger(directPrice)
      ? directPrice
      : item.category !== undefined && Number.isSafeInteger(priceBook?.baseModuleCents)
        ? priceBook.baseModuleCents
        : null;
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
    return Object.freeze({
      status: priceBook?.mode === "demo" ? "demo" : "ready",
      totalCents: estimates.reduce((total, { estimate }) => total + estimate.totalCents, 0),
      missingPriceIds: [],
      label: priceBook?.label || "Valor estimado",
      disclaimer: priceBook?.disclaimer || ""
    });
  }

  global.CasaModulesPricing = Object.freeze({ calculatePublicEstimate, itemEstimate, selectedHandleCents });
})(window);
