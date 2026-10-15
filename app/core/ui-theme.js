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
    // Prefer page content for the two approved pilot pages.
    // On landing, only mount in the displayed environment feature; otherwise
    // preserve the existing header-adjacent control as a safe fallback.
    var contextEyebrow = doc.querySelector(".environment-feature:not([hidden]) .feature-copy > .eyebrow, .viewer-heading > .eyebrow");
    var header = contextEyebrow ? null : doc.querySelector(".site-header, .viewer-header, .topbar__actions, .admin-topbar__actions, .access-page > header, body > header");
    if (!contextEyebrow && !header) return;
    var button = doc.createElement("button");
    button.type = "button";
    button.className = "ui-theme-toggle";
    button.setAttribute("data-ui-theme-toggle", "");
    button.innerHTML = '<span class="ui-theme-toggle__glyph" aria-hidden="true"></span>' +
      '<span class="ui-theme-toggle__label-long"></span>' +
      '<span class="ui-theme-toggle__label-short"></span>';
    button.addEventListener("click", function () { select(nextMode(), true); });
    if (contextEyebrow) {
      // Reuse the existing eyebrow rather than adding a new UI band.
      var contextRow = doc.createElement("div");
      contextRow.className = "ui-theme-context-row";
      contextEyebrow.parentNode.insertBefore(contextRow, contextEyebrow);
      contextRow.appendChild(contextEyebrow);
      contextRow.appendChild(button);
    } else {
      // All other pages retain their existing placement while the pilot is reviewed.
      var standalone = header.classList.contains("site-header") ||
        header.classList.contains("viewer-header") ||
        (header.parentNode && header.parentNode.classList &&
         header.parentNode.classList.contains("access-page"));
      if (standalone) {
      var utility = doc.createElement("div");
      utility.className = "ui-theme-utility";
      if (header.classList.contains("viewer-header")) utility.classList.add("ui-theme-utility--viewer");
      if (header.parentNode.classList && header.parentNode.classList.contains("access-page")) utility.classList.add("ui-theme-utility--access");
      utility.appendChild(button);
        header.parentNode.insertBefore(utility, header.nextSibling);
      } else {
        // Config/admin retain their contextual toolbar layout.
        header.insertBefore(button, header.firstChild);
      }
    }
    refreshControls();
  }

  // Watch parser insertions only until DOMContentLoaded, so a dark-mode logo is
  // switched to its approved dark asset before the first rendered frame.
  var imageObserver = null;
  if (typeof win.MutationObserver === "function" && root) {
    imageObserver = new win.MutationObserver(refreshBrandImages);
    imageObserver.observe(root, { childList: true, subtree: true });
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
    doc.addEventListener("DOMContentLoaded", function () { if (imageObserver) imageObserver.disconnect(); createControl(); apply(); }, { once: true });
  } else {
    if (imageObserver) imageObserver.disconnect();
    createControl(); apply();
  }
  win.CASA_UI_THEME = {
    getMode: function () { return mode; },
    getResolved: resolved,
    setMode: function (next) { return select(next, true); }
  };
})(window, document);