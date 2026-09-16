(function registerPricingCore(global) {
  "use strict";

  function calculatePublicEstimate(scene, state, catalog, resolvedVisibility, priceBook) {
    const visibleIds = new Set(
      scene.entities
        .filter((entity) => resolvedVisibility?.[entity.id]?.visible)
        .map((entity) => entity.id)
    );
    const sellables = [...catalog.modules, ...catalog.accessories]
      .filter((item) => visibleIds.has(item.entityId));
    const entries = priceBook?.entries || null;
    const missingPriceIds = sellables
      .filter((item) => !Number.isSafeInteger(entries?.[item.entityId]))
      .map((item) => item.entityId);
    if (missingPriceIds.length) {
      return Object.freeze({ status: "unavailable", totalCents: null, missingPriceIds });
    }
    return Object.freeze({
      status: priceBook?.mode === "demo" ? "demo" : "ready",
      totalCents: sellables.reduce((total, item) => total + entries[item.entityId], 0),
      missingPriceIds: [],
      label: priceBook?.label || "Valor estimado",
      disclaimer: priceBook?.disclaimer || ""
    });
  }

  global.CasaModulesPricing = Object.freeze({ calculatePublicEstimate });
})(window);
