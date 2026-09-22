(function registerPublishedPriceBook(global) {
  "use strict";

  // Public commercial estimate. Amounts are in cents and are sourced from the
  // approved configurator worksheet. Cost, margin and supplier data do not
  // belong in this public file.
  const priceBook = Object.freeze({
    schemaVersion: "CommercialEstimatePriceBook 1.1",
    mode: "estimate",
    currency: "BRL",
    label: "Estimativa da composição",
    disclaimer: "Estimativa comercial sujeita à validação final de medidas, instalação e disponibilidade.",
    entries: Object.freeze({
      "module-01": 90000,
      "module-02": 110000,
      "module-03": 150000,
      "module-04": 60000,
      "module-05": 80000,
      "module-06": 110000,
      "module-07": 60000,
      "lighting-08": 60000
    }),
    handleEntries: Object.freeze({
      none: 0,
      "tango-chrome": 17985,
      ponto: 14985,
      "alca-colors": 32850
    }),
    // Values are totals for the fourteen chargeable fronts in the full
    // composition. The product UI distributes this only for explanation.
    handleFrontTotal: 14,
    frontFinishRatesBps: Object.freeze({
      "base-light": 0,
      cocoa: 1500,
      mist: 1500,
      steel: 1500,
      fiber: 2500,
      shadow: 2500
    }),
    localEntries: Object.freeze({
      "module-02:mandatory-cooktop-stone": 56600
    }),
    globalEntries: Object.freeze({
      "stone-existing": 0,
      "stone-light-sink": 169900,
      "stone-cloud": 219900,
      "stone-grove": 219900,
      "stone-night": 219900,
      "stone-skirting": 18500,
      "move-stone": 39900,
      "tempered-glass": 39000
    })
  });

  global.CASA_EM_MODULOS_PRICE_BOOK = priceBook;
})(window);
