(function () {
  "use strict";
  const data = window.CASA_PUBLIC_LANDING;
  const track = document.getElementById("environmentTrack");
  const windowEl = document.getElementById("environmentWindow");
  const controls = document.getElementById("carouselControls");
  const pagination = document.getElementById("pagination");
  const feature = document.getElementById("environmentFeature");
  const featureImage = document.getElementById("featureImage");
  const featureTitle = document.getElementById("featureTitle");
  const featureDescription = document.getElementById("featureDescription");
  const featureAction = document.getElementById("featureAction");
  const menuToggle = document.getElementById("menuToggle");
  const primaryNav = document.getElementById("primaryNav");
  let selectedId = "cozinha";
  let page = 0;
  let hintTimer;
  let hintStopped = false;

  function renderBenefits() {
    const mini = document.getElementById("miniBenefits");
    ["Modular", "Inteligente", "Para a sua vida"].forEach((title, index) => {
      const benefit = document.createElement("div");
      benefit.className = "mini-benefit";
      const icon = document.createElement("img");
      icon.src = `assets/icons/ui/gold/${["modular", "inteligente", "para-sua-vida"][index]}.svg`;
      icon.alt = "";
      const strong = document.createElement("strong"); strong.textContent = title;
      benefit.append(icon, strong); mini.append(benefit);
    });
    const strip = document.getElementById("benefits");
    data.benefits.forEach((item) => {
      const node = document.createElement("div"); node.className = "benefit-item";
      const icon = document.createElement("img"); icon.src = item.icon; icon.alt = "";
      const text = document.createElement("span"); text.textContent = item.label;
      node.append(icon, text); strip.append(node);
    });
  }

  function select(environment, userInitiated = false) {
    selectedId = environment.id;
    track.querySelectorAll(".environment").forEach((card) => {
      const active = card.dataset.environmentId === selectedId;
      card.classList.toggle("is-selected", active);
      card.setAttribute("aria-pressed", String(active));
    });
    feature.hidden = false;
    feature.classList.add("is-changing");
    window.setTimeout(() => {
      featureImage.src = environment.featureImage;
      featureImage.alt = environment.alt;
      featureTitle.textContent = environment.name;
      featureDescription.textContent = environment.description;
      featureAction.hidden = !environment.destination;
      if (environment.destination) {
        featureAction.href = environment.destination;
        featureAction.firstChild.textContent = `${environment.action} `;
      }
      feature.classList.remove("is-changing");
      if (userInitiated && environment.destination) {
        window.requestAnimationFrame(() => {
          featureAction.scrollIntoView({
            behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth",
            block: "center",
            inline: "nearest"
          });
        });
      }
    }, 120);
    revealCard(environment.id);
    if (userInitiated) stopHint();
  }

  function renderCards() {
    data.environments.forEach((environment, index) => {
      const card = document.createElement("button");
      card.type = "button"; card.className = "environment";
      card.dataset.environmentId = environment.id;
      card.setAttribute("aria-pressed", "false");
      const image = document.createElement("img"); image.className = "environment-art"; image.src = environment.image; image.alt = ""; image.loading = "lazy";
      const title = document.createElement("strong"); title.textContent = environment.name;
      const copy = document.createElement("span"); copy.textContent = environment.description;
      card.append(image, title, copy);
      card.addEventListener("click", () => select(environment, true));
      card.addEventListener("animationend", (event) => { if (event.animationName === "card-wave") card.classList.remove("wave"); });
      track.append(card);
    });
    [0, 1].forEach((index) => {
      const dot = document.createElement("button"); dot.type = "button"; dot.className = "page-dot";
      dot.setAttribute("aria-label", `Mostrar grupo ${index + 1}`); dot.addEventListener("click", () => goToPage(index)); pagination.append(dot);
    });
  }

  function mobileMode() { return window.matchMedia("(max-width: 760px)").matches; }
  function maxScroll() { return Math.max(0, windowEl.scrollWidth - windowEl.clientWidth); }
  function goToPage(next) {
    page = Math.max(0, Math.min(1, next));
    if (mobileMode()) windowEl.scrollTo({ left: page * maxScroll(), behavior: "smooth" });
    syncPagination();
  }
  function syncPagination() {
    const dots = [...pagination.children];
    dots.forEach((dot, index) => { dot.classList.toggle("is-active", index === page); dot.setAttribute("aria-current", index === page ? "true" : "false"); });
    document.getElementById("previousPage").disabled = page === 0;
    document.getElementById("nextPage").disabled = page === 1;
  }
  function revealCard(id) {
    if (!mobileMode()) return;
    const card = track.querySelector(`[data-environment-id="${id}"]`);
    const bounds = card.getBoundingClientRect(); const viewport = windowEl.getBoundingClientRect();
    if (bounds.right > viewport.right || bounds.left < viewport.left) goToPage(bounds.left >= viewport.right ? 1 : 0);
  }
  function applyResponsive() {
    controls.hidden = !mobileMode();
    windowEl.scrollLeft = mobileMode() ? page * maxScroll() : 0;
    syncPagination();
  }
  function runHint() {
    if (hintStopped) return;
    const visible = mobileMode() ? [...track.children].filter((card) => { const r = card.getBoundingClientRect(); const v = windowEl.getBoundingClientRect(); return r.left < v.right && r.right > v.left; }) : [...track.children];
    visible.forEach((card, index) => { card.style.animationDelay = `${index * 110}ms`; card.classList.add("wave"); });
  }
  function stopHint() { hintStopped = true; window.clearInterval(hintTimer); track.querySelectorAll(".wave").forEach((card) => card.classList.remove("wave")); }

  function closeMenu() {
    document.body.classList.remove("menu-open");
    menuToggle.setAttribute("aria-expanded", "false");
    menuToggle.setAttribute("aria-label", "Abrir menu");
  }

  renderBenefits(); renderCards();
  document.getElementById("previousPage").addEventListener("click", () => goToPage(0));
  document.getElementById("nextPage").addEventListener("click", () => goToPage(1));
  windowEl.addEventListener("scroll", () => { if (mobileMode()) { window.clearTimeout(windowEl.settleTimer); windowEl.settleTimer = window.setTimeout(() => { page = windowEl.scrollLeft >= maxScroll() / 2 ? 1 : 0; syncPagination(); }, 100); } }, { passive: true });
  window.addEventListener("resize", applyResponsive);
  menuToggle.addEventListener("click", () => {
    const open = document.body.classList.toggle("menu-open");
    menuToggle.setAttribute("aria-expanded", String(open));
    menuToggle.setAttribute("aria-label", open ? "Fechar menu" : "Abrir menu");
  });
  primaryNav.querySelectorAll("a").forEach((link) => link.addEventListener("click", closeMenu));
  document.addEventListener("pointerdown", stopHint, { once: true }); document.addEventListener("keydown", stopHint, { once: true });
  applyResponsive(); select(data.environments.find((item) => item.id === selectedId));
  if (!window.matchMedia("(prefers-reduced-motion: reduce)").matches) { window.setTimeout(() => { runHint(); hintTimer = window.setInterval(runHint, 10000); }, 700); }
})();
