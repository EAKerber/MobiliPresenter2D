"use strict";
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const crypto = require("node:crypto");

const root = path.resolve(__dirname, "..");
const read = (name) => fs.readFileSync(path.join(root, name), "utf8");
const code = read("app/core/ui-theme.js");
const shells = [
  "app/index.html", "app/about/index.html", "app/how-it-works/index.html",
  "app/viewer/index.html", "app/config/index.html", "app/admin.html",
  "app/access/manage.html"
];
for (const file of shells) {
  const html = read(file);
  assert(html.includes('src="/core/ui-theme.js?v=ds01-theme-v1"'), file + " theme bootstrap");
  assert(html.includes('href="/ui-theme.css?v=ds01-theme-v1"'), file + " theme CSS");
  assert(html.indexOf("ui-theme.js") < html.indexOf("ui-theme.css"), file + " theme before stylesheet");
  assert(html.includes('href="/branding/favicon.ico"'), file + " favicon");
  assert(html.includes('href="/branding/apple-touch-icon.png"'), file + " apple touch icon");
  assert(html.includes("data-brand-variant"), file + " proper brand logo");
  assert(!html.includes('aria-hidden="true">▱</span>'), file + " no fake mark");
}
const themeCSS = read("app/ui-theme.css");
const navCSS = read("app/landing/landing.css");
assert(navCSS.includes('.site-header nav a[aria-current="page"]'), "shared active navigation styling");
for (const file of ["app/index.html", "app/about/index.html", "app/how-it-works/index.html"]) {
  assert(read(file).includes('aria-current="page"'), file + " active route announced");
}
assert(code.includes('.site-header .header-actions') &&
  code.includes('presentationActions.insertBefore(button, presentationActions.querySelector(".menu-toggle") || null)'),
  "presentation pages mount compact theme control inside their sticky header");
assert(code.includes('.viewer-heading > .eyebrow') &&
  !code.includes('.environment-feature:not([hidden])'), "only viewer uses contextual first-screen introduction");
assert(code.includes('contextRow.appendChild(contextEyebrow)') &&
  code.includes('contextRow.appendChild(button)'), "viewer eyebrow and toggle share a contextual row");
assert(code.includes("ui-theme-utility") && code.includes("header.parentNode.insertBefore(utility, header.nextSibling)"),
  "remaining functional fallback remains at top of page");
assert(themeCSS.includes('.ui-theme-context-row > .ui-theme-toggle') &&
  themeCSS.includes('min-height: 44px; min-width: 44px;'),
  "contextual control keeps the required 44px touch target");
assert(themeCSS.includes('.ui-theme-context-row .ui-theme-toggle__label-short'),
  "small-screen layout preserves a textual mode label");
assert(themeCSS.includes(".site-header .ui-theme-toggle--header") &&
  themeCSS.includes("@media (max-width: 1150px)"),
  "header theme control is compact across desktop/mobile");
assert(themeCSS.includes('html[data-theme="dark"] .technical-view,') &&
  themeCSS.includes('html[data-theme="dark"] .detail-row {') &&
  themeCSS.includes('background: #f0ede8;'),
  "technical views and detail cards share light-neutral surface in dark mode");
assert(themeCSS.includes('.technical-view svg text { color: #3f3a34; }'),
  "technical SVG labels use an intentional readable neutral color");
const landing = read("app/index.html");
assert(landing.includes('id="introSplash"') && landing.includes('logo-light-splash-1548.png'));
assert(landing.includes('id="environmentTrack"'));
assert(landing.includes('class="environment-art environment-art--feature"') &&
  landing.includes('id="featureImage"'), "feature composition retains the accessible interior image");
const sceneJS = read("app/landing/landing.js");
assert(sceneJS.includes('art.className = "environment-art"') &&
  sceneJS.includes('card.append(art, title, copy)'), "card composition shares the same wrapper");
assert(navCSS.includes(".environment-art::after") &&
  navCSS.includes('html[data-theme="dark"] .environment-art::after'), "frame is theme-dependent in CSS");
assert(!navCSS.includes('canvas('), "no runtime canvas or scene assets");
const names = ["cozinha", "sala", "quarto", "escritorio", "lavanderia"];
for (const name of names) for (const dimension of ["large", "small"]) {
  const file = "app/landing/assets/icons/" + dimension + "/" + name + ".webp";
  const bytes = fs.readFileSync(path.join(root, file));
  assert.equal(bytes.toString("ascii", 0, 4), "RIFF", "webp RIFF signature: " + file);
  assert.equal(bytes.toString("ascii", 8, 12), "WEBP", "webp format signature: " + file);
}
for (const theme of ["light", "dark"]) {
  const svg = read("app/landing/assets/icons/frame-" + theme + ".svg");
  assert(svg.includes('viewBox="0 0 900 738"') && svg.includes('#AE5B09'),
    "approved SVG frame geometry and brand color: " + theme);
}
assert(read("app/about/index.html").includes('aria-controls="primaryNav"'));
assert(read("app/about/index.html").includes('header-menu.js'));
assert(read("app/admin.html").includes('id="loginForm"'));
assert(read("app/config/index.html").includes('id="restoreButton"'));

const expectedBlobs = {
  "app/branding/logo-light-380.png": "636b0e72187d6dc00d760dbce5f05d11c99cc5f4",
  "app/branding/logo-dark-380.png": "7b6391a2c003089f937a0c83ad767e495e36f187",
  "app/branding/logo-light-splash-1548.png": "8cec3ce04e8aec8fa57588b80de1b645268f3afe",
  "app/branding/logo-dark-splash-1548.png": "11a776419b62429f95813eeaaea32b395b87343b",
  "app/branding/favicon.ico": "b5e83a00d7900df9b56887bc3357dfbae58833bd",
  "app/branding/favicon-32.png": "47a89a6a3d04ad785884ae2e11b4f6f15a6b2107",
  "app/branding/apple-touch-icon.png": "67ff91be09892b10a4a3dd492ab63974d4d78361",
  "app/branding/android-chrome-192.png": "f7b17b47bd0830709569faea35d1cabf51a5faf2"
};
for (const [file, expected] of Object.entries(expectedBlobs)) {
  const bytes = fs.readFileSync(path.join(root, file));
  const hash = crypto.createHash("sha1").update(`blob ${bytes.length}\0`).update(bytes).digest("hex");
  assert.equal(hash, expected, "homologated asset unchanged: " + file);
}
function harness(osDark, initialMode) {
  const saved = initialMode ? { "casa-ui-theme-mode-v1": initialMode } : {};
  const hooks = {};
  const media = { matches: osDark, addEventListener: (name, cb) => { hooks["media:" + name] = cb; } };
  const attrs = {};
  const rootElement = { style: {}, setAttribute: (k,v) => { attrs[k] = v; } };
  const images = [];
  const document = {
    documentElement: rootElement,
    readyState: "loading",
    querySelectorAll(selector) { return selector === "img[data-brand-variant]" ? images : []; },
    querySelector() { return null; },
    addEventListener(name, fn) { hooks["doc:" + name] = fn; }
  };
  const window = {
    matchMedia() { return media; },
    localStorage: { getItem(k) { return saved[k] || null; }, setItem(k,v) { saved[k] = v; } },
    addEventListener(name, fn) { hooks["win:" + name] = fn; }
  };
  vm.runInNewContext(code, { window, document }, { filename: "app/core/ui-theme.js" });
  return { hooks, media, attrs, saved, window, images };
}
const darkDefault = harness(true);
assert.equal(darkDefault.window.CASA_UI_THEME.getMode(), "auto");
assert.equal(darkDefault.window.CASA_UI_THEME.getResolved(), "dark");
assert.equal(darkDefault.attrs["data-theme"], "dark");
assert.equal(Object.keys(darkDefault.saved).length, 0, "auto default must not persist");
assert.equal(darkDefault.window.CASA_UI_THEME.setMode("light"), true);
assert.equal(darkDefault.attrs["data-theme"], "light");
assert.equal(darkDefault.saved["casa-ui-theme-mode-v1"], "light");
assert.equal(darkDefault.window.CASA_UI_THEME.setMode("invalid"), false);
assert.equal(darkDefault.attrs["data-theme"], "light");
darkDefault.hooks["win:storage"]({ key: "casa-ui-theme-mode-v1", newValue: "auto" });
assert.equal(darkDefault.attrs["data-theme"], "dark");
darkDefault.media.matches = false;
darkDefault.hooks["media:change"]();
assert.equal(darkDefault.attrs["data-theme"], "light");
const lightSaved = harness(true, "light");
assert.equal(lightSaved.attrs["data-theme"], "light", "explicit wins over OS");
lightSaved.media.matches = false;
lightSaved.hooks["media:change"]();
assert.equal(lightSaved.window.CASA_UI_THEME.getMode(), "light");
const attributes = {
  "data-src-light": "/branding/logo-light-380.png",
  "data-src-dark": "/branding/logo-dark-380.png",
  src: "/branding/logo-light-380.png"
};
darkDefault.images.push({getAttribute(k) {return attributes[k];},setAttribute(k,v) {attributes[k]=v;}});
darkDefault.window.CASA_UI_THEME.setMode("dark");
assert.equal(attributes.src, "/branding/logo-dark-380.png");
darkDefault.window.CASA_UI_THEME.setMode("light");
assert.equal(attributes.src, "/branding/logo-light-380.png");
console.log("DS-01 asset hashes, seven shells, theme auto/explicit/sync and image switching: PASS");