(function registerSceneComponent(global) {
  "use strict";
  function selectionStyle(entity, scene) {
    const bounds = entity?.alphaBounds;
    if (!bounds) return null;
    return {
      left: `${bounds.x / scene.canvas.width * 100}%`, top: `${bounds.y / scene.canvas.height * 100}%`,
      width: `${bounds.width / scene.canvas.width * 100}%`, height: `${bounds.height / scene.canvas.height * 100}%`
    };
  }
  function resolveMarkerPlacement(entity, product) {
    const preferredSide = entity?.markerPlacement?.side;
    return { side: ["top", "right", "bottom", "left"].includes(preferredSide) ? preferredSide : product?.category === "Aéreo" ? "bottom" : "top" };
  }
  function renderLayers(scene, base, layers, inlineMasks = null, assetPrefix = "") {
    base.src = `${assetPrefix}${scene.baseAsset}`;
    base.width = scene.canvas.width; base.height = scene.canvas.height;
    layers.replaceChildren();
    scene.entities.slice().sort((a, b) => a.zIndex - b.zIndex || a.id.localeCompare(b.id)).forEach((entity) => {
      const group = document.createElement("div");
      group.className = "layer-group"; group.dataset.entityId = entity.id; group.dataset.module = entity.alias;
      const image = document.createElement("img");
      image.src = `${assetPrefix}${entity.asset}`; image.alt = ""; image.draggable = false;
      image.width = scene.canvas.width; image.height = scene.canvas.height; group.append(image);
      if (inlineMasks && entity.maskAsset) {
        const maskSource = inlineMasks[entity.maskAsset];
        if (!maskSource) throw new Error(`Máscara incorporada ausente: ${entity.maskAsset}`);
        const finishLayer = document.createElement("div"); finishLayer.className = "finish-layer";
        finishLayer.style.setProperty("--mask-image", `url("${maskSource}")`); finishLayer.dataset.maskAsset = entity.maskAsset; group.append(finishLayer);
        const key = /^module-(\d{2})$/.exec(entity.id)?.[1];
        if (key) ["shadow", "highlight"].forEach((kind) => {
          const structureAsset = `assets/kitchen/masks/structure-${key}-${kind}.png`;
          const structureMask = inlineMasks[structureAsset];
          if (!structureMask) throw new Error(`Máscara estrutural incorporada ausente: ${structureAsset}`);
          const structureLayer = document.createElement("div"); structureLayer.className = `structure-layer structure-layer--${kind}`;
          structureLayer.style.setProperty("--structure-mask-image", `url("${structureMask}")`); structureLayer.dataset.structureAsset = structureAsset; group.append(structureLayer);
        });
      }
      layers.append(group);
    });
  }
  function renderHotspots(scene, products, target, assetPrefix = "") {
    const productByEntity = products instanceof Map ? products : new Map(products.map((p) => [p.entityId || p.id, p]));
    target.replaceChildren();
    scene.entities.filter((entity) => entity.controllable && entity.kind === "module" && entity.alphaBounds)
      .sort((a, b) => a.zIndex - b.zIndex || a.id.localeCompare(b.id)).forEach((entity) => {
        const product = productByEntity.get(entity.id); if (!product) return;
        const bounds = entity.alphaBounds, button = document.createElement("button");
        button.type = "button"; button.className = "scene-hotspot";
        button.classList.toggle("scene-hotspot--aerial", product.category === "Aéreo");
        button.dataset.selectSceneEntity = entity.id; button.dataset.entityId = entity.id;
        button.dataset.markerSide = resolveMarkerPlacement(entity, product).side;
        button.setAttribute("aria-label", `Ver ficha de ${product.referenceLabel || product.number || entity.alias}, ${product.title || entity.label}`);
        button.setAttribute("aria-pressed", "false"); button.title = `${product.referenceLabel || product.number || entity.alias} · ${product.title || entity.label}`;
        button.style.zIndex = String(500 + entity.zIndex);
        Object.assign(button.style, selectionStyle(entity, scene));
        const tag = document.createElement("span"); tag.className = "scene-hotspot__tag"; tag.setAttribute("aria-hidden", "true"); tag.textContent = entity.alias; button.append(tag); target.append(button);
      });
  }
  function updateHotspots(target, resolved, selectedId) {
    target.querySelectorAll("[data-select-scene-entity]").forEach((button) => {
      const id = button.dataset.entityId, visible = Boolean(resolved?.[id]?.visible), selected = selectedId === id;
      button.hidden = !visible; button.disabled = !visible; button.tabIndex = visible ? 0 : -1;
      button.setAttribute("aria-disabled", String(!visible)); button.classList.toggle("is-selected", selected); button.setAttribute("aria-pressed", String(selected));
    });
  }
  function renderSelectionFrame(frame, entity, scene) {
    const style = selectionStyle(entity, scene); frame.hidden = !style;
    if (style) Object.assign(frame.style, style);
  }
  function applyFinishAppearance({ scene, layers, products, inlineMasks, resolved, finish, finishApi, assetPrefix = "" }) {
    const productByEntity = products instanceof Map ? products : new Map(products.map((product) => [product.entityId || product.id, product]));
    layers.querySelectorAll(".finish-layer").forEach((layer) => {
      const group = layer.closest(".layer-group"), entity = scene.entities.find((item) => item.id === group?.dataset.entityId);
      const product = productByEntity.get(entity?.id);
      if (!product?.commercial?.finishEligible) return;
      const maskAsset = finishApi.resolveMaskAsset(entity, resolved);
      const maskSource = inlineMasks?.[maskAsset];
      if (maskSource) { layer.style.setProperty("--mask-image", `url("${maskSource}")`); layer.dataset.maskAsset = maskAsset; }
      layer.classList.toggle("is-texture", Boolean(finish.textureAsset)); layer.classList.add("is-color");
      const texture = finish.textureAsset ? `${assetPrefix}${finish.textureAsset}` : finish.textureCss;
      layer.style.backgroundImage = texture ? `url("${texture}")` : "none";
      layer.style.backgroundColor = finish.color;
      layer.style.backgroundSize = finish.textureSize || "160px 160px";
      layer.style.setProperty("--finish-brightness", String(finish.textureBrightness || 1));
      layer.style.setProperty("--finish-opacity", String(finishApi.resolveOverlayOpacity(finish, finish.color)));
      const structure = finishApi.resolveStructureStrength(finish, finish.color);
      group.style.setProperty("--structure-shadow-opacity", String(structure.shadowOpacity));
      group.style.setProperty("--structure-highlight-opacity", String(structure.highlightOpacity));
    });
  }
  function bindKeyboard(target, modules, getSelectedId, select) {
    const ids = modules.map((module) => module.entityId || module.id);
    document.addEventListener("keydown", (event) => {
      const activeElement = document.activeElement;
      const editable = event.target?.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(event.target?.tagName);
      const viewerIdle = target.dataset.keyboardGlobal === "true" && (!activeElement || activeElement === document.body || activeElement === document.documentElement);
      const sceneHasFocus = target.contains(event.target) || target.contains(activeElement);
      if (editable || event.altKey || event.ctrlKey || event.metaKey || (!sceneHasFocus && !viewerIdle)) return;
      if (!ids.length || event.target?.closest?.("a, button:not(.scene-hotspot), [role='textbox']")) return;
      const selected = getSelectedId(), index = ids.indexOf(selected);
      let destination = null;
      if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
        destination = ids[(Math.max(0, index) + (event.key === "ArrowRight" ? 1 : -1) + ids.length) % ids.length];
      } else if (/^[1-7]$/.test(event.key)) {
        const module = modules.find((item) => String(Number(String(item.referenceLabel || item.number || item.id).match(/\d+/)?.[0])) === event.key);
        destination = module && (module.entityId || module.id);
      }
      if (destination && destination !== selected) {
        event.preventDefault(); select(destination);
        target.querySelectorAll("[data-select-scene-entity]").forEach((button) => {
          if (button.dataset.entityId === destination && !button.disabled) button.focus({ preventScroll: true });
        });
      }
    });
  }
  function createSelectionFrame() {
    const frame = document.createElement("div"); frame.className = "selection-frame"; frame.setAttribute("aria-hidden", "true"); return frame;
  }
  global.CasaModulesSceneComponent = Object.freeze({ renderLayers, renderHotspots, updateHotspots, renderSelectionFrame, applyFinishAppearance, bindKeyboard, createSelectionFrame, resolveMarkerPlacement });
})(window);
