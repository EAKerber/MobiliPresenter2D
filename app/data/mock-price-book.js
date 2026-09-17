(function registerMockPriceBook(global) {
  "use strict";

  // Demonstration-only prices. This file deliberately contains no cost, margin,
  // supplier, validity, or commercial approval data.
  const priceBook = Object.freeze({
    schemaVersion: "DemoPriceBook 0.1",
    mode: "demo",
    currency: "BRL",
    label: "Simulação de valor",
    disclaimer: "Valores ilustrativos para testar a composição. Não são orçamento, proposta ou preço comercial.",
    compositionBaseReferenceCents: 300000,
    entries: Object.freeze({
      "module-01": 47980,
      "module-02": 69980,
      "module-03": 85980,
      "module-04": 23980,
      "module-05": 53980,
      "module-06": 63980,
      "module-07": 37980,
      "lighting-08": 89900
    }),
    handleEntries: Object.freeze({
      none: 0,
      "tango-chrome": 17985,
      ponto: 14985,
      "alca-colors": 32850
    }),
    frontFinishEntries: Object.freeze({
      "gianduia-original": 0,
      "gianduia-color": 0,
      "white-tx": 0,
      black: 0,
      olive: 0,
      "petroleum-blue": 0,
      "solid-color-custom": 0,
      "uploaded-texture": 0
    }),
    stoneEntries: Object.freeze({ "stone-original": 0, "stone-custom": 0 }),
    serviceEntries: Object.freeze({ "base-stone": 0 })
  });

  global.CASA_EM_MODULOS_PRICE_BOOK = priceBook;
})(window);
