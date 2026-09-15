(function registerCatalogData(global) {
  "use strict";

  function deepFreeze(value) {
    if (!value || typeof value !== "object" || Object.isFrozen(value)) return value;
    Object.values(value).forEach(deepFreeze);
    return Object.freeze(value);
  }

  // This is the public product catalog, not a cost book. Commercial values stay
  // null until an authenticated back-office publishes a price table.
  const modules = [
    {
      entityId: "module-01", sku: "CM-01", category: "Aéreo", title: "Aéreo da lavanderia",
      dimensions: "760 × 700 × 350 mm",
      benefits: ["Portas com fechamento amortecido", "Prateleira fixa para organização", "Caixaria interna Branco TX"],
      components: ["Dobradiças com amortecimento", "MDF 18 mm", "Fundo 6 mm duplamente melamínico"],
      requirements: [], publicPriceCents: null
    },
    {
      entityId: "module-02", sku: "CM-02", category: "Inferior", title: "Inferior do fogão",
      dimensions: "790 × 760 × 530 mm",
      benefits: ["Espaço para forno embutido", "Integra cooktop e acabamento da bancada", "Preparo elétrico previsto no módulo"],
      components: ["Cabo PP 4 mm", "2 tomadas de 20 A", "Estrutura em MDF 18 mm"],
      requirements: ["Prever alimentação do fogão e do forno conforme especificação técnica."], publicPriceCents: null
    },
    {
      entityId: "module-03", sku: "CM-03", category: "Inferior", title: "Inferior da pia",
      dimensions: "1.200 × 760 × 530 mm",
      benefits: ["Quatro gavetas com corrediças reforçadas H45", "Duas portas com fechamento amortecido", "Frentes com fita de borda coordenada"],
      components: ["4 corrediças telescópicas H45", "Dobradiças com amortecimento", "MDF 18 mm"],
      requirements: ["Verificar os pontos hidráulicos e elétricos previstos para a pia."], publicPriceCents: null
    },
    {
      entityId: "module-04", sku: "CM-04", category: "Estrutural", title: "Lateral da geladeira",
      dimensions: "2.400 × 600 × 18 mm",
      benefits: ["Sustenta o aéreo da geladeira", "Alinha o conjunto pela frente", "Organiza a fiação da iluminação"],
      components: ["Painel MDF 18 mm", "Fita de borda na cor da peça", "Ponto para interruptor de iluminação"],
      requirements: ["Necessária para manter o aéreo da geladeira e a iluminação compatíveis."], publicPriceCents: null
    },
    {
      entityId: "module-05", sku: "CM-05", category: "Aéreo", title: "Aéreo do fogão",
      dimensions: "800 × 700 × 400 mm",
      benefits: ["Organização acima da área de preparo", "Fechamento amortecido", "Caixaria interna Branco TX"],
      components: ["Dobradiças com amortecimento", "Prateleira fixa", "MDF 18 mm"],
      requirements: [], publicPriceCents: null
    },
    {
      entityId: "module-06", sku: "CM-06", category: "Aéreo", title: "Aéreo da pia",
      dimensions: "1.200 × 800 × 400 mm",
      benefits: ["Nicho integrado para micro-ondas", "Porta basculante com pistão", "Iluminação embutida compatível"],
      components: ["Dobradiças amortecidas", "Pistão para porta basculante", "Espera para micro-ondas"],
      requirements: ["Prever tomada para o forno micro-ondas."], publicPriceCents: null
    },
    {
      entityId: "module-07", sku: "CM-07", category: "Aéreo", title: "Aéreo da geladeira",
      dimensions: "800 × 484 × 350 mm",
      benefits: ["Completa o aproveitamento vertical", "Fechamento amortecido", "Caixaria interna Branco TX"],
      components: ["Dobradiças com amortecimento", "Prateleira fixa", "MDF 18 mm"],
      requirements: ["Requer a lateral da geladeira para suporte e alinhamento."], publicPriceCents: null
    }
  ];

  const catalog = {
    schemaVersion: "ProductCatalog2D 0.1",
    pricingStatus: "awaiting-published-price-book",
    modules,
    options: {
      fronts: ["gianduia-color", "white-tx", "black", "olive", "petroleum-blue"],
      stones: ["#34383d", "#d8d8d2", "#968371"],
      handles: []
    },
    accessories: [
      {
        entityId: "lighting-08", sku: "CM-08", title: "Iluminação embutida",
        description: "Luz sob os aéreos para a área de bancada.",
        requirements: ["Requer a lateral da geladeira e o aéreo da pia."], publicPriceCents: null
      }
    ]
  };

  global.CASA_EM_MODULOS_CATALOG = deepFreeze(catalog);
})(window);
