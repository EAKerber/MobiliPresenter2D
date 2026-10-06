(function registerLayoutProfiles(global) {
  "use strict";

  const SCHEMA = "ConfiguratorLayoutProfiles2D 1.0";
  const PROFILES = Object.freeze(["side-rail", "stacked", "compact"]);
  const COMPACT_MAX = 700;
  const STACKED_MAX = 1050;

  function profileForWidth(width) {
    const value = Number(width);
    if (!Number.isFinite(value) || value < 0) throw new TypeError("viewport width must be a finite non-negative number");
    if (value <= COMPACT_MAX) return "compact";
    if (value <= STACKED_MAX) return "stacked";
    return "side-rail";
  }

  function assertProfile(profile) {
    if (!PROFILES.includes(profile)) throw new TypeError(`unsupported layout profile: ${profile || "(empty)"}`);
    return profile;
  }

  const api = Object.freeze({
    SCHEMA,
    PROFILES,
    COMPACT_MAX,
    STACKED_MAX,
    profileForWidth,
    assertProfile
  });

  if (typeof module !== "undefined" && module.exports) module.exports = api;
  if (global && typeof global === "object") global.CasaModulesLayoutProfiles = api;
})(typeof globalThis === "undefined" ? this : globalThis);
