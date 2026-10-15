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
  toggle.addEventListener("click", () => setOpen(toggle.getAttribute("aria-expanded") !== "true"));
  nav.querySelectorAll("a").forEach(a => a.addEventListener("click", () => setOpen(false)));
  document.addEventListener("keydown", e => { if (e.key === "Escape") setOpen(false); });
  document.addEventListener("pointerdown", e => {
    if (!nav.contains(e.target) && !toggle.contains(e.target)) setOpen(false);
  });
})();
