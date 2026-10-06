(function registerHierarchyDefaults(global) {
  "use strict";

  const defaults = {
    schemaVersion: "ConfiguratorHierarchyDefaults2D 1.0",
    stages: {
      modules: {
        allowedItemKinds: ["module"],
        groups: [{
          id: "modules-main",
          label: "Módulos",
          columnSpan: 2,
          sections: [{
            id: "modules",
            label: "Lista de módulos",
            presentation: "list",
            keyboard: false,
            behavior: "selection",
            itemKinds: ["module"]
          }]
        }]
      },
      finishes: {
        allowedItemKinds: ["finish-group"],
        groups: [
          {
            id: "cabinet-finishes",
            label: "Acabamentos do conjunto",
            columnSpan: 1,
            sections: [
              {
                id: "fronts",
                label: "Cor das frentes",
                presentation: "swatches",
                keyboard: true,
                itemIds: ["fronts-all"]
              },
              {
                id: "handles",
                label: "Puxadores",
                presentation: "grid",
                keyboard: true,
                itemIds: ["handles-all"]
              }
            ]
          },
          {
            id: "stone",
            label: "Pedra do conjunto",
            columnSpan: 1,
            sections: [
              {
                id: "stone-packages",
                label: "Pacote de pedra",
                presentation: "cards",
                keyboard: true,
                itemIds: ["stone-all"]
              },
              {
                id: "stone-skirting",
                label: "Rodapé de pedra",
                presentation: "list",
                keyboard: true,
                itemIds: ["stone-skirting"]
              }
            ]
          }
        ]
      },
      services: {
        allowedItemKinds: ["service", "object"],
        groups: [{
          id: "services",
          label: "Serviços",
          columnSpan: 2,
          sections: [
            {
              id: "lighting",
              label: "Iluminação",
              presentation: "list",
              keyboard: true,
              itemIds: ["lighting-08"]
            },
            {
              id: "additional-services",
              label: "Serviços adicionais",
              presentation: "list",
              keyboard: true,
              itemKinds: ["service"]
            }
          ]
        }]
      },
      summary: {
        allowedItemKinds: ["summary"],
        groups: [{
          id: "summary-main",
          label: "Resumo",
          columnSpan: 2,
          sections: [{
            id: "summary",
            label: "Resumo",
            presentation: "list",
            keyboard: false,
            itemKinds: ["summary"]
          }]
        }]
      }
    },
    customStage: {
      allowedItemKinds: ["module", "object", "service"],
      group: {
        id: "custom-content",
        labelFromStage: true,
        columnSpan: 2
      },
      section: {
        id: "items",
        label: "Opções",
        presentation: "list",
        keyboard: true,
        itemMode: "all"
      }
    },
    aggregateOptions: {
      "fronts-all": { source: "finishes" },
      "handles-all": { source: "handles", openByDefault: true },
      "stone-all": { source: "stonePackages" }
    }
  };

  if (typeof module !== "undefined" && module.exports) module.exports = defaults;
  if (global && typeof global === "object") global.CASA_EM_MODULOS_HIERARCHY_DEFAULTS = defaults;
})(typeof globalThis === "undefined" ? this : globalThis);
