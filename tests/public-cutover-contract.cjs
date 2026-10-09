"use strict";
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const root = path.resolve(__dirname, "..");
const read = p => fs.readFileSync(path.join(root,p), "utf8");
const landing = read("app/index.html");
const config = read("app/config/index.html");
const viewer = read("app/viewer/index.html");
const viewerJS = read("app/viewer/viewer.js");
const toml = read("netlify.toml");
assert.match(landing,/id="environmentTrack"/);
assert.match(landing,/<base href="\/landing\/">/);
assert.match(landing,/href="\/#ambientes"/);
assert.match(landing,/href="\/viewer\/"/);
assert.doesNotMatch(landing,/src="app.js|id="sceneLayers"/);
assert.match(config, /<base href="\/"\s*\/?>/);
assert.match(config,/src="app.js\?/);
assert.match(config,/class="workspace"/);
assert.doesNotMatch(config,/core\/authorized-bootstrap\.js/);
assert.match(viewer,/src="viewer.js/);
assert.match(viewer,/href="\/"/);
assert.match(viewerJS,/CASA_PUBLIC_VIEWER_DATA\.load\(\)/);
assert.doesNotMatch(viewerJS,/if \(integration\.usePublishedApi === true\)/);
assert.doesNotMatch(viewerJS,/else\s*\{\s*start\(\);/);
assert.match(toml,/from = "\/api\/public-modules"/);
for(const banned of ["netlify/plugins/cp-public-02c-preview/index.js",
  "scripts/seed-public-preview-v5.cjs","netlify/lib/buyer-session-postgres.cjs"]) {
  assert.equal(fs.existsSync(path.join(root,banned)), false, banned+" must never be released");
}
const rawApi=read("netlify/functions/configuration.mjs");
assert.match(rawApi,/request.method === "GET"/);
assert.match(rawApi,/getUser\(\)/);
console.log("CP-PUBLIC-04a static route, public interim boundaries, no preview seed: PASS");
