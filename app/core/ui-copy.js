/* ARC-13 LOC-003/004: canonical pt-BR catalog for shared UI. */
(function (root, factory) {
  "use strict";
  var catalog = factory();
  if (root) root.CASA_UI_COPY = catalog;
  if (typeof module === "object" && module.exports) module.exports = catalog;
})(typeof window !== "undefined" ? window : null, function () {
  "use strict";
  return Object.freeze({
    schema: "M2DUIStringCatalog/1",
    locale: "pt-BR",
    navigation: Object.freeze({
      menu: Object.freeze({
        open: "Abrir menu",
        close: "Fechar menu"
      }),
      primaryLabel: "Navegação principal",
      environments: "Ambientes",
      howItWorks: "Como funciona",
      about: "Quem somos"
    }),
    theme: Object.freeze({
      mode: Object.freeze({
        auto: Object.freeze({ full: "Automático", short: "Auto" }),
        light: "Claro",
        dark: "Escuro"
      }),
      toggle: Object.freeze({
        ariaLabel: "Tema atual: {current}. Ativar {next}.",
        title: "Tema: {current} (próximo: {next})"
      })
    })
  });
});
