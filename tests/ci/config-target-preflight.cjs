"use strict";

function fail(code, message) {
  const error = new Error(code + ": " + message);
  error.code = code;
  throw error;
}

function requireConfiguratorTarget(value, variable) {
  if (!value) fail("CONFIG_TARGET_REQUIRED", "set " + variable + " to an explicit /config/ URL");
  let url;
  try { url = new URL(value); }
  catch { fail("CONFIG_TARGET_INVALID", "expected an absolute HTTP(S) /config/ URL"); }
  if (!["http:", "https:"].includes(url.protocol) || !["/config", "/config/"].includes(url.pathname))
    fail("CONFIG_TARGET_INVALID", "expected an absolute HTTP(S) /config/ URL");
  return url.href;
}

function assertConfiguratorResponse(current, status) {
  if (status === 401 || status === 403)
    fail("CONFIG_AUTH_REQUIRED", "the Configurator request was not authorized");
  let url;
  try { url = new URL(current); }
  catch { fail("CONFIG_ROUTE_MISMATCH", "browser did not reach the Configurator"); }
  if (url.pathname === "/access" || url.pathname.startsWith("/access/"))
    fail("CONFIG_AUTH_REQUIRED", "the Configurator redirected to access confirmation");
  if (!["/config", "/config/"].includes(url.pathname))
    fail("CONFIG_ROUTE_MISMATCH", "browser did not reach the Configurator route");
  if (Number.isInteger(status) && status >= 400)
    fail("CONFIG_HTTP_FAILURE", "the Configurator request returned HTTP " + status);
}

function isPreflightError(error) {
  return typeof error?.code === "string" && error.code.startsWith("CONFIG_");
}

async function requirePublishedV5(page, required) {
  if (!required) return;
  try {
    await page.waitForFunction(() => document.documentElement.dataset.publishedConfigurationStatus === "validated",
      null, {timeout:30000});
  } catch {
    fail("CONFIG_BOOTSTRAP_UNVERIFIED", "the published V5 configuration was not validated");
  }
}

module.exports = {requireConfiguratorTarget, assertConfiguratorResponse, isPreflightError, requirePublishedV5};
