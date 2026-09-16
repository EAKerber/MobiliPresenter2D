(function startConfigurator(global) {
  "use strict";

  const scene = global.CASA_EM_MODULOS_SCENE;
  const inlineMasks = global.CASA_EM_MODULOS_MASK_DATA;
  const core = global.CasaModulesCore;
  const visibility = global.CasaModulesVisibility;
  const validation = global.CasaModulesValidation;
  const fingerprint = global.CasaModulesFingerprint;
  const finishes = global.CasaModulesFinishes;
  const catalog = global.CASA_EM_MODULOS_CATALOG;
  const priceBook = global.CASA_EM_MODULOS_PRICE_BOOK;
  const pricing = global.CasaModulesPricing;

  if (!scene || !inlineMasks || !core || !visibility || !validation || !fingerprint || !finishes || !catalog || !priceBook || !pricing) {
    throw new Error("Não foi possível carregar os dados da cena 2D.");
  }
  validation.assertValidScene(scene);

  let state = core.createInitialState(scene);
  let finishMode = "original";
  let currentStep = "modules";

  const sceneBase = document.getElementById("sceneBase");
  const sceneLayers = document.getElementById("sceneLayers");
  const sceneHotspots = document.getElementById("sceneHotspots");
  const moduleList = document.getElementById("moduleList");
  const finishSwatches = document.getElementById("finishSwatches");
  const moduleDetail = document.getElementById("moduleDetail");
  const selectionFrame = document.getElementById("selectionFrame");
  const viewerHint = document.getElementById("viewerHint");
  const summaryContent = document.getElementById("summaryContent");
  const nextStepButton = document.getElementById("nextStepButton");
  const configurationValue = document.getElementById("configurationValue");
  const modulesPanel = document.getElementById("modulesPanel");
  const frontFinishPanel = document.getElementById("frontFinishPanel");
  const stonePanel = document.getElementById("stonePanel");
  const summaryPanel = document.getElementById("summaryPanel");
  const lightingToggle = document.getElementById("lightingToggle");
  const configurationAnnouncement = document.getElementById("configurationAnnouncement");
  const catalogByEntityId = new Map(catalog.modules.map((module) => [module.entityId, module]));

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
      .filter((entity) => entity.kind === "module")
      .sort((left, right) => left.zIndex - right.zIndex || left.id.localeCompare(right.id))
      .forEach((entity) => {
        const product = catalogByEntityId.get(entity.id);
        if (!product) return;
        const card = document.createElement("article");
        card.className = "module-card";
        card.dataset.entityId = entity.id;

        const toggleLabel = document.createElement("label");
        toggleLabel.className = "module-card__toggle";
        toggleLabel.htmlFor = `toggle-${entity.id}`;

        const input = document.createElement("input");
        input.id = `toggle-${entity.id}`;
        input.type = "checkbox";
        input.dataset.moduleToggle = entity.id;
        input.setAttribute("aria-label", `Incluir ${product.title}`);
        input.checked = state.visibilityByEntity[entity.id];

        const number = document.createElement("span");
        number.className = "module-number";
        number.textContent = entity.alias;

        const copy = document.createElement("span");
        copy.className = "module-card__copy";
        const title = document.createElement("strong");
        title.textContent = product.title;
        const dimensions = document.createElement("small");
        dimensions.textContent = product.dimensions.display;
        copy.append(title, dimensions);

        const detail = document.createElement("button");
        detail.type = "button";
        detail.className = "module-card__detail";
        detail.dataset.selectEntity = entity.id;
        detail.setAttribute("aria-controls", "moduleDetail");
        detail.setAttribute("aria-expanded", "false");
        detail.setAttribute("aria-label", `Ver detalhes de ${product.title}`);
        detail.textContent = "Ver";

        toggleLabel.append(input, number, copy);
        card.append(toggleLabel, detail);
        moduleList.append(card);
      });
  }

  function renderSceneHotspotsFromData() {
    sceneHotspots.replaceChildren();
    scene.entities
      .filter((entity) => entity.controllable && entity.kind === "module" && entity.alphaBounds)
      .sort((left, right) => left.zIndex - right.zIndex || left.id.localeCompare(right.id))
      .forEach((entity) => {
        const product = catalogByEntityId.get(entity.id);
        if (!product) return;
        const hotspot = document.createElement("button");
        hotspot.type = "button";
        hotspot.className = "scene-hotspot";
        hotspot.dataset.selectSceneEntity = entity.id;
        hotspot.dataset.entityId = entity.id;
        hotspot.setAttribute("aria-label", `Ver ficha de ${product.referenceLabel}, ${product.title}`);
        hotspot.setAttribute("aria-pressed", "false");
        hotspot.title = `${product.referenceLabel} · ${product.title}`;
        hotspot.style.zIndex = String(500 + entity.zIndex);
        Object.assign(hotspot.style, selectionStyle(entity));

        const tag = document.createElement("span");
        tag.className = "scene-hotspot__tag";
        tag.setAttribute("aria-hidden", "true");
        tag.textContent = entity.alias;
        hotspot.append(tag);
        sceneHotspots.append(hotspot);
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
      button.setAttribute("aria-pressed", "false");
      finishSwatches.append(button);
    });

    // Choices shown to buyers are deliberately limited to the published presets.
  }

  function selectionStyle(entity) {
    const bounds = entity?.alphaBounds;
    if (!bounds) return null;
    return {
      left: `${(bounds.x / scene.canvas.width) * 100}%`,
      top: `${(bounds.y / scene.canvas.height) * 100}%`,
      width: `${(bounds.width / scene.canvas.width) * 100}%`,
      height: `${(bounds.height / scene.canvas.height) * 100}%`
    };
  }

  function selectedFrontFinishLabel() {
    if (finishMode === "texture") return "Textura personalizada";
    const group = scene.finishGroups.find((candidate) => candidate.id === "fronts-all");
    if (state.frontFinishId === group?.defaultPresetId) return "Cinza Gianduia";
    const preset = group?.presets.find((candidate) => candidate.id === state.frontFinishId);
    return preset?.label || "Acabamento original";
  }

  function formatDimension(value) {
    return new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 1 }).format(value);
  }

  function createDetailList(items, className) {
    const list = document.createElement("ul");
    list.className = className;
    items.forEach((item) => {
      const listItem = document.createElement("li");
      listItem.textContent = item;
      list.append(listItem);
    });
    return list;
  }

  function createMaterialFact(label, value) {
    const fact = document.createElement("span");
    const heading = document.createElement("strong");
    heading.textContent = label;
    fact.append(heading, document.createTextNode(value));
    return fact;
  }

  function createOrientativeView(label, horizontalLabel, horizontalValue, verticalLabel, verticalValue) {
    const card = document.createElement("figure");
    card.className = "module-detail__view";
    const caption = document.createElement("figcaption");
    caption.textContent = label;

    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("viewBox", "0 0 180 126");
    svg.setAttribute("role", "img");
    svg.setAttribute("aria-label", `${label}: ${horizontalLabel} ${formatDimension(horizontalValue)} milímetros por ${verticalLabel} ${formatDimension(verticalValue)} milímetros`);

    const ratio = horizontalValue / Math.max(verticalValue, 1);
    const longSide = 88;
    const shortSide = 42;
    const drawingWidth = Math.max(shortSide, Math.min(longSide, ratio >= 1 ? longSide : longSide * ratio));
    const drawingHeight = Math.max(shortSide, Math.min(longSide, ratio >= 1 ? longSide / ratio : longSide));
    const x = 92 - drawingWidth / 2;
    const y = 61 - drawingHeight / 2;
    const make = (name, attributes = {}) => {
      const node = document.createElementNS("http://www.w3.org/2000/svg", name);
      Object.entries(attributes).forEach(([key, value]) => node.setAttribute(key, String(value)));
      return node;
    };
    const text = (value, xPosition, yPosition, anchor = "middle") => {
      const node = make("text", { x: xPosition, y: yPosition, "text-anchor": anchor });
      node.textContent = value;
      return node;
    };

    svg.append(
      make("line", { x1: x, y1: 17, x2: x + drawingWidth, y2: 17, class: "module-detail__dimension-line" }),
      make("line", { x1: x, y1: 13, x2: x, y2: 21, class: "module-detail__dimension-line" }),
      make("line", { x1: x + drawingWidth, y1: 13, x2: x + drawingWidth, y2: 21, class: "module-detail__dimension-line" }),
      text(`${horizontalLabel} ${formatDimension(horizontalValue)} mm`, 92, 10),
      make("line", { x1: 26, y1: y, x2: 26, y2: y + drawingHeight, class: "module-detail__dimension-line" }),
      make("line", { x1: 22, y1: y, x2: 30, y2: y, class: "module-detail__dimension-line" }),
      make("line", { x1: 22, y1: y + drawingHeight, x2: 30, y2: y + drawingHeight, class: "module-detail__dimension-line" }),
      make("rect", { x, y, width: drawingWidth, height: drawingHeight, rx: 2, class: "module-detail__view-shape" }),
      text(`${verticalLabel} ${formatDimension(verticalValue)} mm`, 16, y + drawingHeight / 2 + 3)
    );
    card.append(caption, svg);
    return card;
  }

  function createOrientativeViews(dimensions) {
    const section = document.createElement("section");
    section.className = "module-detail__views";
    const heading = document.createElement("h4");
    heading.textContent = "Vistas orientativas";
    const note = document.createElement("p");
    note.textContent = "Leitura das medidas nominais; não substitui desenho de instalação.";
    const grid = document.createElement("div");
    grid.className = "module-detail__views-grid";
    grid.append(
      createOrientativeView("Frontal", "L", dimensions.width, "A", dimensions.height),
      createOrientativeView("Lateral", "P", dimensions.depth, "A", dimensions.height),
      createOrientativeView("Planta", "L", dimensions.width, "P", dimensions.depth)
    );
    section.append(heading, note, grid);
    return section;
  }

  function updateSelection(resolved) {
    const entity = entitiesById.get(state.selectedEntityId);
    const product = catalogByEntityId.get(state.selectedEntityId);
    const isVisible = Boolean(entity && resolved?.[entity.id]?.visible);
    const style = isVisible ? selectionStyle(entity) : null;
    selectionFrame.hidden = !style;
    if (style) Object.assign(selectionFrame.style, style);
    if (!product) {
      moduleDetail.replaceChildren();
      viewerHint.textContent = "Selecione um módulo na cena para abrir sua ficha.";
      return;
    }

    viewerHint.textContent = `Ficha selecionada: ${product.title}`;
    moduleDetail.classList.toggle("is-unavailable", !isVisible);
    const detailHeader = document.createElement("header");
    detailHeader.className = "module-detail__header";
    const moduleNumber = document.createElement("span");
    moduleNumber.className = "module-detail__number";
    moduleNumber.textContent = entity.alias;
    const headerCopy = document.createElement("div");
    const eyebrow = document.createElement("p");
    eyebrow.className = "module-detail__eyebrow";
    eyebrow.textContent = `${product.referenceLabel.toUpperCase()} · ${product.category.toUpperCase()}`;
    const title = document.createElement("h3");
    title.textContent = product.title;
    title.tabIndex = -1;
    headerCopy.append(eyebrow, title);
    detailHeader.append(moduleNumber, headerCopy);

    const material = document.createElement("div");
    material.className = "module-detail__material";
    material.append(
      createMaterialFact("Frentes", selectedFrontFinishLabel()),
      createMaterialFact("Caixaria", "Branco TX")
    );

    const dimensions = document.createElement("p");
    dimensions.className = "module-detail__dimensions";
    dimensions.textContent = `Medidas nominais: ${product.dimensions.display}`;

    const technical = document.createElement("section");
    technical.className = "module-detail__technical";
    const technicalHeading = document.createElement("h4");
    technicalHeading.textContent = "Medidas nominais";
    const technicalGrid = document.createElement("dl");
    const dimensionsByName = [
      ["Largura", product.dimensions.nominalMm.width],
      ["Altura", product.dimensions.nominalMm.height],
      ["Profundidade", product.dimensions.nominalMm.depth]
    ];
    dimensionsByName.forEach(([label, value]) => {
      const group = document.createElement("div");
      const term = document.createElement("dt");
      term.textContent = label;
      const definition = document.createElement("dd");
      definition.textContent = `${formatDimension(value)} mm`;
      group.append(term, definition);
      technicalGrid.append(group);
    });
    technical.append(technicalHeading, technicalGrid);

    const orientativeViews = createOrientativeViews(product.dimensions.nominalMm);

    const benefitsSection = document.createElement("section");
    benefitsSection.className = "module-detail__section";
    const benefitsHeading = document.createElement("h4");
    benefitsHeading.textContent = "Destaques";
    benefitsSection.append(benefitsHeading, createDetailList(product.benefits, "module-detail__benefits"));

    const componentsSection = document.createElement("section");
    componentsSection.className = "module-detail__section";
    const componentsHeading = document.createElement("h4");
    componentsHeading.textContent = "Componentes inclusos";
    componentsSection.append(componentsHeading, createDetailList(product.components, "module-detail__components"));

    const requirements = document.createElement("p");
    requirements.className = "module-detail__requirements";
    const reason = resolved?.[entity.id]?.reason;
    if (reason === "requirement-hidden") {
      requirements.textContent = "Indisponível enquanto o módulo estrutural necessário estiver fora da composição.";
    } else if (product.requirements.length) {
      requirements.textContent = product.requirements[0];
    }
    title.id = "moduleDetailTitle";
    moduleDetail.setAttribute("aria-labelledby", title.id);
    const detailContent = [detailHeader, material, dimensions, technical, orientativeViews, benefitsSection, componentsSection];
    if (requirements.textContent) detailContent.push(requirements);
    moduleDetail.replaceChildren(...detailContent);
  }

  function updateModuleCards(resolved) {
    document.querySelectorAll(".module-card").forEach((card) => {
      const entityId = card.dataset.entityId;
      const entity = entitiesById.get(entityId);
      const result = resolved?.[entityId];
      const input = card.querySelector("input");
      const isVisible = Boolean(result?.visible);
      const blocked = result?.reason === "requirement-hidden" || result?.reason === "requirement-missing";
      card.classList.toggle("is-selected", state.selectedEntityId === entityId);
      card.classList.toggle("is-blocked", blocked);
      card.classList.toggle("is-included", isVisible);
      card.querySelector("[data-select-entity]")?.setAttribute("aria-expanded", String(state.selectedEntityId === entityId));
      if (input && entity) {
        input.checked = Boolean(state.visibilityByEntity[entity.id]);
        input.setAttribute("aria-describedby", blocked ? `blocked-${entity.id}` : "");
      }
      let status = card.querySelector(".module-card__status");
      if (!status) {
        status = document.createElement("small");
        status.className = "module-card__status";
        status.id = `blocked-${entityId}`;
        card.querySelector(".module-card__copy")?.append(status);
      }
      status.textContent = blocked ? "Requer suporte incluído" : isVisible ? "Incluído" : "Não incluído";
    });
  }

  function updateSceneHotspots(resolved) {
    sceneHotspots.querySelectorAll("[data-select-scene-entity]").forEach((hotspot) => {
      const entityId = hotspot.dataset.entityId;
      const isVisible = Boolean(resolved?.[entityId]?.visible);
      const isSelected = state.selectedEntityId === entityId;
      hotspot.hidden = !isVisible;
      hotspot.disabled = !isVisible;
      hotspot.classList.toggle("is-selected", isSelected);
      hotspot.setAttribute("aria-pressed", String(isSelected));
    });
  }

  function updateAccessoryControls(resolved) {
    const result = resolved?.["lighting-08"];
    if (!lightingToggle || !result) return;
    lightingToggle.checked = Boolean(state.visibilityByEntity["lighting-08"]);
    lightingToggle.closest(".accessory-toggle")?.classList.toggle(
      "is-blocked",
      result.reason === "requirement-hidden" || result.reason === "requirement-missing"
    );
  }

  function formatCurrency(cents) {
    return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(cents / 100);
  }

  function getEstimate(resolved) {
    return pricing.calculatePublicEstimate(scene, state, catalog, resolved, priceBook);
  }

  function renderCurrentValue(resolved) {
    const estimate = getEstimate(resolved);
    if (!configurationValue) return;
    if (estimate.status === "demo") {
      configurationValue.innerHTML = `<span>${estimate.label}</span><strong>${formatCurrency(estimate.totalCents)}</strong><small>Demo · não é orçamento</small>`;
      configurationValue.title = estimate.disclaimer;
      return;
    }
    configurationValue.innerHTML = "<span>Valor do conjunto</span><strong>Em configuração</strong>";
    configurationValue.removeAttribute("title");
  }

  function renderSummary(resolved) {
    const estimate = getEstimate(resolved);
    const included = catalog.modules.filter((module) => resolved?.[module.entityId]?.visible);
    const list = document.createElement("ul");
    list.className = "summary-list";
    included.forEach((module) => {
      const item = document.createElement("li");
      item.textContent = `${module.referenceLabel} · ${module.title}`;
      list.append(item);
    });
    const finish = document.createElement("p");
    finish.className = "summary-note";
    const finishGroup = scene.finishGroups.find((group) => group.id === "fronts-all");
    const finishPreset = finishGroup?.presets.find((preset) => preset.id === state.frontFinishId);
    finish.textContent = `Frentes: ${finishPreset?.label || "Original"}. Caixaria: Branco TX.`;
    const price = document.createElement("div");
    price.className = "price-state";
    if (estimate.status === "demo") {
      price.innerHTML = `<span>${estimate.label}</span><strong>${formatCurrency(estimate.totalCents)}</strong><p>${estimate.disclaimer}</p>`;
    } else if (estimate.status === "ready") {
      price.innerHTML = `<span>Valor estimado</span><strong>${formatCurrency(estimate.totalCents)}</strong>`;
    } else {
      price.innerHTML = "<span>Valor do conjunto</span><strong>Em configuração</strong><p>Os valores só aparecem depois que a tabela comercial for publicada.</p>";
    }
    summaryContent.replaceChildren(list, finish, price);
  }

  function syncStep(resolved) {
    const isModules = currentStep === "modules";
    const isFinishes = currentStep === "finishes";
    modulesPanel.hidden = !isModules;
    frontFinishPanel.hidden = !isFinishes;
    stonePanel.hidden = !isFinishes;
    summaryPanel.hidden = currentStep !== "summary";
    document.querySelectorAll("[data-step]").forEach((button) => {
      const active = button.dataset.step === currentStep;
      button.classList.toggle("is-active", active);
      button.setAttribute("aria-current", active ? "step" : "false");
    });
    const next = currentStep === "modules" ? "finishes" : currentStep === "finishes" ? "summary" : "modules";
    nextStepButton.textContent = currentStep === "summary" ? "Editar módulos" : `Continuar para ${next === "finishes" ? "acabamentos" : "resumo"} →`;
    renderSummary(resolved);
  }

  function announce(message) {
    if (configurationAnnouncement) configurationAnnouncement.textContent = message;
  }

  function focusCurrentStep() {
    const panel = currentStep === "modules"
      ? modulesPanel
      : currentStep === "finishes"
        ? frontFinishPanel
        : summaryPanel;
    const heading = panel.querySelector("h2");
    if (!heading) return;
    heading.focus({ preventScroll: true });
    panel.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function changeStep(nextStep, moveFocus) {
    currentStep = nextStep;
    syncLayerVisibility();
    if (moveFocus) requestAnimationFrame(focusCurrentStep);
  }

  renderSceneFromData();
  renderModuleControlsFromData();
  renderSceneHotspotsFromData();
  renderFinishControlsFromData();

  const moduleToggles = [...document.querySelectorAll("[data-module-toggle]")];
  const layerGroups = [...document.querySelectorAll(".layer-group")];
  const finishLayers = [...document.querySelectorAll(".finish-layer")];
  const entitiesById = new Map(scene.entities.map((entity) => [entity.id, entity]));
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

  const renderStone = global.CasaStone.createRenderer(document.getElementById("stoneCanvas"), global.CASA_STONE_DATA);

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

  function syncFinishMasks(resolved) {
    finishLayers.forEach((layer) => {
      const group = layer.closest(".layer-group");
      const entity = entitiesById.get(group?.dataset.entityId);
      const maskAsset = finishes.resolveMaskAsset(entity, resolved);
      if (!maskAsset || layer.dataset.maskAsset === maskAsset) return;
      const maskSource = inlineMasks[maskAsset];
      if (!maskSource) throw new Error(`Máscara incorporada ausente: ${maskAsset}`);
      layer.style.setProperty("--mask-image", `url("${maskSource}")`);
      layer.dataset.maskAsset = maskAsset;
    });
  }

  function syncLayerVisibility() {
    renderStone(state);
    const resolved = visibility.resolveVisibility(scene, state);
    syncFinishMasks(resolved);
    layerGroups.forEach((layer) => {
      const result = resolved[layer.dataset.entityId];
      const isVisible = Boolean(result?.visible);
      layer.classList.toggle("is-hidden", !isVisible);
      layer.setAttribute("aria-hidden", String(!isVisible));
      layer.dataset.visibilityReason = result?.reason || "default-hidden";
    });
    updateModuleCards(resolved);
    updateSceneHotspots(resolved);
    updateAccessoryControls(resolved);
    updateSelection(resolved);
    renderCurrentValue(resolved);
    syncStep(resolved);
  }

  function setEntityVisibility(entityId, isVisible) {
    if (!core.setEntityVisibility(state, entityId, isVisible)) return;
    const affected = [];
    const applyRequirements = (id) => {
      const entity = entitiesById.get(id);
      (entity?.requiresVisibleIds || []).forEach((requirementId) => {
        if (!state.visibilityByEntity[requirementId]) {
          core.setEntityVisibility(state, requirementId, true);
          affected.push(requirementId);
        }
        applyRequirements(requirementId);
      });
    };
    const removeDependents = (id) => {
      scene.entities
        .filter((entity) => (entity.requiresVisibleIds || []).includes(id) && state.visibilityByEntity[entity.id])
        .forEach((entity) => {
          core.setEntityVisibility(state, entity.id, false);
          affected.push(entity.id);
          removeDependents(entity.id);
        });
    };
    if (isVisible) applyRequirements(entityId);
    else removeDependents(entityId);
    syncLayerVisibility();
    if (affected.length) {
      const names = affected.map((id) => catalogByEntityId.get(id)?.title || catalog.accessories.find((item) => item.entityId === id)?.title || id);
      announce(isVisible ? `${names.join(", ")} incluído como suporte necessário.` : `${names.join(", ")} removido porque depende deste módulo.`);
    }
  }

  function selectEntity(entityId, source) {
    const product = catalogByEntityId.get(entityId);
    if (!product) return;
    state.selectedEntityId = entityId;
    if (currentStep !== "modules") currentStep = "modules";
    syncLayerVisibility();
    announce(`Ficha de ${product.referenceLabel}, ${product.title}, aberta.`);
    if (source === "scene") {
      requestAnimationFrame(() => {
        moduleDetail.querySelector("h3")?.focus({ preventScroll: true });
        moduleDetail.scrollIntoView({ behavior: "smooth", block: "nearest" });
      });
    }
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
    swatches.forEach((swatch) => {
      swatch.classList.remove("is-selected");
      swatch.setAttribute("aria-pressed", "false");
    });
  }

  function applyColor(color, selectedSwatch) {
    finishMode = "color";
    state.frontFinishId = selectedSwatch?.dataset.finishId || "solid-color-custom";
    state.customColor = color;
    state.customTextureKey = null;
    clearSelectedSwatch();
    if (selectedSwatch) {
      selectedSwatch.classList.add("is-selected");
      selectedSwatch.setAttribute("aria-pressed", "true");
    }
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

    if (customColor) customColor.value = color;
    textureLabel.textContent = "Carregar imagem de amadeirado";
    resetFinishButton.disabled = false;
    syncFingerprint();
    syncLayerVisibility();
    if (selectedSwatch) announce(`Frentes alteradas para ${selectedSwatch.title}.`);
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
      syncLayerVisibility();
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
    syncLayerVisibility();
  }

  moduleToggles.forEach((toggle) => {
    toggle.addEventListener("change", () => {
      setEntityVisibility(toggle.dataset.moduleToggle, toggle.checked);
      updateVisibleCount();
    });
  });

  if (showAllButton) showAllButton.addEventListener("click", () => setAllVisibility(true));
  if (hideAllButton) hideAllButton.addEventListener("click", () => setAllVisibility(false));

  if (gridButton) gridButton.addEventListener("click", () => {
    state.gridVisible = alignmentGrid.classList.toggle("is-visible");
    gridButton.setAttribute("aria-pressed", String(state.gridVisible));
    syncFingerprint();
  });

  swatches.forEach((swatch) => {
    swatch.addEventListener("click", () => applyColor(swatch.dataset.color, swatch));
  });

  if (customColor) customColor.addEventListener("input", () => applyColor(customColor.value));
  if (textureButton) textureButton.addEventListener("click", () => textureInput.click());
  if (textureInput) textureInput.addEventListener("change", () => applyTexture(textureInput.files?.[0]));
  resetFinishButton.addEventListener("click", resetFinish);

  moduleList.addEventListener("click", (event) => {
    const button = event.target.closest("[data-select-entity]");
    if (!button) return;
    event.preventDefault();
    selectEntity(button.dataset.selectEntity, "list");
  });

  sceneHotspots.addEventListener("click", (event) => {
    const hotspot = event.target.closest("[data-select-scene-entity]");
    if (!hotspot || hotspot.disabled) return;
    selectEntity(hotspot.dataset.selectSceneEntity, "scene");
  });

  document.querySelectorAll("[data-step]").forEach((button) => {
    button.addEventListener("click", () => {
      changeStep(button.dataset.step, true);
    });
  });

  nextStepButton.addEventListener("click", () => {
    changeStep(currentStep === "modules" ? "finishes" : currentStep === "finishes" ? "summary" : "modules", true);
  });

  lightingToggle.addEventListener("change", () => {
    setEntityVisibility("lighting-08", lightingToggle.checked);
    updateVisibleCount();
  });

  const stoneColor = document.getElementById("stoneColor");
  const resetStone = document.getElementById("resetStone");
  const stoneButtons = [...document.querySelectorAll("[data-stone-color]")];
  function applyStone(color) {
    state.stoneColor = color;
    state.stoneFinishId = color ? "stone-custom" : "stone-original";
    if (color) stoneColor.value = color;
    resetStone.disabled = !color;
    stoneButtons.forEach(button => {
      const selected = button.dataset.stoneColor === color;
      button.classList.toggle("is-selected", selected);
      button.setAttribute("aria-pressed", String(selected));
    });
    document.getElementById("stoneStatus").textContent = "Simulação de cor sobre a textura existente.";
    renderStone(state);
    syncFingerprint();
    syncLayerVisibility();
  }
  stoneButtons.forEach(button => button.addEventListener("click", () => applyStone(button.dataset.stoneColor)));
  stoneColor.addEventListener("input", () => applyStone(stoneColor.value));
  resetStone.addEventListener("click", () => applyStone(null));

  restoreButton.addEventListener("click", () => {
    if (!global.confirm("Recomeçar a configuração? Suas escolhas atuais serão removidas.")) return;
    state = core.createInitialState(scene);
    setAllVisibility(true);
    resetFinish();
    applyStone(null);
    alignmentGrid.classList.remove("is-visible");
    if (gridButton) gridButton.setAttribute("aria-pressed", "false");
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
