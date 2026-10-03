(function registerConfiguratorSettings(global) {
  "use strict";

  const settings = {
    schemaVersion: "ConfiguratorSettings2D 1.0",
    revision: 1,
    stages: [
      { id: "modules", label: "Módulos", enabled: true, items: ["module-01", "module-02", "module-03", "module-04", "module-05", "module-06", "module-07"] },
      { id: "finishes", label: "Acabamentos", enabled: true, items: ["fronts-all", "stone-all"] },
      { id: "services", label: "Serviços", enabled: true, items: ["move-stone", "tempered-glass", "lighting-08"] },
      { id: "summary", label: "Resumo", enabled: true, items: ["summary"] }
    ]
  };

  if (typeof module !== "undefined" && module.exports) module.exports = settings;
  if (global && typeof global === "object") global.CASA_EM_MODULOS_CONFIGURATOR_DEFAULTS = settings;
})(typeof globalThis === "undefined" ? this : globalThis);
