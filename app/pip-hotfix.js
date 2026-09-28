(function installMobilePipHotfix(global) {
  "use strict";

  const root = document.documentElement;
  const viewerCard = document.getElementById("viewerCard");
  const resizeHandle = document.getElementById("mobileSceneResize");
  if (!viewerCard || !resizeHandle) return;

  const clamp = (value, minimum, maximum) => Math.min(Math.max(value, minimum), maximum);

  // Hotfix transparency: the old mode faded the scene over the card's dark
  // surface, which looked like dimming. Make the card itself transparent and
  // use a clearly translucent scene so content behind the floating PiP shows
  // through while PiP controls remain fully opaque.
  const style = document.createElement("style");
  style.id = "mobile-pip-hotfix-style";
  style.textContent = `
    @media (max-width: 700px) {
      body.is-mobile-scene-transparent.is-mobile-scene-pinned .viewer-card {
        background: transparent !important;
        border-color: rgba(255,255,255,.24) !important;
        box-shadow: 0 4px 14px rgba(0,0,0,.12) !important;
        backdrop-filter: none !important;
      }
      body.is-mobile-scene-transparent.is-mobile-scene-pinned .viewer {
        opacity: .28 !important;
        background: transparent !important;
      }
      body.is-mobile-scene-transparent.is-mobile-scene-pinned .viewer-pip-controls,
      body.is-mobile-scene-transparent.is-mobile-scene-pinned .viewer-pip-resize,
      body.is-mobile-scene-transparent.is-mobile-scene-pinned .viewer-card__footer {
        opacity: 1 !important;
      }
    }
  `;
  document.head.append(style);

  // The original resize handler updates width on every pointermove. Intercept
  // pointerdown in capture phase and replace it with a release-to-commit flow:
  // movement only computes the pending size; layout changes once on pointerup.
  resizeHandle.addEventListener("pointerdown", (event) => {
    if (!document.body.classList.contains("is-mobile-scene-pinned")) return;
    if (event.button !== 0 && event.pointerType !== "touch") return;

    event.preventDefault();
    event.stopImmediatePropagation();

    const startRect = viewerCard.getBoundingClientRect();
    const startWidth = startRect.width;
    const startRight = startRect.right;
    const startX = event.clientX;
    const pointerId = event.pointerId;
    let pendingWidth = startWidth;
    let pendingLeft = startRect.left;

    resizeHandle.setPointerCapture?.(pointerId);
    resizeHandle.dataset.resizing = "true";

    const move = (moveEvent) => {
      if (moveEvent.pointerId !== pointerId) return;
      const maxWidth = Math.max(150, Math.min(global.innerWidth - 16, 360));
      pendingWidth = clamp(startWidth - (moveEvent.clientX - startX), 140, maxWidth);
      pendingLeft = clamp(startRight - pendingWidth, 8, Math.max(8, global.innerWidth - pendingWidth - 8));
      resizeHandle.dataset.pendingWidth = String(Math.round(pendingWidth));
    };

    const cleanup = () => {
      global.removeEventListener("pointermove", move, true);
      global.removeEventListener("pointerup", commit, true);
      global.removeEventListener("pointercancel", cancel, true);
      resizeHandle.releasePointerCapture?.(pointerId);
      delete resizeHandle.dataset.resizing;
      delete resizeHandle.dataset.pendingWidth;
    };

    const commit = (upEvent) => {
      if (upEvent.pointerId !== pointerId) return;
      root.style.setProperty("--mobile-pip-width", pendingWidth + "px");
      root.style.setProperty("--mobile-pip-left", pendingLeft + "px");
      root.style.setProperty("--mobile-pip-right", "auto");
      viewerCard.dataset.pipPositioned = "true";
      cleanup();
    };

    const cancel = (cancelEvent) => {
      if (cancelEvent.pointerId !== pointerId) return;
      cleanup();
    };

    global.addEventListener("pointermove", move, true);
    global.addEventListener("pointerup", commit, true);
    global.addEventListener("pointercancel", cancel, true);
  }, true);
})(window);
