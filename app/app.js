(function startConfigurator(global) {
  "use strict";

  const scene = global.CASA_EM_MODULOS_SCENE;
  const inlineMasks = global.CASA_EM_MODULOS_MASK_DATA;
  const core = global.CasaModulesCore;
  const visibility = global.CasaModulesVisibility;
  const validation = global.CasaModulesValidation;
  const fingerprint = global.CasaModulesFingerprint;
  const finishes = global.CasaModulesFinishes;

  if (!scene || !inlineMasks || !core || !visibility || !validation || !fingerprint || !finishes) {
    throw new Error("Não foi possível carregar os dados da cena 2D.");
  }
  validation.assertValidScene(scene);

  let state = core.createInitialState(scene);
  let finishMode = "original";

  const sceneBase = document.getElementById("sceneBase");
  const sceneLayers = document.getElementById("sceneLayers");
  const moduleList = document.getElementById("moduleList");
  const finishSwatches = document.getElementById("finishSwatches");

  function renderSceneFromData() {
    sceneBase.src = scene.baseAsset;
    sceneBase.width = scene.canvas.width;
    sceneBase.height = scene.canvas.height;
    sceneLayers.replaceChildren();

    scene.entities
      .slice()
      .sort((left, right) => left.zIndex - right.zIndex || left.id.localeCompare(right.id))
      .forEach((entity) => {
        const group = document.createElement("div");
        group.className = "layer-group";
        group.dataset.entityId = entity.id;
        group.dataset.module = entity.alias;

        const image = document.createElement("img");
        image.src = entity.asset;
        image.alt = "";
        image.draggable = false;
        image.width = scene.canvas.width;
        image.height = scene.canvas.height;
        group.append(image);

        if (entity.maskAsset) {
          const maskSource = inlineMasks[entity.maskAsset];
          if (!maskSource) throw new Error(`Máscara incorporada ausente: ${entity.maskAsset}`);
          const finishLayer = document.createElement("div");
          finishLayer.className = "finish-layer";
          finishLayer.style.setProperty("--mask-image", `url("${maskSource}")`);
          finishLayer.dataset.maskAsset = entity.maskAsset;
          group.append(finishLayer);
        }

        sceneLayers.append(group);
      });
  }

  function renderModuleControlsFromData() {
    moduleList.replaceChildren();

    scene.entities
      .filter((entity) => entity.controllable)
      .sort((left, right) => left.zIndex - right.zIndex || left.id.localeCompare(right.id))
      .forEach((entity) => {
        const label = document.createElement("label");
        label.className = "module-row";
        label.htmlFor = `toggle-${entity.id}`;

        const input = document.createElement("input");
        input.id = `toggle-${entity.id}`;
        input.type = "checkbox";
        input.dataset.moduleToggle = entity.id;
        input.checked = state.visibilityByEntity[entity.id];

        const number = document.createElement("span");
        number.className = "module-number";
        number.textContent = entity.alias;

        const text = document.createElement("span");
        text.textContent = entity.label;

        label.append(input, number, text);
        moduleList.append(label);
      });
  }

  function renderFinishControlsFromData() {
    const finishGroup = scene.finishGroups.find((group) => group.id === "fronts-all");
    finishSwatches.replaceChildren();

    finishGroup.presets.forEach((preset) => {
      const button = document.createElement("button");
      button.className = "swatch";
      button.type = "button";
      button.dataset.finishId = preset.id;
      button.dataset.color = preset.color;
      button.dataset.overlayOpacity = String(finishes.resolveOverlayOpacity(preset, preset.color));
      button.style.setProperty("--swatch", preset.color);
      button.title = preset.label;
      button.setAttribute("aria-label", `Aplicar ${preset.label}`);
      finishSwatches.append(button);
    });

    const customLabel = document.createElement("label");
    customLabel.className = "custom-color";
    customLabel.title = "Escolher outra cor";

    const customMarker = document.createElement("span");
    const customInput = document.createElement("input");
    customInput.id = "customColor";
    customInput.type = "color";
    customInput.value = "#918981";
    customInput.setAttribute("aria-label", "Escolher outra cor");
    customLabel.append(customMarker, customInput);
    finishSwatches.append(customLabel);
  }

  renderSceneFromData();
  renderModuleControlsFromData();
  renderFinishControlsFromData();

  const moduleToggles = [...document.querySelectorAll("[data-module-toggle]")];
  const layerGroups = [...document.querySelectorAll(".layer-group")];
  const finishLayers = [...document.querySelectorAll(".finish-layer")];
  const swatches = [...document.querySelectorAll("[data-color]")];

  const visibleCount = document.getElementById("visibleCount");
  const totalCount = document.getElementById("totalCount");
  const showAllButton = document.getElementById("showAllButton");
  const hideAllButton = document.getElementById("hideAllButton");
  const gridButton = document.getElementById("gridButton");
  const alignmentGrid = document.getElementById("alignmentGrid");
  const restoreButton = document.getElementById("restoreButton");
  const customColor = document.getElementById("customColor");
  const textureInput = document.getElementById("textureInput");
  const textureButton = document.getElementById("textureButton");
  const textureLabel = document.getElementById("textureLabel");
  const resetFinishButton = document.getElementById("resetFinishButton");

  function syncFingerprint() {
    const value = fingerprint.computeFingerprint(scene, state);
    document.body.dataset.sceneFingerprint = value;
    global.CASA_EM_MODULOS_CURRENT_FINGERPRINT = value;
  }

  function updateVisibleCount() {
    visibleCount.textContent = String(visibility.getVisibleControllableEntities(scene, state).length);
    totalCount.textContent = String(scene.entities.filter((entity) => entity.controllable).length);
    syncFingerprint();
  }

  function syncLayerVisibility() {
    const resolved = visibility.resolveVisibility(scene, state);
    layerGroups.forEach((layer) => {
      const result = resolved[layer.dataset.entityId];
      const isVisible = Boolean(result?.visible);
      layer.classList.toggle("is-hidden", !isVisible);
      layer.setAttribute("aria-hidden", String(!isVisible));
      layer.dataset.visibilityReason = result?.reason || "default-hidden";
    });
  }

  function setEntityVisibility(entityId, isVisible) {
    if (!core.setEntityVisibility(state, entityId, isVisible)) return;
    syncLayerVisibility();
  }

  function setAllVisibility(isVisible) {
    core.setAllControllableVisibility(scene, state, isVisible);
    moduleToggles.forEach((toggle) => {
      toggle.checked = isVisible;
    });
    syncLayerVisibility();
    updateVisibleCount();
  }

  function clearSelectedSwatch() {
    swatches.forEach((swatch) => swatch.classList.remove("is-selected"));
  }

  function applyColor(color, selectedSwatch) {
    finishMode = "color";
    state.frontFinishId = selectedSwatch?.dataset.finishId || "solid-color-custom";
    state.customColor = color;
    state.customTextureKey = null;
    clearSelectedSwatch();
    if (selectedSwatch) selectedSwatch.classList.add("is-selected");
    const overlayOpacity = finishes.resolveOverlayOpacity(
      selectedSwatch
        ? { overlayOpacity: Number(selectedSwatch.dataset.overlayOpacity) }
        : null,
      color
    );

    finishLayers.forEach((layer) => {
      layer.classList.remove("is-texture");
      layer.classList.add("is-color");
      layer.style.backgroundImage = "none";
      layer.style.backgroundColor = color;
      layer.style.setProperty("--finish-opacity", String(overlayOpacity));
    });

    customColor.value = color;
    textureLabel.textContent = "Carregar imagem de amadeirado";
    resetFinishButton.disabled = false;
    syncFingerprint();
  }

  function applyTexture(file) {
    if (!file) return;

    const reader = new FileReader();
    reader.addEventListener("load", () => {
      if (typeof reader.result !== "string") return;
      finishMode = "texture";
      state.frontFinishId = "uploaded-texture";
      state.customColor = null;
      state.customTextureKey = `${file.name}:${file.size}:${file.lastModified}`;
      clearSelectedSwatch();

      finishLayers.forEach((layer) => {
        layer.classList.remove("is-color");
        layer.classList.add("is-texture");
      layer.style.backgroundColor = "transparent";
      layer.style.backgroundImage = `url("${reader.result}")`;
      layer.style.removeProperty("--finish-opacity");
      });

      textureLabel.textContent = file.name;
      resetFinishButton.disabled = false;
      syncFingerprint();
    });
    reader.readAsDataURL(file);
  }

  function resetFinish() {
    finishMode = "original";
    state.frontFinishId = scene.defaultConfiguration.frontFinishId;
    state.customColor = null;
    state.customTextureKey = null;
    clearSelectedSwatch();
    finishLayers.forEach((layer) => {
      layer.classList.remove("is-color", "is-texture");
      layer.style.backgroundColor = "transparent";
      layer.style.backgroundImage = "none";
      layer.style.removeProperty("--finish-opacity");
    });
    textureLabel.textContent = "Carregar imagem de amadeirado";
    textureInput.value = "";
    resetFinishButton.disabled = true;
    syncFingerprint();
  }

  moduleToggles.forEach((toggle) => {
    toggle.addEventListener("change", () => {
      setEntityVisibility(toggle.dataset.moduleToggle, toggle.checked);
      updateVisibleCount();
    });
  });

  showAllButton.addEventListener("click", () => setAllVisibility(true));
  hideAllButton.addEventListener("click", () => setAllVisibility(false));

  gridButton.addEventListener("click", () => {
    state.gridVisible = alignmentGrid.classList.toggle("is-visible");
    gridButton.setAttribute("aria-pressed", String(state.gridVisible));
    syncFingerprint();
  });

  swatches.forEach((swatch) => {
    swatch.addEventListener("click", () => applyColor(swatch.dataset.color, swatch));
  });

  customColor.addEventListener("input", () => applyColor(customColor.value));
  textureButton.addEventListener("click", () => textureInput.click());
  textureInput.addEventListener("change", () => applyTexture(textureInput.files?.[0]));
  resetFinishButton.addEventListener("click", resetFinish);

  restoreButton.addEventListener("click", () => {
    state = core.createInitialState(scene);
    setAllVisibility(true);
    resetFinish();
    alignmentGrid.classList.remove("is-visible");
    gridButton.setAttribute("aria-pressed", "false");
    syncFingerprint();
  });

  if (finishMode === "original") resetFinishButton.disabled = true;
  syncLayerVisibility();
  updateVisibleCount();
  global.CASA_EM_MODULOS_DEBUG = Object.freeze({
    getState: () => state,
    getVisibility: () => visibility.resolveVisibility(scene, state),
    scene
  });
})(window);
