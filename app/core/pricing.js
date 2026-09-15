(function registerPricingCore(global) {
  "use strict";

  function calculatePublicEstimate(scene, state, catalog, resolvedVisibility) {
    const visibleIds = new Set(
      scene.entities
        .filter((entity) => resolvedVisibility?.[entity.id]?.visible)
        .map((entity) => entity.id)
    );
    const sellables = [...catalog.modules, ...catalog.accessories]
      .filter((item) => visibleIds.has(item.entityId));
    const missingPriceIds = sellables
      .filter((item) => !Number.isSafeInteger(item.publicPriceCents))
      .map((item) => item.entityId);
    if (missingPriceIds.length) {
      return Object.freeze({ status: "unavailable", totalCents: null, missingPriceIds });
    }
    return Object.freeze({
      status: "ready",
      totalCents: sellables.reduce((total, item) => total + item.publicPriceCents, 0),
      missingPriceIds: []
    });
  }

  global.CasaModulesPricing = Object.freeze({ calculatePublicEstimate });
})(window);
