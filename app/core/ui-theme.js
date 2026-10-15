/* DS-01: shared, presentation-only theme preference. No product/auth dependencies. */
(function (win, doc) {
  "use strict";
  var STORAGE_KEY = "casa-ui-theme-mode-v1";
  var MODES = ["auto", "light", "dark"];
  var FULL = { auto: "Automático", light: "Claro", dark: "Escuro" };
  var SHORT = { auto: "Auto", light: "Claro", dark: "Escuro" };
  var mql = typeof win.matchMedia === "function" ? win.matchMedia("(prefers-color-scheme: dark)") : null;
  var root = doc.documentElement;
  var mode = "auto";
  try {
    var stored = win.localStorage.getItem(STORAGE_KEY);
    if (MODES.indexOf(stored) !== -1) mode = stored;
  } catch (_error) { /* Private mode may disable storage; keep auto. */ }

  function resolved() {
    return mode === "auto" ? (mql && mql.matches ? "dark" : "light") : mode;
  }
  function nextMode() {
    return MODES[(MODES.indexOf(mode) + 1) % MODES.length];
  }
  function refreshBrandImages() {
    var desired = resolved();
    doc.querySelectorAll("img[data-brand-variant]").forEach(function (image) {
      var target = image.getAttribute("data-src-" + desired);
      if (target && image.getAttribute("src") !== target) image.setAttribute("src", target);
    });
  }
  function refreshControls() {
    doc.querySelectorAll("[data-ui-theme-toggle]").forEach(function (button) {
      button.setAttribute("data-mode", mode);
      button.setAttribute("aria-label", "Tema atual: " + FULL[mode] + ". Ativar " + FULL[nextMode()] + ".");
      button.setAttribute("title", "Tema: " + FULL[mode] + " (próximo: " + FULL[nextMode()] + ")");
      var full = button.querySelector(".ui-theme-toggle__label-long");
      var short = button.querySelector(".ui-theme-toggle__label-short");
      if (full) full.textContent = FULL[mode];
      if (short) short.textContent = SHORT[mode];
    });
  }
  function apply() {
    var actual = resolved();
    root.setAttribute("data-theme-mode", mode);
    root.setAttribute("data-theme", actual);
    root.style.colorScheme = actual;
    refreshBrandImages();
    refreshControls();
    var meta = doc.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute("content", actual === "dark" ? "#111210" : "#f7f5f2");
  }
  function select(next, persist) {
    if (MODES.indexOf(next) === -1) return false;
    mode = next;
    if (persist) {
      try { win.localStorage.setItem(STORAGE_KEY, next); } catch (_error) { /* fail soft */ }
    }
    apply();
    return true;
  }
  function createControl() {
    if (doc.querySelector("[data-ui-theme-toggle]")) return;
    var header = doc.querySelector(".site-header .header-actions, .viewer-header, .topbar__actions, .admin-topbar__actions, body > header");
    if (!header) return;
    var button = doc.createElement("button");
    button.type = "button";
    button.className = "ui-theme-toggle";
    button.setAttribute("data-ui-theme-toggle", "");
    button.innerHTML = '<span class="ui-theme-toggle__glyph" aria-hidden="true"></span>' +
      '<span class="ui-theme-toggle__label-long"></span>' +
      '<span class="ui-theme-toggle__label-short"></span>';
    button.addEventListener("click", function () { select(nextMode(), true); });
    if (header.classList.contains("header-actions")) {
      header.insertBefore(button, header.firstChild);
    } else if (header.classList.contains("viewer-header")) {
      header.insertBefore(button, header.querySelector(".back-link") || null);
    } else if (header.classList.contains("admin-topbar__actions") || header.classList.contains("topbar__actions")) {
      header.insertBefore(button, header.firstChild);
    } else {
      header.insertBefore(button, header.lastElementChild);
    }
    refreshControls();
  }

  // Theme attributes are applied synchronously in <head>, ahead of CSS rendering.
  apply();
  if (mql) {
    var onMediaChange = function () { if (mode === "auto") apply(); };
    if (typeof mql.addEventListener === "function") mql.addEventListener("change", onMediaChange);
    else if (typeof mql.addListener === "function") mql.addListener(onMediaChange);
  }
  win.addEventListener("storage", function (event) {
    if (event.key !== STORAGE_KEY) return;
    select(MODES.indexOf(event.newValue) !== -1 ? event.newValue : "auto", false);
  });
  if (doc.readyState === "loading") {
    doc.addEventListener("DOMContentLoaded", function () { createControl(); apply(); }, { once: true });
  } else {
    createControl(); apply();
  }
  win.CASA_UI_THEME = {
    getMode: function () { return mode; },
    getResolved: resolved,
    setMode: function (next) { return select(next, true); }
  };
})(window, document);