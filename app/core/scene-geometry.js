(function registerSceneGeometry(global) {
  "use strict";

  function boundsToPercent(entity, scene) {
    const bounds = entity?.alphaBounds;
    if (!bounds || !scene?.canvas?.width || !scene?.canvas?.height) return null;
    return {
      left: `${bounds.x / scene.canvas.width * 100}%`,
      top: `${bounds.y / scene.canvas.height * 100}%`,
      width: `${bounds.width / scene.canvas.width * 100}%`,
      height: `${bounds.height / scene.canvas.height * 100}%`
    };
  }

  function resolveMarkerPlacement(entity, product) {
    const preferredSide = entity?.markerPlacement?.side;
    return { side: ["top", "right", "bottom", "left"].includes(preferredSide) ? preferredSide : product?.category === "Aéreo" ? "bottom" : "top" };
  }

  global.CasaSceneGeometry = Object.freeze({ boundsToPercent, resolveMarkerPlacement });
})(window);
