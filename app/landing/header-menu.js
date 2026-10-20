(function () {
  "use strict";
  const toggle = document.getElementById("menuToggle");
  const nav = document.getElementById("primaryNav");
  if (!toggle || !nav) return;
  function setOpen(open) {
    document.body.classList.toggle("menu-open", open);
    toggle.setAttribute("aria-expanded", String(open));
    toggle.setAttribute("aria-label", open ? "Fechar menu" : "Abrir menu");
  }
  toggle.addEventListener("click", event => {
    const opening = toggle.getAttribute("aria-expanded") !== "true";
    setOpen(opening);
    // Mobile DOM orders nav before the toggle; keyboard-open must expose a tab target.
    if (opening && event.detail === 0) nav.querySelector("a[href]")?.focus();
  });
  nav.querySelectorAll("a").forEach(a => a.addEventListener("click", () => setOpen(false)));
  document.addEventListener("keydown", event => {
    if (event.key !== "Escape" || toggle.getAttribute("aria-expanded") !== "true") return;
    const focusWasInsideMenu = nav.contains(document.activeElement);
    setOpen(false);
    if (focusWasInsideMenu) toggle.focus();
  });
  document.addEventListener("pointerdown", e => {
    if (!nav.contains(e.target) && !toggle.contains(e.target)) setOpen(false);
  });
})();
