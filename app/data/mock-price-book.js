(function registerPublishedPriceBook(global) {
  "use strict";

  // Public commercial estimate. Amounts are in cents and are sourced from the
  // approved configurator worksheet. Cost, margin and supplier data do not
  // belong in this public file.
  const priceBook = Object.freeze({
    schemaVersion: "CommercialEstimatePriceBook 1.0",
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
      // Per-front values. The supplied whole-set references divide exactly
      // across the 15 confirmed fronts: 179,85 / 15; 149,85 / 15; 328,50 / 15.
      none: 0,
      "tango-chrome": 1199,
      ponto: 999,
      "alca-colors": 2190
    }),
    // These bands are data capabilities only. Until approved swatches arrive,
    // the public selector exposes the base finish exclusively.
    frontFinishRatesBps: Object.freeze({
      "base-light": 0,
      "tone-15-a": 1500,
      "tone-15-b": 1500,
      "tone-15-c": 1500,
      "tone-25-a": 2500,
      "tone-25-b": 2500
    }),
    localEntries: Object.freeze({
      "module-02:mandatory-cooktop-stone": 56600
    }),
    globalEntries: Object.freeze({
      "stone-existing": 0,
      "stone-standard-sink": 169900,
      "stone-light": 219900,
      "stone-green": 219900,
      "stone-dark": 219900,
      "stone-skirting": 18500,
      "move-stone": 39900,
      "tempered-glass": 39000
    })
  });

  global.CASA_EM_MODULOS_PRICE_BOOK = priceBook;
})(window);
