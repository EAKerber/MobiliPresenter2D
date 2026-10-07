(function registerPublishedBuyerProjection(global) {
  "use strict";

  // Pure input boundary for the buyer. No request, DOM, state or fallback.
  // The validated source and normalized hierarchical flow retain semantic
  // authority; a flat stage view is derived only for legacy visual widgets.
  function prepare(value, {
    configuration, administrationV5, flow, catalog, priceBook, scene,
    hierarchyDefaults, pricingContract, defaultPresentationPolicy
  }) {
    if (!value || typeof value !== "object") {
      throw new TypeError("published buyer configuration is required");
    }
    const isV3 = value.schemaVersion === configuration.SCHEMA;
    const isV5 = value.schemaVersion === administrationV5.SCHEMA;
    if (!isV3 && !isV5) throw new TypeError("unsupported published buyer configuration schema");

    let normalized;
    if (isV3) {
      normalized = configuration.normalizeConfiguratorSettings(value, catalog, priceBook, scene);
    } else {
      const errors = administrationV5.validate(value, configuration, catalog, priceBook, scene);
      if (errors.length) throw new TypeError(errors.join("; "));
      normalized = administrationV5.normalize(value);
    }

    const normalizedFlow = flow.normalizeFlow(
      normalized, configuration.itemRegistry(catalog), hierarchyDefaults
    );

    const displaySettings = isV3 ? normalized : {
      ...structuredClone(normalized),
      // This is a strictly derived display projection; it must never be
      // passed to a schema normalizer or used as a second flow authority.
      stages: normalized.stages.map((stage) => {
        const declared = normalizedFlow.stages.find((entry) => entry.id === stage.id);
        if (!declared) throw new TypeError("published stage missing from normalized flow: " + stage.id);
        return {
          id: stage.id,
          kind: stage.kind || stage.id,
          label: stage.label,
          enabled: stage.enabled,
          items: declared.groups.flatMap((group) =>
            group.sections.flatMap((section) => section.itemIds)
          )
        };
      })
    };

    return Object.freeze({
      source: normalized,
      flow: normalizedFlow,
      displaySettings,
      pricingRules: isV5
        ? pricingContract.normalize(normalized.pricing)
        : pricingContract.upgradeLegacy(normalized.pricing),
      presentationPolicy: isV5
        ? structuredClone(normalized.presentationPolicy)
        : structuredClone(defaultPresentationPolicy)
    });
  }

  const api = Object.freeze({ prepare });
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  if (global && typeof global === "object") global.CasaModulesPublishedBuyerProjection = api;
})(typeof window === "undefined" ? globalThis : window);
