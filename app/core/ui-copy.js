/* ARC-13 LOC-003: reviewed pt-BR strings for shared UI controls. */
(function (win) {
  "use strict";
  win.CASA_UI_COPY = Object.freeze({
    schema: "M2DUIStringCatalog/1",
    locale: "pt-BR",
    navigation: Object.freeze({
      menu: Object.freeze({
        open: "Abrir menu",
        close: "Fechar menu"
      })
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
})(window);
