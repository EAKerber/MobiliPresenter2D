(function registerPresentationPolicyDefaults(global) {
  "use strict";

  const policy = Object.freeze({
    schemaVersion: "ConfiguratorPresentation2D 1.1",
    stageViews: Object.freeze({
      modules: Object.freeze({
        views: Object.freeze([
          Object.freeze({
            id: "modules-list",
            sourceSectionId: "modules",
            component: "selection-list",
            role: "primary"
          }),
          Object.freeze({
            id: "modules-detail",
            sourceSectionId: "modules",
            component: "detail-panel",
            role: "companion",
            relation: Object.freeze({ kind: "companion", of: "modules-list" }),
            projectionByProfile: Object.freeze({
              "side-rail": "side-panel",
              stacked: "side-panel",
              compact: "replace"
            })
          })
        ])
      })
    }),
    scene: Object.freeze({
      pip: Object.freeze({
        availableProfiles: Object.freeze(["stacked", "compact"]),
        activationByProfile: Object.freeze({
          stacked: "manual",
          compact: "auto-after-anchor"
        })
      })
    }),
    shell: Object.freeze({
      bottomDock: Object.freeze({
        enabled: true,
        slots: Object.freeze(["estimate", "primary-action"])
      })
    })
  });

  if (typeof module !== "undefined" && module.exports) module.exports = policy;
  if (global && typeof global === "object") global.CASA_EM_MODULOS_PRESENTATION_POLICY = policy;
})(typeof globalThis === "undefined" ? this : globalThis);
