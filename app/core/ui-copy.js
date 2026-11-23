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
      about: "Quem somos",
      contactAriaLabel: "Fale conosco pelo WhatsApp",
      contact: "Fale conosco"
    }),
    home: Object.freeze({
      hero: Object.freeze({
        eyebrow: "Casa em Módulos",
        heading: Object.freeze({
          assemble: "Monte.",
          choose: "Escolha.",
          enjoy: "Aproveite."
        }),
        lead: "Móveis inteligentes, pensados para o seu espaço e para o seu orçamento.",
        description: "Um novo conceito em mobiliário que une projeto, fabricação e instalação em uma solução simples, prática e acessível.",
        aboutLink: "Saiba mais",
        video: Object.freeze({
          groupLabel: "Vídeo de apresentação no celular",
          playLabel: "Reproduzir o vídeo de apresentação"
        })
      }),
      benefits: Object.freeze({
        miniLabel: "Vantagens",
        stripLabel: "Vantagens Casa em Módulos"
      }),
      environments: Object.freeze({
        eyebrow: "Você escolhe o que precisa",
        heading: "A gente já sabe como fazer.",
        carousel: Object.freeze({
          previous: "Ambientes anteriores",
          page: "Página do carrossel",
          next: "Próximos ambientes"
        })
      }),
      story: Object.freeze({
        eyebrow: "Simples do início ao fim",
        heading: "Do seu espaço ao ambiente pronto.",
        description: "Escolha o ambiente, conheça os módulos e encontre uma solução que acompanha sua rotina.",
        action: "Encontre seu ambiente "
      })
    }),
    actions: Object.freeze({
      exploreEnvironments: "Conheça nossos ambientes"
    }),
    video: Object.freeze({
      youtubeLink: "Assistir no YouTube ↗",
      fullscreen: Object.freeze({
        open: "Abrir vídeo em tela cheia",
        close: "Sair da tela cheia"
      })
    }),
    footer: Object.freeze({
      tagline: "Móveis modulares pensados para a vida real.",
      homeLink: "Voltar ao início ↑"
    }),
    comparison: Object.freeze({
      labels: Object.freeze({
        adaptation: "Adaptação",
        quality: "Qualidade",
        personalization: "Personalização",
        cost: "Custo",
        stagedPurchase: "Compra por etapas",
        production: "Produção"
      }),
      cards: Object.freeze({
        readyMade: "Móveis prontos",
        traditional: "Planejados tradicionais",
        modular: "Casa em Módulos"
      }),
      details: Object.freeze({
        readyMade: Object.freeze({
          adaptation: "Dimensões e configurações da linha.",
          quality: "Varia conforme o produto e o fabricante.",
          personalization: "Opções oferecidas pela linha.",
          cost: "Varia conforme produto e configuração.",
          stagedPurchase: "Depende da linha e da disponibilidade.",
          production: "Produção da linha do fabricante."
        }),
        traditional: Object.freeze({
          adaptation: "Projeto definido para o ambiente.",
          quality: "Definida por materiais, projeto e execução.",
          personalization: "Definida durante o projeto.",
          cost: "Varia conforme projeto, materiais e serviço.",
          stagedPurchase: "Definida com o prestador.",
          production: "Produção conforme o projeto."
        }),
        modular: Object.freeze({
          adaptation: "Combinação de módulos estudados para o empreendimento.",
          quality: "Padrão de marcenaria conforme especificações do projeto.",
          personalization: "Combinações de módulos, acabamentos e acessórios disponíveis.",
          cost: "Busca valores acessíveis por eficiência e escala.",
          stagedPurchase: "Possibilidade prevista no modelo, conforme regras comerciais.",
          production: "Organizada a partir de uma plataforma modular por empreendimento."
        })
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
        accessibleInstruction: "Cena da cozinha. Use as setas para percorrer os módulos ou as teclas de 1 a 7 para selecionar pelo número.",
        imageAlt: "Composição da cozinha Casa em Módulos",
        hotspotsLabel: "Módulos selecionáveis na cena",
        fallbackStatus: "Imagem indisponível",
        fallbackDescription: "A composição completa da cozinha não pôde ser exibida.",
        fallbackAccessibleLabel: "Cena da cozinha indisponível. A composição completa não pôde ser exibida."
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
