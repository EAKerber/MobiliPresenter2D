"use strict";
const assert = require("node:assert/strict");

module.exports = function assertLocalV5Url(value) {
  let url;
  try { url = new URL(value); }
  catch { assert.fail("LOCAL_ONLY_TARGET_REQUIRED: expected an absolute loopback V5 URL"); }
  assert.equal(url.protocol, "http:", "local V5 fixture must use HTTP");
  assert.equal(url.hostname, "127.0.0.1", "local V5 fixture must stay on loopback");
  assert(Number(url.port) >= 1 && Number(url.port) <= 65535, "local V5 fixture must use an explicit valid port");
  assert.equal(url.pathname, "/config/", "local V5 fixture must target the Configurator route");
  assert.equal(url.search, "", "local V5 fixture URL cannot carry query parameters");
  assert.equal(url.hash, "", "local V5 fixture URL cannot carry a fragment");
  return url.href;
};
