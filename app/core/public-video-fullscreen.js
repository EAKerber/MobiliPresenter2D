(function exposePublicVideoFullscreen(root) {
  "use strict";

  function bind(button, target, copy, fallbackUrl) {
    if (!button || !target || !copy || !root.document) return false;

    const document = root.document;
    const activeElement = () => document.fullscreenElement || document.webkitFullscreenElement || null;
    const syncButton = () => {
      const isFullscreen = activeElement() === target;
      const label = isFullscreen ? copy.close : copy.open;
      button.dataset.fullscreen = isFullscreen ? "active" : "inactive";
      button.setAttribute("aria-label", label);
      button.setAttribute("title", label);
      button.setAttribute("aria-pressed", String(isFullscreen));
    };

    button.addEventListener("click", () => {
      if (activeElement() === target) {
        const exit = document.exitFullscreen || document.webkitExitFullscreen;
        if (exit) Promise.resolve(exit.call(document)).catch(() => {});
        return;
      }

      const request = target.requestFullscreen || target.webkitRequestFullscreen;
      if (!request) {
        if (fallbackUrl) root.open(fallbackUrl, "_blank", "noopener,noreferrer");
        return;
      }

      try { Promise.resolve(request.call(target)).catch(() => {}); } catch (_) {}
    });

    document.addEventListener("fullscreenchange", syncButton);
    document.addEventListener("webkitfullscreenchange", syncButton);
    syncButton();
    return true;
  }

  root.CasaPublicVideoFullscreen = Object.freeze({ bind });
})(window);
