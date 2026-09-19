(function registerReconstructionData(global) {
  "use strict";

  const operations = {
    bmc01: {
      schemaVersion: "ReconstructionRenderData 0.3",
      id: "bmc01-module02-right-side",
      researchOnly: true,
      visibility: {
        requiresVisibleIds: ["module-02"],
        requiresHiddenIds: ["module-03"]
      },
      delegateEntityIds: ["module-02-right-exposed-face"],
      authorizedRoi: [742, 520, 764, 899],
      slots: {
        carcass: {
          neutralAsset: "assets/kitchen/reconstruction/bmc01/carcass-neutral.png",
          maskAsset: "assets/kitchen/reconstruction/bmc01/carcass-mask.png",
          materialPolicy: "front-finish"
        },
        plinth: {
          neutralAsset: "assets/kitchen/reconstruction/bmc01/plinth-neutral.png",
          maskAsset: "assets/kitchen/reconstruction/bmc01/plinth-mask.png",
          materialPolicy: "front-finish-unless-stone-skirting"
        }
      },
      provenance: {
        runtimeManifest: "assets/kitchen/reconstruction/bmc01/manifest.json",
        checkpoint: "../docs/work/bmc-01-research-checkpoint-v0.2.md",
        geometry: "../review-assets/research/bmc01-local-depth-transfer-v0.1-report.json",
        candidate: "../review-assets/research/bmc01-antialiased-completion-v0.1/report.json"
      }
    },
    bmc02: {
      schemaVersion: "ReconstructionRenderData 0.3",
      id: "bmc02-module03-left-stone-termination",
      researchOnly: true,
      visibility: {
        requiresVisibleIds: ["module-03"],
        requiresHiddenIds: ["module-02"]
      },
      delegateEntityIds: [],
      authorizedRoi: [720, 510, 755, 600],
      slots: {
        termination: {
          neutralAsset: "assets/kitchen/reconstruction/bmc02/termination-neutral.png",
          maskAsset: "assets/kitchen/reconstruction/bmc02/termination-mask.png",
          materialPolicy: "stone-upper"
        }
      },
      provenance: {
        runtimeManifest: "assets/kitchen/reconstruction/bmc02/manifest.json",
        ownershipAudit: "../review-assets/research/bmc02-termination-ownership-v0.1-report.json",
        candidate: "../review-assets/candidates/module-03-left-termination-e-rounded-9px/candidate.json"
      }
    }
  };

  global.CASA_RECONSTRUCTION_DATA = Object.freeze(operations);
  global.CASA_BMC01_RECONSTRUCTION_DATA = operations.bmc01;
})(window);
