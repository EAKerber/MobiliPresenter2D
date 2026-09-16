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
    entries: Object.freeze({
      "module-01": 239900,
      "module-02": 349900,
      "module-03": 429900,
      "module-04": 119900,
      "module-05": 269900,
      "module-06": 319900,
      "module-07": 189900,
      "lighting-08": 89900
    })
  });

  global.CASA_EM_MODULOS_PRICE_BOOK = priceBook;
})(window);
