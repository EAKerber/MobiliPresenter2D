const fail = (message) => { throw new Error("VIS-002C lifecycle: " + message); };
const isSha = (value) => typeof value === "string" && /^[0-9a-f]{40}$/i.test(value);
const cssRgb = (hex) => {
  if (!/^#[0-9a-f]{6}$/i.test(hex || "")) return null;
  const parts = [1, 3, 5].map((start) => Number.parseInt(hex.slice(start, start + 2), 16));
  return "rgb(" + parts.join(", ") + ")";
};

export function validateVis002cPinLifecycle(pin, {
  environment = "unknown",
  consumerImported = false,
  manifest = null,
  mappingContexts = []
} = {}) {
  if (pin?.status === "REFERENCE_ONLY") {
    if (pin.runtimeStatus !== "NOT_INTEGRATED") fail("reference-only state needs NOT_INTEGRATED");
    if (environment === "production" || consumerImported) fail("reference-only artifact cannot be a runtime consumer");
    if (pin.runtimeAuthorization || pin.runtimeVerification) fail("reference-only artifact cannot carry runtime authorization evidence");
    return "reference-only";
  }

  if (pin?.status === "SCOPED_INTEGRATION_CANDIDATE_NOT_RELEASED") {
    if (!["PREVIEW_PENDING", "PREVIEW_VERIFIED"].includes(pin.runtimeStatus)) {
      fail("candidate state needs a pending or verified preview status");
    }
    if (environment === "production" || pin.runtimeVerification?.environment === "production") {
      fail("candidate state cannot claim Production");
    }
    return "candidate";
  }

  if (pin?.status !== "SCOPED_RUNTIME_AUTHORIZED_AND_RELEASED") {
    fail("unknown or missing lifecycle status");
  }
  if (pin.runtimeStatus !== "PRODUCTION_VERIFIED") fail("authorized runtime state needs PRODUCTION_VERIFIED");
  if (environment !== "production") fail("authorized runtime state must be checked against Production");
  if (!consumerImported) fail("authorized runtime state needs a real consumer import");
  if (manifest?.constraints?.visualChangeAuthorized !== true) fail("the scoped manifest authorization is missing");
  if (pin.runtimeAuthorization?.status !== "authorized") fail("explicit runtime authorization receipt is missing");
  if (pin.runtimeAuthorization?.sourceDecision !== "VIS-002") fail("runtime authorization must point to VIS-002");
  if (pin.runtimeAuthorization?.decisionGitBlob !== pin.designSystem?.decisionGitBlob) {
    fail("runtime authorization does not match the pinned Design System decision");
  }
  if (pin.runtimeAuthorization?.visualChangeAuthorized !== true) fail("runtime authorization must be scoped by the manifest");
  const ds = pin.runtimeAuthorization?.designSystemIntegration;
  const product = pin.runtimeAuthorization?.productIntegration;
  if (ds?.repository !== pin.designSystem?.repository || ds?.state !== "merged" || ds?.pullRequest !== 52 ||
      ds?.sourceCommit !== pin.designSystem?.sourceCommit || !isSha(ds?.mergeCommit)) {
    fail("the Design System integration receipt is incomplete");
  }
  if (product?.repository !== "EAKerber/MobiliPresenter2D" || product?.state !== "merged" ||
      product?.pullRequest !== 241 || !isSha(product?.mergeCommit)) {
    fail("the Product integration receipt is incomplete");
  }
  const runtime = pin.runtimeVerification;
  if (runtime?.environment !== "production" || runtime?.deployState !== "ready" ||
      runtime?.siteUrl !== "https://casaemmodulos.casa" || !runtime?.deployId ||
      !isSha(runtime?.deployedProductCommit) || !/^\d{4}-\d{2}-\d{2}$/.test(runtime?.observedAt || "")) {
    fail("the Production deployment readback is incomplete");
  }
  if (runtime.theme !== "light" || runtime.tokenValue !== manifest.value ||
      runtime.computedColor !== cssRgb(manifest.value)) {
    fail("the observed runtime color does not match the scoped manifest");
  }
  if (runtime.contexts?.length !== mappingContexts.length || mappingContexts.length !== pin.allowedSelectorsCount) {
    fail("runtime readback must cover every mapped context");
  }
  const expected = new Set(mappingContexts.map((item) => item.route + "|" + item.selector));
  const actual = runtime.contexts.map((item) => item.route + "|" + item.selector);
  if (new Set(actual).size !== actual.length || actual.some((item) => !expected.has(item))) {
    fail("runtime readback contains missing, duplicate, or out-of-scope contexts");
  }
  if (runtime.contexts.some((item) => item.computedColor !== runtime.computedColor)) {
    fail("runtime contexts do not share the verified computed color");
  }
  return "runtime-authorized";
}
