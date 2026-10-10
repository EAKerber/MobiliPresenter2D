(function () {
  "use strict";

  const toggle = document.getElementById("menuToggle");
  const navigation = document.getElementById("primaryNav");
  if (!toggle || !navigation) return;

  function setMenuOpen(open) {
    document.body.classList.toggle("menu-open", open);
    toggle.setAttribute("aria-expanded", String(open));
    toggle.setAttribute("aria-label", open ? "Fechar menu" : "Abrir menu");
  }

  toggle.addEventListener("click", function () {
    setMenuOpen(toggle.getAttribute("aria-expanded") !== "true");
  });
  navigation.querySelectorAll("a").forEach(function (link) {
    link.addEventListener("click", function () { setMenuOpen(false); });
  });
  document.addEventListener("keydown", function (event) {
    if (event.key === "Escape") setMenuOpen(false);
  });
  document.addEventListener("pointerdown", function (event) {
    if (!navigation.contains(event.target) && !toggle.contains(event.target)) setMenuOpen(false);
  });
})();
