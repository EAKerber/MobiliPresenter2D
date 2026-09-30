(function registerSceneData(global) {
  "use strict";

  function deepFreeze(value) {
    if (!value || typeof value !== "object" || Object.isFrozen(value)) return value;
    Object.values(value).forEach(deepFreeze);
    return Object.freeze(value);
  }

  const scene = {
    schemaVersion: "Scene2D 1.0",
    manifestVersion: "cozinha-01@glass-exposed-sides-v5",
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
        "faucet-approved",
        "approved-stone-02",
        "approved-stone-03",
        "stone-02-joint-bridge",
        "stone-03-joint-bridge",
        "module-04",
        "module-05",
        "module-05-right-return",
        "module-06",
        "module-07",
        "module-07-left-return",
        "module-02-right-exposed-face",
        "range-freestanding-right-side",
        "lighting-08"
      ],
      decorVisible: [],
      gridVisible: false
    },
    entities: [
      ...[
        ["module-05-right-return", "module-05", "module-06", 499, 751, 65, 14, 203],
        ["module-07-left-return", "module-07", "module-04", 399, 1223, 51, 15, 155]
      ].map(([id, hostId, occluder, zIndex, x, y, width, height]) => ({
        id, alias: id, label: "Continuação da caixaria",
        kind: "accessory", zIndex,
        asset: `assets/kitchen/overlays/${id}.png`, maskAsset: null,
        alphaBounds: { x, y, width, height },
        defaultVisible: true, controllable: false, hostId,
        occludedByIds: occluder ? [occluder] : [], finishGroups: [], tags: ["exposed-side", "carcass-side"]
      })),
      {
        id: "tempered-glass", alias: "glass", label: "Vidro temperado",
        kind: "accessory", zIndex: 90,
        asset: "assets/kitchen/overlays/tempered-glass.png", maskAsset: null,
        alphaBounds: { x: 495, y: 0, width: 28, height: 902 },
        defaultVisible: false, controllable: false,
        serviceId: "tempered-glass", hostId: null, requiresVisibleIds: [],
        finishGroups: [], tags: ["glass", "global-option"]
      },
      {
        "id": "approved-stone-02",
        "alias": "02A",
        "label": "Componentes aprovados 02",
        "kind": "accessory",
        "zIndex": 305,
        "asset": "assets/kitchen/overlays/approved-stone-02.png",
        "maskAsset": null,
        "alphaBounds": {
          "x": 515,
          "y": 491,
          "width": 224,
          "height": 84
        },
        "defaultVisible": true,
        "controllable": false,
        "hostId": "module-02",
        "finishGroups": [],
        "tags": [
          "approved-stone-components"
        ]
      },
      {
        "id": "approved-stone-03",
        "alias": "03A",
        "label": "Componentes aprovados 03",
        "kind": "accessory",
        "zIndex": 306,
        "asset": "assets/kitchen/overlays/approved-stone-03.png",
        "maskAsset": null,
        "alphaBounds": {
          "x": 786,
          "y": 441,
          "width": 307,
          "height": 134
        },
        "defaultVisible": true,
        "controllable": false,
        "hostId": "module-03",
        "finishGroups": [],
        "tags": [
          "approved-stone-components"
        ]
      },
      {
        id: "faucet-approved", alias: "03T", label: "Torneira",
        kind: "accessory", zIndex: 303,
        asset: "assets/kitchen/overlays/faucet-approved.png", maskAsset: null,
        alphaBounds: { x: 986, y: 439, width: 49, height: 123 },
        defaultVisible: true, controllable: false, hostId: "module-03",
        finishGroups: [], tags: ["approved-faucet", "sink-zone"]
      },
      {
        id: "module-01",
        alias: "01",
        label: "Aéreo da lavanderia",
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
        finishMaskVariants: [
          {
            // This only changes the paint mask at the visual overlap. It is
            // not a configuration dependency between modules 04 and 06.
            visibleWithIds: ["module-06"],
            maskAsset: "assets/kitchen/masks/04-with-06-seam.png",
            sourceBridgeMaskAsset: "assets/kitchen/masks/04-06-seam-bridge.png"
          }
        ],
        alphaBounds: { x: 1205, y: 44, width: 38, height: 870 },
        // The usual tag position is inferred from the module category. This
        // panel is the exception: its label belongs beside the thin face.
        markerPlacement: { side: "right" },
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
        // Lighting is a global option, not a relation between the side panel
        // and the upper sink cabinet. Both independent supports are required.
        requiresVisibleIds: ["module-04", "module-06"],
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
        alphaBounds: { x: 741, y: 521, width: 23, height: 69 },
        defaultVisible: true,
        controllable: false,
        hostIds: ["module-02", "module-03"],
        finishGroups: [],
        tags: ["stone", "joint", "cooking-zone", "sink-zone"]
      },
      {
        id: "module-02-right-exposed-face",
        alias: "02L",
        label: "Lateral direita exposta do módulo 02",
        kind: "accessory",
        // The solid-color guide defines the exact exposed face. The module 03
        // occlusion rule prevents this face from painting over the sink unit.
        zIndex: 203,
        asset: "assets/kitchen/overlays/module-02-right-exposed-face.png",
        maskAsset: "assets/kitchen/masks/module-02-right-exposed-face.png",
        alphaBounds: { x: 739, y: 552, width: 18, height: 301 },
        defaultVisible: true,
        controllable: false,
        hostId: "module-02",
        occludedByIds: ["module-03"],
        finishGroups: [],
        tags: ["exposed-side", "carcass-side", "finish-matched-side", "cooking-zone"]
      },
      {
        id: "stone-03-joint-bridge",
        alias: "03J",
        label: "Junta da pedra 02–03 (lado 03)",
        kind: "stone-joint",
        zIndex: 302,
        asset: "assets/kitchen/bridges/stone-03-joint-bridge.png",
        maskAsset: null,
        alphaBounds: { x: 736, y: 516, width: 11, height: 74 },
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
        zIndex: 305,
        asset: "assets/kitchen/substitutions/range-freestanding.png",
        maskAsset: null,
        alphaBounds: { x: 494, y: 531, width: 257, height: 355 },
        defaultVisible: false,
        controllable: false,
        visibilityIntent: "auto",
        hostId: null,
        finishGroups: [],
        tags: ["replacement", "cooking-zone"]
      },
      {
        id: "range-freestanding-right-side",
        alias: "02R-lateral",
        label: "Lateral metálica do fogão convencional",
        kind: "accessory",
        zIndex: 304,
        asset: "assets/kitchen/overlays/range-freestanding-right-side.png",
        maskAsset: null,
          alphaBounds: { x: 743, y: 543, width: 19, height: 319 },
        defaultVisible: true,
        controllable: false,
        hostId: "range-freestanding",
        finishGroups: [],
        tags: ["replacement-side", "metal", "cooking-zone"]
      }
    ],
    finishGroups: [
      {
        id: "fronts-all",
        label: "Acabamento das frentes",
        scope: "module",
        targets: [
          "module-01",
          "module-02",
          "module-03",
          "module-04",
          "module-05",
          "module-06",
          "module-07"
        ],
        defaultPresetId: "base-light",
        presets: [
          { id: "base-light", label: "Base clara", strategy: "masked-overlay", color: "#eeeae3", overlayOpacity: 0.84 }
        ]
      },
      {
        id: "stone-all",
        label: "Acabamento geral das pedras",
        scope: "global",
        targets: ["stone-02", "stone-03"],
        defaultPresetId: "stone-existing",
        presets: [
          { id: "stone-existing", label: "Pedra existente", strategy: "asset-original" }
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
