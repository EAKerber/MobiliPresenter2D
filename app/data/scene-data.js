(function registerSceneData(global) {
  "use strict";

  function deepFreeze(value) {
    if (!value || typeof value !== "object" || Object.isFrozen(value)) return value;
    Object.values(value).forEach(deepFreeze);
    return Object.freeze(value);
  }

  const scene = {
    schemaVersion: "Scene2D 1.0",
    manifestVersion: "cozinha-01@2026-09-05-r5a-pixelperfect-bridges1",
    id: "cozinha-01",
    label: "Cozinha Casa em Módulos",
    canvas: { width: 1536, height: 1024 },
    baseAsset: "assets/kitchen/base.png",
    goldenAsset: "assets/kitchen/composicao-completa.png",
    defaultConfiguration: {
      visible: [
        "module-01",
        "module-02",
        "stone-02",
        "module-03",
        "stone-03",
        "stone-02-joint-bridge",
        "stone-03-joint-bridge",
        "module-04",
        "module-05",
        "module-06",
        "module-07",
        "lighting-08"
      ],
      frontFinishId: "gianduia-original",
      stoneFinishId: "stone-original",
      handlePresetId: "none",
      lightingPresetId: "on",
      decorVisible: [],
      gridVisible: false
    },
    entities: [
      {
        id: "module-01",
        alias: "01",
        label: "Lavanderia",
        kind: "module",
        zIndex: 100,
        asset: "assets/kitchen/layers/01_modulo_lavanderia.png",
        maskAsset: "assets/kitchen/masks/01.png",
        alphaBounds: { x: 122, y: 54, width: 271, height: 255 },
        defaultVisible: true,
        controllable: true,
        hostId: null,
        finishGroups: ["fronts-all"],
        tags: ["lower", "laundry-zone"]
      },
      {
        id: "module-02",
        alias: "02",
        label: "Inferior do fogão",
        kind: "module",
        zIndex: 200,
        asset: "assets/kitchen/layers/02_inferior_fogao.png",
        maskAsset: "assets/kitchen/masks/02.png",
        alphaBounds: { x: 498, y: 590, width: 259, height: 266 },
        defaultVisible: true,
        controllable: true,
        hostId: null,
        finishGroups: ["fronts-all"],
        tags: ["lower", "cooking-zone"]
      },
      {
        id: "stone-02",
        alias: "02P",
        label: "Pedra do fogão",
        kind: "stone",
        zIndex: 201,
        asset: "assets/kitchen/variants/stone-02-cozinha-exposed-right.png",
        maskAsset: null,
        alphaBounds: { x: 484, y: 491, width: 273, height: 421 },
        defaultVisible: true,
        controllable: false,
        hostId: "module-02",
        finishGroups: ["stone-all"],
        tags: ["stone", "cooking-zone"]
      },
      {
        id: "module-03",
        alias: "03",
        label: "Inferior da pia",
        kind: "module",
        zIndex: 300,
        asset: "assets/kitchen/layers/03_inferior_pia.png",
        maskAsset: "assets/kitchen/masks/03.png",
        alphaBounds: { x: 736, y: 590, width: 481, height: 266 },
        defaultVisible: true,
        controllable: true,
        hostId: null,
        finishGroups: ["fronts-all"],
        tags: ["lower", "sink-zone"]
      },
      {
        id: "stone-03",
        alias: "03P",
        label: "Pedra da pia",
        kind: "stone",
        zIndex: 301,
        asset: "assets/kitchen/variants/stone-03-pia-exposed-left.png",
        maskAsset: null,
        alphaBounds: { x: 736, y: 442, width: 481, height: 470 },
        defaultVisible: true,
        controllable: false,
        hostId: "module-03",
        finishGroups: ["stone-all"],
        tags: ["stone", "sink-zone"]
      },
      {
        id: "module-04",
        alias: "04",
        label: "Lateral da geladeira",
        kind: "module",
        zIndex: 400,
        asset: "assets/kitchen/layers/04_lateral_geladeira.png",
        maskAsset: "assets/kitchen/masks/04.png",
        alphaBounds: { x: 1205, y: 44, width: 38, height: 870 },
        defaultVisible: true,
        controllable: true,
        hostId: null,
        finishGroups: ["fronts-all"],
        tags: ["tall", "refrigerator-zone"]
      },
      {
        id: "module-05",
        alias: "05",
        label: "Aéreo do fogão",
        kind: "module",
        zIndex: 500,
        asset: "assets/kitchen/layers/05_aereo_fogao.png",
        maskAsset: "assets/kitchen/masks/05.png",
        alphaBounds: { x: 490, y: 60, width: 275, height: 276 },
        defaultVisible: true,
        controllable: true,
        hostId: null,
        finishGroups: ["fronts-all"],
        tags: ["upper", "cooking-zone"]
      },
      {
        id: "module-06",
        alias: "06",
        label: "Aéreo da pia",
        kind: "module",
        zIndex: 600,
        asset: "assets/kitchen/layers/06_aereo_pia.png",
        maskAsset: "assets/kitchen/masks/06.png",
        alphaBounds: { x: 745, y: 60, width: 480, height: 278 },
        defaultVisible: true,
        controllable: true,
        hostId: null,
        finishGroups: ["fronts-all"],
        tags: ["upper", "sink-zone"]
      },
      {
        id: "module-07",
        alias: "07",
        label: "Aéreo da geladeira",
        kind: "module",
        zIndex: 700,
        asset: "assets/kitchen/layers/07_aereo_geladeira.png",
        maskAsset: "assets/kitchen/masks/07.png",
        alphaBounds: { x: 1232, y: 46, width: 274, height: 185 },
        defaultVisible: true,
        controllable: true,
        hostId: null,
        finishGroups: ["fronts-all"],
        tags: ["upper", "refrigerator-zone"]
      },
      {
        id: "lighting-08",
        alias: "08",
        label: "Iluminação",
        kind: "lighting",
        zIndex: 800,
        asset: "assets/kitchen/layers/08_iluminacao.png",
        maskAsset: null,
        alphaBounds: { x: 715, y: 266, width: 534, height: 113 },
        defaultVisible: true,
        controllable: true,
        hostId: null,
        finishGroups: [],
        tags: ["lighting"]
      },
      {
        id: "stone-02-joint-bridge",
        alias: "02J",
        label: "Junta da pedra 02–03 (lado 02)",
        kind: "stone-joint",
        zIndex: 202,
        asset: "assets/kitchen/bridges/stone-02-joint-bridge.png",
        maskAsset: null,
        alphaBounds: { x: 745, y: 521, width: 19, height: 69 },
        defaultVisible: true,
        controllable: false,
        hostIds: ["module-02", "module-03"],
        finishGroups: [],
        tags: ["stone", "joint", "cooking-zone", "sink-zone"]
      },
      {
        id: "stone-03-joint-bridge",
        alias: "03J",
        label: "Junta da pedra 02–03 (lado 03)",
        kind: "stone-joint",
        zIndex: 302,
        asset: "assets/kitchen/bridges/stone-03-joint-bridge.png",
        maskAsset: null,
        alphaBounds: { x: 736, y: 516, width: 15, height: 74 },
        defaultVisible: true,
        controllable: false,
        hostIds: ["module-02", "module-03"],
        finishGroups: [],
        tags: ["stone", "joint", "cooking-zone", "sink-zone"]
      },
      {
        id: "range-freestanding",
        alias: "02R",
        label: "Fogão convencional",
        kind: "substitution",
        zIndex: 205,
        asset: "assets/kitchen/substitutions/range-freestanding-placeholder.png",
        maskAsset: null,
        alphaBounds: null,
        defaultVisible: false,
        controllable: false,
        visibilityIntent: "auto",
        hostId: null,
        finishGroups: [],
        tags: ["replacement", "cooking-zone", "placeholder"]
      }
    ],
    finishGroups: [
      {
        id: "fronts-all",
        label: "Acabamento geral das frentes",
        scope: "global",
        targets: [
          "module-01",
          "module-02",
          "module-03",
          "module-04",
          "module-05",
          "module-06",
          "module-07"
        ],
        defaultPresetId: "gianduia-original",
        presets: [
          { id: "gianduia-color", label: "Cinza Gianduia", strategy: "masked-overlay", color: "#918981", overlayOpacity: 0.68 },
          { id: "white-tx", label: "Branco TX", strategy: "masked-overlay", color: "#eeeae3", overlayOpacity: 0.84 },
          { id: "black", label: "Preto", strategy: "masked-overlay", color: "#252422", overlayOpacity: 0.78 },
          { id: "olive", label: "Verde oliva", strategy: "masked-overlay", color: "#69705f", overlayOpacity: 0.72 },
          { id: "petroleum-blue", label: "Azul petróleo", strategy: "masked-overlay", color: "#354f55", overlayOpacity: 0.72 }
        ]
      },
      {
        id: "stone-all",
        label: "Acabamento geral das pedras",
        scope: "global",
        targets: ["stone-02", "stone-03"],
        defaultPresetId: "stone-original",
        presets: [
          { id: "stone-original", label: "Pedra original", strategy: "asset-original" }
        ]
      }
    ],
    substitutionGroups: [
      {
        id: "stove-zone",
        primaryEntityId: "module-02",
        replacementEntityId: "range-freestanding",
        policy: "replacement-when-primary-hidden"
      }
    ]
  };

  global.CASA_EM_MODULOS_SCENE = deepFreeze(scene);
})(window);
