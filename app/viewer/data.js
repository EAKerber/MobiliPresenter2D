/* Page composition only; module data comes from Scene2D and ProductCatalog2D. */
window.CASA_PUBLIC_VIEWER = {
  adapterContractVersion: "PublicSceneAdapter 0.5",
  sourceContracts: { scene: "Scene2D 1.0", catalog: "ProductCatalog2D 1.0" },
  layout: ["overview", "scene", "views", "details"],
  viewTypes: {
    focus: { label: "Detalhe do módulo", kind: "focus" },
    open: { label: "Perspectiva aberta", kind: "isometric-open" },
    internal: { label: "Vista interna", kind: "internal" },
    front: { label: "Vista frontal", kind: "front" },
    side: { label: "Vista lateral", kind: "side" },
    "internal-front": { label: "Vista interna / frontal", kind: "internal-front" },
    isometric: { label: "Vista isométrica", kind: "isometric" }
  },
  detailLayout: [
    { id: "components", title: "Componentes", source: "components", placeholder: "assets/icon-placeholder.svg" },
    { id: "requirements", title: "Requisitos", source: "requirements", placeholder: "assets/icon-placeholder.svg" }
  ]
};
