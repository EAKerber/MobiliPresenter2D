import { parse } from "acorn";
import fs from "node:fs";

const input = JSON.parse(fs.readFileSync(0, "utf8"));
const entries = [];
const sourceEntries = [];
const importEdges = [];
const parseErrors = [];
const excludedSinks = [];
const textProperties = new Set([
  "textContent", "innerText", "innerHTML", "outerHTML", "placeholder", "title", "alt",
  "ariaLabel", "ariaDescription", "ariaPlaceholder", "ariaRoleDescription", "ariaValueText",
]);
const ariaReferenceAttributes = new Set([
  "aria-labelledby", "aria-describedby", "aria-details", "aria-errormessage",
  "aria-controls", "aria-owns", "aria-flowto", "for",
]);
const ariaTextAttributes = new Set([
  "aria-label", "aria-description", "aria-placeholder", "aria-roledescription", "aria-valuetext",
]);
const plainTextAttributes = new Set(["alt", "title", "placeholder"]);
const propertyAttributes = new Map([
  ["ariaRoleDescription", "aria-roledescription"],
  ["ariaValueText", "aria-valuetext"],
]);
const messageHelpers = new Map([
  ["setMessage", [1]], ["announce", [0]], ["announceStatus", [0]],
  ["announceConfigurationStatus", [0]], ["showStatus", [0]], ["showToast", [0]],
  ["notifyUser", [0]], ["setStatus", [1]], ["element", [2]],
  ["section", [2, 3]], ["makeLink", [1]], ["addGroup", [0]], ["label", [1]],
]);
const knownTextBindings = new Map([
  ["app/how-it-works/how-it-works.js::explanations", { policy: "all-values", role: "fixed-ui-table" }],
  ["app/core/private-navigation.js::publicPages", { policy: "pair-labels", role: "navigation-labels" }],
  ["app/admin/admin.js::pricingRoles", {
    policy: "pair-labels", role: "commercial-ui-labels",
    target: { line: 1167, sink: "property:textContent", expression: "title", flow: "bounded-static-array-to-heading" },
  }],
  ["app/admin/admin.js::axes", {
    policy: "pair-labels", role: "dimension-labels",
    target: { line: 287, sink: "call:createTextNode", expression: "axisLabel", flow: "bounded-static-array-to-field-label" },
  }],
  ["app/admin/admin.js::pricingTypeLabels", {
    policy: "all-values", role: "commercial-ui-labels",
    target: { line: 1189, sink: "property:textContent", expression: "pricingTypeLabels[type] || type", flow: "bounded-static-map-to-option-with-fallback" },
    reviewNote: "Known static pricing-type labels are displayed when their keys match; the `type` fallback remains dynamic.",
  }],
  ["app/admin/admin.js::pricingBasisLabels", {
    policy: "all-values", role: "commercial-ui-labels",
    target: { line: 1216, sink: "property:textContent", expression: "pricingBasisLabels[rule.basis] || `Base: ${rule.basis}`", flow: "bounded-static-map-to-description-with-fallback" },
    reviewNote: "The known eligible-module basis label is static; other `rule.basis` values use a dynamic fallback.",
  }],
  ["app/core/ui-theme.js::FULL", { policy: "all-values", role: "theme-labels" }],
  ["app/core/ui-theme.js::SHORT", { policy: "all-values", role: "theme-labels" }],
]);
const knownDataBindingSchemas = new Map([
  ["app/data/configurator-settings.js::settings", [{
    path: ["stages", "*", "label"], role: "config-default-stage-label", domain: "authorable-config-default",
    use: "active", evidence: ["configurator-settings.js default stage labels feed initialization and legacy projection"],
  }]],
  ["app/data/hierarchy-defaults.js::defaults", [
    { path: ["stages", "*", "groups", "*", "label"], role: "config-default-group-label", domain: "authorable-config-default", use: "active", evidence: ["hierarchy-defaults.js group labels seed the configurator hierarchy"] },
    { path: ["stages", "*", "groups", "*", "sections", "*", "label"], role: "config-default-section-label", domain: "authorable-config-default", use: "active", evidence: ["hierarchy-defaults.js section labels seed the configurator hierarchy"] },
    { path: ["customStage", "section", "label"], role: "config-default-custom-section-label", domain: "authorable-config-default", use: "active", evidence: ["custom-stage section default is rendered as authorable flow content"] },
  ]],
  ["app/data/catalog-data.js::modules", [
    { path: ["*", "referenceLabel"], role: "catalog-module-reference", domain: "stable-product-reference", use: "active", evidence: ["module reference is shown and also participates in numbered navigation"], reviewNote: "Do not replace the stable reference key with translated copy." },
    { path: ["*", "category"], role: "catalog-module-category", domain: "product-taxonomy-and-behavior", use: "active", evidence: ["module category is displayed and branches configurator behavior"], reviewNote: "Separate behavioral key from localized presentation before translation." },
    { path: ["*", "title"], role: "catalog-module-title", domain: "catalog-product-content", use: "active", evidence: ["module title feeds configurator and viewer cards; published Buyer display data may override it"] },
    { path: ["*", "dimensions", "display"], role: "catalog-dimension-display", domain: "technical-product-data", use: "active", evidence: ["catalog dimension display is presented in product detail"] },
    {
      path: ["*", "dimensions", "displayAxes"], role: "catalog-dimension-axis-order", domain: "technical-product-data", use: "active",
      evidence: [
        "app/app.js:865 uses displayAxes to order nominal dimensions before formatting.",
        "app/app.js:1064 appends displayAxes to the nominal summary rendered at app/app.js:1455.",
        "app/core/public-module-projection.js:54–55 uses displayAxes to order dimensions in the public module projection consumed by the Viewer.",
      ],
      reviewNote: "This value couples visible dimension notation and ordering. Keep it as catalog/formatting data, not a translatable UI message; define locale notation separately before adding a locale.",
      consumerTargets: [{ source: "app/app.js", line: 1455, sink: "property:textContent", expression: "dimensionSummary(product)", flow: "catalog-dimension-format-to-config-detail" }],
    },
    { path: ["*", "benefits", "*"], role: "catalog-module-benefit", domain: "catalog-product-content", use: "active", evidence: ["module benefits feed product detail and buyer highlights"] },
    { path: ["*", "components", "*"], role: "catalog-module-component", domain: "catalog-product-content", use: "active", evidence: ["module components feed product detail"] },
    { path: ["*", "requirements", "*"], role: "catalog-module-requirement", domain: "catalog-product-content", use: "active", evidence: ["module requirements feed product detail and dependencies"] },
  ]],
  ["app/data/catalog-data.js::catalog", [
    { path: ["options", "finishes", "*", "publicLabel"], role: "catalog-finish-label", domain: "catalog-commercial-content", use: "active", evidence: ["finish labels are presented in material selection and pricing"] },
    { path: ["options", "stonePackages", "*", "label"], role: "catalog-stone-label", domain: "catalog-commercial-content", use: "active", evidence: ["stone package labels feed selection and pricing"] },
    { path: ["options", "stonePackages", "*", "description"], role: "catalog-stone-description", domain: "catalog-commercial-content", use: "active", evidence: ["stone package descriptions feed material details"] },
    { path: ["options", "handles", "*", "label"], role: "catalog-handle-label", domain: "catalog-commercial-content", use: "active", evidence: ["handle labels feed selection and pricing"] },
    { path: ["options", "handles", "*", "description"], role: "catalog-handle-description", domain: "catalog-commercial-content", use: "active", evidence: ["handle descriptions feed material details"] },
    { path: ["accessories", "*", "title"], role: "catalog-accessory-title", domain: "catalog-commercial-content", use: "active", evidence: ["accessory titles feed configurator and viewer details"] },
    { path: ["accessories", "*", "description"], role: "catalog-accessory-description", domain: "catalog-commercial-content", use: "active", evidence: ["accessory descriptions feed product details"] },
    { path: ["services", "*", "title"], role: "catalog-service-title", domain: "catalog-commercial-content", use: "active", evidence: ["service titles feed item and event selections"] },
    { path: ["services", "*", "description"], role: "catalog-service-description", domain: "catalog-commercial-content", use: "active", evidence: ["service descriptions feed product details"] },
  ]],
  ["app/data/scene-data.js::scene", [
    { path: ["entities", "*", "label"], role: "scene-entity-label", domain: "scene-presentation-data", use: "active", evidence: ["scene labels feed entity selection and accessible names"] },
  ]],
  ["app/data/mock-price-book.js::priceBook", [
    { path: ["label"], role: "pricebook-label", domain: "commercial-estimate-copy", use: "active", evidence: ["PriceBook label is presented in estimate output"] },
    { path: ["disclaimer"], role: "pricebook-disclaimer", domain: "commercial-estimate-copy", use: "active", evidence: ["PriceBook disclaimer is presented in estimate output"] },
  ]],
]);
const knownSourceCallArguments = new Map([
  ["app/admin/admin.js::makeField", [{ index: 0, role: "admin-field-label", target: { line: 739, sink: "call:createTextNode", expression: "labelText" } }]],
  ["app/admin/admin.js::makeRuleSelect", [
    { index: 0, role: "admin-rule-select-label", target: { line: 941, sink: "call:createTextNode", expression: "labelText" } },
    { index: 3, role: "admin-rule-select-option-label", target: { line: 943, sink: "property:textContent", expression: "text" }, policy: "option-labels" },
  ]],
  ["app/admin/admin.js::appendMaterialAvailabilityList", [{ index: 1, role: "admin-material-availability-heading", target: { line: 1028, sink: "property:textContent", expression: "`${label} · ${selectedIds.length} disponível(is)`" } }]],
  ["app/admin/admin.js::makeMaterialCheckboxDropdown", [{ index: 0, role: "admin-material-dropdown-label", target: { line: 1048, sink: "property:textContent", expression: "`${label} · ${selectedIds.length} selecionado(s)`" } }]],
]);
const knownForEachTextTargets = new Map([
  ["app/admin/admin.js::284", { line: 287, sink: "call:createTextNode", expression: "axisLabel", flow: "bounded-static-array-to-field-label" }],
  ["app/admin/admin.js::818", { line: 819, sink: "call:createTextNode", expression: "title", flow: "bounded-static-array-to-field-label" }],
  ["app/admin/admin.js::866", { line: 867, sink: "property:textContent", expression: "label", flow: "bounded-static-array-to-option" }],
  ["app/admin/admin.js::964", { line: 964, sink: "property:textContent", expression: "text", flow: "bounded-static-array-to-option" }],
]);
const knownErrorFallbackTargets = new Map([
  ["app/access/access.js::30", [{ source: "app/access/access.js", line: 34, sink: "property:textContent", expression: "\"Não foi possível validar este link. Solicite um novo acesso à equipe.\"", relationship: "error-to-fixed-fallback", evidence: "The catch discards the Error and writes a fixed access-status message." }]],
  ["app/app.js::2551", [{ source: "app/app.js", line: 2535, sink: "property:textContent", expression: "\"Não foi possível validar a configuração publicada. O configurador está temporariamente indisponível.\"", relationship: "error-to-fixed-fallback", evidence: "The failure handler logs the TypeError and writes a fixed alert." }]],
  ["app/app.js::2552", [{ source: "app/app.js", line: 2535, sink: "property:textContent", expression: "\"Não foi possível validar a configuração publicada. O configurador está temporariamente indisponível.\"", relationship: "error-to-fixed-fallback", evidence: "The failure handler logs the Error and writes a fixed alert." }]],
  ["app/landing/landing.js::54", [{ source: "app/index.html", line: 48, sink: "text:p", expression: "Imagem temporariamente indisponível.", relationship: "error-to-fixed-fallback", evidence: "The rejected image load reaches the static HTML fallback; the Error text is discarded." }]],
  ["app/viewer/public-data.js::11", [{ source: "app/viewer/viewer.js", line: 191, sink: "property:textContent", expression: "viewerCopy(\"unavailable\", \"Informações temporariamente indisponíveis. Tente novamente mais tarde.\")", relationship: "error-to-fixed-fallback", evidence: "The catch ignores the Error and appends a fixed viewer alert." }]],
  ["app/viewer/public-data.js::18", [{ source: "app/viewer/viewer.js", line: 191, sink: "property:textContent", expression: "viewerCopy(\"unavailable\", \"Informações temporariamente indisponíveis. Tente novamente mais tarde.\")", relationship: "error-to-fixed-fallback", evidence: "The load rejection is caught by the viewer start chain; the TypeError text is discarded." }]],
  ["app/viewer/public-data.js::22", [{ source: "app/viewer/viewer.js", line: 191, sink: "property:textContent", expression: "viewerCopy(\"unavailable\", \"Informações temporariamente indisponíveis. Tente novamente mais tarde.\")", relationship: "error-to-fixed-fallback", evidence: "The load rejection is caught by the viewer start chain; the TypeError text is discarded." }]],
  ["app/viewer/public-data.js::25", [{ source: "app/viewer/viewer.js", line: 191, sink: "property:textContent", expression: "viewerCopy(\"unavailable\", \"Informações temporariamente indisponíveis. Tente novamente mais tarde.\")", relationship: "error-to-fixed-fallback", evidence: "The load rejection is caught by the viewer start chain; the TypeError text is discarded." }]],
  ["app/viewer/public-data.js::30", [{ source: "app/viewer/viewer.js", line: 191, sink: "property:textContent", expression: "viewerCopy(\"unavailable\", \"Informações temporariamente indisponíveis. Tente novamente mais tarde.\")", relationship: "error-to-fixed-fallback", evidence: "The load rejection is caught by the viewer start chain; the TypeError text is discarded." }]],
  ["app/viewer/public-data.js::37", [{ source: "app/viewer/viewer.js", line: 191, sink: "property:textContent", expression: "viewerCopy(\"unavailable\", \"Informações temporariamente indisponíveis. Tente novamente mais tarde.\")", relationship: "error-to-fixed-fallback", evidence: "The load rejection is caught by the viewer start chain; the TypeError text is discarded." }]],
  ["app/viewer/public-data.js::40", [{ source: "app/viewer/viewer.js", line: 191, sink: "property:textContent", expression: "viewerCopy(\"unavailable\", \"Informações temporariamente indisponíveis. Tente novamente mais tarde.\")", relationship: "error-to-fixed-fallback", evidence: "The load rejection is caught by the viewer start chain; the TypeError text is discarded." }]],
]);
const viewerPublicFailureTarget = {
  source: "app/viewer/viewer.js",
  line: 191,
  sink: "property:textContent",
  expression: "viewerCopy(\"unavailable\", \"Informações temporariamente indisponíveis. Tente novamente mais tarde.\")",
  relationship: "error-to-fixed-fallback",
  evidence: "The Viewer startup promise catches this failure and renders its fixed alert; neither the exception text nor identifiers are displayed.",
};
const configuratorPublishedFailureTarget = {
  source: "app/app.js",
  line: 2535,
  sink: "property:textContent",
  expression: "\"Não foi possível validar a configuração publicada. O configurador está temporariamente indisponível.\"",
  relationship: "error-to-fixed-fallback",
  evidence: "The published-configuration promise chain catches this failure and writes the fixed alert; the Error text is only logged.",
};
const knownBoundedServerFailureFlows = new Map([
  ...[18, 21, 27, 32, 39, 42, 52, 78, 84, 93, 107, 116, 124, 130].map((line) => [
    `app/core/public-module-projection.js::${line}`,
    [{
      ...viewerPublicFailureTarget,
      intermediateFailureResponse: {
        source: "netlify/functions/public-modules.mjs",
        line: 112,
        expression: 'return respond({ error: "public_modules_unavailable" }, 503);',
        statusCode: 503,
        relationship: "server-exception-to-fixed-json-response",
        evidence: "The handler catches projection/storage/validation failures and returns this fixed JSON error without exposing the exception.",
      },
      evidence: "The source is inside the handler's projection try; its catch returns a fixed 503 JSON response at netlify/functions/public-modules.mjs:110-113. The browser then renders the fixed Viewer alert.",
    }],
  ]),
  // The throw on line 45 contributes two Error literal fragments; map the
  // shared validation throw once so both records inherit the same fallback.
  ["app/core/public-module-projection.js::45", [{
    ...viewerPublicFailureTarget,
    intermediateFailureResponse: {
      source: "netlify/functions/public-modules.mjs",
      line: 112,
      expression: 'return respond({ error: "public_modules_unavailable" }, 503);',
      statusCode: 503,
      relationship: "server-exception-to-fixed-json-response",
      evidence: "The handler catches projection/storage/validation failures and returns this fixed JSON error without exposing the exception.",
    },
    evidence: "Both static fragments are part of the same validation throw inside the handler's projection try; its catch returns the fixed 503 JSON response at netlify/functions/public-modules.mjs:110-113, then the Viewer renders its fixed alert.",
  }]],
  ...[12, 16, 37].map((line) => [`app/core/published-buyer-projection.js::${line}`, [{
    ...configuratorPublishedFailureTarget,
    intermediateFailureResponse: {
      source: "netlify/functions/buyer-configuration.mjs",
      line: 72,
      expression: 'return jsonResponse({ error: "published_configuration_unavailable" }, 503);',
      statusCode: 503,
      relationship: "server-exception-to-fixed-json-response",
      evidence: "The handler catches publication/projection errors and returns this fixed JSON error without exposing the exception.",
    },
    evidence: "The source is reached inside the buyer endpoint projection try; its catch returns a fixed 503 JSON response at netlify/functions/buyer-configuration.mjs:71-73. The client converts the failed response to a rejection and renders the fixed Configurator alert.",
  }]]),
  ["app/core/published-buyer-projection.js::100", [{
    ...configuratorPublishedFailureTarget,
    evidence: "app/app.js:1766 calls consume() from applyConfiguratorSettings() inside the fetch promise's .then; the single .catch at :2558 renders this fixed alert.",
  }]],
  ...[174, 212, 218, 221, 231, 247, 249, 267, 273, 279, 288, 299, 310].map((line) => [`app/viewer/scene-adapters.js::${line}`, [{
    ...viewerPublicFailureTarget,
    evidence: `The error is thrown while start() creates or mounts the public adapter; start() is the fulfillment callback of the Viewer load promise, whose .catch at viewer.js:183-191 renders this fixed alert.`,
  }]]),
  ["app/access/manage.js::41", [
    { source: "app/access/manage.js", line: 95, sink: "property:textContent", expression: "\"Não foi possível carregar os acessos. Verifique a configuração do serviço.\"", relationship: "error-to-fixed-fallback", evidence: "The refreshGrants catch discards api() errors and writes this fixed status." },
    { source: "app/access/manage.js", line: 86, sink: "property:textContent", expression: "\"Não foi possível revogar agora. Tente novamente.\"", relationship: "error-to-fixed-fallback", evidence: "The revoke handler catch discards api() errors and writes this fixed status." },
    { source: "app/access/manage.js", line: 124, sink: "property:textContent", expression: "error.message === \"access_service_not_configured\"\r\n      ? \"O envio ainda não está configurado neste ambiente.\"\r\n      : \"Não foi possível enviar o link. Verifique o email e tente novamente.\"", relationship: "error-to-fixed-fallback", evidence: "The grant handler maps the request_failed fallback code to the generic branch of this fixed conditional status; it does not display error.message." },
  ]],
]);
const knownErrorConsumerTargets = new Map([
  ["app/core/administration-v5.js::305", {
    classification: "diagnostic",
    classificationHints: ["conditional-diagnostic-message-reaches-visible-error-sink"],
    useStatus: "active",
    consumerLinkStatus: "manual-consumer-review",
    consumerConfidence: "conditional",
    consumerEvidence: ["Exact chain: admin.js:1288 calls baselineHierarchyFor(published), which calls AdministrationV5.upgrade at :1242; if the API decodes a null JSON body, this throw rejects loadSettings(), awaited by showUser() and displayed at admin.js:1560. The normal published payload is non-null, so keep this conditional and diagnostic."],
    target: {
      source: "app/admin/admin.js",
      line: 1560,
      sink: "helper:setMessage",
      expression: "error.message || \"Falha ao carregar os dados administrativos.\"",
      flow: "bounded-admin-load-settings-to-set-message",
    },
  }],
]);
const knownManualErrorReviews = new Map([
  ["app/app.js::47", { classification: "diagnostic", useStatus: "diagnostic", consumerLinkStatus: "manual-no-ui-link", consumerEvidence: ["The top-level Configurator dependency guard throws during script initialization; no local catch or message sink consumes this Error text."], classificationHints: ["startup-contract-diagnostic"] }],
  ["app/core/admin-bootstrap-retry.mjs::18", { classification: "diagnostic", useStatus: "diagnostic", consumerLinkStatus: "manual-unlinked-conditional", consumerEvidence: ["The sole caller at app/admin/admin.js:1579 supplies fetch and getUser functions. The guard is structurally inside a path caught by showUser(), but its condition is not reachable through the current caller; keep unlinked."], classificationHints: ["unreachable-dependency-guard"] }],
  ...[23, 24, 25, 26, 27, 28].map((line) => [`app/core/administration-v5.js::${line}`, { classification: "diagnostic", useStatus: "diagnostic", consumerLinkStatus: "manual-no-ui-link", consumerEvidence: ["Module-initialization dependency guard; no bounded catch or UI message sink for this thrown literal."], classificationHints: ["module-dependency-diagnostic"] }]),
  ["app/core/administration-v5.js::164", { classification: "diagnostic", useStatus: "diagnostic", consumerLinkStatus: "manual-no-ui-link", consumerEvidence: ["The fallback in projectedLegacyPricing() is reached only when toV4() has no explicit legacy-pricing argument; both current call sites pass one, and no current Product runtime caller invokes toV4() without it."], classificationHints: ["dormant-error-fallback"] }],
  ["app/core/browser-compat.js::6", { classification: "system-message", useStatus: "diagnostic", consumerLinkStatus: "manual-no-ui-link", consumerEvidence: ["Compatibility-polyfill TypeError for an invalid nullish argument; no bounded UI consumer or message sink is associated with the polyfill error."], classificationHints: ["system-contract-error"] }],
  ["app/core/configuration.js::10", { classification: "diagnostic", useStatus: "diagnostic", consumerLinkStatus: "manual-no-ui-link", consumerEvidence: ["Module-initialization dependency guard; no bounded catch or UI message sink for this thrown literal."], classificationHints: ["module-dependency-diagnostic"] }],
  ["app/core/configuration.js::11", { classification: "diagnostic", useStatus: "diagnostic", consumerLinkStatus: "manual-no-ui-link", consumerEvidence: ["Module-initialization dependency guard; no bounded catch or UI message sink for this thrown literal."], classificationHints: ["module-dependency-diagnostic"] }],
  ["app/core/flow-layout.js::7", { classification: "diagnostic", useStatus: "diagnostic", consumerLinkStatus: "manual-no-ui-link", consumerEvidence: ["Module-initialization dependency guard; no bounded catch or UI message sink for this thrown literal."], classificationHints: ["module-dependency-diagnostic"] }],
  ["app/core/flow-model.js::7", { classification: "diagnostic", useStatus: "diagnostic", consumerLinkStatus: "manual-no-ui-link", consumerEvidence: ["Module-initialization dependency guard; no bounded catch or UI message sink for this thrown literal."], classificationHints: ["module-dependency-diagnostic"] }],
  ["app/core/hierarchy-administration.js::7", { classification: "diagnostic", useStatus: "diagnostic", consumerLinkStatus: "manual-no-ui-link", consumerEvidence: ["Module-initialization dependency guard; no bounded catch or UI message sink for this thrown literal."], classificationHints: ["module-dependency-diagnostic"] }],
  ["app/core/hierarchy-administration.js::68", { classification: "diagnostic", useStatus: "diagnostic", consumerLinkStatus: "manual-unlinked-conditional", consumerEvidence: ["Null guard in upgradeToHierarchy(); the current AdministrationV5.upgrade() caller rejects null at administration-v5.js:305 before calling this helper, so this specific literal is unreachable on the bounded Product path."], classificationHints: ["guarded-null-input"] }],
  ["app/core/layout-profiles.js::11", { classification: "diagnostic", useStatus: "diagnostic", consumerLinkStatus: "manual-unlinked-conditional", consumerEvidence: ["profileForWidth() is called with window.innerWidth in app.js:1946; the browser supplies a finite non-negative width on the supported route. The thrown text has no display catch."], classificationHints: ["validated-browser-input"] }],
  ["app/core/presentation-contract.js::81", { classification: "diagnostic", useStatus: "diagnostic", consumerLinkStatus: "manual-unlinked-conditional", consumerEvidence: ["The only reviewed app route reaches this through flow-layout.js:26. A null section is not valid normalized flow; malformed input may fail earlier, and no exact source-to-catch relationship is proven for this throw."], classificationHints: ["unproven-malformed-flow-path"] }],
  ["app/core/private-navigation.js::184", { classification: "diagnostic", useStatus: "diagnostic", consumerLinkStatus: "manual-error-swallowed", consumerEvidence: ["The rejection is caught at private-navigation.js:164-166 and preserves the generic loading state at :92. That text is also shown during an ordinary pending lookup, so it is not linked as an error-specific fallback."], classificationHints: ["error-swallowed-loading-state"] }],
  ["app/viewer/scene-adapters.js::101", { classification: "diagnostic", useStatus: "diagnostic", consumerLinkStatus: "manual-unlinked-conditional", consumerEvidence: ["A failure during initial mount would reach viewer.js:176-184, but the public-state checks at scene-adapters.js:276-310 validate finish availability and selection before mount; normal operation cannot produce this missing initial finish. Leave the low-confidence fallback relation unlinked."], classificationHints: ["invariant-guarded-startup-error"] }],
]);
const knownCustomErrorMessages = new Map([
  ["app/core/admin-bootstrap-retry.mjs::AdminBootstrapRequestError", {
    messageArgumentIndex: 1,
    target: {
      source: "app/admin/admin.js",
      line: 1560,
      sink: "helper:setMessage",
      expression: "error.message || \"Falha ao carregar os dados administrativos.\"",
      flow: "bounded-custom-error-to-admin-status",
    },
    evidence: "AdminBootstrapRequestError(code, message) is rethrown by ensureAdminData(); showUser() displays error.message through the fixed Admin status helper.",
  }],
]);
const drawingTargets = {
  elevation: {
    source: "app/core/technical-drawings.js", line: 81, sink: "call:setAttribute",
    expression: `format(copy("elevationAria", "{view}: {axis} {width} milímetros por A {height} milímetros{ending}"), {
      view: isSide ? copy("side", "Vista lateral") : copy("front", "Vista frontal"),
      axis: horizontalLabel, width: dimension(horizontalMm), height: dimension(spec.faceHeightMm), ending: ending(amplified)
    })`,
    flow: "bounded-catalog-copy-to-technical-drawing",
  },
  isometric: {
    source: "app/core/technical-drawings.js", line: 113, sink: "call:setAttribute",
    expression: `format(copy("isometricAria", "{prefix}: {axis} {width} milímetros, A {height} milímetros e {depthAxis} {depth} milímetros{ending}"), {
      prefix: ariaPrefix, axis: spec.faceHorizontalLabel, width: dimension(spec.faceWidthMm),
      height: dimension(spec.faceHeightMm), depthAxis: spec.extrusionLabel, depth: dimension(spec.extrusionMm), ending: ending(amplified)
    })`,
    flow: "bounded-catalog-copy-to-technical-drawing",
  },
  internal: {
    source: "app/core/technical-drawings.js", line: 148, sink: "call:setAttribute",
    expression: 'ariaLabel || format(copy("internalAria", "Vista interna frontal: {segments}."), { segments: describe })',
    flow: "bounded-catalog-copy-to-technical-drawing",
  },
};
const knownCatalogSourcePaths = new Map([
  ["app/core/ui-copy.js", [
    ...[
      ["side", ["elevation"]], ["front", ["elevation"]],
      ["elevationAria", ["elevation"]], ["isometric", ["isometric"]],
      ["isometricAria", ["isometric"]], ["amplification", ["elevation", "isometric"]],
      ["internalAria", ["internal"]], ["internalSegment", ["internal"]],
    ].map(([key, targets]) => ({
      path: ["technicalDrawings", key], role: "technical-drawing-copy",
      binding: "uiCopy.technicalDrawings",
      evidence: key.startsWith("internal")
        ? "The default internal drawing description is used by the Configurator; Viewer supplies its own ariaLabel. The sink routeConsumers list both routes."
        : "The shared drawing renderer composes this fixed text into the SVG accessible description used by the Configurator and Viewer; amplification is conditional.",
      targets: targets.map((name) => drawingTargets[name]),
    })),
    ...["components", "requirements"].map((kind) => ({
      path: ["viewer", "detailHeadings", kind],
      role: "detail-heading",
      binding: "uiCopy.viewer.detailHeadings",
      evidence: "The fixed Viewer heading is selected by the closed detailLayout ID set and rendered by viewer.js through the text-only element helper.",
      target: {
        source: "app/viewer/viewer.js",
        line: 125,
        sink: "helper:element",
        expression: "detailHeadingsCopy[descriptor.id]",
        flow: "bounded-catalog-copy-to-viewer-detail-heading",
      },
    })),
    ...[
      ["overview", "kicker", "app/viewer/viewer.js", 53, "helper:element", 'viewerText("overview.kicker", "{category} · Módulo {number}")\n      .replace(/\\{(category|number)\\}/g, (_, key) => String(module[key]))'],
      ["overview", "basePrice", "app/viewer/viewer.js", 72, "helper:element", 'viewerText("overview.basePrice", "Valor base do módulo")'],
      ["sections", "viewsTitle", "app/viewer/viewer.js", 156, "helper:section", 'viewerText("sections.viewsTitle", "Vistas técnicas")'],
      ["sections", "viewsDescription", "app/viewer/viewer.js", 156, "helper:section", 'viewerText("sections.viewsDescription", "Desenhos orientativos a partir das dimensões disponíveis.")'],
      ["sections", "detailsTitle", "app/viewer/viewer.js", 164, "helper:section", 'viewerText("sections.detailsTitle", "Detalhes do módulo")'],
      ["sections", "detailsDescription", "app/viewer/viewer.js", 164, "helper:section", 'viewerText("sections.detailsDescription", "Informações organizadas para consulta rápida.")'],
      ...["isometric", "side", "front"].map((key) => ["technical", key, "app/viewer/technical-views.js", 26, "property:textContent", "caption"]),
      ...["frontsConfirmed", "nominalDrawing"].map((key) => ["technical", key, "app/viewer/technical-views.js", 27, "property:textContent", 'module.frontLayout?.status === "count-confirmed" && !isSide ? copy("frontsConfirmed", "Número de frentes confirmado; proporções internas orientativas.") : copy("nominalDrawing", "Desenho proporcional · cotas nominais.")']),
      ["technical", "internal", "app/viewer/technical-views.js", 41, "property:textContent", 'copy("internal", "Vista interna")'],
      ["technical", "internalDescription", "app/viewer/technical-views.js", 42, "property:textContent", 'copy("internalDescription", "Vãos internos confirmados; medidas não representam o envelope externo.")'],
      ["technical", "focus", "app/viewer/technical-views.js", 48, "property:textContent", 'copy("focus", "Detalhe do módulo")'],
      ["technical", "focusUnavailable", "app/viewer/technical-views.js", 50, "property:textContent", 'copy("focusUnavailable", "Recorte do módulo indisponível.")'],
      ["technical", "focusAria", "app/viewer/technical-views.js", 56, "call:setAttribute", 'copy("focusAria", "Recorte isolado de {title}").replace("{title}", () => String(module.title))'],
      ["technical", "focusDescription", "app/viewer/technical-views.js", 60, "property:textContent", 'copy("focusDescription", "Recorte do módulo selecionado na cena.")'],
      ...["internalAria", "internalSegment"].map((key) => ["technical", key, "app/core/technical-drawings.js", 148, "call:setAttribute", 'ariaLabel || format(copy("internalAria", "Vista interna frontal: {segments}."), { segments: describe })']),
    ].map(([group, key, source, line, sink, expression]) => ({
      path: ["viewer", group, key], role: "fixed-viewer-copy", binding: `uiCopy.viewer.${group}`,
      evidence: group === "technical" && (key === "internalAria" || key === "internalSegment")
        ? "Viewer internalView supplies the composed label to CasaTechnicalDrawings.internalFront, which assigns it to its SVG. The sink's routeConsumers describe all routes using the shared sink; this catalog flow is confined to /viewer/."
        : "Viewer renders the fixed catalog text through the named consumer; dynamic product values remain separate.",
      target: { source, line, sink, expression, flow: "bounded-catalog-copy-to-viewer" },
    })),
  ]],
]);
const knownOptionFactoryFunctions = new Map([
  ["app/admin/admin.js::materialTargetOptions", {
    role: "admin-material-target-option-label",
    targets: [
      { line: 980, sink: "call:createTextNode", expression: "label" },
      { line: 999, sink: "property:textContent", expression: "`${title} · opções válidas`" },
    ],
  }],
  ["app/admin/admin.js::eventTriggerOptions", {
    role: "admin-event-trigger-option-label",
    targets: [{ line: 943, sink: "property:textContent", expression: "text" }],
  }],
]);
const textDataSchemas = new Map([
  ["app/landing/data.js", {
    globalName: "CASA_PUBLIC_LANDING",
    fields: [
      { path: ["title"], role: "brand-name", use: "unconsumed", evidence: [] },
      { path: ["tagline"], role: "editorial-tagline", use: "unconsumed", evidence: [] },
      { path: ["environments", "*", "name"], role: "environment-name", use: "active", evidence: ["app/landing/landing.js:87,131 -> textContent"] },
      { path: ["environments", "*", "alt"], role: "image-alternative-text", use: "active", evidence: ["app/landing/landing.js:78 -> img.alt"] },
      { path: ["environments", "*", "description"], role: "environment-description", use: "active", evidence: ["app/landing/landing.js:88,132 -> textContent"] },
      { path: ["environments", "*", "action"], role: "environment-action", use: "active", evidence: ["app/landing/landing.js:94 -> firstChild.textContent"] },
      { path: ["benefits", "*", "label"], role: "benefit-label", use: "active", evidence: ["app/landing/landing.js:37 -> textContent"] },
    ],
  }],
  ["app/viewer/data.js", {
    globalName: "CASA_PUBLIC_VIEWER",
    fields: [
      { path: ["viewTypes", "*", "label"], role: "view-label", use: "passed-but-unused", evidence: ["app/viewer/viewer.js:89 -> render argument; app/viewer/technical-views.js does not render label"] },
    ],
  }],
]);

function memberName(node) {
  if (!node || node.type !== "MemberExpression") return null;
  if (!node.computed && node.property.type === "Identifier") return node.property.name;
  if (node.computed && node.property.type === "Literal") return String(node.property.value);
  return null;
}

function objectName(node) {
  if (!node || node.type !== "MemberExpression" || node.object.type !== "Identifier") return null;
  return node.object.name;
}

function calleeName(node) {
  if (!node) return null;
  if (node.type === "Identifier") return node.name;
  return memberName(node);
}

function isErrorConstructor(node) {
  return ["Error", "TypeError"].includes(calleeName(node));
}

function sourceOf(node, source) {
  return node ? source.slice(node.start, node.end) : "";
}

function literalParts(node, parts = []) {
  if (!node || typeof node !== "object") return parts;
  if (node.type === "Literal" && typeof node.value === "string") {
    parts.push(node.value);
    return parts;
  }
  if (node.type === "TemplateElement") {
    const value = node.value?.cooked ?? node.value?.raw ?? "";
    if (value) parts.push(value);
    return parts;
  }
  if (Array.isArray(node)) {
    for (const child of node) literalParts(child, parts);
    return parts;
  }
  for (const key of Object.keys(node)) {
    if (["loc", "start", "end", "range", "raw"].includes(key)) continue;
    literalParts(node[key], parts);
  }
  return parts;
}

function fullyStatic(node) {
  if (!node) return null;
  if (node.type === "Literal" && typeof node.value === "string") return node.value;
  if (node.type === "TemplateLiteral" && node.expressions.length === 0) {
    return node.quasis.map((part) => part.value?.cooked ?? part.value?.raw ?? "").join("");
  }
  if (node.type === "BinaryExpression" && node.operator === "+") {
    const left = fullyStatic(node.left);
    const right = fullyStatic(node.right);
    if (left !== null && right !== null) return left + right;
  }
  return null;
}

function staticStringLeaves(node) {
  if (!node || typeof node !== "object") return [];
  if (node.type === "Literal" && typeof node.value === "string") return [node.value];
  if (node.type === "TemplateLiteral") {
    return node.quasis.map((part) => part.value?.cooked ?? part.value?.raw ?? "").filter(Boolean);
  }
  if (node.type === "ArrayExpression") {
    return node.elements.flatMap((element) => staticStringLeaves(element));
  }
  if (node.type === "ObjectExpression") {
    return node.properties.flatMap((property) => property.type === "Property"
      ? staticStringLeaves(property.value)
      : []);
  }
  if (node.type === "BinaryExpression" && node.operator === "+") {
    const value = fullyStatic(node);
    return value === null ? [...staticStringLeaves(node.left), ...staticStringLeaves(node.right)] : [value];
  }
  if (node.type === "ConditionalExpression") {
    return [...staticStringLeaves(node.consequent), ...staticStringLeaves(node.alternate)];
  }
  return [];
}

function staticStringNodes(node, path = [], output = []) {
  if (!node || typeof node !== "object") return output;
  if (node.type === "Literal" && typeof node.value === "string") {
    output.push({ node, path, value: node.value });
    return output;
  }
  if (node.type === "TemplateLiteral" && node.expressions.length === 0) {
    const value = node.quasis.map((part) => part.value?.cooked ?? part.value?.raw ?? "").join("");
    output.push({ node, path, value });
    return output;
  }
  if (node.type === "ArrayExpression") {
    node.elements.forEach((child, index) => staticStringNodes(child, [...path, `[${index}]`], output));
    return output;
  }
  if (node.type === "ObjectExpression") {
    node.properties.forEach((property) => {
      if (property.type !== "Property") return;
      const key = property.key.type === "Identifier"
        ? property.key.name
        : property.key.type === "Literal"
          ? String(property.key.value)
          : "?";
      staticStringNodes(property.value, [...path, key], output);
    });
    return output;
  }
  if (node.type === "ConditionalExpression") {
    staticStringNodes(node.consequent, [...path, "then"], output);
    staticStringNodes(node.alternate, [...path, "else"], output);
  } else if (node.type === "LogicalExpression") {
    staticStringNodes(node.left, [...path, "left"], output);
    staticStringNodes(node.right, [...path, "right"], output);
  } else if (node.type === "BinaryExpression" && node.operator === "+") {
    staticStringNodes(node.left, [...path, "left"], output);
    staticStringNodes(node.right, [...path, "right"], output);
  }
  return output;
}

function tupleStringNodes(node, tupleIndex, path = [], output = []) {
  if (!node || node.type !== "ArrayExpression") return output;
  node.elements.forEach((child, index) => {
    if (child?.type !== "ArrayExpression") return;
    const valueNode = child.elements[tupleIndex];
    if (valueNode) staticStringNodes(valueNode, [...path, `[${index}]`, `[${tupleIndex}]`], output);
  });
  return output;
}

function addSourceNode(file, node, sourceRole, sourceBinding, valuePath, value = null, metadata = {}) {
  const resolved = value ?? fullyStatic(node);
  if (typeof resolved !== "string" || !resolved.trim()) return;
  const location = node.loc?.start || { line: 1, column: 0 };
  sourceEntries.push({
    source: file.path,
    line: location.line + (file.lineOffset || 0),
    column: location.column + 1 + (location.line === 1 ? (file.columnOffset || 0) : 0),
    kind: "javascript-text-source",
    sink: "source:" + sourceRole,
    sourceRole,
    sourceBinding,
    valuePath,
    expression: sourceOf(node, file.source),
    value: resolved,
    literalSegments: [resolved],
    classification: "unreviewed",
    classificationHints: ["source-needs-consumer-and-domain-review"],
    consumerLinkStatus: metadata.useStatus === "active" ? "field-consumer-evidence" : "manual-consumer-review",
    ...metadata,
  });
}

function addSourceNodes(file, nodes, sourceRole, sourceBinding, metadata = {}) {
  for (const item of nodes) {
    addSourceNode(file, item.node, sourceRole, sourceBinding, item.path.join("."), item.value, metadata);
  }
}

function propertyValue(node, name) {
  if (node?.type !== "ObjectExpression") return null;
  const property = node.properties.find((item) => item.type === "Property" && !item.computed && (
    item.key.type === "Identifier" ? item.key.name === name
      : item.key.type === "Literal" && String(item.key.value) === name
  ));
  return property?.value || null;
}

function extractPath(node, path, basePath = [], output = []) {
  if (node?.type === "CallExpression" && calleeName(node.callee) === "freeze") {
    node = node.arguments[0];
  }
  if (!path.length) {
    staticStringNodes(node, basePath, output);
    return output;
  }
  const [part, ...rest] = path;
  if (part === "*") {
    if (node?.type === "ArrayExpression") {
      node.elements.forEach((child, index) => extractPath(child, rest, [...basePath, `[${index}]`], output));
    } else if (node?.type === "ObjectExpression") {
      node.properties.forEach((property) => {
        if (property.type !== "Property" || property.computed) return;
        const key = property.key.type === "Identifier"
          ? property.key.name
          : property.key.type === "Literal" ? String(property.key.value) : null;
        if (key !== null) extractPath(property.value, rest, [...basePath, key], output);
      });
    }
    return output;
  }
  const child = propertyValue(node, part);
  if (child) extractPath(child, rest, [...basePath, part], output);
  return output;
}

function bindingName(node) {
  return node?.type === "Identifier" ? node.name : null;
}

function sourceRecordPolicy(file, node, name) {
  const config = knownTextBindings.get(file.path + "::" + name);
  if (!config) return;
  if (node?.type === "CallExpression" && calleeName(node.callee) === "freeze") {
    node = node.arguments[0];
  }
  const nodes = config.policy === "pair-labels"
    ? tupleStringNodes(node, 1)
    : staticStringNodes(node);
  const metadata = {
    useStatus: "active",
    consumerEvidence: ["consumer traced during bounded source review; see valuePath and routeConsumers"],
  };
  if (config.target) metadata.consumerTargets = [config.target];
  if (config.reviewNote) metadata.reviewNote = config.reviewNote;
  addSourceNodes(file, nodes, config.role, name, metadata);
}

function visitSources(node, file) {
  if (!node || typeof node !== "object") return;
  if (Array.isArray(node)) {
    node.forEach((child) => visitSources(child, file));
    return;
  }
  if (node.type === "ReturnStatement" && node.argument) {
    const catalogPaths = knownCatalogSourcePaths.get(file.path) || [];
    const catalogRoot = node.argument.type === "CallExpression" && calleeName(node.argument.callee) === "freeze"
      ? node.argument.arguments[0]
      : node.argument;
    for (const config of catalogPaths) {
      addSourceNodes(file, extractPath(catalogRoot, config.path), config.role, config.binding, {
        useStatus: "active",
        consumerEvidence: [config.evidence],
        consumerTargets: config.targets || [config.target],
        classificationHints: config.role === "error-message-source"
          ? ["user-visible-operational-message", "catalog-error-copy-to-admin-status"]
          : config.role === "detail-heading"
            ? ["user-visible-heading", "catalog-copy-to-viewer-detail-heading"]
            : config.role === "technical-drawing-copy"
              ? ["accessible-technical-drawing-copy", "catalog-copy-to-shared-renderer"]
              : ["user-visible-viewer-copy", "catalog-copy-to-viewer"],
      });
    }
  }
  if (node.type === "VariableDeclarator") {
    const name = bindingName(node.id);
    if (name) {
      sourceRecordPolicy(file, node.init, name);
      const schemas = knownDataBindingSchemas.get(file.path + "::" + name) || [];
      const dataNode = node.init?.type === "CallExpression" && calleeName(node.init.callee) === "freeze"
        ? node.init.arguments[0]
        : node.init;
      for (const field of schemas) {
        const nodes = extractPath(dataNode, field.path);
        addSourceNodes(file, nodes, field.role, name, {
          useStatus: field.use,
          contentDomain: field.domain,
          reviewNote: field.reviewNote,
          consumerEvidence: field.evidence,
          consumerTargets: field.consumerTargets,
          classificationHints: ["domain-bound-text-review", ...(field.reviewNote ? ["behavior-coupled-value"] : [])],
        });
      }
    }
  }
  if (node.type === "FunctionDeclaration" && node.id?.type === "Identifier") {
    const config = knownOptionFactoryFunctions.get(file.path + "::" + node.id.name);
    if (config) {
      const returns = [];
      function findReturns(current, root = false) {
        if (!current || typeof current !== "object") return;
        if (Array.isArray(current)) {
          current.forEach((child) => findReturns(child));
          return;
        }
        if (!root && ["FunctionDeclaration", "FunctionExpression", "ArrowFunctionExpression"].includes(current.type)) return;
        if (current.type === "ReturnStatement" && current.argument) {
          returns.push(...optionLabelNodes(current.argument));
          return;
        }
        for (const key of Object.keys(current)) {
          if (["loc", "start", "end", "range", "raw"].includes(key)) continue;
          if (current[key] && typeof current[key] === "object") findReturns(current[key]);
        }
      }
      findReturns(node.body, true);
      addSourceNodes(file, returns, config.role, node.id.name, {
        useStatus: "active",
        consumerEvidence: [`${file.path}:${node.loc?.start?.line || 1} return options used by a recognized renderer`],
        consumerTargets: config.targets,
      });
    }
  }
  if (
    node.type === "AssignmentExpression"
    && memberName(node.left) === "compactLabel"
    && memberName(node.left.object) === "dataset"
  ) {
    const location = node.loc?.start || { line: 1, column: 0 };
    const target = {
      line: location.line + (file.lineOffset || 0),
      sink: "css-generated-content:data-compact-label",
      expression: sourceOf(node.right, file.source),
    };
    const compactValueNode = node.right?.type === "MemberExpression"
      && node.right.object?.type === "ObjectExpression"
      ? node.right.object
      : node.right;
    addSourceNodes(file, staticStringNodes(compactValueNode), "compact-flow-label", "dataset.compactLabel", {
      useStatus: "active",
      contentDomain: "compact-configurator-ui-copy",
      reviewNote: "CSS ::after displays this data attribute; the full stage.label is also the button accessible name.",
      consumerEvidence: [`${file.path}:${target.line} data-compact-label is rendered through CSS generated content`],
      consumerTargets: [target],
    });
  }
  if (node.type === "AssignmentExpression" && node.left.type === "MemberExpression") {
    const name = memberName(node.left);
    if (node.left.object?.type === "Identifier" && node.left.object.name === "window" && name) {
      const schema = textDataSchemas.get(file.path);
      if (schema && name === schema.globalName) {
        const dataNode = node.right?.type === "CallExpression" && calleeName(node.right.callee) === "freeze"
          ? node.right.arguments[0]
          : node.right;
        for (const field of schema.fields) {
          const nodes = extractPath(dataNode, field.path);
          addSourceNodes(file, nodes, field.role, schema.globalName, {
            useStatus: field.use,
            consumerEvidence: field.evidence,
          });
        }
      }
    }
  }
  if (node.type === "CallExpression" && memberName(node.callee) === "forEach") {
    const array = node.callee.object;
    const callback = node.arguments[0];
    const parameter = callback?.params?.[0];
    const tupleSlot = textBoundTupleSlot(callback);
    const writesScalar = parameter?.type === "Identifier"
      && callbackWritesParameterAsText(callback.body, parameter.name);
    if (array?.type === "ArrayExpression" && (writesScalar || tupleSlot !== null)) {
      const location = node.loc?.start || { line: 1, column: 0 };
      const nodes = tupleSlot === null ? staticStringNodes(array) : tupleStringNodes(array, tupleSlot);
      const sourceRole = tupleSlot === null ? "inline-text-array" : "inline-text-tuple-label";
      const consumerTarget = knownForEachTextTargets.get(`${file.path}::${location.line}`);
      const metadata = {
        useStatus: "active",
        consumerEvidence: [`same callback writes ${tupleSlot === null ? "its first parameter" : `tuple slot ${tupleSlot}`} to a recognized DOM text property at ${file.path}:${location.line}`],
      };
      if (consumerTarget) metadata.consumerTargets = [consumerTarget];
      addSourceNodes(file, nodes, sourceRole, `forEach@${location.line}`, metadata);
    }
  }
  if (node.type === "CallExpression") {
    const name = calleeName(node.callee);
    const policies = knownSourceCallArguments.get(file.path + "::" + name) || [];
    for (const policy of policies) {
      const argument = node.arguments[policy.index];
      if (!argument) continue;
      const nodes = policy.policy === "option-labels"
        ? optionLabelNodes(argument)
        : staticStringNodes(argument);
      const location = node.loc?.start || { line: 1, column: 0 };
      addSourceNodes(file, nodes, policy.role, `${name}@${location.line}`, {
        useStatus: "active",
        consumerEvidence: [`${file.path}:${location.line} argument passed to ${name}`],
        consumerTargets: [policy.target],
      });
    }
  }
  if (node.type === "NewExpression" && isErrorConstructor(node.callee) && node.arguments[0]) {
    const messageArgument = node.arguments[0];
    const selectionOperators = [];
    function collectSelectionOperators(current) {
      if (!current || typeof current !== "object") return;
      if (Array.isArray(current)) {
        current.forEach(collectSelectionOperators);
        return;
      }
      if (current.type === "LogicalExpression" || current.type === "ConditionalExpression") {
        selectionOperators.push({
          kind: current.type === "LogicalExpression" ? "logical" : "conditional",
          operator: current.operator || "?:",
          line: current.loc?.start?.line + (file.lineOffset || 0),
          expression: sourceOf(current, file.source),
        });
      }
      for (const key of Object.keys(current)) {
        if (["loc", "start", "end", "range", "raw"].includes(key)) continue;
        const child = current[key];
        if (child && typeof child === "object") collectSelectionOperators(child);
      }
    }
    collectSelectionOperators(messageArgument);
    const sourceNodes = staticStringNodes(messageArgument);
    for (const item of sourceNodes) {
      const sourceLine = item.node.loc?.start?.line + (file.lineOffset || 0);
      const sourceKey = file.path + "::" + sourceLine;
      const fallbackTargets = [
        ...(knownErrorFallbackTargets.get(sourceKey) || []),
        ...(knownBoundedServerFailureFlows.get(sourceKey) || []),
      ];
      const manualReview = knownManualErrorReviews.get(sourceKey) || {};
      const consumerPolicy = knownErrorConsumerTargets.get(sourceKey);
      const metadata = {
        useStatus: "diagnostic-or-user-message-review",
        consumerEvidence: ["no bounded display flow has been linked yet; review the catch/source boundary"],
        sourceExpression: sourceOf(messageArgument, file.source),
        selectionOperators,
        ...manualReview,
      };
      if (fallbackTargets.length) {
        metadata.classification = "diagnostic";
        metadata.classificationHints = ["error-literal-not-displayed-fixed-fallback-is-shown"];
        metadata.useStatus = "diagnostic";
        metadata.consumerLinkStatus = "fixed-fallback-only";
        metadata.consumerEvidence = fallbackTargets.map((target) => target.evidence);
        metadata.failureFallbackTargets = fallbackTargets;
      }
      if (consumerPolicy) {
        const { target, ...reviewMetadata } = consumerPolicy;
        Object.assign(metadata, reviewMetadata, { consumerTargets: [target] });
      }
      addSourceNode(file, item.node, "error-message-source", calleeName(node.callee) + " constructor", item.path.join("."), item.value, metadata);
    }
  }
  if (node.type === "NewExpression") {
    const customErrorPolicy = knownCustomErrorMessages.get(file.path + "::" + calleeName(node.callee));
    const messageArgument = customErrorPolicy && node.arguments[customErrorPolicy.messageArgumentIndex];
    if (messageArgument) {
      const sourceNodes = staticStringNodes(messageArgument);
      for (const item of sourceNodes) {
        addSourceNode(file, item.node, "error-message-source", calleeName(node.callee) + " message argument", item.path.join("."), item.value, {
          useStatus: "active",
          consumerEvidence: [customErrorPolicy.evidence],
          sourceExpression: sourceOf(messageArgument, file.source),
          classificationHints: ["user-visible-operational-message"],
          consumerTargets: [customErrorPolicy.target],
        });
      }
    }
  }
  for (const key of Object.keys(node)) {
    if (["loc", "start", "end", "range", "raw"].includes(key)) continue;
    const child = node[key];
    if (child && typeof child === "object") visitSources(child, file);
  }
}

function messageSinksUsingCatchParameter(catchClause, file) {
  if (!catchClause?.param) return [];
  const catchNames = new Set(boundIdentifiers(catchClause.param));
  const targets = [];
  function catchesMessage(node) {
    if (!node || typeof node !== "object") return false;
    if (Array.isArray(node)) return node.some(catchesMessage);
    if (
      node.type === "MemberExpression"
      && memberName(node) === "message"
      && node.object?.type === "Identifier"
      && catchNames.has(node.object.name)
    ) return true;
    for (const key of Object.keys(node)) {
      if (["loc", "start", "end", "range", "raw"].includes(key)) continue;
      if (catchesMessage(node[key])) return true;
    }
    return false;
  }
  function visitCatch(node) {
    if (!node || typeof node !== "object") return;
    if (Array.isArray(node)) {
      node.forEach(visitCatch);
      return;
    }
    if (["FunctionDeclaration", "FunctionExpression", "ArrowFunctionExpression"].includes(node.type)) return;
    if (node.type === "CallExpression") {
      const name = calleeName(node.callee);
      for (const index of messageHelpers.get(name) || []) {
        const argument = node.arguments[index];
        if (catchesMessage(argument)) {
          const location = node.loc?.start || { line: 1, column: 0 };
          targets.push({
            line: location.line + (file.lineOffset || 0),
            sink: "helper:" + name,
            expression: sourceOf(argument, file.source),
          });
        }
      }
    }
    for (const key of Object.keys(node)) {
      if (["loc", "start", "end", "range", "raw"].includes(key)) continue;
      const child = node[key];
      if (child && typeof child === "object") visitCatch(child);
    }
  }
  visitCatch(catchClause.body);
  return targets;
}

function linkSameTryCatchSources(ast, file) {
  function shiftedLocation(node) {
    const location = node?.loc?.start || { line: 1, column: 0 };
    return {
      line: location.line + (file.lineOffset || 0),
      column: location.column + 1 + (location.line === 1 ? (file.columnOffset || 0) : 0),
    };
  }
  function walk(node, activeCatch = null) {
    if (!node || typeof node !== "object") return;
    if (Array.isArray(node)) {
      node.forEach((child) => walk(child, activeCatch));
      return;
    }
    if (["FunctionDeclaration", "FunctionExpression", "ArrowFunctionExpression"].includes(node.type)) {
      walk(node.body, null);
      return;
    }
    if (node.type === "TryStatement") {
      walk(node.block, node.handler || activeCatch);
      if (node.handler) walk(node.handler.body, activeCatch);
      if (node.finalizer) walk(node.finalizer, activeCatch);
      return;
    }
    if (
      node.type === "ThrowStatement"
      && activeCatch
      && node.argument?.type === "NewExpression"
      && isErrorConstructor(node.argument.callee)
      && node.argument.arguments[0]
    ) {
      const targets = messageSinksUsingCatchParameter(activeCatch, file);
      const sourceNodes = staticStringNodes(node.argument.arguments[0]);
      for (const sourceNode of sourceNodes) {
        const location = shiftedLocation(sourceNode.node);
        const record = sourceEntries.find((item) =>
          item.source === file.path
          && item.sourceRole === "error-message-source"
          && item.line === location.line
          && item.column === location.column
          && item.expression === sourceOf(sourceNode.node, file.source)
        );
        if (record && targets.length) {
          record.sameTryCatchTargets = targets;
          record.useStatus = "active";
          record.consumerLinkStatus = "same-try-catch-candidate";
          record.consumerEvidence = targets.map((target) =>
            `Error literal in try reaches caught .message sink at ${target.source || file.path}:${target.line}`
          );
        }
      }
    }
    for (const key of Object.keys(node)) {
      if (["loc", "start", "end", "range", "raw"].includes(key)) continue;
      const child = node[key];
      if (child && typeof child === "object") walk(child, activeCatch);
    }
  }
  walk(ast);

  const functions = new Map();
  function collectFunctions(node) {
    if (!node || typeof node !== "object") return;
    if (Array.isArray(node)) {
      node.forEach(collectFunctions);
      return;
    }
    if (node.type === "FunctionDeclaration" && node.id?.type === "Identifier") {
      if (functions.has(node.id.name)) functions.set(node.id.name, null);
      else functions.set(node.id.name, node);
    }
    for (const key of Object.keys(node)) {
      if (["loc", "start", "end", "range", "raw"].includes(key)) continue;
      if (node[key] && typeof node[key] === "object") collectFunctions(node[key]);
    }
  }
  collectFunctions(ast);

  const awaitedCallTargets = new Map();
  function findAwaitedCalls(node, activeCatch = null) {
    if (!node || typeof node !== "object") return;
    if (Array.isArray(node)) {
      node.forEach((child) => findAwaitedCalls(child, activeCatch));
      return;
    }
    if (["FunctionDeclaration", "FunctionExpression", "ArrowFunctionExpression"].includes(node.type)) {
      findAwaitedCalls(node.body, null);
      return;
    }
    if (node.type === "TryStatement") {
      findAwaitedCalls(node.block, node.handler || activeCatch);
      if (node.handler) findAwaitedCalls(node.handler.body, activeCatch);
      if (node.finalizer) findAwaitedCalls(node.finalizer, activeCatch);
      return;
    }
    if (
      node.type === "AwaitExpression"
      && node.argument?.type === "CallExpression"
      && node.argument.callee.type === "Identifier"
      && activeCatch
      && functions.get(node.argument.callee.name)
    ) {
      const calledFunction = functions.get(node.argument.callee.name);
      let containsTry = false;
      function detectTry(current) {
        if (!current || typeof current !== "object") return;
        if (Array.isArray(current)) {
          current.forEach(detectTry);
          return;
        }
        if (current !== calledFunction.body && ["FunctionDeclaration", "FunctionExpression", "ArrowFunctionExpression"].includes(current.type)) return;
        if (current.type === "TryStatement") containsTry = true;
        for (const key of Object.keys(current)) {
          if (["loc", "start", "end", "range", "raw"].includes(key)) continue;
          if (current[key] && typeof current[key] === "object") detectTry(current[key]);
        }
      }
      detectTry(calledFunction.body);
      if (!containsTry) {
        const targets = messageSinksUsingCatchParameter(activeCatch, file);
        if (targets.length) {
          const callsites = awaitedCallTargets.get(node.argument.callee.name) || [];
          callsites.push(targets);
          awaitedCallTargets.set(node.argument.callee.name, callsites);
        }
      }
    }
    for (const key of Object.keys(node)) {
      if (["loc", "start", "end", "range", "raw"].includes(key)) continue;
      if (node[key] && typeof node[key] === "object") findAwaitedCalls(node[key], activeCatch);
    }
  }
  findAwaitedCalls(ast);

  function linkAwaitedFunctionErrors(functionNode, targets) {
    function walkFunction(node) {
      if (!node || typeof node !== "object") return;
      if (Array.isArray(node)) {
        node.forEach(walkFunction);
        return;
      }
      if (["FunctionDeclaration", "FunctionExpression", "ArrowFunctionExpression"].includes(node.type)) return;
      if (
        node.type === "ThrowStatement"
        && node.argument?.type === "NewExpression"
        && isErrorConstructor(node.argument.callee)
        && node.argument.arguments[0]
      ) {
        for (const sourceNode of staticStringNodes(node.argument.arguments[0])) {
          const location = shiftedLocation(sourceNode.node);
          const record = sourceEntries.find((item) =>
            item.source === file.path
            && item.sourceRole === "error-message-source"
            && item.line === location.line
            && item.column === location.column
            && item.expression === sourceOf(sourceNode.node, file.source)
          );
          if (record) {
            record.consumerTargets = targets.map((target) => ({
              ...target,
              flow: "same-file-awaited-call-catch",
            }));
            record.useStatus = "active";
            record.consumerLinkStatus = "same-file-awaited-call-candidate";
            record.consumerEvidence = targets.map((target) =>
              `Awaited local call reaches catch .message sink at ${file.path}:${target.line}`
            );
          }
        }
      }
      for (const key of Object.keys(node)) {
        if (["loc", "start", "end", "range", "raw"].includes(key)) continue;
        if (node[key] && typeof node[key] === "object") walkFunction(node[key]);
      }
    }
    walkFunction(functionNode.body);
  }
  for (const [functionName, callsites] of awaitedCallTargets) {
    const functionNode = functions.get(functionName);
    if (functionNode && callsites.length === 1) {
      linkAwaitedFunctionErrors(functionNode, callsites[0]);
    }
  }
}

function optionLabelNodes(node, path = [], output = []) {
  if (!node || node.type !== "ArrayExpression") return output;
  for (let index = 0; index < node.elements.length; index += 1) {
    const item = node.elements[index];
    if (item?.type !== "ArrayExpression") continue;
    if (item.elements.length > 1 && fullyStatic(item.elements[1]) !== null) {
      staticStringNodes(item.elements[1], [...path, `[${index}]`, "label"], output);
    } else {
      optionLabelNodes(item, [...path, `[${index}]`], output);
    }
  }
  return output;
}

function callbackWritesParameterAsText(node, parameterName) {
  if (!node || typeof node !== "object") return false;
  if (Array.isArray(node)) return node.some((child) => callbackWritesParameterAsText(child, parameterName));
  if (
    node.type === "AssignmentExpression"
    && textProperties.has(memberName(node.left))
    && referencedIdentifierNames(node.right).has(parameterName)
  ) return true;
  for (const key of Object.keys(node)) {
    if (["loc", "start", "end", "range", "raw"].includes(key)) continue;
    if (callbackWritesParameterAsText(node[key], parameterName)) return true;
  }
  return false;
}

function textBoundTupleSlot(callback) {
  const pattern = callback?.params?.[0];
  if (pattern?.type !== "ArrayPattern") return null;
  const usedSlots = [];
  pattern.elements.forEach((element, index) => {
    if (element?.type === "Identifier" && callbackWritesParameterAsText(callback.body, element.name)) {
      usedSlots.push(index);
    }
  });
  return usedSlots.length === 1 ? usedSlots[0] : null;
}

function referencedIdentifierNames(node, names = new Set()) {
  if (!node || typeof node !== "object") return names;
  if (Array.isArray(node)) {
    for (const child of node) referencedIdentifierNames(child, names);
    return names;
  }
  if (node.type === "Identifier") {
    names.add(node.name);
    return names;
  }
  if (node.type === "MemberExpression") {
    referencedIdentifierNames(node.object, names);
    return names;
  }
  if (node.type === "Property") {
    referencedIdentifierNames(node.value, names);
    return names;
  }
  for (const key of Object.keys(node)) {
    if (["loc", "start", "end", "range", "raw", "key"].includes(key)) continue;
    const child = node[key];
    if (child && typeof child === "object") referencedIdentifierNames(child, names);
  }
  return names;
}

function boundIdentifiers(pattern, names = []) {
  if (!pattern) return names;
  if (pattern.type === "Identifier") names.push(pattern.name);
  else if (pattern.type === "RestElement") boundIdentifiers(pattern.argument, names);
  else if (pattern.type === "AssignmentPattern") boundIdentifiers(pattern.left, names);
  else if (pattern.type === "ArrayPattern") pattern.elements.forEach((item) => boundIdentifiers(item, names));
  else if (pattern.type === "ObjectPattern") pattern.properties.forEach((item) => {
    boundIdentifiers(item.type === "RestElement" ? item.argument : item.value, names);
  });
  return names;
}

function collectConstants(ast) {
  const declarations = [];
  const loops = [];
  const scopedBindings = [];
  function collect(node) {
    if (!node || typeof node !== "object") return;
    if (Array.isArray(node)) {
      node.forEach(collect);
      return;
    }
    if (node.type === "VariableDeclaration") {
      declarations.push(...node.declarations.map((declaration) => ({ declaration, kind: node.kind })));
    }
    if (["FunctionDeclaration", "FunctionExpression", "ArrowFunctionExpression"].includes(node.type)) {
      for (const parameter of node.params) scopedBindings.push(...boundIdentifiers(parameter));
    }
    if (node.type === "CatchClause" && node.param) scopedBindings.push(...boundIdentifiers(node.param));
    if (node.type === "ForOfStatement" || node.type === "ForInStatement") loops.push(node);
    for (const key of Object.keys(node)) {
      if (["loc", "start", "end", "range", "raw"].includes(key)) continue;
      if (node[key] && typeof node[key] === "object") collect(node[key]);
    }
  }
  collect(ast);

  const nameCounts = new Map();
  for (const { declaration } of declarations) {
    for (const name of boundIdentifiers(declaration.id)) {
      nameCounts.set(name, (nameCounts.get(name) || 0) + 1);
    }
  }
  for (const name of scopedBindings) nameCounts.set(name, (nameCounts.get(name) || 0) + 1);

  const values = new Map();
  function add(name, items) {
    if (!items.length || nameCounts.get(name) !== 1) return;
    const merged = [...new Set([...(values.get(name) || []), ...items].filter((item) => item.trim()))];
    if (merged.length <= 120) values.set(name, merged);
  }
  for (const { declaration } of declarations) {
    const directValues = staticStringLeaves(declaration.init);
    boundIdentifiers(declaration.id).forEach((name) => add(name, directValues));
  }
  for (const { declaration } of declarations) {
    if (declaration.id.type === "Identifier") continue;
    const names = boundIdentifiers(declaration.id);
    const sourceValues = [...referencedIdentifierNames(declaration.init)]
      .flatMap((name) => values.get(name) || []);
    names.forEach((name) => add(name, sourceValues));
  }
  for (const loop of loops) {
    if (loop.left.type !== "VariableDeclaration") continue;
    const names = loop.left.declarations.flatMap((item) => boundIdentifiers(item.id));
    const sourceValues = [...referencedIdentifierNames(loop.right)]
      .flatMap((name) => values.get(name) || []);
    names.forEach((name) => add(name, sourceValues));
  }
  const constantIdentifiers = new Set(declarations
    .filter(({ declaration, kind }) => kind === "const" && declaration.id.type === "Identifier")
    .map(({ declaration }) => declaration.id.name)
    .filter((name) => nameCounts.get(name) === 1 && values.has(name)));
  return { values, constantIdentifiers };
}

function collectStyleVariables(ast) {
  const names = new Set();
  function visit(node) {
    if (!node || typeof node !== "object") return;
    if (Array.isArray(node)) {
      node.forEach(visit);
      return;
    }
    if (
      node.type === "VariableDeclarator"
      && node.id.type === "Identifier"
      && node.init?.type === "CallExpression"
      && calleeName(node.init.callee) === "createElement"
      && node.init.arguments[0]?.type === "Literal"
      && String(node.init.arguments[0].value).toLowerCase() === "style"
    ) {
      names.add(node.id.name);
    }
    for (const key of Object.keys(node)) {
      if (["loc", "start", "end", "range", "raw"].includes(key)) continue;
      if (node[key] && typeof node[key] === "object") visit(node[key]);
    }
  }
  visit(ast);
  return names;
}

function isMarkupOnly(value) {
  return value !== null && value.replace(/<[^>]*>/g, "").replace(/&nbsp;/gi, " ").trim() === "";
}

function hasWordCharacter(value) {
  return /[\p{L}\p{N}]/u.test(value);
}

function addExcluded(file, node, sink, reason) {
  const location = node.loc?.start || { line: 1, column: 0 };
  excludedSinks.push({
    source: file.path,
    line: location.line + (file.lineOffset || 0),
    column: location.column + 1 + (location.line === 1 ? (file.columnOffset || 0) : 0),
    kind: "javascript-excluded-sink",
    sink,
    reason,
  });
}

function hintForSink(sink, attribute, expression, identifiers, parts, value) {
  const hints = [];
  const attr = String(attribute || "").toLowerCase();
  if (ariaReferenceAttributes.has(attr)) hints.push("non-translatable-reference");
  else if (ariaTextAttributes.has(attr) || attr === "alt") hints.push("accessibility-text");
  else if (plainTextAttributes.has(attr) || sink.includes("text") || sink.startsWith("helper:") || sink.startsWith("native-dialog:")) hints.push("visible-or-accessible-ui");
  else hints.push("review-consumer");
  if (sink.startsWith("css-generated-content:")) hints.push("visible-text-through-css-attribute");
  if (/(catalog|config|settings|stage|group|section|entity|product|service|dataset|module|item)/i.test([...identifiers].join(" "))) {
    hints.push("possible-product-or-v5-content");
  }
  if (/(error|diagnostic|validation|failure)/i.test([...identifiers].join(" "))) hints.push("possible-diagnostic");
  if (sink.includes("innerHTML") || sink.includes("insertAdjacentHTML")) hints.push("markup-needs-text-review");
  if (parts.length && !parts.some(hasWordCharacter)) {
    hints.push(value !== null || identifiers.size === 0 ? "symbol-or-icon" : "punctuation-in-dynamic-text");
  }
  return [...new Set(hints)];
}

function addEntry(file, node, sink, valueNode, attribute = null, assignmentOperator = null, targetNode = null) {
  const expression = sourceOf(valueNode, file.source);
  let value = fullyStatic(valueNode);
  const identifiers = referencedIdentifierNames(valueNode);
  const constantParts = [...identifiers].flatMap((name) => file.constantValues.get(name) || []);
  if (
    value === null
    && valueNode?.type === "Identifier"
    && file.constantIdentifiers.has(valueNode.name)
    && constantParts.length === 1
  ) {
    value = constantParts[0];
  }
  const literalSegments = [...new Set(literalParts(valueNode))];
  const constantCandidates = [...new Set(constantParts)];
  const reviewParts = [...new Set([...literalSegments, ...constantCandidates])];
  if (
    sink.startsWith("property:")
    && ["textContent", "innerText", "innerHTML"].includes(sink.slice("property:".length))
    && file.styleVariables.has(objectName(targetNode || node.left))
  ) {
    addExcluded(file, node, sink, "style-element-content");
    return;
  }
  if (sink.includes("innerHTML") && isMarkupOnly(value)) {
    addExcluded(file, node, sink, "static-markup-without-text");
    return;
  }
  if (value !== null && !value.trim()) {
    addExcluded(file, node, sink, value.length === 0 ? "empty-value-clears-sink" : "whitespace-only-sink-content");
    return;
  }
  if (value === null && reviewParts.length === 0 && !expression.trim()) return;
  const location = node.loc?.start || valueNode?.loc?.start || { line: 1, column: 0 };
  const line = location.line + (file.lineOffset || 0);
  let column = location.column + 1;
  if (location.line === 1) column += file.columnOffset || 0;
  const entry = {
    source: file.path,
    line,
    column,
    kind: "javascript-sink",
    sink,
    attribute,
    expression,
    value,
    literalSegments,
    constantCandidates,
    classification: "unreviewed",
    classificationHints: hintForSink(sink, attribute, expression, identifiers, reviewParts, value),
  };
  if (assignmentOperator && assignmentOperator !== "=") entry.assignmentOperator = assignmentOperator;
  entries.push(entry);
}

function visit(node, file) {
  if (!node || typeof node !== "object") return;
  if (Array.isArray(node)) {
    for (const child of node) visit(child, file);
    return;
  }
  if (node.type === "ImportDeclaration" && node.source?.type === "Literal") {
    importEdges.push({ source: file.path, specifier: node.source.value, kind: "static-import" });
  } else if (
    (node.type === "ExportNamedDeclaration" || node.type === "ExportAllDeclaration")
    && node.source?.type === "Literal"
  ) {
    importEdges.push({ source: file.path, specifier: node.source.value, kind: "re-export" });
  } else if (node.type === "ImportExpression" && node.source?.type === "Literal") {
    importEdges.push({ source: file.path, specifier: node.source.value, kind: "dynamic-import" });
  }

  if (node.type === "AssignmentExpression") {
    const property = memberName(node.left);
    if (property === "compactLabel" && memberName(node.left.object) === "dataset") {
      addEntry(file, node, "css-generated-content:data-compact-label", node.right, "data-compact-label", node.operator);
    } else if (property && textProperties.has(property)) {
      const attribute = propertyAttributes.get(property)
        || property.replace(/[A-Z]/g, (letter) => "-" + letter.toLowerCase());
      addEntry(file, node, "property:" + property, node.right, attribute, node.operator);
    }
  }

  if (node.type === "CallExpression") {
    const name = calleeName(node.callee);
    if (
      name === "assign"
      && node.callee.type === "MemberExpression"
      && node.callee.object.type === "Identifier"
      && node.callee.object.name === "Object"
    ) {
      const targetNode = node.arguments[0];
      for (const sourceNode of node.arguments.slice(1)) {
        if (sourceNode?.type !== "ObjectExpression") continue;
        for (const propertyNode of sourceNode.properties) {
          if (propertyNode.type !== "Property" || propertyNode.computed) continue;
          const property = propertyNode.key.type === "Identifier"
            ? propertyNode.key.name
            : propertyNode.key.type === "Literal"
              ? String(propertyNode.key.value)
              : null;
          if (!property || !textProperties.has(property)) continue;
          const attribute = propertyAttributes.get(property)
            || property.replace(/[A-Z]/g, (letter) => "-" + letter.toLowerCase());
          addEntry(file, propertyNode, "property:" + property, propertyNode.value, attribute, null, targetNode);
        }
      }
    } else if (name === "setAttribute" || name === "setAttributeNS") {
      const attributeArgumentIndex = name === "setAttributeNS" ? 1 : 0;
      const valueArgumentIndex = name === "setAttributeNS" ? 2 : 1;
      const attribute = node.arguments[attributeArgumentIndex]?.type === "Literal"
        ? String(node.arguments[attributeArgumentIndex].value).toLowerCase()
        : null;
      const recognized = attribute && (
        ariaTextAttributes.has(attribute) || ariaReferenceAttributes.has(attribute)
        || plainTextAttributes.has(attribute) || attribute === "value"
      );
      if (recognized && node.arguments[valueArgumentIndex]) {
        addEntry(file, node, "call:" + name, node.arguments[valueArgumentIndex], attribute);
      } else if (!attribute && node.arguments[valueArgumentIndex]) {
        addEntry(file, node, "call:" + name + ":dynamic-attribute", node.arguments[valueArgumentIndex], null);
      }
    } else if (name === "createTextNode" && node.arguments[0]) {
      addEntry(file, node, "call:createTextNode", node.arguments[0]);
    } else if (name === "insertAdjacentHTML" && node.arguments[1]) {
      addEntry(file, node, "call:insertAdjacentHTML", node.arguments[1]);
    } else if (name === "insertAdjacentText" && node.arguments[1]) {
      addEntry(file, node, "call:insertAdjacentText", node.arguments[1]);
    } else if (["alert", "confirm", "prompt"].includes(name) && node.arguments[0]) {
      addEntry(file, node, "native-dialog:" + name, node.arguments[0]);
      if (name === "prompt" && node.arguments[1]) {
        addEntry(file, node, "native-dialog:prompt-default", node.arguments[1]);
      }
    } else if (["append", "prepend", "replaceChildren"].includes(name)) {
      for (const argument of node.arguments) {
        const directString = argument?.type === "Literal" && typeof argument.value === "string"
          || argument?.type === "TemplateLiteral"
          || argument?.type === "BinaryExpression" && argument.operator === "+" && literalParts(argument).length > 0
          || argument?.type === "Identifier" && file.constantIdentifiers.has(argument.name)
            && (file.constantValues.get(argument.name) || []).length > 0;
        if (directString) addEntry(file, node, "call:" + name, argument);
      }
    } else if (messageHelpers.has(name)) {
      for (const index of messageHelpers.get(name)) {
        const message = node.arguments[index];
        if (message) addEntry(file, node, "helper:" + name, message);
      }
    } else if (name === "require" && node.arguments[0]?.type === "Literal") {
      importEdges.push({ source: file.path, specifier: node.arguments[0].value, kind: "commonjs-require" });
    }
  }

  for (const key of Object.keys(node)) {
    if (["loc", "start", "end", "range", "raw"].includes(key)) continue;
    const child = node[key];
    if (child && typeof child === "object") visit(child, file);
  }
}

for (const file of input.files || []) {
  let ast = null;
  try {
    ast = parse(file.source, {
      ecmaVersion: "latest", sourceType: "module", locations: true, allowHashBang: true,
    });
  } catch (moduleError) {
    try {
      ast = parse(file.source, {
        ecmaVersion: "latest", sourceType: "script", locations: true,
        allowHashBang: true, allowReturnOutsideFunction: true,
      });
    } catch (scriptError) {
      parseErrors.push({
        source: file.path,
        line: (scriptError.loc?.line || moduleError.loc?.line || 1) + (file.lineOffset || 0),
        message: scriptError.message,
      });
    }
  }
  if (ast) {
    const constants = collectConstants(ast);
    file.constantValues = constants.values;
    file.constantIdentifiers = constants.constantIdentifiers;
    file.styleVariables = collectStyleVariables(ast);
    visit(ast, file);
    visitSources(ast, file);
    linkSameTryCatchSources(ast, file);
  }
}

process.stdout.write(JSON.stringify({ entries, sourceEntries, importEdges, parseErrors, excludedSinks }));
