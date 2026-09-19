(function registerBmc01ReconstructionData(global) {
  "use strict";

  global.CASA_BMC01_RECONSTRUCTION_DATA = Object.freeze({
    schemaVersion: "ReconstructionRenderData 0.2",
    id: "bmc01-module02-right-side",
    researchOnly: true,
    visibilityEntityId: "module-02-right-exposed-face",
    authorizedRoi: [742, 520, 764, 899],
    slots: {
      carcass: {
        neutralAsset: "assets/kitchen/reconstruction/bmc01/carcass-neutral.png",
        maskAsset: "assets/kitchen/reconstruction/bmc01/carcass-mask.png",
        materialPolicy: "module-02-front-finish"
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
  });
})(window);
