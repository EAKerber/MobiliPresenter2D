(function () {
  "use strict";
  const toggle = document.getElementById("menuToggle");
  const nav = document.getElementById("primaryNav");
  if (!toggle || !nav) return;
  const publicHeader = toggle.closest(".site-header--public");
  const contact = publicHeader && publicHeader.querySelector(".header-cta");
  const actions = publicHeader && toggle.closest(".header-actions");
  const compactQuery = typeof window.matchMedia === "function"
    ? window.matchMedia("(max-width: 900px)") : null;

  function setOpen(open) {
    document.body.classList.toggle("menu-open", open);
    toggle.setAttribute("aria-expanded", String(open));
    toggle.setAttribute("aria-label", open ? "Fechar menu" : "Abrir menu");
  }

  let lastHeaderFocus = null;
  if (publicHeader) {
    document.addEventListener("focusin", event => {
      if (publicHeader.contains(event.target)) lastHeaderFocus = event.target;
      else if (event.target !== document.body && event.target !== document.documentElement)
        lastHeaderFocus = null;
    });
  }

  function syncContactPlacement() {
    if (!contact || !actions || !compactQuery) return;
    const active = document.activeElement;
    const priorFocus = publicHeader.contains(active) ? active : lastHeaderFocus;
    const focusWasContact = priorFocus === contact;
    const focusWasToggle = priorFocus === toggle;
    const focusWasInNav = nav.contains(priorFocus);
    if (compactQuery.matches) {
      if (contact.parentElement !== nav) nav.appendChild(contact);
      if (focusWasContact || focusWasInNav) {
        setOpen(true);
        priorFocus?.focus({ preventScroll: true });
      }
    } else if (contact.parentElement !== actions) {
      actions.insertBefore(contact, actions.querySelector("[data-ui-theme-toggle]") || toggle);
      if (toggle.getAttribute("aria-expanded") === "true") setOpen(false);
      if (focusWasToggle) nav.querySelector("a[href]")?.focus({ preventScroll: true });
      else if (focusWasContact) contact.focus({ preventScroll: true });
    } else if (toggle.getAttribute("aria-expanded") === "true") {
      setOpen(false);
      if (focusWasToggle) nav.querySelector("a[href]")?.focus({ preventScroll: true });
    }
  }
  syncContactPlacement();
  if (typeof compactQuery.addEventListener === "function") {
    compactQuery.addEventListener("change", syncContactPlacement);
  } else if (typeof compactQuery.addListener === "function") {
    compactQuery.addListener(syncContactPlacement);
  }

  toggle.addEventListener("click", event => {
    const opening = toggle.getAttribute("aria-expanded") !== "true";
    setOpen(opening);
    if (opening && event.detail === 0) nav.querySelector("a[href]")?.focus();
  });
  nav.addEventListener("click", event => {
    const link = event.target instanceof Element ? event.target.closest("a[href]") : null;
    if (link && nav.contains(link)) setOpen(false);
  });
  document.addEventListener("keydown", event => {
    if (event.key !== "Escape" || toggle.getAttribute("aria-expanded") !== "true") return;
    const focusWasInside = nav.contains(document.activeElement);
    setOpen(false);
    if (focusWasInside) toggle.focus();
  });
  document.addEventListener("pointerdown", event => {
    if (publicHeader && !publicHeader.contains(event.target)) lastHeaderFocus = null;
    if (!nav.contains(event.target) && !toggle.contains(event.target)) setOpen(false);
  });
})();
