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
      entityId: "module-01", referenceLabel: "Módulo 01", category: "Aéreo", title: "Aéreo da lavanderia",
      sourceEntityId: "scene/traditional/module/upper-laundry",
      dimensions: {
        display: "763,3 × 700 × 350 mm", displayPolicy: "nominal",
        nominalMm: { width: 763.3, height: 700, depth: 350 }, geometryMm: { width: 763.25, height: 700, depth: 350 },
        evidence: [
          { source: "promob-property", status: "confirmed", reference: "module-01-properties" },
          { source: "promob-dxf", status: "confirmed", reference: "placement:LAYER42-57" }
        ]
      },
      benefits: ["Portas com fechamento amortecido", "Prateleira fixa para organização", "Caixaria interna Branco TX"],
      components: ["Dobradiças com amortecimento", "MDF 18 mm", "Fundo 6 mm duplamente melamínico"],
      requirements: [], publicPriceCents: null
    },
    {
      entityId: "module-02", referenceLabel: "Módulo 02", category: "Inferior", title: "Inferior do fogão",
      sourceEntityId: "scene/traditional/module/lower-stove",
      dimensions: {
        display: "790 × 760 × 530 mm", displayPolicy: "nominal",
        nominalMm: { width: 790, height: 760, depth: 530 }, geometryMm: { width: 791.01, height: 760, depth: 530 },
        evidence: [
          { source: "technical-sheet", status: "provided", reference: "module-02-sheet" },
          { source: "promob-dxf", status: "confirmed", reference: "placement:LAYER134-140" }
        ]
      },
      benefits: ["Espaço para forno embutido", "Integra cooktop e acabamento da bancada", "Preparo elétrico previsto no módulo"],
      components: ["Cabo PP 4 mm", "2 tomadas de 20 A", "Estrutura em MDF 18 mm"],
      requirements: ["Prever alimentação do fogão e do forno conforme especificação técnica."], publicPriceCents: null
    },
    {
      entityId: "module-03", referenceLabel: "Módulo 03", category: "Inferior", title: "Inferior da pia",
      sourceEntityId: "scene/traditional/module/lower-sink",
      dimensions: {
        display: "1.200 × 760 × 530 mm", displayPolicy: "nominal",
        nominalMm: { width: 1200, height: 760, depth: 530 }, geometryMm: { width: 1216.678, height: 760, depth: 530 },
        evidence: [
          { source: "technical-sheet", status: "provided", reference: "module-03-sheet" },
          { source: "promob-dxf", status: "confirmed", reference: "placement:LAYER5-11,LAYER120,LAYER124,LAYER129" }
        ]
      },
      benefits: ["Quatro gavetas com corrediças reforçadas H45", "Duas portas com fechamento amortecido", "Frentes com fita de borda coordenada"],
      components: ["4 corrediças telescópicas H45", "Dobradiças com amortecimento", "MDF 18 mm"],
      technicalLayout: {
        internalFront: {
          source: "technical-sheet:module-03:user-provided-2026-08-10",
          segments: [
            { label: "Gavetas", spanMm: 390, subdivisions: 4 },
            { label: "Porta central", spanMm: 400 },
            { label: "Porta direita", spanMm: 400 }
          ]
        }
      },
      requirements: ["Verificar os pontos hidráulicos e elétricos previstos para a pia."], publicPriceCents: null
    },
    {
      entityId: "module-04", referenceLabel: "Módulo 04", category: "Estrutural", title: "Lateral da geladeira",
      sourceEntityId: "scene/traditional/module/fridge-side",
      dimensions: {
        display: "2.400 × 600 × 18 mm", displayPolicy: "nominal",
        nominalMm: { width: 18, height: 2400, depth: 600 }, geometryMm: { width: 18, height: 2400, depth: 610 },
        evidence: [
          { source: "technical-sheet", status: "provided", reference: "module-04-sheet" },
          { source: "promob-dxf", status: "confirmed", reference: "placement:LAYER114" }
        ]
      },
      benefits: ["Sustenta o aéreo da geladeira", "Alinha o conjunto pela frente", "Organiza a fiação da iluminação"],
      components: ["Painel MDF 18 mm", "Fita de borda na cor da peça", "Ponto para interruptor de iluminação"],
      requirements: ["Necessária para manter o aéreo da geladeira e a iluminação compatíveis."], publicPriceCents: null
    },
    {
      entityId: "module-05", referenceLabel: "Módulo 05", category: "Aéreo", title: "Aéreo do fogão",
      sourceEntityId: "scene/traditional/module/upper-stove",
      dimensions: {
        display: "800 × 700 × 400 mm", displayPolicy: "nominal",
        nominalMm: { width: 800, height: 700, depth: 400 }, geometryMm: { width: 800, height: 700, depth: 400 },
        evidence: [
          { source: "promob-property", status: "confirmed", reference: "module-05-properties" },
          { source: "promob-dxf", status: "confirmed", reference: "placement:LAYER60-75" }
        ]
      },
      benefits: ["Organização acima da área de preparo", "Fechamento amortecido", "Caixaria interna Branco TX"],
      components: ["Dobradiças com amortecimento", "Prateleira fixa", "MDF 18 mm"],
      requirements: [], publicPriceCents: null
    },
    {
      entityId: "module-06", referenceLabel: "Módulo 06", category: "Aéreo", title: "Aéreo da pia",
      sourceEntityId: "scene/traditional/module/upper-sink-microwave",
      dimensions: {
        display: "1.200 × 800 × 400 mm", displayPolicy: "nominal",
        nominalMm: { width: 1200, height: 800, depth: 400 }, geometryMm: { width: 1200, height: 800, depth: 400 },
        evidence: [
          { source: "technical-sheet", status: "confirmed", reference: "module-06-sheet" },
          { source: "promob-property", status: "confirmed", reference: "module-06-properties" },
          { source: "promob-dxf", status: "confirmed", reference: "placement:LAYER76-93" }
        ]
      },
      benefits: ["Nicho integrado para micro-ondas", "Porta basculante com pistão", "Iluminação embutida compatível"],
      components: ["Dobradiças amortecidas", "Pistão para porta basculante", "Espera para micro-ondas"],
      requirements: ["Prever tomada para o forno micro-ondas."], publicPriceCents: null
    },
    {
      entityId: "module-07", referenceLabel: "Módulo 07", category: "Aéreo", title: "Aéreo da geladeira",
      sourceEntityId: "scene/traditional/module/upper-fridge",
      dimensions: {
        display: "800 × 484 × 350 mm", displayPolicy: "nominal",
        nominalMm: { width: 800, height: 484, depth: 350 }, geometryMm: { width: 800, height: 484, depth: 350 },
        evidence: [
          { source: "technical-sheet", status: "confirmed", reference: "module-07-sheet" },
          { source: "promob-property", status: "confirmed", reference: "module-07-properties" },
          { source: "promob-dxf", status: "confirmed", reference: "placement:LAYER99-113" }
        ]
      },
      benefits: ["Completa o aproveitamento vertical", "Fechamento amortecido", "Caixaria interna Branco TX"],
      components: ["Dobradiças com amortecimento", "Prateleira fixa", "MDF 18 mm"],
      requirements: ["Requer a lateral da geladeira para suporte e alinhamento."], publicPriceCents: null
    }
  ];

  const catalog = {
    schemaVersion: "ProductCatalog2D 0.1",
    technicalSource: {
      repository: "EAKerber/MobiliPresenter",
      commit: "4d46da44c08dcafbb53c52c0375e14651981a93b",
      profile: "PromobDxfSourceProfile 0.1.0",
      rawSourceAvailability: "profile-only-in-this-checkout"
    },
    pricingStatus: "awaiting-published-price-book",
    modules,
    options: {
      fronts: ["gianduia-color", "white-tx", "black", "olive", "petroleum-blue"],
      stones: ["#34383d", "#d8d8d2", "#968371"],
      handles: [
        { id: "none", label: "Definir depois", description: "Sem adicional na simulação.", orientation: "Portas na vertical · gavetas na horizontal" },
        { id: "tango-chrome", label: "Tango / Íris", description: "Acabamento cromado.", orientation: "Portas na vertical · gavetas na horizontal" },
        { id: "ponto", label: "Ponto", description: "Família com variações de cor.", orientation: "Portas na vertical · gavetas na horizontal" },
        { id: "alca-colors", label: "Alça em cores", description: "Nome comercial em validação.", orientation: "Portas na vertical · gavetas na horizontal" }
      ]
    },
    accessories: [
      {
        entityId: "lighting-08", sku: "CM-08", title: "Iluminação embutida",
        description: "Luz sob os aéreos para a área de bancada.",
        requirements: ["Requer a lateral da geladeira e o aéreo da pia."], publicPriceCents: null
      }
    ],
    services: [
      {
        id: "base-stone",
        title: "Pedra base",
        description: "Prevista na composição inicial; a escolha de cor continua em Acabamentos.",
        status: "included"
      }
    ]
  };

  global.CASA_EM_MODULOS_CATALOG = deepFreeze(catalog);
})(window);
