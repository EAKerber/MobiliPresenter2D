"use strict";
const assert = require("node:assert/strict");
const test = require("node:test");
const {requireConfiguratorTarget, assertConfiguratorResponse, isPreflightError, requirePublishedV5} = require("./config-target-preflight.cjs");

test("a configurator suite requires an explicit HTTP(S) Configurator route", () => {
  assert.equal(requireConfiguratorTarget("http://127.0.0.1:8123/config/", "FLOW_LAYOUT_URL"), "http://127.0.0.1:8123/config/");
  assert.equal(requireConfiguratorTarget("https://preview.example/config/?mode=light", "FLOW_LAYOUT_URL"), "https://preview.example/config/?mode=light");
  for (const target of [undefined, "", "file:///app/index.html", "https://preview.example/", "https://preview.example/viewer/"]) {
    assert.throws(() => requireConfiguratorTarget(target, "FLOW_LAYOUT_URL"), error => isPreflightError(error));
  }
});

test("required published bootstrap gets a distinct diagnostic; optional runs do not wait", async () => {
  let calls = 0;
  const page = {waitForFunction: async () => {calls++; throw new Error("sensitive provider detail");}};
  await requirePublishedV5(page, false);
  assert.equal(calls, 0);
  await assert.rejects(requirePublishedV5(page, true), error =>
    error.code === "CONFIG_BOOTSTRAP_UNVERIFIED" && !error.message.includes("provider detail"));
  assert.equal(calls, 1);
  await requirePublishedV5({waitForFunction: async () => true}, true);
});

test("authentication, wrong route and HTTP failures are distinguished without exposing the URL", () => {
  assert.doesNotThrow(() => assertConfiguratorResponse("https://preview.example/config/", 200));
  for (const [url, status, code] of [
    ["https://preview.example/access/?token=secret", 200, "CONFIG_AUTH_REQUIRED"],
    ["https://preview.example/config/", 403, "CONFIG_AUTH_REQUIRED"],
    ["https://preview.example/", 200, "CONFIG_ROUTE_MISMATCH"],
    ["https://preview.example/config/", 503, "CONFIG_HTTP_FAILURE"]
  ]) {
    assert.throws(() => assertConfiguratorResponse(url, status), error =>
      error.code === code && !error.message.includes("secret") && !error.message.includes("preview.example"));
  }
});
