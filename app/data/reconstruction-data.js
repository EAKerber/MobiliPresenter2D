(function registerBmc01ReconstructionData(global) {
  "use strict";

  global.CASA_BMC01_RECONSTRUCTION_DATA = Object.freeze({
    schemaVersion: "ReconstructionRenderData 0.1",
    id: "bmc01-module02-right-side",
    researchOnly: true,
    visibilityEntityId: "module-02-right-exposed-face",
    authorizedRoi: [742, 520, 764, 899],
    slots: {
      carcass: {
        neutralAsset: "../review-assets/research/bmc01-antialiased-completion-v0.1/carcass-candidate.png",
        materialPolicy: "module-02-front-finish"
      },
      plinth: {
        neutralAsset: "../review-assets/research/bmc01-antialiased-completion-v0.1/plinth-candidate.png",
        materialPolicy: "front-finish-unless-stone-skirting"
      }
    },
    provenance: {
      checkpoint: "../docs/work/bmc-01-research-checkpoint-v0.2.md",
      geometry: "../review-assets/research/bmc01-local-depth-transfer-v0.1-report.json",
      candidate: "../review-assets/research/bmc01-antialiased-completion-v0.1/report.json"
    }
  });
})(window);
