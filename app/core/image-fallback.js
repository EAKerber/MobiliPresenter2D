(function (global) {
  "use strict";
  function ensureFallback(frame) {
    let fallback = frame.querySelector(".image-fallback");
    if (fallback) return fallback;
    fallback = document.createElement("div");
    fallback.className = "image-fallback";
    fallback.hidden = true;
    const icon = document.createElement("span");
    icon.className = "image-fallback__icon";
    icon.setAttribute("aria-hidden", "true");
    icon.textContent = "▧";
    const status = document.createElement("span");
    status.className = "image-fallback__status";
    status.textContent = "Imagem indisponível";
    const description = document.createElement("span");
    description.className = "image-fallback__description";
    fallback.append(icon, status, description);
    frame.append(fallback);
    return fallback;
  }
  function scan() {
    document.querySelectorAll("[data-image-fallback]").forEach((frame) => {
      if (frame.dataset.imageFallbackBound === "true") return;
      const image = Array.from(frame.querySelectorAll("img[alt]"))
        .find((candidate) => candidate.alt.trim() !== "");
      if (!image) return;
      frame.dataset.imageFallbackBound = "true";
      const fallback = ensureFallback(frame);
      const status = fallback.querySelector(".image-fallback__status");
      const description = fallback.querySelector(".image-fallback__description");
      if (!status || !description) return;
      const showFallback = () => {
        const alt = image.alt.trim();
        const label = status.textContent.trim() || "Imagem indisponível";
        description.textContent = alt;
        fallback.setAttribute("role", "img");
        fallback.setAttribute("aria-label", label + ": " + alt);
        image.hidden = true;
        fallback.hidden = false;
        // Some compact cards need an internal scroll area for the full alt text.
        // Make only those fallbacks keyboard reachable; avoid 19 extra tab stops.
        if (fallback.scrollHeight > fallback.clientHeight + 2) {
          fallback.setAttribute("tabindex", "0");
        } else {
          fallback.removeAttribute("tabindex");
        }
      };
      const restoreImage = () => {
        image.hidden = false;
        fallback.hidden = true;
        fallback.removeAttribute("role");
        fallback.removeAttribute("aria-label");
        fallback.removeAttribute("tabindex");
      };
      image.addEventListener("error", showFallback);
      image.addEventListener("load", restoreImage);
      if (image.complete && image.naturalWidth === 0) showFallback();
    });
  }
  global.PublicImageFallback = { scan };
  scan();
})(globalThis);
