(function registerPublishedPriceBook(global) {
  "use strict";

  // Public commercial estimate. Amounts are in cents and are sourced from the
  // approved configurator worksheet. Cost, margin and supplier data do not
  // belong in this public file.
  const amount = (cents) => Object.freeze({ type: "amount", cents });
  const percentage = (bps) => Object.freeze({
    type: "percentage",
    bps,
    basis: "eligible-module-base"
  });

  const pricing = Object.freeze({
    schemaVersion: "CommercialPricingRules 1.0",
    roles: Object.freeze({
      itemBase: Object.freeze({
        "module-01": amount(90000),
        "module-02": amount(110000),
        "module-03": amount(150000),
        "module-04": amount(60000),
        "module-05": amount(80000),
        "module-06": amount(110000),
        "module-07": amount(60000),
        "lighting-08": amount(60000)
      }),
      handleChoiceTotal: Object.freeze({
        none: amount(0),
        "tango-chrome": amount(17985),
        ponto: amount(14985),
        "alca-colors": amount(32850)
      }),
      frontFinishAdjustment: Object.freeze({
        "base-light": percentage(0),
        cocoa: percentage(1500),
        mist: percentage(1500),
        steel: percentage(1500),
        fiber: percentage(2500),
        shadow: percentage(2500)
      }),
      localAdjustment: Object.freeze({
        "module-02:mandatory-cooktop-stone": amount(56600)
      }),
      globalAdjustment: Object.freeze({
        "stone-existing": amount(0),
        "stone-light-sink": amount(169900),
        "stone-cloud": amount(219900),
        "stone-grove": amount(219900),
        "stone-night": amount(219900),
        "stone-skirting": amount(18500),
        "move-stone": amount(39900),
        "tempered-glass": amount(39000)
      })
    }),
    // Values are totals for the fourteen chargeable fronts in the full
    // composition. The product UI distributes this only for explanation.
    allocation: Object.freeze({ handleFrontTotal: 14 })
  });

  const priceBook = Object.freeze({
    schemaVersion: "CommercialEstimatePriceBook 2.0",
    mode: "estimate",
    currency: "BRL",
    label: "Estimativa da composição",
    disclaimer: "Estimativa comercial sujeita à validação final de medidas, instalação e disponibilidade.",
    pricing
  });

  global.CASA_EM_MODULOS_PRICE_BOOK = priceBook;
  if (typeof module !== "undefined" && module.exports) module.exports = priceBook;
})(typeof window === "undefined" ? globalThis : window);
