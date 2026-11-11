(function () {
  "use strict";
  const data = window.CASA_PUBLIC_LANDING;
  const track = document.getElementById("environmentTrack");
  const windowEl = document.getElementById("environmentWindow");
  const controls = document.getElementById("carouselControls");
  const pagination = document.getElementById("pagination");
  const feature = document.getElementById("environmentFeature");
  let featureImage = document.getElementById("featureImage");
  const featureTitle = document.getElementById("featureTitle");
  const featureDescription = document.getElementById("featureDescription");
  const featureAction = document.getElementById("featureAction");
  const featureAvailability = document.getElementById("featureAvailability");
  const featureImageFallback = document.getElementById("featureImageFallback");
  let selectedId = "cozinha";
  let selectionVersion = 0;
  const featureImageCache = new Map();
  let page = 0;
  let hintTimer;
  let hintStopped = false;

  function layoutHeroPhoneVideo() {
    const frame = document.querySelector(".hero-image-frame");
    const art = document.querySelector(".hero-art");
    const image = frame && frame.querySelector("img");
    const trigger = document.getElementById("heroVideoTrigger");
    if (!frame || !art || !image || !trigger || !image.naturalWidth || !image.naturalHeight) return;

    const frameWidth = frame.clientWidth;
    const frameHeight = frame.clientHeight;
    if (!frameWidth || !frameHeight) return;
    const scale = Math.max(frameWidth / image.naturalWidth, frameHeight / image.naturalHeight);
    const renderedWidth = image.naturalWidth * scale;
    const renderedHeight = image.naturalHeight * scale;
    const offsetX = (frameWidth - renderedWidth) / 2;
    // Screen bounds are measured on the 1074x1465 source image; keep the overlay on the rendered cover crop.
    const screen = { left: 184, top: 170, width: 400, height: 973 };

    image.style.left = `${offsetX}px`;
    image.style.top = "0px";
    image.style.width = `${renderedWidth}px`;
    image.style.height = `${renderedHeight}px`;
    trigger.style.left = `${offsetX + screen.left * scale}px`;
    trigger.style.top = `${screen.top * scale}px`;
    trigger.style.width = `${screen.width * scale}px`;
    trigger.style.height = `${screen.height * scale}px`;
    trigger.hidden = false;
  }

  function initHeroVideo() {
    const trigger = document.getElementById("heroVideoTrigger");
    const image = document.querySelector(".hero-image-frame > img");
    const dialog = document.getElementById("homeVideoDialog");
    const player = document.getElementById("homeVideoPlayer");
    const close = document.getElementById("homeVideoClose");
    const fullscreen = document.getElementById("homeVideoFullscreen");
    const youtubeUrl = "https://www.youtube.com/shorts/hgcJ1k7lFkE";
    if (!trigger || !image || !dialog || !player || !close || !fullscreen) return;

    function openYoutubeFallback() {
      window.open(youtubeUrl, "_blank", "noopener,noreferrer");
    }
    function loadPlayer() {
      if (player.querySelector("iframe")) return player.querySelector("iframe");
      const iframe = document.createElement("iframe");
      iframe.src = "https://www.youtube-nocookie.com/embed/hgcJ1k7lFkE?autoplay=1&controls=1&fs=1&playsinline=1&rel=0&cc_load_policy=1";
      iframe.title = "Apresentação da Casa em Módulos";
      iframe.loading = "eager";
      iframe.referrerPolicy = "strict-origin-when-cross-origin";
      iframe.allow = "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share; fullscreen";
      iframe.allowFullscreen = true;
      player.replaceChildren(iframe);
      return iframe;
    }

    trigger.addEventListener("click", () => {
      if (typeof dialog.showModal !== "function") {
        openYoutubeFallback();
        return;
      }
      loadPlayer();
      dialog.showModal();
      close.focus();
    });
    close.addEventListener("click", () => dialog.close());
    dialog.addEventListener("click", (event) => { if (event.target === dialog) dialog.close(); });
    dialog.addEventListener("close", () => { player.replaceChildren(); trigger.focus(); });
    fullscreen.addEventListener("click", () => {
      const iframe = player.querySelector("iframe");
      const request = iframe && (iframe.requestFullscreen || iframe.webkitRequestFullscreen);
      if (request) Promise.resolve(request.call(iframe)).catch(() => {});
      else openYoutubeFallback();
    });

    image.addEventListener("load", layoutHeroPhoneVideo);
    image.addEventListener("error", () => { trigger.hidden = true; });
    if (image.complete && image.naturalWidth) layoutHeroPhoneVideo();
    const frame = document.querySelector(".hero-image-frame");
    if (frame && typeof ResizeObserver === "function") new ResizeObserver(layoutHeroPhoneVideo).observe(frame);
    else window.addEventListener("resize", layoutHeroPhoneVideo);
  }

  function renderBenefits() {
    const mini = document.getElementById("miniBenefits");
    ["Modular", "Inteligente", "Para a sua vida"].forEach((title, index) => {
      const benefit = document.createElement("div");
      benefit.className = "mini-benefit";
      const icon = document.createElement("img");
      icon.src = `/landing/assets/icons/ui/gold/${["modular", "inteligente", "para-sua-vida"][index]}.svg`;
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

  // Load and decode the next WebP before switching its text and destination.
  // A monotonically increasing token prevents slower requests replacing newer ones.
  function preparedFeatureImage(src) {
    if (featureImageCache.has(src)) return featureImageCache.get(src);
    const image = new Image(900, 738);
    image.decoding = "async";
    image.id = "featureImage";
    const pending = new Promise((resolve, reject) => {
      image.onload = () => {
        const decoded = typeof image.decode === "function" ? image.decode() : Promise.resolve();
        decoded.then(() => resolve(image), () => resolve(image));
      };
      image.onerror = () => reject(new Error("Imagem indisponível"));
      image.src = src;
    }).catch((error) => {
      featureImageCache.delete(src);
      throw error;
    });
    featureImageCache.set(src, pending);
    return pending;
  }

  function select(environment, userInitiated = false) {
    const version = ++selectionVersion;
    selectedId = environment.id;
    track.querySelectorAll(".environment").forEach((card) => {
      const active = card.dataset.environmentId === selectedId;
      card.classList.toggle("is-selected", active);
      card.setAttribute("aria-pressed", String(active));
    });
    feature.classList.add("is-changing");
    feature.setAttribute("aria-busy", "true");

    function commit(image, failed) {
      if (version !== selectionVersion) return;
      if (image) {
        image.alt = environment.alt;
        if (image !== featureImage) featureImage.replaceWith(image);
        featureImage = image;
        featureImage.hidden = false;
      } else {
        featureImage.hidden = true;
      }
      featureImageFallback.hidden = !failed;
      feature.classList.toggle("has-image-error", failed);
      featureTitle.textContent = environment.name;
      featureDescription.textContent = environment.description;
      const available = Boolean(environment.destination);
      featureAction.hidden = !available;
      featureAvailability.hidden = available;
      if (available) {
        featureAction.href = environment.destination;
        featureAction.firstChild.textContent = `${environment.action} `;
      } else {
        featureAction.removeAttribute("href");
      }
      feature.hidden = false;
      feature.classList.remove("is-changing");
      feature.removeAttribute("aria-busy");
      if (userInitiated) {
        window.requestAnimationFrame(() => {
          if (version !== selectionVersion) return;
          (available ? featureAction : featureAvailability).scrollIntoView({
            behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth",
            block: "center",
            inline: "nearest"
          });
        });
      }
    }
    preparedFeatureImage(environment.featureImage).then(
      (image) => commit(image, false),
      () => commit(null, true)
    );
    revealCard(environment.id);
    if (userInitiated) stopHint();
  }
  function renderCards() {
    data.environments.forEach((environment, index) => {
      const card = document.createElement("button");
      card.type = "button"; card.className = "environment";
      card.dataset.environmentId = environment.id;
      card.setAttribute("aria-pressed", "false");
      const art = document.createElement("div"); art.className = "environment-art";
      const image = document.createElement("img");
      image.className = "environment-interior"; image.src = environment.image;
      image.alt = ""; image.width = 300; image.height = 246;
      image.loading = "lazy"; image.decoding = "async";
      art.append(image);
      const title = document.createElement("strong"); title.textContent = environment.name;
      const copy = document.createElement("span"); copy.textContent = environment.description;
      card.append(art, title, copy);
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
    if (bounds.right > viewport.right) goToPage(1);
    else if (bounds.left < viewport.left) goToPage(0);
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

  renderBenefits(); renderCards(); initHeroVideo();
  document.getElementById("previousPage").addEventListener("click", () => goToPage(0));
  document.getElementById("nextPage").addEventListener("click", () => goToPage(1));
  windowEl.addEventListener("scroll", () => { if (mobileMode()) { window.clearTimeout(windowEl.settleTimer); windowEl.settleTimer = window.setTimeout(() => { page = windowEl.scrollLeft >= maxScroll() / 2 ? 1 : 0; syncPagination(); }, 100); } }, { passive: true });
  window.addEventListener("resize", applyResponsive);
  document.addEventListener("pointerdown", stopHint, { once: true }); document.addEventListener("keydown", stopHint, { once: true });
  applyResponsive(); select(data.environments.find((item) => item.id === selectedId));
  if (!window.matchMedia("(prefers-reduced-motion: reduce)").matches) { window.setTimeout(() => { runHint(); hintTimer = window.setInterval(runHint, 10000); }, 700); }
})();
