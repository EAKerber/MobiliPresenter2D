(function registerAuthorizedBootstrap(global) {
  "use strict";

  // CP-PUBLIC-03a2-0: HTTP success is necessary, but not sufficient:
  // the caller must validate/apply the response before the UI is unlocked.
  const STATES = Object.freeze(["loading", "ready", "unauthorized", "forbidden", "invalid", "unavailable"]);
  function classifyStatus(status) {
    if (status === 401) return "unauthorized";
    if (status === 403) return "forbidden";
    if (status === 429 || status >= 500) return "unavailable";
    return "invalid";
  }
  function validPayload(value) {
    return value !== null && typeof value === "object" && !Array.isArray(value)
      && typeof value.schemaVersion === "string";
  }
  async function load({ request, apply, transition }) {
    if (typeof request !== "function" || typeof apply !== "function"
      || typeof transition !== "function") throw new TypeError("bootstrap callbacks required");
    transition("loading");
    let response;
    try {
      response = await request();
    } catch {
      transition("unavailable");
      return { ok: false, state: "unavailable" };
    }
    if (!response || response.ok !== true) {
      const state = classifyStatus(Number(response?.status) || 0);
      transition(state);
      return { ok: false, state };
    }
    let published;
    try {
      published = await response.json();
      if (!validPayload(published)) throw new TypeError("invalid published configuration");
      const applied = await apply(published);
      if (applied === false) throw new TypeError("configuration application rejected");
    } catch {
      transition("invalid");
      return { ok: false, state: "invalid" };
    }
    transition("ready");
    return { ok: true, state: "ready" };
  }
  const api = Object.freeze({ STATES, classifyStatus, validPayload, load });
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  if (global && typeof global === "object") global.CasaModulesAuthorizedBootstrap = api;
})(typeof globalThis === "undefined" ? this : globalThis);
