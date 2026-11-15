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

  function layoutHeroPhoneScreen() {
    const frame = document.querySelector(".hero-image-frame");
    const art = document.querySelector(".hero-art");
    const image = frame && frame.querySelector("img");
    const screenElement = document.getElementById("heroPhoneScreen");
    const player = screenElement && screenElement.querySelector(".hero-phone-player");
    if (!frame || !art || !image || !screenElement || !player || !image.naturalWidth || !image.naturalHeight) return;

    const frameWidth = frame.clientWidth;
    const frameHeight = frame.clientHeight;
    if (!frameWidth || !frameHeight) return;
    const coverScale = Math.max(frameWidth / image.naturalWidth, frameHeight / image.naturalHeight);
    const minimumPhoneScale = Math.min(0.56, Math.max(0.52, frameWidth / 616));
    const scale = Math.max(coverScale, minimumPhoneScale);
    const renderedWidth = image.naturalWidth * scale;
    const renderedHeight = image.naturalHeight * scale;
    const offsetX = (frameWidth - renderedWidth) / 2;
    const screen = { left: 333, top: 590, width: 358, height: 719 };
    const offsetY = screen.top * scale * 0.3;

    image.style.left = `${offsetX}px`;
    image.style.top = `-${offsetY}px`;
    image.style.width = `${renderedWidth}px`;
    image.style.height = `${renderedHeight}px`;
    screenElement.style.left = `${offsetX + screen.left * scale}px`;
    screenElement.style.top = `${screen.top * scale - offsetY}px`;
    screenElement.style.width = `${screen.width * scale}px`;
    screenElement.style.height = `${screen.height * scale}px`;
    screenElement.hidden = false;

    const artMinimum = frameWidth <= 680 ? 350 : frameWidth <= 900 ? Math.max(340, Math.min(frameWidth * 0.56, 500)) : 420;
    const phoneBottom = (screen.top + screen.height + 35) * scale - offsetY;
    art.style.minHeight = `${Math.ceil(Math.max(artMinimum, phoneBottom))}px`;
  }

  function initHeroPhoneScreen() {
    const image = document.querySelector(".hero-image-frame > img");
    const screenElement = document.getElementById("heroPhoneScreen");
    const media = document.getElementById("heroPhoneMedia");
    const poster = document.getElementById("heroPhonePoster");
    const playToggle = document.getElementById("heroPhonePlayToggle");
    const fullscreenToggle = document.getElementById("heroPhoneFullscreen");
    const videoId = screenElement && screenElement.querySelector(".hero-phone-player") && screenElement.querySelector(".hero-phone-player").dataset.videoId;
    if (!image || !screenElement || !media || !poster || !playToggle || !fullscreenToggle || !videoId) return;

    let apiPromise = null;
    let youtubePlayer = null;
    let playerRequested = false;

    function syncPlaybackControl(playing) {
      playToggle.setAttribute("aria-label", playing ? "Pausar o vídeo" : "Reproduzir o vídeo");
      playToggle.querySelector("[data-play-icon]").hidden = playing;
      playToggle.querySelector("[data-pause-icon]").hidden = !playing;
    }

    function togglePlayback() {
      if (!youtubePlayer) {
        if (!playerRequested) poster.click();
        return;
      }
      const isPlaying = youtubePlayer.getPlayerState() === window.YT.PlayerState.PLAYING;
      if (isPlaying) youtubePlayer.pauseVideo();
      else youtubePlayer.playVideo();
    }

    function syncFullscreenControl() {
      const isFullscreen = document.fullscreenElement === screenElement || document.webkitFullscreenElement === screenElement;
      fullscreenToggle.setAttribute("aria-label", isFullscreen ? "Sair da tela cheia" : "Tela cheia");
    }

    function toggleFullscreen() {
      const isFullscreen = document.fullscreenElement === screenElement || document.webkitFullscreenElement === screenElement;
      if (isFullscreen) {
        const exitFullscreen = document.exitFullscreen || document.webkitExitFullscreen;
        if (exitFullscreen) exitFullscreen.call(document);
        return;
      }
      const requestFullscreen = screenElement.requestFullscreen || screenElement.webkitRequestFullscreen;
      if (requestFullscreen) {
        const result = requestFullscreen.call(screenElement);
        if (result && typeof result.catch === "function") result.catch(() => {});
      }
    }

    playToggle.addEventListener("click", togglePlayback);
    fullscreenToggle.addEventListener("click", toggleFullscreen);
    document.addEventListener("fullscreenchange", syncFullscreenControl);
    document.addEventListener("webkitfullscreenchange", syncFullscreenControl);

    function loadYouTubeIframeApi() {
      if (window.YT && window.YT.Player) return Promise.resolve(window.YT);
      if (apiPromise) return apiPromise;
      apiPromise = new Promise((resolve, reject) => {
        const previousReady = window.onYouTubeIframeAPIReady;
        const script = document.createElement("script");
        script.id = "casaYouTubeIframeApi";
        script.src = "https://www.youtube.com/iframe_api";
        script.async = true;
        window.onYouTubeIframeAPIReady = () => {
          if (typeof previousReady === "function") {
            try { previousReady(); } catch (_) {}
          }
          resolve(window.YT);
        };
        script.addEventListener("error", () => {
          apiPromise = null;
          reject(new Error("Não foi possível carregar o player do YouTube."));
        }, { once: true });
        document.head.append(script);
      });
      return apiPromise;
    }

    function revealPlayingVideo() {
      if (media.classList.contains("is-playing")) return;
      media.classList.add("is-playing");
      poster.disabled = true;
      poster.setAttribute("aria-hidden", "true");
      const removePoster = () => poster.remove();
      poster.addEventListener("transitionend", (event) => {
        if (event.propertyName === "opacity") removePoster();
      }, { once: true });
      window.setTimeout(removePoster, 320);
    }

    function handlePlayerError(event) {
      if (media.classList.contains("is-playing")) return;
      youtubePlayer = null;
      playerRequested = false;
      poster.disabled = false;
      poster.removeAttribute("aria-hidden");
      syncPlaybackControl(false);
      const iframe = event && event.target && event.target.getIframe ? event.target.getIframe() : media.querySelector("iframe");
      if (iframe) iframe.remove();
    }

    poster.addEventListener("click", () => {
      if (playerRequested) return;
      playerRequested = true;
      poster.disabled = true;

      const iframe = document.createElement("iframe");
      iframe.className = "hero-phone-media__iframe";
      iframe.title = "Casa em Módulos — apresentação institucional";
      iframe.loading = "eager";
      iframe.referrerPolicy = "strict-origin-when-cross-origin";
      iframe.allow = "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share; fullscreen";
      iframe.allowFullscreen = true;
      const params = new URLSearchParams({
        autoplay: "1",
        controls: "0",
        enablejsapi: "1",
        fs: "1",
        origin: window.location.origin,
        playsinline: "1",
        rel: "0"
      });
      iframe.src = "https://www.youtube-nocookie.com/embed/" + encodeURIComponent(videoId) + "?" + params.toString();
      media.append(iframe);

      loadYouTubeIframeApi().then((YT) => {
        youtubePlayer = new YT.Player(iframe, {
          events: {
            onReady: (event) => event.target.playVideo(),
            onStateChange: (event) => {
              if (event.data === YT.PlayerState.PLAYING) {
                syncPlaybackControl(true);
                revealPlayingVideo();
              } else if (event.data === YT.PlayerState.PAUSED || event.data === YT.PlayerState.ENDED) {
                syncPlaybackControl(false);
              }
            },
            onError: handlePlayerError
          }
        });
      }).catch(() => {
        playerRequested = false;
        poster.disabled = false;
        syncPlaybackControl(false);
        if (iframe.parentNode) iframe.remove();
      });
    });

    image.addEventListener("load", layoutHeroPhoneScreen);
    image.addEventListener("error", () => { screenElement.hidden = true; });
    if (image.complete && image.naturalWidth) layoutHeroPhoneScreen();
    const frame = document.querySelector(".hero-image-frame");
    if (frame && typeof ResizeObserver === "function") new ResizeObserver(layoutHeroPhoneScreen).observe(frame);
    else window.addEventListener("resize", layoutHeroPhoneScreen);
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

  renderBenefits(); renderCards(); initHeroPhoneScreen();
  document.getElementById("previousPage").addEventListener("click", () => goToPage(0));
  document.getElementById("nextPage").addEventListener("click", () => goToPage(1));
  windowEl.addEventListener("scroll", () => { if (mobileMode()) { window.clearTimeout(windowEl.settleTimer); windowEl.settleTimer = window.setTimeout(() => { page = windowEl.scrollLeft >= maxScroll() / 2 ? 1 : 0; syncPagination(); }, 100); } }, { passive: true });
  window.addEventListener("resize", applyResponsive);
  document.addEventListener("pointerdown", stopHint, { once: true }); document.addEventListener("keydown", stopHint, { once: true });
  applyResponsive(); select(data.environments.find((item) => item.id === selectedId));
  if (!window.matchMedia("(prefers-reduced-motion: reduce)").matches) { window.setTimeout(() => { runHint(); hintTimer = window.setInterval(runHint, 10000); }, 700); }
})();
