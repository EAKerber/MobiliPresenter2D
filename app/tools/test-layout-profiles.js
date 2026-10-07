const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const projectRoot = path.resolve(__dirname, "..");
const profiles = require(path.join(projectRoot, "core/layout-profiles.js"));

assert.equal(profiles.SCHEMA, "ConfiguratorLayoutProfiles2D 1.0");
assert.deepEqual(profiles.PROFILES, ["side-rail", "stacked", "compact"]);
assert.equal(profiles.COMPACT_MAX, 700);
assert.equal(profiles.STACKED_MAX, 1050);

assert.equal(profiles.profileForWidth(0), "compact");
assert.equal(profiles.profileForWidth(700), "compact");
assert.equal(profiles.profileForWidth(701), "stacked");
assert.equal(profiles.profileForWidth(1050), "stacked");
assert.equal(profiles.profileForWidth(1051), "side-rail");
assert.equal(profiles.profileForWidth(1920), "side-rail");
assert.equal(profiles.assertProfile("stacked"), "stacked");
assert.throws(() => profiles.profileForWidth(-1), /finite non-negative/);
assert.throws(() => profiles.profileForWidth(Number.NaN), /finite non-negative/);
assert.throws(() => profiles.assertProfile("tablet"), /unsupported layout profile/);

// CP-SD-03A2 makes named profiles the application-topology authority.
// Local component/PiP rules may still use narrow media queries, but workspace
// topology must no longer duplicate the 1050/701 application breakpoints.
const css = fs.readFileSync(path.join(projectRoot, "styles.css"), "utf8");
assert.equal(css.includes("@media (max-width: " + profiles.STACKED_MAX + "px)"), false);
assert.equal(css.includes("@media (min-width: " + (profiles.COMPACT_MAX + 1) + "px) and (max-width: " + profiles.STACKED_MAX + "px)"), false);
assert.equal(css.includes("@media (min-width: " + (profiles.STACKED_MAX + 1) + "px)"), false);
profiles.PROFILES.forEach((profile) => {
  assert.equal(css.includes('html[data-layout-profile="' + profile + '"]'), true, `missing application topology selector for ${profile}`);
});
assert.equal(css.includes("@media (max-width: " + profiles.COMPACT_MAX + "px)"), true, "compact-width media remains only for local component/PiP behavior");

console.log("layout profiles: PASS");
