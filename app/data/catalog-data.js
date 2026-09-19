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
      benefits: ["Portas com fechamento amortecido", "Prateleira fixa para organização", "Caixaria interna clara"],
      components: ["Dobradiças com amortecimento", "MDF 18 mm", "Fundo 6 mm duplamente melamínico"],
      frontLayout: { status: "count-confirmed", pattern: "two-doors", frontCount: 2 },
      requirements: [], publicPriceCents: null,
      commercial: { finishEligible: true, handleEligible: true, handleFrontCount: 2, mandatoryLocalChargeIds: [] },
      drawingEvidence: "front-count-confirmed"
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
      requirements: ["Prever alimentação do fogão e do forno conforme especificação técnica."], publicPriceCents: null,
      commercial: { finishEligible: true, handleEligible: false, handleFrontCount: 0, mandatoryLocalChargeIds: ["mandatory-cooktop-stone"] },
      drawingEvidence: "envelope-only"
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
      frontLayout: {
        source: "technical-sheet:module-03:user-provided-2026-08-10", status: "confirmed", innerWidthMm: 1190,
        segments: [
          { kind: "drawer", spanMm: 390, subdivisions: 4 },
          { kind: "door", spanMm: 400 },
          { kind: "door", spanMm: 400 }
        ]
      },
      requirements: ["Verificar os pontos hidráulicos e elétricos previstos para a pia."], publicPriceCents: null,
      commercial: { finishEligible: true, handleEligible: true, handleFrontCount: 6, mandatoryLocalChargeIds: [] },
      drawingEvidence: "geometry-confirmed"
    },
    {
      entityId: "module-04", referenceLabel: "Módulo 04", category: "Estrutural", title: "Lateral da geladeira",
      sourceEntityId: "scene/traditional/module/fridge-side",
      dimensions: {
        display: "2.400 × 600 × 18 mm", displayPolicy: "nominal", displayAxes: "A × P × E",
        nominalMm: { width: 18, height: 2400, depth: 600 }, geometryMm: { width: 18, height: 2400, depth: 610 },
        evidence: [
          { source: "technical-sheet", status: "provided", reference: "module-04-sheet" },
          { source: "promob-dxf", status: "confirmed", reference: "placement:LAYER114" }
        ]
      },
      drawingSpec: {
        kind: "panel", faceWidthMm: 600, faceHeightMm: 2400, thicknessMm: 18,
        faceHorizontalLabel: "P", extrusionLabel: "E"
      },
      benefits: ["Acabamento lateral para a área da geladeira", "Alinha o conjunto pela frente", "Organiza a fiação da iluminação"],
      components: ["Painel MDF 18 mm", "Fita de borda na cor da peça", "Ponto para interruptor de iluminação"],
      requirements: ["Ponto estrutural para a instalação da iluminação embutida."], publicPriceCents: null,
      commercial: { finishEligible: true, handleEligible: false, handleFrontCount: 0, mandatoryLocalChargeIds: [] },
      drawingEvidence: "geometry-confirmed"
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
      benefits: ["Organização acima da área de preparo", "Fechamento amortecido", "Caixaria interna clara"],
      components: ["Dobradiças com amortecimento", "Prateleira fixa", "MDF 18 mm"],
      frontLayout: { status: "count-confirmed", pattern: "two-doors", frontCount: 2 },
      requirements: [], publicPriceCents: null,
      commercial: { finishEligible: true, handleEligible: true, handleFrontCount: 2, mandatoryLocalChargeIds: [] },
      drawingEvidence: "front-count-confirmed"
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
      frontLayout: { status: "count-confirmed", pattern: "two-doors-and-lift", frontCount: 3 },
      requirements: ["Prever tomada para o forno micro-ondas."], publicPriceCents: null,
      commercial: { finishEligible: true, handleEligible: true, handleFrontCount: 3, mandatoryLocalChargeIds: [] },
      drawingEvidence: "front-count-confirmed"
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
      benefits: ["Completa o aproveitamento vertical", "Fechamento amortecido", "Caixaria interna clara"],
      components: ["Dobradiças com amortecimento", "Prateleira fixa", "MDF 18 mm"],
      frontLayout: { status: "count-confirmed", pattern: "two-doors", frontCount: 2 },
      requirements: [], publicPriceCents: null,
      commercial: { finishEligible: true, handleEligible: true, handleFrontCount: 2, mandatoryLocalChargeIds: [] },
      drawingEvidence: "front-count-confirmed"
    }
  ];

  const catalog = {
    schemaVersion: "ProductCatalog2D 1.0",
    technicalSource: {
      repository: "EAKerber/MobiliPresenter",
      commit: "4d46da44c08dcafbb53c52c0375e14651981a93b",
      profile: "PromobDxfSourceProfile 0.1.0",
      rawSourceAvailability: "profile-only-in-this-checkout"
    },
    pricingStatus: "commercial-estimate-published",
    modules,
    options: {
      finishes: [
        {
          id: "base-light", publicLabel: "Base clara", color: "#eeeae3", status: "published", adjustmentLabel: "normal",
          materialType: "mdf", textureAsset: "assets/materials/mdf-base.webp", textureSize: "160px 160px", textureStrength: 0.18, textureLuminance: 0.9242
        },
        {
          id: "tone-15-a", publicLabel: "Avelã", color: "#8d8178", status: "published", adjustmentLabel: "+15%",
          materialType: "mdf", textureAsset: "assets/materials/mdf-warm.webp", textureSize: "160px 160px", textureStrength: 0.24, textureLuminance: 0.5259
        },
        {
          id: "tone-15-b", publicLabel: "Névoa", color: "#d7d5cf", status: "published", adjustmentLabel: "+15%",
          materialType: "mdf", textureAsset: "assets/materials/mdf-soft.webp", textureSize: "160px 160px", textureStrength: 0.16, textureLuminance: 0.9216
        },
        {
          id: "tone-15-c", publicLabel: "Aço", color: "#777874", status: "published", adjustmentLabel: "+15%",
          materialType: "mdf", textureAsset: "assets/materials/mdf-metal.webp", textureSize: "160px 160px", textureStrength: 0.22, textureLuminance: 0.7679
        },
        {
          id: "tone-25-a", publicLabel: "Bosque", color: "#92775f", status: "published", adjustmentLabel: "+25%",
          materialType: "mdf", textureAsset: "assets/materials/mdf-wood.webp", textureSize: "180px 180px", textureStrength: 0.58, textureLuminance: 0.7988
        },
        {
          id: "tone-25-b", publicLabel: "Carvão", color: "#30312f", status: "published", adjustmentLabel: "+25%",
          materialType: "mdf", textureAsset: "assets/materials/mdf-dark.webp", textureSize: "160px 160px", textureStrength: 0.28, textureLuminance: 0.1647
        }
      ],
      stonePackages: [
        {
          id: "stone-existing", label: "Padrão", description: "Mantém a pedra atual do conjunto.", color: null,
          materialType: "stone", swatchColor: "#b7b0a7"
        },
        {
          id: "stone-standard-sink", label: "Padrão + cuba nova", description: "Pedra padrão com cuba nova.", color: null,
          materialType: "stone", swatchColor: "#b7b0a7"
        },
        {
          id: "stone-light", label: "Clara mineral", description: "Pedra clara de granulação fina.", color: "#e3ddd2",
          materialType: "stone", swatchColor: "#e4ded2", textureAsset: "assets/materials/stone-light.webp", textureScale: 1
        },
        {
          id: "stone-green", label: "Verde profundo", description: "Pedra verde-escura de granulação contrastante.", color: "#1e2a24",
          materialType: "stone", swatchColor: "#1f2924", textureAsset: "assets/materials/stone-green.webp", textureScale: 1
        },
        {
          id: "stone-dark", label: "Preta mineral", description: "Pedra preta de granulação fina e reflexos discretos.", color: "#171918",
          materialType: "stone", swatchColor: "#181a19", textureAsset: "assets/materials/stone-dark.webp", textureScale: 1
        }
      ],
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
        requirements: ["Requer a lateral da geladeira."], publicPriceCents: null
      }
    ],
    services: [
      { id: "move-stone", title: "Mover pedra", description: "Reposicionamento da pedra como serviço global." },
      { id: "tempered-glass", title: "Vidro temperado 8 mm", description: "Complemento global para a composição." }
    ]
  };

  global.CASA_EM_MODULOS_CATALOG = deepFreeze(catalog);
})(window);
