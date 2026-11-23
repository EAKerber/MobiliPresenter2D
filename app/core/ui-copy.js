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
    brand: Object.freeze({
      homeLinkAriaLabel: "Casa em Módulos, início",
      logoAlt: "Casa em Módulos"
    }),
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
    home: Object.freeze({
      hero: Object.freeze({
        aboutLink: "Saiba mais"
      })
    }),
    video: Object.freeze({
      youtubeLink: "Assistir no YouTube ↗",
      fullscreen: Object.freeze({
        open: "Abrir vídeo em tela cheia",
        close: "Sair da tela cheia"
      })
    }),
    viewer: Object.freeze({
      state: Object.freeze({
        empty: "Nenhum módulo está visível no viewer neste momento.",
        loading: "Carregando informações publicadas…",
        unavailable: "Informações temporariamente indisponíveis. Tente novamente mais tarde."
      }),
      views: Object.freeze({
        show: "Mostrar vista {index}",
        previous: "Vista anterior",
        counter: "{current} / {total}",
        next: "Próxima vista"
      }),
      scene: Object.freeze({
        selected: "Selecionado: {number} · {title}",
        heading: "Cena interativa",
        instruction: "Clique em um módulo ou use ←/→ e as teclas 1–7.",
        accessibleInstruction: "Cena da cozinha. Use as setas para percorrer os módulos ou as teclas de 1 a 7 para selecionar pelo número."
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
});
