import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import * as policy from "../../netlify/access/identity-policy.mjs";
import { cookieValue, hasSameOrigin, internalSecretMatches, jsonResponse, readJson } from "../../netlify/access/http.mjs";
import { ACCESS_COOKIE_NAME, ACCESS_TTL_SECONDS, clearSessionCookie, cookieForSession } from "../../netlify/access/tokens.mjs";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
let moduleSequence = 0;

async function loadHandler(relativePath, bindings, harness) {
  const source = await readFile(resolve(ROOT, relativePath), "utf8");
  const stripped = source.replace(/^import\s+[\s\S]*?\s+from\s+["'][^"']+["'];\s*$/gm, "");
  assert.doesNotMatch(stripped, /^\s*import\s/m, `${relativePath} imports are all injected`);
  const key = `__accessSurfaceHarness${++moduleSequence}`;
  globalThis[key] = harness;
  try {
    const prefix = `const { ${bindings.join(", ")} } = globalThis.${key};\n`;
    const url = `data:text/javascript;base64,${Buffer.from(prefix + stripped).toString("base64")}#${moduleSequence}`;
    return await import(url);
  } finally {
    delete globalThis[key];
  }
}

function request(url, method = "GET", { body, headers = {} } = {}) {
  return new Request(`https://site.test${url}`, {
    method,
    headers: { ...(body === undefined ? {} : { "content-type": "application/json", origin: "https://site.test" }), ...headers },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
}

async function result(response) {
  return { status: response.status, body: await response.json(), headers: response.headers };
}

test("Buyer authorization gate watches the endpoint, DTO projection and route mapping on push and PR", async () => {
  const workflow = (await readFile(resolve(ROOT, ".github/workflows/development-access-dto-boundary.yml"), "utf8"))
    .replace(/\r\n/g, "\n");
  const pushStart = workflow.indexOf("  push:\n");
  const pullStart = workflow.indexOf("  pull_request:\n");
  const dispatchStart = workflow.indexOf("  workflow_dispatch:\n");
  assert.ok(pushStart >= 0 && pullStart > pushStart && dispatchStart > pullStart, "workflow triggers have stable boundaries");
  const push = workflow.slice(pushStart, pullStart);
  const pullRequest = workflow.slice(pullStart, dispatchStart);
  const testedSources = [
    "netlify/functions/buyer-configuration.mjs",
    "app/core/published-buyer-projection.js",
    "netlify.toml",
  ];
  for (const source of testedSources) {
    assert.ok(push.includes(`      - '${source}'`), `push gate watches ${source}`);
    assert.ok(pullRequest.includes(`      - '${source}'`), `pull-request gate watches ${source}`);
  }

  const netlify = await readFile(resolve(ROOT, "netlify.toml"), "utf8");
  const buyerRoute = netlify.match(/\[\[redirects\]\]\s+from = "\/api\/buyer-configuration"[\s\S]*?force = true/);
  assert.ok(buyerRoute, "the Buyer endpoint has an explicit same-origin redirect");
  assert.match(buyerRoute[0], /to = "\/\.netlify\/functions\/buyer-configuration"/);

  const sessionStatus = await readFile(resolve(ROOT, "netlify/functions/access-session-status.mjs"), "utf8");
  assert.doesNotMatch(sessionStatus, /export const config\s*=\s*\{\s*path:/,
    "a custom path would disable the default function URL used by the session redirect");
  const sessionRoute = netlify.match(/\[\[redirects\]\]\s+from = "\/api\/access\/session"\s+to = "\/\.netlify\/functions\/access-session-status"\s+status = 200\s+force = true/);
  assert.ok(sessionRoute, "the session endpoint rewrite targets the function's default URL");
});

test("administrative configuration and bootstrap require admin before protected reads", async () => {
  let actor = null;
  let identityDown = false;
  let storeOpens = 0;
  let reads = 0;
  const store = {};
  const endpoint = await loadHandler("netlify/functions/configuration.mjs", [
    "getStore", "getDeployStore", "getUser", "canManageAdministration", "configCore",
    "administrationV5", "publishedReader", "v5NormalSave", "legacyStageRepair", "catalog",
    "priceBook", "scene",
  ], {
    getStore() { storeOpens += 1; return store; },
    getDeployStore() { storeOpens += 1; return store; },
    async getUser() { if (identityDown) throw new Error("identity unavailable"); return actor; },
    canManageAdministration: policy.canManageAdministration,
    configCore: {}, administrationV5: { SCHEMA: "v5" }, catalog: {}, priceBook: {}, scene: {},
    v5NormalSave: {}, legacyStageRepair: {},
    publishedReader: {
      async readRawPublished(received) { assert.equal(received, store); reads += 1; return { fixture: true }; },
      inspectPublishedRaw() { return { kind: "valid", schema: "v5", value: { safe: true } }; },
    },
  });
  const bootstrap = await loadHandler("netlify/functions/admin-bootstrap.mjs", [
    "getUser", "canManageAdministration", "jsonResponse", "priceBook",
  ], {
    async getUser() { if (identityDown) throw new Error("identity unavailable"); return actor; },
    canManageAdministration: policy.canManageAdministration,
    jsonResponse,
    priceBook: { publicFixture: true },
  });

  assert.equal((await result(await endpoint.default(request("/api/configuration"), {}))).status, 401);
  assert.equal((await result(await bootstrap.default(request("/api/admin-bootstrap")))).status, 401);
  actor = { id: "buyer-1", roles: ["buyer"] };
  assert.equal((await result(await endpoint.default(request("/api/configuration"), {}))).status, 403);
  assert.equal((await result(await bootstrap.default(request("/api/admin-bootstrap")))).status, 403);
  assert.equal(storeOpens, 0, "anonymous and Buyer denials happen before opening Blob storage");
  assert.equal(reads, 0, "denied requests never read protected configuration");

  actor = { id: "staff-1", roles: ["staff"] };
  assert.equal((await result(await endpoint.default(request("/api/configuration"), {}))).status, 403,
    "staff is not an administrator for the configuration endpoint");
  actor = { id: "admin-1", app_metadata: { roles: ["admin"] } };
  assert.deepEqual((await result(await endpoint.default(request("/api/configuration"), {}))).body, { safe: true });
  assert.deepEqual((await result(await bootstrap.default(request("/api/admin-bootstrap")))).body, {
    priceBook: { publicFixture: true },
  });
  assert.equal(storeOpens, 1);
  assert.equal(reads, 1);

  identityDown = true;
  assert.equal((await result(await endpoint.default(request("/api/configuration"), {}))).status, 503);
  assert.equal((await result(await bootstrap.default(request("/api/admin-bootstrap")))).status, 503);
  assert.equal(storeOpens, 1, "Identity failure stays fail-closed before protected reads");
});

test("grant administration enforces roles before storage and does not log email or bearer tokens", async () => {
  let actor = null;
  let listCalls = 0;
  let issueCalls = 0;
  let listFailure = false;
  let sentToken = null;
  const token = "opaque-access-fixture-token";
  const email = "private.fixture@example.test";
  const logs = [];
  const endpoint = await loadHandler("netlify/functions/access-grants.mjs", [
    "getUser", "canIssueOrRevokeGrants", "env", "hasSameOrigin", "jsonResponse", "readJson",
    "accessMailIsConfigured", "sendAccessLink", "issueGrant", "listRecentGrants", "revokeGrant",
    "ACCESS_TTL_SECONDS", "createId", "createOpaqueToken", "hashOpaqueToken", "normalizeRecipientEmail", "console",
  ], {
    async getUser() { return actor; },
    canIssueOrRevokeGrants: policy.canIssueOrRevokeGrants,
    env(name) { return name === "DATABASE_URL" ? "local-fixture" : undefined; },
    hasSameOrigin,
    jsonResponse,
    readJson,
    accessMailIsConfigured() { return true; },
    async sendAccessLink({ token: issued }) { sentToken = issued; },
    async issueGrant() { issueCalls += 1; },
    async listRecentGrants() {
      listCalls += 1;
      if (listFailure) throw Object.assign(new Error(`${email} ${token}`), { code: "08006" });
      return [];
    },
    async revokeGrant() { return true; },
    ACCESS_TTL_SECONDS,
    createId: () => "grant-fixture-id",
    createOpaqueToken: () => token,
    hashOpaqueToken: () => "hash-only",
    normalizeRecipientEmail: (value) => typeof value === "string" ? value.trim().toLowerCase() : null,
    console: {
      error(...values) { logs.push(values.join(" ")); },
      info(...values) { logs.push(values.join(" ")); },
    },
  });

  assert.equal((await result(await endpoint.default(request("/api/access/grants")))).status, 401);
  actor = { id: "buyer-1", roles: ["buyer"] };
  assert.equal((await result(await endpoint.default(request("/api/access/grants")))).status, 403);
  assert.equal(listCalls, 0);
  assert.equal(issueCalls, 0);
  actor = { id: "staff-1", roles: ["staff"] };
  assert.equal((await result(await endpoint.default(request("/api/access/grants")))).status, 200);
  assert.equal(listCalls, 1, "staff may list/revoke invitation grants by policy");
  listFailure = true;
  assert.equal((await result(await endpoint.default(request("/api/access/grants")))).status, 503);
  assert.equal(logs.join("\n").includes(token), false, "storage failures never put bearer tokens in logs");
  assert.equal(logs.join("\n").includes(email), false, "storage failures never put recipient email in logs");
  listFailure = false;

  actor = { id: "admin-1", roles: ["admin"] };
  const response = await result(await endpoint.default(request("/api/access/grants", "POST", { body: { email } })));
  assert.equal(response.status, 201);
  assert.equal(issueCalls, 1);
  assert.equal(sentToken, token, "the token reaches only the mail adapter in this local fixture");
  assert.equal(JSON.stringify(response.body).includes(token), false, "the bearer token is never returned by the grant endpoint");
  assert.equal(logs.join("\n").includes(token), false, "logs never contain the bearer token");
  assert.equal(logs.join("\n").includes(email), false, "logs never contain the recipient email");
});

test("temporary-session handlers enforce origin, expiry, logout revocation and internal secret", async () => {
  let session = null;
  let sessionError = false;
  let revoked = [];
  let redeemInput = null;
  let activeLookupCalls = 0;
  let expectedSecret = "gate-secret-fixture";
  const redeem = await loadHandler("netlify/functions/access-redeem.mjs", [
    "cookieForSession", "hasSameOrigin", "jsonResponse", "readJson", "redeemGrant",
  ], {
    cookieForSession,
    hasSameOrigin,
    jsonResponse,
    readJson,
    async redeemGrant(input) { redeemInput = input; return { ok: true, sessionToken: "session-cookie-fixture", expiresAt: new Date(Date.now() + 60_000).toISOString() }; },
  });
  const status = await loadHandler("netlify/functions/access-session-status.mjs", [
    "cookieValue", "hasSameOrigin", "jsonResponse", "findActiveSession", "ACCESS_COOKIE_NAME",
  ], {
    cookieValue,
    hasSameOrigin,
    jsonResponse,
    async findActiveSession(token) { activeLookupCalls += 1; if (sessionError) throw new Error("store offline"); return token === "valid-session" ? session : null; },
    ACCESS_COOKIE_NAME,
  });
  const logout = await loadHandler("netlify/functions/access-session-logout.mjs", [
    "cookieValue", "hasSameOrigin", "jsonResponse", "revokeSession", "ACCESS_COOKIE_NAME", "clearSessionCookie",
  ], {
    cookieValue,
    hasSameOrigin,
    jsonResponse,
    async revokeSession(token) { if (sessionError) throw new Error("store offline"); revoked.push(token); },
    ACCESS_COOKIE_NAME,
    clearSessionCookie,
  });
  const check = await loadHandler("netlify/functions/access-check.mjs", [
    "env", "cookieValue", "internalSecretMatches", "jsonResponse", "findActiveSession", "ACCESS_COOKIE_NAME",
  ], {
    env(name) { return name === "ACCESS_GATE_SECRET" ? expectedSecret : undefined; },
    cookieValue,
    internalSecretMatches,
    jsonResponse,
    async findActiveSession(token) { activeLookupCalls += 1; if (sessionError) throw new Error("store offline"); return token === "valid-session" ? session : null; },
    ACCESS_COOKIE_NAME,
  });

  const hostile = new Request("https://site.test/api/access/redeem", {
    method: "POST", headers: { origin: "https://attacker.test", "content-type": "application/json" }, body: JSON.stringify({ token: "grant-token" }),
  });
  assert.equal((await result(await redeem.default(hostile))).status, 403);
  assert.equal(redeemInput, null, "cross-origin redemption never reaches grant storage");
  const redemption = await result(await redeem.default(request("/api/access/redeem", "POST", { body: { token: "grant-token-fixture" } })));
  assert.equal(redemption.status, 200);
  assert.deepEqual(redeemInput, { grantToken: "grant-token-fixture" });
  assert.match(redemption.headers.get("set-cookie"), /HttpOnly; Secure; SameSite=Lax/);
  assert.equal(JSON.stringify(redemption.body).includes("session-cookie-fixture"), false);

  const noSession = await result(await status.default(request("/api/access/session", "POST", { body: {} })));
  assert.deepEqual(noSession.body, { authenticated: false });
  const expired = await result(await status.default(request("/api/access/session", "POST", {
    body: {}, headers: { cookie: `${ACCESS_COOKIE_NAME}=expired-session` },
  })));
  assert.deepEqual(expired.body, { authenticated: false });
  session = { recipient_email: "temporary@example.test" };
  const valid = await result(await status.default(request("/api/access/session", "POST", {
    body: {}, headers: { cookie: `${ACCESS_COOKIE_NAME}=valid-session` },
  })));
  assert.deepEqual(valid.body, { authenticated: true, email: "temporary@example.test", accessType: "temporary" });
  sessionError = true;
  assert.equal((await result(await status.default(request("/api/access/session", "POST", {
    body: {}, headers: { cookie: `${ACCESS_COOKIE_NAME}=valid-session` },
  })))).status, 503, "session store failures do not degrade into anonymous success");
  sessionError = false;
  const lookupsBeforeWrongOrigin = activeLookupCalls;
  const wrongOrigin = new Request("https://site.test/api/access/session", {
    method: "POST", headers: { origin: "https://attacker.test", cookie: `${ACCESS_COOKIE_NAME}=valid-session` },
  });
  assert.equal((await result(await status.default(wrongOrigin))).status, 403);
  assert.equal(activeLookupCalls, lookupsBeforeWrongOrigin);

  const logoutResponse = await result(await logout.default(request("/api/access/session/logout", "POST", {
    body: {}, headers: { cookie: `${ACCESS_COOKIE_NAME}=valid-session` },
  })));
  assert.equal(logoutResponse.status, 200);
  assert.deepEqual(revoked, ["valid-session"]);
  assert.match(logoutResponse.headers.get("set-cookie"), /Max-Age=0/);
  sessionError = true;
  const failedLogout = await result(await logout.default(request("/api/access/session/logout", "POST", {
    body: {}, headers: { cookie: `${ACCESS_COOKIE_NAME}=valid-session` },
  })));
  assert.equal(failedLogout.status, 503);
  assert.match(failedLogout.headers.get("set-cookie"), /Max-Age=0/,
    "logout still clears the browser credential if session storage is unavailable");

  sessionError = false;
  const beforeSecret = activeLookupCalls;
  const deniedCheck = await result(await check.default(new Request("https://site.test/.netlify/functions/access-check", { method: "POST" })));
  assert.equal(deniedCheck.status, 404);
  assert.equal(activeLookupCalls, beforeSecret, "the internal check secret is validated before session lookup");
  const validCheck = await result(await check.default(new Request("https://site.test/.netlify/functions/access-check", {
    method: "POST", headers: { "x-access-gate-secret": expectedSecret, cookie: `${ACCESS_COOKIE_NAME}=valid-session` },
  })));
  assert.deepEqual(validCheck.body, { authorized: true });
  sessionError = true;
  assert.equal((await result(await check.default(new Request("https://site.test/.netlify/functions/access-check", {
    method: "POST", headers: { "x-access-gate-secret": expectedSecret, cookie: `${ACCESS_COOKIE_NAME}=valid-session` },
  })))).status, 503);
});

test("private route gate distinguishes admin, staff, buyer, temporary session and public Viewer", async () => {
  let actor = null;
  let accessResult = { authorized: false };
  let fetchError = false;
  const endpoint = await loadHandler("netlify/edge-functions/access-gate.mjs", [
    "getUser", "canIssueOrRevokeGrants", "canUseInternalPages", "ACCESS_COOKIE_NAME", "Netlify", "fetch",
  ], {
    async getUser() { if (actor === "identity-error") throw new Error("identity down"); return actor; },
    canIssueOrRevokeGrants: policy.canIssueOrRevokeGrants,
    canUseInternalPages: policy.canUseInternalPages,
    ACCESS_COOKIE_NAME,
    Netlify: { env: { get(name) { return name === "ACCESS_GATE_SECRET" ? "gate-secret-fixture" : undefined; } } },
    async fetch(_url, options) {
      if (fetchError) throw new Error("lookup offline");
      assert.equal(options.headers["x-access-gate-secret"], "gate-secret-fixture");
      assert.equal(options.headers.Cookie, `${ACCESS_COOKIE_NAME}=valid-session`);
      return Response.json(accessResult);
    },
  });
  let nextCalls = 0;
  const context = { async next() { nextCalls += 1; return new Response("private page", { headers: { "content-type": "text/html" } }); } };
  const invoke = (path, cookie = "") => endpoint.default(new Request(`https://site.test${path}`, {
    headers: cookie ? { cookie } : {},
  }), context);

  assert.equal((await invoke("/config/")).status, 302, "anonymous private request redirects to access entry");
  actor = { id: "buyer-1", roles: ["buyer"] };
  assert.equal((await invoke("/config/")).status, 403, "a Buyer without a verified temporary session is denied");
  actor = "identity-error";
  assert.equal((await invoke("/config/")).status, 503, "Identity failure is fail-closed");
  actor = { id: "staff-1", roles: ["staff"] };
  const staff = await invoke("/config/");
  assert.equal(staff.status, 200);
  assert.equal(staff.headers.get("cache-control"), "private, no-store, max-age=0");
  assert.equal(nextCalls, 1);

  actor = null;
  accessResult = { authorized: true };
  const temp = await invoke("/config/", `${ACCESS_COOKIE_NAME}=valid-session`);
  assert.equal(temp.status, 200, "only the server verified temporary session opens Configurator");
  assert.equal(nextCalls, 2);
  accessResult = { authorized: false };
  assert.equal((await invoke("/config/", `${ACCESS_COOKIE_NAME}=valid-session`)).headers.get("location"), "https://site.test/access/");
  fetchError = true;
  assert.equal((await invoke("/config/", `${ACCESS_COOKIE_NAME}=valid-session`)).status, 503);
  fetchError = false;

  actor = null;
  const manageLogin = await invoke("/access/manage.html");
  assert.equal(manageLogin.status, 302);
  assert.match(manageLogin.headers.get("location"), /returnTo=%2Faccess%2Fmanage.html/);
  actor = { id: "staff-1", roles: ["staff"] };
  assert.equal((await invoke("/access/manage.html")).status, 200);
  actor = { id: "buyer-1", roles: ["buyer"] };
  assert.equal((await invoke("/access/manage.html")).status, 403);
  assert.equal(endpoint.config.path.includes("/viewer/"), false, "public Viewer is outside the private edge gate");
});

class FakeElement {
  constructor(tagName = "div") {
    this.tagName = tagName.toLowerCase();
    this.children = [];
    this.attributes = new Map();
    this.listeners = new Map();
    this.hidden = false;
    this.disabled = false;
    this._textContent = "";
    this.href = "";
    this.className = "";
    this.classList = { add: (...names) => { this.className = [...new Set([...this.className.split(/\s+/).filter(Boolean), ...names])].join(" "); } };
  }
  append(...nodes) { for (const node of nodes) { node.parentNode = this; this.children.push(node); } }
  replaceChildren(...nodes) { this.children = []; this.append(...nodes); }
  get textContent() { return this._textContent + this.children.map((child) => child.textContent).join(""); }
  set textContent(value) { this._textContent = String(value); }
  contains(node) { return this === node || this.children.some((child) => child.contains(node)); }
  addEventListener(type, callback) { const callbacks = this.listeners.get(type) || []; callbacks.push(callback); this.listeners.set(type, callbacks); }
  async dispatch(type, event = {}) { for (const callback of this.listeners.get(type) || []) await callback({ target: this, key: "", preventDefault() {}, ...event }); }
  setAttribute(name, value) { this.attributes.set(name, String(value)); }
  getAttribute(name) { return this.attributes.get(name) ?? null; }
  hasAttribute(name) { return this.attributes.has(name); }
  focus() { this.focused = true; }
  querySelector(selector) {
    if (selector === "a, button") return this.find((node) => node.tagName === "a" || node.tagName === "button");
    return this.find((node) => node.selector === selector);
  }
  find(predicate) { for (const child of this.children) { if (predicate(child)) return child; const nested = child.find(predicate); if (nested) return nested; } return null; }
  get links() { const output = []; const walk = (node) => { for (const child of node.children) { if (child.tagName === "a") output.push(child); walk(child); } }; walk(this); return output; }
  get buttons() { const output = []; const walk = (node) => { for (const child of node.children) { if (child.tagName === "button") output.push(child); walk(child); } }; walk(this); return output; }
}

test("private menu renders authoritative roles and ignores stale asynchronous session results", async () => {
  const header = new FakeElement("header");
  const toggle = new FakeElement("button");
  const menu = new FakeElement("nav");
  menu.hidden = true;
  const privateLinks = new FakeElement();
  privateLinks.selector = "[data-private-links]";
  const account = new FakeElement();
  account.selector = "[data-private-account]";
  const email = new FakeElement("span");
  email.selector = "[data-private-email]";
  account.append(email);
  menu.append(privateLinks, account);
  header.append(toggle, menu);
  const listeners = [];
  const document = {
    querySelector(selector) { return selector === "[data-private-header]" ? header : null; },
    getElementById() { return null; },
    createElement(tagName) { return new FakeElement(tagName); },
    addEventListener(type, listener) { listeners.push([type, listener]); },
  };
  header.querySelector = (selector) => ({
    "[data-private-menu-toggle]": toggle,
    "[data-private-menu]": menu,
  }[selector] || null);
  menu.querySelector = (selector) => selector === "[data-private-links]" ? privateLinks : FakeElement.prototype.querySelector.call(menu, selector);
  const location = { pathname: "/admin.html", origin: "https://site.test", assign(value) { this.assigned = value; } };
  const copyLookups = [];
  const window = { location, CASA_UI_THEME: { getCopy(key, fallback) { copyLookups.push([key, fallback]); return fallback; } } };
  let authCallback;
  let failNextSessionLookup = true;
  let sessionResponse = { authenticated: false };
  let deferredSessionResolve = () => {};
  let logoutCalls = 0;
  const fetchCalls = [];
  const fetchImpl = async (url, options) => {
    fetchCalls.push({ url, options });
    if (url === "/api/access/session/logout") return { ok: true, status: 200, json: async () => ({ ok: true }) };
    const sessionResponseForRequest = () => ({
      ok: !failNextSessionLookup,
      status: failNextSessionLookup ? 503 : 200,
      json: async () => sessionResponse,
    });
    if (deferredSessionResolve) return new Promise((resolve) => { deferredSessionResolve = () => resolve(sessionResponseForRequest()); });
    return sessionResponseForRequest();
  };
  const source = await readFile(resolve(ROOT, "app/core/private-navigation.js"), "utf8");
  const stripped = source.replace(/^import\s+[\s\S]*?\s+from\s+["'][^"']+["'];\s*$/gm, "");
  assert.doesNotMatch(stripped, /^\s*import\s/m);
  new Function("getUser", "logout", "onAuthChange", "document", "window", "fetch", stripped)(
    async () => null,
    async () => { logoutCalls += 1; },
    (callback) => { authCallback = callback; },
    document,
    window,
    fetchImpl,
  );
  await new Promise((resolve) => setImmediate(resolve));
  const privateHrefs = () => privateLinks.links.map((link) => link.href);
  const privateLabels = () => privateLinks.links.map((link) => link.textContent);
  const groupHeadings = () => privateLinks.children.map((group) => group.children[0]?.textContent);
  const accessNote = () => privateLinks.children[0]?.find((node) => node.tagName === "p");
  const assertAccessStateLookup = (key, fallback) => assert.ok(copyLookups.some(([lookedUpKey, lookedUpFallback]) =>
    lookedUpKey === `navigation.privateAccessState.${key}` && lookedUpFallback === fallback), `private access state resolves catalog key ${key}`);
  assert.equal(accessNote()?.textContent, "Verificando acesso…");
  assertAccessStateLookup("loading", "Verificando acesso…");
  deferredSessionResolve();
  await new Promise((resolve) => setImmediate(resolve));
  deferredSessionResolve = null;
  assert.equal(menu.hidden, true, "a closed menu stays closed after its background lookup fails");
  assert.equal(accessNote()?.textContent, "Não foi possível verificar o acesso. Feche e abra o menu para tentar novamente.");
  assertAccessStateLookup("lookupFailure", "Não foi possível verificar o acesso. Feche e abra o menu para tentar novamente.");
  assert.equal(privateHrefs().includes("/config/"), false, "a failed lookup never exposes Configurator access");
  assert.equal(privateHrefs().includes("/access/manage.html"), false, "a failed lookup never exposes access management");
  assert.equal(privateHrefs().includes("/admin.html"), false, "a failed lookup does not assume an anonymous session");
  await toggle.dispatch("click");
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(menu.hidden, false, "opening the menu exposes the lookup failure and retry guidance");
  assert.equal(accessNote()?.textContent, "Não foi possível verificar o acesso. Feche e abra o menu para tentar novamente.");
  assert.equal(privateHrefs().includes("/config/"), false, "a failed retry never exposes Configurator access");
  assert.equal(privateHrefs().includes("/access/manage.html"), false, "a failed retry never exposes access management");
  assert.equal(privateHrefs().includes("/admin.html"), false, "a failed retry does not assume an anonymous session");
  await toggle.dispatch("click");
  assert.equal(menu.hidden, true);
  failNextSessionLookup = false;
  await toggle.dispatch("click");
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(menu.hidden, false);
  assert.deepEqual(groupHeadings(), ["Páginas privadas", "Páginas públicas"]);
  assert.ok(privateHrefs().includes("/admin.html"), "anonymous menu offers entry to administration");
  assert.equal(privateLabels().find((label) => label === "Entrar na administração"), "Entrar na administração");
  assertAccessStateLookup("anonymousAdminEntry", "Entrar na administração");

  authCallback("login", { id: "admin-1", app_metadata: { roles: ["admin"] }, email: "admin@example.test" });
  assert.ok(privateHrefs().includes("/config/"));
  assert.ok(privateHrefs().includes("/access/manage.html"));
  assert.ok(privateLabels().includes("Configurador"));
  assert.ok(privateLabels().includes("Administração"));
  assert.ok(privateLabels().includes("Gerenciar acessos"));
  for (const [key, fallback] of [
    ["privatePages", "Páginas privadas"],
    ["publicPages", "Páginas públicas"],
    ["configurator", "Configurador"],
    ["administration", "Administração"],
    ["manageAccesses", "Gerenciar acessos"]
  ]) {
    assert.ok(copyLookups.some(([lookedUpKey, lookedUpFallback]) =>
      lookedUpKey === `navigation.privateMenu.${key}` && lookedUpFallback === fallback), `private navigation resolves catalog key ${key}`);
  }
  assert.equal(email.textContent, "admin@example.test");
  authCallback("login", { id: "staff-1", roles: ["staff"], email: "staff@example.test" });
  assert.ok(privateHrefs().includes("/config/"));
  assert.ok(privateHrefs().includes("/access/manage.html"));
  assert.ok(privateLabels().includes("Configurador"));
  assert.ok(privateLabels().includes("Gerenciar acessos"));
  assert.equal(privateHrefs().includes("/admin.html"), false, "staff menu does not expose the administrator-only page");
  authCallback("login", { id: "buyer-1", roles: ["buyer"], email: "buyer@example.test" });
  assert.equal(privateHrefs().includes("/config/"), false);
  assert.equal(accessNote()?.textContent, "Esta conta não tem acesso às páginas de gestão.");
  assertAccessStateLookup("denied", "Esta conta não tem acesso às páginas de gestão.");

  sessionResponse = { authenticated: true, email: "temporary@example.test", accessType: "temporary" };
  authCallback("logout", null);
  await new Promise((resolve) => setImmediate(resolve));
  assert.ok(privateHrefs().includes("/config/"), "verified temporary session is represented as Configurator access");
  assert.ok(privateLabels().includes("Configurador"));
  assert.equal(privateHrefs().includes("/admin.html"), false);
  assert.equal(privateHrefs().includes("/access/manage.html"), false);

  deferredSessionResolve = () => {};
  sessionResponse = { authenticated: false };
  authCallback("logout", null);
  await new Promise((resolve) => setImmediate(resolve));
  authCallback("login", { id: "admin-2", roles: ["admin"], email: "latest@example.test" });
  deferredSessionResolve?.();
  await new Promise((resolve) => setImmediate(resolve));
  assert.ok(privateHrefs().includes("/access/manage.html"), "late anonymous lookup cannot overwrite a newer admin state");

  const logoutButton = menu.buttons.find((button) => button.textContent === "Sair");
  assert.ok(copyLookups.some(([key, fallback]) => key === "navigation.logout" && fallback === "Sair"), "private logout uses the canonical copy key and safe fallback");
  await logoutButton.dispatch("click");
  assert.equal(fetchCalls.some((call) => call.url === "/api/access/session/logout"), true);
  assert.equal(logoutCalls, 1);
  assert.equal(location.assigned, "/");
  assert.equal(listeners.length, 2, "document-level close handlers are installed once");
});

test("static /access/ logout control receives the shared temporary-session logout handler", async () => {
  const header = new FakeElement("header");
  const toggle = new FakeElement("button");
  const menu = new FakeElement("nav");
  const privateLinks = new FakeElement();
  privateLinks.selector = "[data-private-links]";
  const account = new FakeElement();
  account.selector = "[data-private-account]";
  const email = new FakeElement("span");
  email.selector = "[data-private-email]";
  const logoutButton = new FakeElement("button");
  logoutButton.textContent = "Sair";
  logoutButton.setAttribute("data-private-logout", "");
  account.append(email, logoutButton);
  menu.append(privateLinks, account);
  header.append(toggle, menu);
  const document = {
    querySelector(selector) { return selector === "[data-private-header]" ? header : null; },
    getElementById(id) { return id === "logoutButton" ? logoutButton : null; },
    createElement(tagName) { return new FakeElement(tagName); },
    addEventListener() {},
  };
  header.querySelector = (selector) => ({
    "[data-private-menu-toggle]": toggle,
    "[data-private-menu]": menu,
  }[selector] || null);
  menu.querySelector = (selector) => selector === "[data-private-links]" ? privateLinks : FakeElement.prototype.querySelector.call(menu, selector);
  const location = { pathname: "/access/", origin: "https://site.test", assign(value) { this.assigned = value; } };
  const window = { location, CASA_UI_THEME: { getCopy(_key, fallback) { return fallback; } } };
  let logoutCalls = 0;
  const logoutOutcomes = ["network", 503, 403, 200];
  const fetchCalls = [];
  const fetchImpl = async (url, options) => {
    fetchCalls.push({ url, options });
    if (url === "/api/access/session/logout") {
      const outcome = logoutOutcomes.shift();
      if (outcome === "network") {
        throw new Error("network details must not reach the UI");
      }
      return { ok: outcome === 200, status: outcome, json: async () => ({ ok: outcome === 200 }) };
    }
    return { ok: true, status: 200, json: async () => ({ authenticated: true, email: "temporary@example.test", accessType: "temporary" }) };
  };
  const source = await readFile(resolve(ROOT, "app/core/private-navigation.js"), "utf8");
  const stripped = source.replace(/^import\s+[\s\S]*?\s+from\s+["'][^"']+['"];\s*$/gm, "");
  new Function("getUser", "logout", "onAuthChange", "document", "window", "fetch", stripped)(
    async () => null,
    async () => { logoutCalls += 1; },
    () => {},
    document,
    window,
    fetchImpl,
  );
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(logoutButton.hidden, false, "a verified temporary session reveals the existing static control");
  const logoutStatus = account.children.find((node) => node.getAttribute("role") === "status");
  for (const failure of ["network", 503, 403]) {
    await logoutButton.dispatch("click");
    assert.equal(logoutStatus.hidden, false, `${failure} leaves a generic live message visible`);
    assert.equal(logoutStatus.textContent, "Não foi possível encerrar o acesso. Verifique a conexão e tente novamente.");
    assert.equal(logoutStatus.textContent.includes("network details"), false, "transport details never appear in the UI");
    assert.equal(logoutButton.disabled, false, "the temporary-session logout can be retried");
    assert.equal(logoutCalls, 0, "Identity logout is not treated as revoking a temporary session");
    assert.equal(location.assigned, undefined, `${failure} does not claim logout succeeded`);
  }
  await logoutButton.dispatch("click");
  assert.equal(logoutStatus.hidden, true, "retry clears the previous failure message");
  assert.ok(fetchCalls.some((call) => call.url === "/api/access/session/logout" && call.options.method === "POST"), "static control revokes the temporary session");
  assert.equal(logoutCalls, 1, "static control also closes Identity when present");
  assert.equal(location.assigned, "/", "the static access route returns to the public entry point");
});

test("invitation token leaves the URL before UI interaction and never appears in rendered text", async () => {
  const token = "one-time-grant-token-fixture";
  const button = new FakeElement("button");
  const status = new FakeElement("p");
  const location = {
    pathname: "/access/",
    search: "?source=mail",
    hash: `#token=${token}`,
    assign(value) { this.assigned = value; },
  };
  let urlCleaned = false;
  let fetchBody = null;
  const document = { getElementById(id) { return id === "confirmAccess" ? button : status; } };
  const history = { replaceState(_state, _title, path) { assert.equal(path, "/access/?source=mail"); location.hash = ""; urlCleaned = true; } };
  const fetchImpl = async (_url, options) => {
    assert.equal(urlCleaned, true, "URL cleanup precedes the redemption request");
    fetchBody = JSON.parse(options.body);
    return { ok: true, json: async () => ({ ok: true }) };
  };
  const source = await readFile(resolve(ROOT, "app/access/access.js"), "utf8");
  new Function("document", "window", "history", "fetch", source)(document, { location }, history, fetchImpl);
  assert.equal(urlCleaned, true);
  assert.equal(status.textContent.includes(token), false);
  assert.equal(button.textContent.includes(token), false);
  await button.dispatch("click");
  assert.deepEqual(fetchBody, { token }, "token is sent only to the redemption endpoint after URL cleanup");
  assert.equal(location.assigned, "/config/");
});
