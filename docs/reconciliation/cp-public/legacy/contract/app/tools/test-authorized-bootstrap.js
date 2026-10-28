"use strict";
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const bootstrap = require("../core/authorized-bootstrap.js");

async function main() {
  const cases = [
    [401, "unauthorized"], [403, "forbidden"], [404, "invalid"],
    [409, "invalid"], [422, "invalid"], [429, "unavailable"],
    [500, "unavailable"], [503, "unavailable"]
  ];
  for (const [status, expected] of cases) {
    const transitions = [], applyCalls = [];
    const result = await bootstrap.load({
      request: async () => ({ ok: false, status }),
      apply: async value => { applyCalls.push(value); },
      transition: state => transitions.push(state)
    });
    assert.deepEqual(result, { ok: false, state: expected });
    assert.deepEqual(transitions, ["loading", expected]);
    assert.deepEqual(applyCalls, [], "HTTP failure must never apply defaults or body");
  }
  const failedFetch = [], applied = [];
  const outage = await bootstrap.load({
    request: async () => { throw Error("network/timeout"); },
    apply: value => applied.push(value),
    transition: state => failedFetch.push(state)
  });
  assert.deepEqual(outage, { ok: false, state: "unavailable" });
  assert.deepEqual(failedFetch, ["loading", "unavailable"]);
  assert.deepEqual(applied, []);

  for (const invalidValue of [null, [], "not an object", {}, { schemaVersion: null }]) {
    const transitions = [];
    const result = await bootstrap.load({
      request: async () => ({ ok: true, status: 200, json: async () => invalidValue }),
      apply: () => { throw Error("must not be called"); },
      transition: state => transitions.push(state)
    });
    assert.equal(result.state, "invalid");
    assert.deepEqual(transitions, ["loading", "invalid"]);
  }
  const failedApply = [];
  const invalidApply = await bootstrap.load({
    request: async () => ({ ok: true, json: async () => ({ schemaVersion: "v5" }) }),
    apply: () => { throw Error("bad schema/invalid publication"); },
    transition: state => failedApply.push(state)
  });
  assert.equal(invalidApply.state, "invalid");
  assert.deepEqual(failedApply, ["loading", "invalid"]);
  const rejected = await bootstrap.load({
    request: async () => ({ ok: true, json: async () => ({ schemaVersion: "v5" }) }),
    apply: () => false,
    transition: () => {}
  });
  assert.equal(rejected.state, "invalid");

  const success = [];
  let appliedValue;
  const ready = await bootstrap.load({
    request: async () => ({ ok: true, status: 200, json: async () => ({ schemaVersion: "v5", title: "approved" }) }),
    apply: value => { appliedValue = value; },
    transition: state => success.push(state)
  });
  assert.deepEqual(ready, { ok: true, state: "ready" });
  assert.deepEqual(success, ["loading", "ready"]);
  assert.equal(appliedValue.title, "approved");

  const html = fs.readFileSync(path.join(__dirname, "../index.html"), "utf8");
  const stylesheet = fs.readFileSync(path.join(__dirname, "../styles.css"), "utf8");
  const script = fs.readFileSync(path.join(__dirname, "../app.js"), "utf8");
  assert.match(html, /<html[^>]+data-configuration-access-state="loading"/);
  assert.match(html, /<main class="workspace" hidden inert>/);
  assert.match(html, /id="restoreButton"[^>]+disabled/);
  assert(html.indexOf('src="core/authorized-bootstrap.js') < html.indexOf('src="app.js'));
  assert.match(stylesheet, /\.workspace\[hidden\]/);
  assert(!script.includes("Continue legacy offline/empty-server resilience"),
    "HTTP failure cannot silently continue with defaults");
  assert.match(script, /global\.location\?\.protocol === "file:"/);
  console.log("CP-PUBLIC-03a2-0 fail-closed bootstrap states, HTTP errors and first-paint lock: PASS");
}
main().catch(error => { console.error(error); process.exitCode = 1; });
