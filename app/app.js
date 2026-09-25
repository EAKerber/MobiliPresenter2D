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
  const frontGuides = global.CASA_FRONT_GUIDES || {};
  const priceBook = global.CASA_EM_MODULOS_PRICE_BOOK;
  const pricing = global.CasaModulesPricing;

  if (!scene || !inlineMasks || !core || !visibility || !validation || !fingerprint || !finishes || !catalog || !priceBook || !pricing) {
    throw new Error("Não foi possível carregar os dados da cena 2D.");
  }
  validation.assertValidScene(scene);

  let state = core.createInitialState(scene);
  let currentStep = "modules";
  let activeFinishModuleId = null;
  let detailOrigin = null;
  let mobileScenePinEnabled = true;
  let mobileSceneIsMini = false;
  let mobileSceneTransparent = false;
  let mobileSceneAnchorHeight = 0;

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
  const servicesPanel = document.getElementById("servicesPanel");
  const summaryPanel = document.getElementById("summaryPanel");
  const lightingToggle = document.getElementById("lightingToggle");
  const configurationAnnouncement = document.getElementById("configurationAnnouncement");
  const handleOptions = document.getElementById("handleOptions");
  const servicesChecklist = document.getElementById("servicesChecklist");
  const finishTargetSelect = document.getElementById("finishTargetSelect");
  const selectedFinishName = document.getElementById("selectedFinishName");
  const stonePackageOptions = document.getElementById("stonePackageOptions");
  const stoneSkirtingToggle = document.getElementById("stoneSkirtingToggle");
  const plinthCanvas = document.getElementById("plinthCanvas");
  const viewerCard = document.getElementById("viewerCard");
  const viewerAnchor = document.getElementById("viewerAnchor");
  const viewerPinSentinel = document.getElementById("viewerPinSentinel");
  const mobileScenePin = document.getElementById("mobileScenePin");
  const mobileSceneOpacity = document.getElementById("mobileSceneOpacity");
  const mobileSceneResize = document.getElementById("mobileSceneResize");
  const flowNav = document.querySelector(".flow-nav");
  const catalogByEntityId = new Map(catalog.modules.map((module) => [module.entityId, module]));
  const detailPageByEntity = new Map();
  const detailInteractionByEntity = new Set();
  const detailViewsCollapsedByEntity = new Set();
  let detailCarouselTimer = null;
  let lastResolved = null;

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

          const moduleKey = /^module-(\d{2})$/.exec(entity.id)?.[1];
          if (moduleKey) {
            ["shadow", "highlight"].forEach((kind) => {
              const structureAsset = "assets/kitchen/masks/structure-" + moduleKey + "-" + kind + ".png";
              const structureMask = inlineMasks[structureAsset];
              if (!structureMask) throw new Error("Máscara estrutural incorporada ausente: " + structureAsset);
              const structureLayer = document.createElement("div");
              structureLayer.className = "structure-layer structure-layer--" + kind;
              structureLayer.style.setProperty("--structure-mask-image", 'url("' + structureMask + '")');
              structureLayer.dataset.structureAsset = structureAsset;
              group.append(structureLayer);
            });
          }
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
        if (entity.alphaBounds.y < scene.canvas.height * 0.12) tag.classList.add("scene-hotspot__tag--below");
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

  function renderHandleControlsFromData() {
    if (!handleOptions) return;
    handleOptions.replaceChildren();
    catalog.options.handles.forEach((handle) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "handle-option";
      button.dataset.handleId = handle.id;
      button.setAttribute("aria-pressed", "false");
      button.setAttribute("aria-label", `Selecionar puxador ${handle.label}`);

      const orientation = document.createElement("span");
      orientation.className = "handle-option__orientation";
      orientation.setAttribute("aria-hidden", "true");
      const door = document.createElement("i");
      door.className = "handle-option__door";
      const drawer = document.createElement("i");
      drawer.className = "handle-option__drawer";
      orientation.append(door, drawer);

      const copy = document.createElement("span");
      copy.className = "handle-option__copy";
      const label = document.createElement("strong");
      label.textContent = handle.label;
      const description = document.createElement("small");
      const value = priceBook.handleEntries?.[handle.id] || 0;
      description.textContent = value ? `${handle.description} · ${formatCurrency(value)}` : handle.description;
      copy.append(label, description);
      button.append(orientation, copy);
      handleOptions.append(button);
    });
  }

  function renderServices() {
    if (!servicesChecklist) return;
    servicesChecklist.replaceChildren();
    catalog.services.forEach((service) => {
      const card = document.createElement("label");
      card.className = "service-check";
      const input = document.createElement("input");
      input.type = "checkbox";
      input.checked = service.status === "included";
      input.disabled = service.status === "included";
      input.setAttribute("aria-label", `${service.title}: incluída`);
      const copy = document.createElement("span");
      const title = document.createElement("strong");
      title.textContent = service.title;
      const description = document.createElement("small");
      description.textContent = service.description;
      const status = document.createElement("em");
      status.textContent = "Incluída";
      copy.append(title, description, status);
      card.append(input, copy);
      servicesChecklist.append(card);
    });
  }

  function availableFinishTargetIds() {
    return catalog.modules
      .filter((product) => product.commercial?.finishEligible)
      .filter((product) => lastResolved?.[product.entityId]?.visible || state.visibilityByEntity[product.entityId])
      .map((product) => product.entityId);
  }

  function ensureFinishTarget() {
    const ids = availableFinishTargetIds();
    const currentIsEligible = ids.includes(activeFinishModuleId);
    if (!currentIsEligible) {
      const handleAnchor = catalog.modules.find((product) => ids.includes(product.entityId) && product.commercial?.handleEligible);
      activeFinishModuleId = handleAnchor?.entityId || ids[0] || null;
    }
    return activeFinishModuleId;
  }

  function selectedModuleFinish(product) {
    return core.moduleSelection(state, product?.entityId || ensureFinishTarget()).finishId || core.BASE_FINISH_ID;
  }

  function selectedFrontFinishLabel(product) {
    const id = selectedModuleFinish(product);
    return catalog.options.finishes.find((finish) => finish.id === id)?.publicLabel || "Base clara";
  }

  function selectedHandle(product) {
    const id = core.moduleSelection(state, product?.entityId || ensureFinishTarget()).handleId || "none";
    return catalog.options.handles.find((handle) => handle.id === id) || catalog.options.handles[0];
  }

  function renderFinishTargetOptions() {
    if (!finishTargetSelect) return;
    const targetId = ensureFinishTarget();
    finishTargetSelect.replaceChildren();
    availableFinishTargetIds().forEach((entityId) => {
      const product = catalogByEntityId.get(entityId);
      if (!product) return;
      const option = document.createElement("option");
      option.value = entityId;
      option.textContent = product.referenceLabel + " · " + product.title;
      option.selected = entityId === targetId;
      finishTargetSelect.append(option);
    });
    finishTargetSelect.disabled = !targetId;
  }

  function renderFinishControlsFromData() {
    const targetId = ensureFinishTarget();
    const product = catalogByEntityId.get(targetId);
    renderFinishTargetOptions();
    finishSwatches.replaceChildren();
    const currentId = selectedModuleFinish(product);
    catalog.options.finishes.filter((finish) => finish.status === "published").forEach((finish) => {
      const button = document.createElement("button");
      button.className = "swatch";
      button.type = "button";
      button.dataset.finishId = finish.id;
      button.dataset.color = finish.color;
      button.style.setProperty("--swatch", finish.color);
      button.style.setProperty("--swatch-image", finish.textureAsset ? `url("${finish.textureAsset}")` : "none");
      button.style.setProperty("--swatch-size", finish.textureSize || "cover");
      button.title = finish.publicLabel + (finish.adjustmentLabel ? " · " + finish.adjustmentLabel : "");
      button.setAttribute("aria-label", "Aplicar " + finish.publicLabel + " ao conjunto");
      const selected = currentId === finish.id;
      button.classList.toggle("is-selected", selected);
      button.setAttribute("aria-pressed", String(selected));
      finishSwatches.append(button);
    });
    if (selectedFinishName) selectedFinishName.textContent = selectedFrontFinishLabel(product);
  }

  function renderHandleControlsFromData() {
    if (!handleOptions) return;
    const anchorId = ensureFinishTarget();
    const product = catalogByEntityId.get(anchorId);
    const help = document.getElementById("handleHelp");
    handleOptions.replaceChildren();
    if (!product) {
      if (help) help.textContent = "Inclua ao menos um módulo configurável.";
      return;
    }
    if (help) help.textContent = "Uma escolha para o conjunto; o adicional local usa a quantidade de frentes de cada módulo.";
    const current = selectedHandle(product);
    catalog.options.handles.forEach((handle) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "handle-option";
      button.dataset.handleId = handle.id;
      const active = handle.id === current.id;
      button.classList.toggle("is-selected", active);
      button.setAttribute("aria-pressed", String(active));
      button.setAttribute("aria-label", "Selecionar puxador " + handle.label + " para o conjunto");

      const orientation = document.createElement("span");
      orientation.className = "handle-option__orientation";
      orientation.setAttribute("aria-hidden", "true");
      const door = document.createElement("i");
      door.className = "handle-option__door";
      const drawer = document.createElement("i");
      drawer.className = "handle-option__drawer";
      orientation.append(door, drawer);

      const copy = document.createElement("span");
      copy.className = "handle-option__copy";
      const label = document.createElement("strong");
      label.textContent = handle.label;
      const description = document.createElement("small");
      const perFront = priceBook.handleEntries?.[handle.id] || 0;
      description.textContent = perFront ? handle.description + " · " + formatCurrency(perFront) + " por puxador." : handle.description;
      copy.append(label, description);
      button.append(orientation, copy);
      handleOptions.append(button);
    });
  }

  function renderStonePackages() {
    if (!stonePackageOptions) return;
    stonePackageOptions.replaceChildren();
    const activeId = state.globalSelections?.stonePackageId || "stone-existing";
    catalog.options.stonePackages.forEach((stone) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "global-option";
      button.dataset.stonePackageId = stone.id;
      button.classList.toggle("is-selected", stone.id === activeId);
      button.setAttribute("aria-pressed", String(stone.id === activeId));
      button.setAttribute("aria-label", "Selecionar " + stone.label);

      const swatch = document.createElement("span");
      swatch.className = "stone-swatch";
      swatch.setAttribute("aria-hidden", "true");
      swatch.style.setProperty("--stone-swatch", stone.swatchColor || stone.color || "#aaa");
      swatch.style.setProperty("--stone-swatch-image", stone.textureAsset ? `url("${stone.textureAsset}")` : "none");
      swatch.style.setProperty("--stone-swatch-size", stone.textureAsset ? "cover" : "auto");

      const copy = document.createElement("span");
      copy.className = "global-option__copy";
      const title = document.createElement("strong");
      title.textContent = stone.label;
      const description = document.createElement("small");
      const value = priceBook.globalEntries?.[stone.id] || 0;
      description.textContent = stone.description + (value ? " · +" + formatCurrency(value) : " · sem adicional.");
      copy.append(title, description);
      button.append(swatch, copy);
      stonePackageOptions.append(button);
    });
    if (stoneSkirtingToggle) stoneSkirtingToggle.checked = Boolean(state.globalSelections?.serviceIds?.includes("stone-skirting"));
  }

  function renderServices() {
    if (!servicesChecklist) return;
    servicesChecklist.replaceChildren();
    const selected = new Set(state.globalSelections?.serviceIds || []);
    catalog.services.forEach((service) => {
      const card = document.createElement("label");
      card.className = "service-check";
      const input = document.createElement("input");
      input.type = "checkbox";
      input.dataset.globalServiceId = service.id;
      input.checked = selected.has(service.id);
      input.setAttribute("aria-label", service.title);
      const copy = document.createElement("span");
      const title = document.createElement("strong");
      title.textContent = service.title;
      const description = document.createElement("small");
      const value = priceBook.globalEntries?.[service.id] || 0;
      description.textContent = service.description + (value ? " · +" + formatCurrency(value) : "");
      copy.append(title, description);
      card.append(input, copy);
      servicesChecklist.append(card);
    });
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

  function selectedFrontFinishLabel(product) {
    const target = product || catalogByEntityId.get(ensureFinishTarget());
    const id = selectedModuleFinish(target);
    return catalog.options.finishes.find((finish) => finish.id === id)?.publicLabel || "Base clara";
  }

  function selectedHandle(product) {
    const id = core.moduleSelection(state, product?.entityId || ensureFinishTarget()).handleId || "none";
    return catalog.options.handles.find((handle) => handle.id === id) || catalog.options.handles[0];
  }

  function selectedStoneLabel() {
    const id = state.globalSelections?.stonePackageId || "stone-existing";
    return catalog.options.stonePackages.find((stone) => stone.id === id)?.label || "Pedra existente";
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

  function valueImpactLabel(cents) {
    if (!cents) return "Sem adicional";
    return cents > 0 ? `+${formatCurrency(cents)}` : `−${formatCurrency(Math.abs(cents))}`;
  }

  function appendPriceBreakdownRow(list, label, value, detail) {
    const row = document.createElement("div");
    const term = document.createElement("dt");
    term.textContent = label;
    const definition = document.createElement("dd");
    const amount = document.createElement("strong");
    amount.textContent = value;
    definition.append(amount);
    if (detail) {
      const note = document.createElement("small");
      note.textContent = detail;
      definition.append(note);
    }
    row.append(term, definition);
    list.append(row);
  }

  function createItemPriceBreakdown(product, itemPricing) {
    const breakdown = document.createElement("dl");
    breakdown.className = "module-detail__price-breakdown";
    const adjustments = pricing.sharedAdjustments(catalog, state, priceBook);
    const handle = selectedHandle();
    const appliesHandle = product.category && product.category !== "Estrutural";
    const includedServices = catalog.services
      .filter((service) => service.status === "included")
      .map((service) => service.title)
      .join(", ");
    appendPriceBreakdownRow(breakdown, "Módulo", formatCurrency(itemPricing.baseCents), "Valor-base do módulo.");
    appendPriceBreakdownRow(
      breakdown,
      "Puxador",
      appliesHandle ? formatCurrency(itemPricing.handleCents) : "Não aplicável",
      appliesHandle ? handle.label : "Painel estrutural sem puxador."
    );
    appendPriceBreakdownRow(breakdown, "Frentes", formatCurrency(adjustments.frontCents), `${selectedFrontFinishLabel()} · ${valueImpactLabel(adjustments.frontCents)}.`);
    appendPriceBreakdownRow(breakdown, "Pedra", formatCurrency(adjustments.stoneCents), `${selectedStoneLabel()} · ${valueImpactLabel(adjustments.stoneCents)}.`);
    appendPriceBreakdownRow(breakdown, "Serviço", formatCurrency(adjustments.serviceCents), `${includedServices || "Nenhum"} · ${valueImpactLabel(adjustments.serviceCents)}.`);
    return breakdown;
  }

  function createCommercialItemPriceBreakdown(product, itemPricing) {
    const breakdown = document.createElement("dl");
    breakdown.className = "module-detail__price-breakdown";
    appendPriceBreakdownRow(breakdown, "Módulo", formatCurrency(itemPricing.baseCents), "Valor-base do módulo.");
    if (itemPricing.finishCents) {
      appendPriceBreakdownRow(
        breakdown,
        "Acabamento",
        "+" + formatCurrency(itemPricing.finishCents),
        selectedFrontFinishLabel(product) + " · adicional percentual do módulo."
      );
    }
    if (itemPricing.handleCents) {
      const handle = selectedHandle(product);
      const frontCount = itemPricing.handleFrontCount || 0;
      const perFrontCents = itemPricing.handlePerFrontCents || 0;
      const allocationNote = frontCount
        ? frontCount + " frente(s) × " + formatCurrency(perFrontCents) + " por puxador."
        : "Sem frentes com puxador neste módulo.";
      appendPriceBreakdownRow(breakdown, "Puxador", "+" + formatCurrency(itemPricing.handleCents), handle.label + " · " + allocationNote);
    }
    if (itemPricing.localCents) {
      appendPriceBreakdownRow(breakdown, "Pedra cooktop", "+" + formatCurrency(itemPricing.localCents), "Obrigatória neste módulo.");
    }
    return breakdown;
  }

  function createOrientativeInternalFront(dimensions, layout) {
    const card = document.createElement("figure");
    card.className = "module-detail__view";
    const caption = document.createElement("figcaption");
    caption.textContent = "Vista interna";

    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("viewBox", "0 0 180 126");
    svg.setAttribute("role", "img");
    const segmentsLabel = layout.segments.map((segment) => `${segment.label} ${formatDimension(segment.spanMm)} milímetros`).join(", ");
    svg.setAttribute("aria-label", `Vista interna frontal: ${segmentsLabel}.`);
    const make = (name, attributes = {}) => {
      const node = document.createElementNS("http://www.w3.org/2000/svg", name);
      Object.entries(attributes).forEach(([key, value]) => node.setAttribute(key, String(value)));
      return node;
    };
    const text = (value, xPosition, yPosition) => {
      const node = make("text", { x: xPosition, y: yPosition, "text-anchor": "middle" });
      node.textContent = value;
      return node;
    };
    const x = 48, y = 30, width = 94, height = 61;
    let cursorMm = 0;
    const diagram = [
      make("line", { x1: x, y1: 17, x2: x + width, y2: 17, class: "module-detail__dimension-line" }),
      make("line", { x1: x, y1: 13, x2: x, y2: 21, class: "module-detail__dimension-line" }),
      make("line", { x1: x + width, y1: 13, x2: x + width, y2: 21, class: "module-detail__dimension-line" }),
      text(`L ${formatDimension(dimensions.width)} mm`, x + width / 2, 10),
      make("rect", { x, y, width, height, rx: 2, class: "module-detail__view-shape" })
    ];
    layout.segments.forEach((segment, index) => {
      cursorMm += segment.spanMm;
      const segmentEnd = x + (cursorMm / dimensions.width) * width;
      if (index < layout.segments.length - 1) {
        diagram.push(make("line", { x1: segmentEnd, y1: y, x2: segmentEnd, y2: y + height, class: "module-detail__view-shape" }));
      }
      if (segment.subdivisions) {
        const segmentStartMm = cursorMm - segment.spanMm;
        const segmentStart = x + (segmentStartMm / dimensions.width) * width;
        for (let part = 1; part < segment.subdivisions; part += 1) {
          const divisionY = y + (height / segment.subdivisions) * part;
          diagram.push(make("line", { x1: segmentStart, y1: divisionY, x2: segmentEnd, y2: divisionY, class: "module-detail__view-shape" }));
        }
      }
    });
    diagram.push(text(layout.segments.map((segment) => formatDimension(segment.spanMm)).join(" · "), x + width / 2, 108));
    svg.append(...diagram);
    card.append(caption, svg);
    return card;
  }

  function createCarouselPage(label, content, note) {
    const page = document.createElement("section");
    page.className = "module-detail__carousel-page";
    const heading = document.createElement("h4");
    heading.textContent = label;
    const contentArea = document.createElement("div");
    contentArea.className = "module-detail__carousel-content";
    contentArea.append(content);
    page.append(heading, contentArea);
    if (note) {
      const description = document.createElement("p");
      description.className = "module-detail__carousel-note";
      description.textContent = note;
      page.append(description);
    }
    return page;
  }

  function createModuleFocus(entity, product) {
    const bounds = entity.alphaBounds;
    const focus = document.createElement("div");
    focus.className = "module-detail__focus";
    focus.style.setProperty("--focus-ratio", `${bounds.width} / ${bounds.height}`);
    const image = document.createElement("img");
    image.src = entity.asset;
    image.alt = `Recorte isolado de ${product.title}`;
    image.draggable = false;
    image.style.width = `${(scene.canvas.width / bounds.width) * 100}%`;
    image.style.left = `${-(bounds.x / bounds.width) * 100}%`;
    image.style.top = `${-(bounds.y / bounds.height) * 100}%`;
    focus.append(image);
    return focus;
  }

  function drawingSpecFor(product) {
    const nominal = product.dimensions.nominalMm;
    if (product.drawingSpec?.kind === "panel") {
      return {
        kind: "panel",
        faceWidthMm: product.drawingSpec.faceWidthMm,
        faceHeightMm: product.drawingSpec.faceHeightMm,
        extrusionMm: product.drawingSpec.thicknessMm,
        faceHorizontalLabel: product.drawingSpec.faceHorizontalLabel,
        extrusionLabel: product.drawingSpec.extrusionLabel
      };
    }
    return {
      kind: "cabinet",
      faceWidthMm: nominal.width,
      faceHeightMm: nominal.height,
      extrusionMm: nominal.depth,
      faceHorizontalLabel: "L",
      extrusionLabel: "P"
    };
  }

  function detailDimensionFacts(product) {
    const dimensions = product.dimensions.nominalMm;
    if (product.drawingSpec?.kind === "panel") {
      return [
        ["Altura", product.drawingSpec.faceHeightMm],
        ["Profundidade", product.drawingSpec.faceWidthMm],
        ["Espessura", product.drawingSpec.thicknessMm]
      ];
    }
    return [
      ["Largura", dimensions.width],
      ["Altura", dimensions.height],
      ["Profundidade", dimensions.depth]
    ];
  }

  function dimensionSummary(product) {
    const axes = product.dimensions.displayAxes ? ` (${product.dimensions.displayAxes})` : "";
    return `Medidas nominais: ${product.dimensions.display}${axes}`;
  }

  function fitProportionalBox(widthMm, heightMm, maxWidth = 104, maxHeight = 64) {
    const safeWidth = Math.max(Number(widthMm) || 1, 1);
    const safeHeight = Math.max(Number(heightMm) || 1, 1);
    const scale = Math.min(maxWidth / safeWidth, maxHeight / safeHeight);
    return { width: safeWidth * scale, height: safeHeight * scale, scale };
  }

  function svgFactory(svg) {
    return (name, attributes = {}) => {
      const node = document.createElementNS("http://www.w3.org/2000/svg", name);
      Object.entries(attributes).forEach(([key, value]) => node.setAttribute(key, String(value)));
      svg.append(node);
      return node;
    };
  }

  function svgLabel(make, value, x, y, anchor = "middle") {
    const label = make("text", { x, y, "text-anchor": anchor });
    label.textContent = value;
    return label;
  }

  function appendGuideLines(make, guide, x, y, width, height) {
    (guide?.lines || []).forEach((line) => {
      make("line", {
        x1: x + line.x1 * width,
        y1: y + line.y1 * height,
        x2: x + line.x2 * width,
        y2: y + line.y2 * height,
        class: "module-detail__view-shape module-detail__view-guide-line"
      });
    });
  }

  function appendFrontSegments(make, product, x, y, width, height, faceWidthMm) {
    const layout = product?.frontLayout;
    if (layout?.status === "confirmed" && layout?.segments?.length) {
      const segmentsWidthMm = layout.innerWidthMm || layout.segments.reduce((total, segment) => total + (segment.spanMm || 0), 0);
      if (!segmentsWidthMm) return;
      const visibleWidth = width * Math.min(segmentsWidthMm, faceWidthMm) / faceWidthMm;
      const startX = x + (width - visibleWidth) / 2;
      let cursorMm = 0;
      layout.segments.forEach((segment, index) => {
        const segmentWidthMm = segment.spanMm || 0;
        const segmentStart = startX + (cursorMm / segmentsWidthMm) * visibleWidth;
        cursorMm += segmentWidthMm;
        const segmentEnd = startX + (cursorMm / segmentsWidthMm) * visibleWidth;
        if (index < layout.segments.length - 1) {
          make("line", { x1: segmentEnd, y1: y, x2: segmentEnd, y2: y + height, class: "module-detail__view-shape" });
        }
        if (segment.subdivisions) {
          for (let part = 1; part < segment.subdivisions; part += 1) {
            const divisionY = y + (height / segment.subdivisions) * part;
            make("line", { x1: segmentStart, y1: divisionY, x2: segmentEnd, y2: divisionY, class: "module-detail__view-shape" });
          }
        }
      });
      return;
    }

    const guide = frontGuides[product?.entityId];
    if (guide?.lines?.length) {
      appendGuideLines(make, guide, x, y, width, height);
      return;
    }

    if (layout?.pattern === "two-doors") {
      const middle = x + width / 2;
      make("line", { x1: middle, y1: y, x2: middle, y2: y + height, class: "module-detail__view-shape" });
      return;
    }
    if (layout?.pattern === "two-doors-and-lift") {
      const liftBottom = y + height * 0.34;
      const middle = x + width / 2;
      make("line", { x1: x, y1: liftBottom, x2: x + width, y2: liftBottom, class: "module-detail__view-shape" });
      make("line", { x1: middle, y1: liftBottom, x2: middle, y2: y + height, class: "module-detail__view-shape" });
    }
  }

  function createProportionalView(product, type) {
    const spec = drawingSpecFor(product);
    const isSide = type === "side";
    const horizontalMm = isSide ? spec.extrusionMm : spec.faceWidthMm;
    const horizontalLabel = isSide ? spec.extrusionLabel : spec.faceHorizontalLabel;
    const fit = fitProportionalBox(horizontalMm, spec.faceHeightMm);
    const isAmplifiedThickness = spec.kind === "panel" && isSide && fit.width < 2.5;
    const drawingWidth = isAmplifiedThickness ? 2.5 : fit.width;
    const drawingHeight = fit.height;
    const x = 94 - drawingWidth / 2;
    const y = 62 - drawingHeight / 2;
    const figure = document.createElement("figure");
    figure.className = "module-detail__view module-detail__view--technical";
    const caption = document.createElement("figcaption");
    caption.textContent = isSide ? "Vista lateral" : "Vista frontal";
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("viewBox", "0 0 180 126");
    svg.setAttribute("role", "img");
    svg.setAttribute("aria-label", `${caption.textContent}: ${horizontalLabel} ${formatDimension(horizontalMm)} milímetros por A ${formatDimension(spec.faceHeightMm)} milímetros${isAmplifiedThickness ? ". A espessura foi ampliada apenas para legibilidade." : "."}`);
    const make = svgFactory(svg);
    make("line", { x1: x, y1: 17, x2: x + drawingWidth, y2: 17, class: "module-detail__dimension-line" });
    make("line", { x1: x, y1: 13, x2: x, y2: 21, class: "module-detail__dimension-line" });
    make("line", { x1: x + drawingWidth, y1: 13, x2: x + drawingWidth, y2: 21, class: "module-detail__dimension-line" });
    svgLabel(make, `${horizontalLabel} ${formatDimension(horizontalMm)} mm`, 94, 10);
    make("line", { x1: Math.max(14, x - 18), y1: y, x2: Math.max(14, x - 18), y2: y + drawingHeight, class: "module-detail__dimension-line" });
    make("line", { x1: Math.max(10, x - 22), y1: y, x2: Math.max(18, x - 14), y2: y, class: "module-detail__dimension-line" });
    make("line", { x1: Math.max(10, x - 22), y1: y + drawingHeight, x2: Math.max(18, x - 14), y2: y + drawingHeight, class: "module-detail__dimension-line" });
    make("rect", { x, y, width: drawingWidth, height: drawingHeight, rx: 2, class: "module-detail__view-shape" });
    if (!isSide) appendFrontSegments(make, product, x, y, drawingWidth, drawingHeight, spec.faceWidthMm);
    svgLabel(make, `A ${formatDimension(spec.faceHeightMm)} mm`, 4, y + drawingHeight / 2 + 3, "start");
    figure.append(caption, svg);
    return figure;
  }

  function createTechnicalIsometricView(product) {
    const spec = drawingSpecFor(product);
    const fit = fitProportionalBox(spec.faceWidthMm, spec.faceHeightMm, 86, 58);
    const rawExtrusion = spec.extrusionMm * fit.scale * 0.68;
    const isAmplifiedThickness = spec.kind === "panel" && rawExtrusion < 4;
    const depthX = Math.max(isAmplifiedThickness ? 4 : 6, rawExtrusion);
    const depthY = -Math.min(18, depthX * 0.62);
    const width = fit.width;
    const height = fit.height;
    const left = 92 - (width + depthX) / 2;
    const top = 59 - height / 2 - depthY / 2;
    const right = left + width;
    const bottom = top + height;
    const figure = document.createElement("figure");
    figure.className = "module-detail__view module-detail__view--isometric module-detail__view--technical";
    const caption = document.createElement("figcaption");
    caption.textContent = "Projeção isométrica";
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("viewBox", "0 0 180 126");
    svg.setAttribute("role", "img");
    svg.setAttribute("aria-label", `Projeção isométrica orientativa: ${spec.faceHorizontalLabel} ${formatDimension(spec.faceWidthMm)} milímetros, A ${formatDimension(spec.faceHeightMm)} milímetros e ${spec.extrusionLabel} ${formatDimension(spec.extrusionMm)} milímetros${isAmplifiedThickness ? ". A espessura foi ampliada apenas para legibilidade." : "."}`);
    const make = svgFactory(svg);
    make("path", { d: `M ${left} ${top} L ${right} ${top} L ${right + depthX} ${top + depthY} L ${left + depthX} ${top + depthY} Z`, class: "module-detail__view-shape" });
    make("path", { d: `M ${right} ${top} L ${right + depthX} ${top + depthY} L ${right + depthX} ${bottom + depthY} L ${right} ${bottom} Z`, class: "module-detail__view-shape" });
    make("rect", { x: left, y: top, width, height, class: "module-detail__view-shape" });
    appendFrontSegments(make, product, left, top, width, height, spec.faceWidthMm);
    make("line", { x1: left, y1: bottom + 14, x2: right, y2: bottom + 14, class: "module-detail__dimension-line" });
    make("line", { x1: left, y1: bottom + 10, x2: left, y2: bottom + 18, class: "module-detail__dimension-line" });
    make("line", { x1: right, y1: bottom + 10, x2: right, y2: bottom + 18, class: "module-detail__dimension-line" });
    make("line", { x1: Math.max(15, left - 19), y1: top, x2: Math.max(15, left - 19), y2: bottom, class: "module-detail__dimension-line" });
    make("line", { x1: Math.max(11, left - 23), y1: top, x2: Math.max(19, left - 15), y2: top, class: "module-detail__dimension-line" });
    make("line", { x1: Math.max(11, left - 23), y1: bottom, x2: Math.max(19, left - 15), y2: bottom, class: "module-detail__dimension-line" });
    make("line", { x1: right + 4, y1: top - 6, x2: right + depthX + 4, y2: top + depthY - 6, class: "module-detail__dimension-line" });
    svgLabel(make, `${spec.faceHorizontalLabel} ${formatDimension(spec.faceWidthMm)} mm`, left + width / 2, bottom + 27);
    svgLabel(make, `A ${formatDimension(spec.faceHeightMm)} mm`, 4, top + height / 2 + 3, "start");
    svgLabel(make, `${spec.extrusionLabel} ${formatDimension(spec.extrusionMm)} mm`, 174, top + depthY - 9, "end");
    figure.append(caption, svg);
    return figure;
  }

  function frontViewNote(product) {
    if (product.frontLayout?.status === "confirmed") {
      const spans = product.frontLayout.segments.map((segment) => formatDimension(segment.spanMm)).join(" · ");
      return `Vãos internos confirmados: ${spans} mm; envelope externo: ${formatDimension(product.dimensions.nominalMm.width)} mm.`;
    }
    if (product.drawingSpec?.kind === "panel") {
      return "Elevação proporcional do painel estrutural; a espessura aparece como chamada separada.";
    }
    if (product.frontLayout?.status === "count-confirmed") {
      if (frontGuides[product.entityId]?.lines?.length) {
        return "Número de frentes confirmado; proporções internas guiadas pelas linhas de divisão visuais do recorte e ainda orientativas.";
      }
      return "Número de frentes confirmado; as proporções internas são orientativas até a ficha técnica detalhada.";
    }
    return "Envelope frontal proporcional; detalhamento interno ainda não está confirmado nesta base.";
  }

  function sideViewNote(product) {
    return product.drawingSpec?.kind === "panel"
      ? "Perfil A × E; a espessura é ampliada somente quando necessário para leitura."
      : "Leitura proporcional de profundidade e altura nominais.";
  }

  function clearDetailCarouselTimer() {
    if (detailCarouselTimer !== null) {
      global.clearInterval(detailCarouselTimer);
      detailCarouselTimer = null;
    }
  }

  function createDetailCarousel(entity, product) {
    clearDetailCarouselTimer();
    const section = document.createElement("section");
    section.className = "module-detail__views module-detail__carousel";
    section.setAttribute("aria-label", "Visualizações do módulo");
    const header = document.createElement("div");
    header.className = "module-detail__carousel-header";
    const heading = document.createElement("h4");
    heading.textContent = "Visualizações";
    const collapse = document.createElement("button");
    collapse.type = "button";
    collapse.className = "module-detail__collapse";
    collapse.dataset.toggleDetailViews = "true";
    collapse.setAttribute("aria-controls", `detailViews-${entity.id}`);
    const note = document.createElement("p");
    note.className = "module-detail__carousel-intro";
    note.textContent = "Navegue pelo foco do módulo e pelas vistas orientativas.";
    const stage = document.createElement("div");
    stage.className = "module-detail__carousel-stage";
    stage.id = `detailViews-${entity.id}`;
    const dots = document.createElement("div");
    dots.className = "module-detail__carousel-dots";
    dots.setAttribute("aria-label", "Visualizações disponíveis");
    dots.setAttribute("role", "tablist");
    stage.setAttribute("role", "region");
    stage.setAttribute("aria-roledescription", "carrossel");

    const pages = [
      { label: "Foco no módulo", node: createCarouselPage("Foco no módulo", createModuleFocus(entity, product), "Visual isolado da peça selecionada na cena."), shortLabel: "Foco" },
      { label: "Vista frontal", node: createCarouselPage("Vista frontal", createProportionalView(product, "front"), frontViewNote(product)), shortLabel: "Frontal" },
      { label: "Vista lateral", node: createCarouselPage("Vista lateral", createProportionalView(product, "side"), sideViewNote(product)), shortLabel: "Lateral" },
      ...(product.technicalLayout?.internalFront
        ? [{ label: "Vista interna", node: createCarouselPage("Vista interna", createOrientativeInternalFront(product.dimensions.nominalMm, product.technicalLayout.internalFront), "Vãos internos confirmados; não equivalem ao envelope externo do módulo."), shortLabel: "Interna" }]
        : []),
      { label: "Projeção isométrica", node: createCarouselPage("Projeção isométrica", createTechnicalIsometricView(product), product.drawingSpec?.kind === "panel" ? "Painel estrutural em proporção; espessura ampliada somente para leitura." : "Projeção isométrica orientativa das cotas nominais."), shortLabel: "Isométrica" }
    ];
    let currentPage = Math.min(detailPageByEntity.get(entity.id) || 0, pages.length - 1);
    let isTransitioning = false;
    const isReducedMotion = global.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    const isCollapsed = detailViewsCollapsedByEntity.has(entity.id);

    const stopAutoCycle = () => {
      detailInteractionByEntity.add(entity.id);
      clearDetailCarouselTimer();
    };
    const startAutoCycle = () => {
      if (isReducedMotion || detailInteractionByEntity.has(entity.id) || pages.length < 2 || detailViewsCollapsedByEntity.has(entity.id)) return;
      detailCarouselTimer = global.setInterval(() => renderPage((currentPage + 1) % pages.length, false), 7000);
    };

    const renderPage = (nextPage, interacted) => {
      if (interacted) stopAutoCycle();
      if (isTransitioning || nextPage === currentPage) return;
      isTransitioning = true;
      stage.classList.add("is-fading");
      global.setTimeout(() => {
        currentPage = nextPage;
        detailPageByEntity.set(entity.id, currentPage);
        stage.replaceChildren(pages[currentPage].node);
        dots.querySelectorAll("button").forEach((dot, index) => {
          const active = index === currentPage;
          dot.classList.toggle("is-active", active);
          dot.setAttribute("aria-current", active ? "true" : "false");
          dot.setAttribute("aria-selected", String(active));
          dot.tabIndex = active ? 0 : -1;
        });
        stage.classList.remove("is-fading");
        isTransitioning = false;
      }, 180);
    };

    pages.forEach((page, index) => {
      const dot = document.createElement("button");
      dot.type = "button";
      dot.className = "module-detail__carousel-dot";
      dot.setAttribute("role", "tab");
      dot.setAttribute("aria-controls", stage.id);
      dot.setAttribute("aria-label", `Mostrar ${page.label}, página ${index + 1} de ${pages.length}`);
      dot.setAttribute("aria-selected", "false");
      dot.tabIndex = -1;
      dot.title = page.shortLabel;
      dot.addEventListener("click", () => renderPage(index, true));
      dots.append(dot);
    });
    stage.replaceChildren(pages[currentPage].node);
    dots.children[currentPage]?.classList.add("is-active");
    dots.children[currentPage]?.setAttribute("aria-current", "true");
    dots.children[currentPage]?.setAttribute("aria-selected", "true");
    if (dots.children[currentPage]) dots.children[currentPage].tabIndex = 0;

    let swipeStartX = null;
    let swipeStartY = null;
    let swipePointerId = null;
    let wheelAccumX = 0;
    let wheelResetTimer = null;

    const clearSwipe = () => {
      swipeStartX = null;
      swipeStartY = null;
      swipePointerId = null;
      stage.classList.remove("is-swiping", "is-dragging");
    };

    const finishSwipe = (event) => {
      if (swipeStartX === null || swipeStartY === null) return;
      const deltaX = event.clientX - swipeStartX;
      const deltaY = event.clientY - swipeStartY;
      const pointerId = swipePointerId;
      clearSwipe();
      try {
        if (pointerId !== null && stage.hasPointerCapture?.(pointerId)) stage.releasePointerCapture(pointerId);
      } catch (_) {}
      const horizontal = Math.abs(deltaX) >= 32 && Math.abs(deltaX) > Math.abs(deltaY) * 1.15;
      if (!horizontal) return;
      if (deltaX < 0 && currentPage < pages.length - 1) renderPage(currentPage + 1, true);
      if (deltaX > 0 && currentPage > 0) renderPage(currentPage - 1, true);
    };

    stage.addEventListener("pointerdown", (event) => {
      if (event.button !== undefined && event.button !== 0) return;
      swipeStartX = event.clientX;
      swipeStartY = event.clientY;
      swipePointerId = event.pointerId;
      stage.classList.add("is-swiping");
      try { stage.setPointerCapture?.(event.pointerId); } catch (_) {}
      stopAutoCycle();
    });
    stage.addEventListener("pointermove", (event) => {
      if (swipePointerId === null || event.pointerId !== swipePointerId || swipeStartX === null) return;
      const deltaX = event.clientX - swipeStartX;
      const deltaY = event.clientY - swipeStartY;
      if (Math.abs(deltaX) > 8 && Math.abs(deltaX) > Math.abs(deltaY)) {
        stage.classList.add("is-dragging");
        if (event.cancelable) event.preventDefault();
      }
    });
    stage.addEventListener("pointerup", finishSwipe);
    stage.addEventListener("pointercancel", clearSwipe);
    stage.addEventListener("lostpointercapture", () => {
      if (swipeStartX !== null) clearSwipe();
    });
    stage.addEventListener("wheel", (event) => {
      if (Math.abs(event.deltaX) < 4 || Math.abs(event.deltaX) <= Math.abs(event.deltaY) * 1.15) return;
      event.preventDefault();
      stopAutoCycle();
      wheelAccumX += event.deltaX;
      global.clearTimeout(wheelResetTimer);
      wheelResetTimer = global.setTimeout(() => { wheelAccumX = 0; }, 140);
      if (Math.abs(wheelAccumX) < 55) return;
      const direction = wheelAccumX > 0 ? 1 : -1;
      wheelAccumX = 0;
      const target = clamp(currentPage + direction, 0, pages.length - 1);
      if (target !== currentPage) renderPage(target, true);
    }, { passive: false });

    collapse.setAttribute("aria-expanded", String(!isCollapsed));
    collapse.setAttribute("aria-label", isCollapsed ? "Expandir visualizações" : "Recolher visualizações");
    collapse.textContent = isCollapsed ? "Mostrar" : "Recolher";
    header.append(heading, collapse);
    section.classList.toggle("is-collapsed", isCollapsed);
    section.append(header, note, stage, dots);

    collapse.addEventListener("click", () => {
      const nextCollapsed = !detailViewsCollapsedByEntity.has(entity.id);
      if (nextCollapsed) detailViewsCollapsedByEntity.add(entity.id);
      else detailViewsCollapsedByEntity.delete(entity.id);
      stopAutoCycle();
      section.classList.toggle("is-collapsed", nextCollapsed);
      collapse.setAttribute("aria-expanded", String(!nextCollapsed));
      collapse.setAttribute("aria-label", nextCollapsed ? "Expandir visualizações" : "Recolher visualizações");
      collapse.textContent = nextCollapsed ? "Mostrar" : "Recolher";
    });
    section.addEventListener("pointerdown", stopAutoCycle, { once: true });
    section.addEventListener("wheel", stopAutoCycle, { once: true, passive: true });
    section.addEventListener("focusin", stopAutoCycle, { once: true });
    startAutoCycle();
    return section;
  }

  function visibleModuleEntityIds(resolved = lastResolved) {
    return catalog.modules
      .filter((product) => resolved?.[product.entityId]?.visible)
      .map((product) => product.entityId);
  }

  function adjacentVisibleModuleId(direction) {
    const ids = visibleModuleEntityIds();
    if (ids.length < 2) return null;
    const selectedIndex = ids.indexOf(state.selectedEntityId);
    const currentIndex = selectedIndex >= 0 ? selectedIndex : direction > 0 ? -1 : 0;
    return ids[(currentIndex + direction + ids.length) % ids.length];
  }

  function createModuleNavigationButton(direction, targetProduct) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "module-detail__navigation";
    button.dataset.navigateModule = String(direction);
    const directionLabel = direction < 0 ? "anterior" : "próximo";
    button.setAttribute("aria-label", `Abrir módulo ${directionLabel}: ${targetProduct.title}`);
    button.title = `Módulo ${directionLabel}: ${targetProduct.referenceLabel}`;
    button.textContent = direction < 0 ? "‹" : "›";
    return button;
  }

  function updateSelection(resolved) {
    const entity = entitiesById.get(state.selectedEntityId);
    const product = catalogByEntityId.get(state.selectedEntityId);
    const isVisible = Boolean(entity && resolved?.[entity.id]?.visible);
    const style = isVisible ? selectionStyle(entity) : null;
    selectionFrame.hidden = !style;
    if (style) Object.assign(selectionFrame.style, style);
    if (!product) {
      clearDetailCarouselTimer();
      document.body.classList.remove("has-module-detail");
      moduleDetail.replaceChildren();
      viewerHint.textContent = "Selecione um módulo na cena para abrir sua ficha.";
      return;
    }

    document.body.classList.add("has-module-detail");
    viewerHint.textContent = `Ficha selecionada: ${product.title}`;
    moduleDetail.classList.toggle("is-unavailable", !isVisible);
    const detailHeader = document.createElement("header");
    detailHeader.className = "module-detail__header";
    const moduleNumber = document.createElement("span");
    moduleNumber.className = "module-detail__number";
    moduleNumber.textContent = entity.alias;
    const headerCopy = document.createElement("div");
    headerCopy.className = "module-detail__header-copy";
    const eyebrow = document.createElement("p");
    eyebrow.className = "module-detail__eyebrow";
    eyebrow.textContent = `${product.referenceLabel.toUpperCase()} · ${product.category.toUpperCase()}`;
    const title = document.createElement("h3");
    title.textContent = product.title;
    headerCopy.append(eyebrow, title);
    const headerActions = document.createElement("div");
    headerActions.className = "module-detail__actions";
    const previousId = adjacentVisibleModuleId(-1);
    const nextId = adjacentVisibleModuleId(1);
    const previousProduct = catalogByEntityId.get(previousId);
    const nextProduct = catalogByEntityId.get(nextId);
    if (previousProduct) headerActions.append(createModuleNavigationButton(-1, previousProduct));
    if (nextProduct) headerActions.append(createModuleNavigationButton(1, nextProduct));
    const close = document.createElement("button");
    close.type = "button";
    close.className = "module-detail__close";
    close.dataset.closeModuleDetail = "true";
    close.setAttribute("aria-label", "Fechar detalhes do módulo");
    close.textContent = "×";
    headerActions.append(close);
    detailHeader.append(moduleNumber, headerCopy, headerActions);

    const itemPricing = pricing.itemEstimate(product, catalog, state, priceBook);
    const price = document.createElement("section");
    price.className = "module-detail__price";
    const priceLabel = document.createElement("span");
    priceLabel.textContent = "Valor atual na simulação";
    const priceValue = document.createElement("strong");
    const priceDescription = document.createElement("p");
    if (itemPricing.status === "ready") {
      priceValue.textContent = formatCurrency(itemPricing.totalCents);
      priceDescription.textContent = product.category === "Estrutural"
        ? "Valor local do painel estrutural. Impactos globais aparecem uma única vez no resumo."
        : "Valor local do módulo. Impactos globais aparecem uma única vez no resumo.";
      price.append(priceLabel, priceValue, priceDescription, createCommercialItemPriceBreakdown(product, itemPricing));
    } else {
      priceValue.textContent = "Em configuração";
      priceDescription.textContent = "O valor aparece quando a tabela de trabalho estiver completa.";
      price.append(priceLabel, priceValue, priceDescription);
    }

    const material = document.createElement("div");
    material.className = "module-detail__material";
    material.append(
      createMaterialFact("Frentes", selectedFrontFinishLabel(product)),
      createMaterialFact("Caixaria", "Base clara")
    );

    const dimensions = document.createElement("p");
    dimensions.className = "module-detail__dimensions";
    dimensions.textContent = dimensionSummary(product);

    const technical = document.createElement("section");
    technical.className = "module-detail__technical";
    const technicalHeading = document.createElement("h4");
    technicalHeading.textContent = "Medidas nominais";
    const technicalGrid = document.createElement("dl");
    const dimensionsByName = detailDimensionFacts(product);
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

    const orientativeViews = createDetailCarousel(entity, product);

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
    const detailContent = [detailHeader, price, material, dimensions, technical, orientativeViews, benefitsSection, componentsSection];
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
      hotspot.tabIndex = isVisible ? 0 : -1;
      hotspot.setAttribute("aria-disabled", String(!isVisible));
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

  function updateHandleControls() {
    document.querySelectorAll("[data-handle-id]").forEach((button) => {
      const active = button.dataset.handleId === state.handlePresetId;
      button.classList.toggle("is-selected", active);
      button.setAttribute("aria-pressed", String(active));
    });
  }

  function updateHandleControls() {
    renderHandleControlsFromData();
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
    if (estimate.status === "legacy") {
      configurationValue.innerHTML = `<span>${estimate.label}</span><strong>${formatCurrency(estimate.totalCents)}</strong><small>Estimativa comercial</small>`;
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
    const handle = selectedHandle();
    const includedServices = catalog.services.filter((service) => service.status === "included").map((service) => service.title);
    finish.textContent = `Frentes: ${finishPreset?.label || selectedFrontFinishLabel()}. Caixaria: clara. Puxador: ${handle.label}. Serviço incluso: ${includedServices.join(", ") || "nenhum"}.`;
    const price = document.createElement("div");
    price.className = "price-state";
    if (estimate.status === "legacy") {
      const label = document.createElement("span");
      label.textContent = estimate.label;
      const total = document.createElement("strong");
      total.textContent = formatCurrency(estimate.totalCents);
      const composition = document.createElement("dl");
      composition.className = "price-state__breakdown";
      const includedHandleCount = included.filter((module) => module.category !== "Estrutural").length;
      const adjustments = estimate.adjustments;
      appendPriceBreakdownRow(composition, "Módulos", formatCurrency(estimate.breakdown.moduleCents), `${included.length} incluído(s).`);
      if (estimate.breakdown.accessoryCents || resolved?.["lighting-08"]?.visible) {
        appendPriceBreakdownRow(composition, "Iluminação", formatCurrency(estimate.breakdown.accessoryCents), resolved?.["lighting-08"]?.visible ? "Iluminação embutida." : "Não incluída.");
      }
      appendPriceBreakdownRow(composition, "Puxadores", formatCurrency(estimate.breakdown.handleCents), `${handle.label} · ${includedHandleCount} módulo(s) aplicável(is).`);
      appendPriceBreakdownRow(composition, "Frentes", formatCurrency(adjustments.frontCents), `${selectedFrontFinishLabel()} · ${valueImpactLabel(adjustments.frontCents)}.`);
      appendPriceBreakdownRow(composition, "Pedra", formatCurrency(adjustments.stoneCents), `${selectedStoneLabel()} · ${valueImpactLabel(adjustments.stoneCents)}.`);
      appendPriceBreakdownRow(composition, "Serviço", formatCurrency(adjustments.serviceCents), `${includedServices.join(", ") || "Nenhum"} · ${valueImpactLabel(adjustments.serviceCents)}.`);
      const reference = document.createElement("p");
      reference.className = "price-state__reference";
      reference.textContent = "Valores estimativos sujeitos à validação final de medidas e instalação.";
      const disclaimer = document.createElement("p");
      disclaimer.textContent = estimate.disclaimer;
      price.append(label, total, composition, reference, disclaimer);
    } else if (estimate.status === "ready") {
      price.innerHTML = `<span>Valor estimado</span><strong>${formatCurrency(estimate.totalCents)}</strong>`;
    } else {
      price.innerHTML = "<span>Valor do conjunto</span><strong>Em configuração</strong><p>Os valores só aparecem depois que a tabela comercial for publicada.</p>";
    }
    summaryContent.replaceChildren(list, finish, price);
  }

  function renderCurrentValue(resolved) {
    const estimate = getEstimate(resolved);
    if (!configurationValue) return;
    if (estimate.status === "estimate") {
      configurationValue.innerHTML = "<span>" + estimate.label + "</span><strong>" + formatCurrency(estimate.totalCents) + "</strong><small>Estimativa</small>";
      configurationValue.title = estimate.disclaimer;
      return;
    }
    configurationValue.innerHTML = "<span>Valor do conjunto</span><strong>Em configuração</strong>";
    configurationValue.removeAttribute("title");
  }

  function globalItemLabel(id) {
    const stone = catalog.options.stonePackages.find((item) => item.id === id);
    if (stone) return stone.label;
    if (id === "stone-skirting") return "Rodapé de pedra";
    return catalog.services.find((service) => service.id === id)?.title || id;
  }

  function renderSummary(resolved) {
    const estimate = getEstimate(resolved);
    const list = document.createElement("ul");
    list.className = "summary-list";
    estimate.moduleEstimates?.forEach(({ item, estimate: itemEstimate }) => {
      const itemRow = document.createElement("li");
      const additions = [];
      if (itemEstimate.finishCents) additions.push("acabamento +" + formatCurrency(itemEstimate.finishCents));
      if (itemEstimate.handleCents) additions.push("puxador +" + formatCurrency(itemEstimate.handleCents));
      if (itemEstimate.localCents) additions.push("pedra de cooktop +" + formatCurrency(itemEstimate.localCents));
      itemRow.textContent = item.referenceLabel + " · " + item.title + " — " + formatCurrency(itemEstimate.totalCents) + (additions.length ? " (" + additions.join(", ") + ")" : "");
      list.append(itemRow);
    });

    const finish = document.createElement("p");
    finish.className = "summary-note";
    finish.textContent = "Cor e puxador são escolhas globais; os acréscimos aparecem distribuídos localmente por módulo. Pedra e serviços impactam o conjunto uma única vez.";

    const price = document.createElement("div");
    price.className = "price-state";
    if (estimate.status === "estimate") {
      const label = document.createElement("span");
      label.textContent = estimate.label;
      const total = document.createElement("strong");
      total.textContent = formatCurrency(estimate.totalCents);
      const composition = document.createElement("dl");
      composition.className = "price-state__breakdown";
      appendPriceBreakdownRow(composition, "Módulos", formatCurrency(estimate.breakdown.modulesCents), estimate.moduleEstimates.length + " incluído(s).");
      if (estimate.breakdown.finishesCents) appendPriceBreakdownRow(composition, "Acabamentos", "+" + formatCurrency(estimate.breakdown.finishesCents), selectedFrontFinishLabel() + " · percentual global aplicado aos módulos elegíveis.");
      if (estimate.breakdown.handlesCents) {
        const selected = selectedHandle();
        const visibleFronts = estimate.moduleEstimates.reduce((total, entry) => total + (entry.estimate.handleFrontCount || 0), 0);
        const perFront = priceBook.handleEntries?.[selected.id] || 0;
        appendPriceBreakdownRow(composition, "Puxadores", "+" + formatCurrency(estimate.breakdown.handlesCents), selected.label + " · " + visibleFronts + " frente(s) × " + formatCurrency(perFront) + ".");
      }
      if (estimate.breakdown.localCents) appendPriceBreakdownRow(composition, "Pedra cooktop", "+" + formatCurrency(estimate.breakdown.localCents), "Inclusa no Módulo 02.");
      if (estimate.breakdown.lightingCents) appendPriceBreakdownRow(composition, "Iluminação", "+" + formatCurrency(estimate.breakdown.lightingCents), "Serviço global com lateral incluída.");
      estimate.global.items.filter((item) => item.cents).forEach((item) => {
        appendPriceBreakdownRow(composition, globalItemLabel(item.id), "+" + formatCurrency(item.cents), item.scope === "stone" ? "Impacto global de pedra." : "Serviço global.");
      });
      const disclaimer = document.createElement("p");
      disclaimer.textContent = estimate.disclaimer;
      price.append(label, total, composition, disclaimer);
    } else {
      price.innerHTML = "<span>Valor do conjunto</span><strong>Em configuração</strong>";
    }
    summaryContent.replaceChildren(list, finish, price);
  }

  function syncStep(resolved) {
    const isModules = currentStep === "modules";
    const isFinishes = currentStep === "finishes";
    modulesPanel.hidden = !isModules;
    frontFinishPanel.hidden = !isFinishes;
    stonePanel.hidden = !isFinishes;
    servicesPanel.hidden = currentStep !== "services";
    summaryPanel.hidden = currentStep !== "summary";
    document.querySelectorAll("[data-step]").forEach((button) => {
      const active = button.dataset.step === currentStep;
      button.classList.toggle("is-active", active);
      button.setAttribute("aria-current", active ? "step" : "false");
    });
    const nextByStep = { modules: "finishes", finishes: "services", services: "summary", summary: "modules" };
    const next = nextByStep[currentStep];
    const nextLabel = { finishes: "acabamentos", services: "serviços", summary: "resumo" };
    nextStepButton.textContent = currentStep === "summary" ? "Editar módulos" : `Continuar para ${nextLabel[next]} →`;
    renderSummary(resolved);
  }

  function announce(message) {
    if (configurationAnnouncement) configurationAnnouncement.textContent = message;
  }

  function shouldReduceMotion() {
    return Boolean(global.matchMedia?.("(prefers-reduced-motion: reduce)").matches);
  }

  function focusCurrentStep() {
    const panel = currentStep === "modules"
      ? modulesPanel
      : currentStep === "finishes"
        ? frontFinishPanel
        : currentStep === "services"
          ? servicesPanel
          : summaryPanel;
    const heading = panel.querySelector("h2");
    if (!heading) return;
    heading.focus({ preventScroll: true });
    panel.scrollIntoView({ behavior: shouldReduceMotion() ? "auto" : "smooth", block: "start" });
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
  renderHandleControlsFromData();
  renderStonePackages();
  renderServices();

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

  const renderStone = global.CasaStone.createRenderer(document.getElementById("stoneCanvas"), plinthCanvas, global.CASA_STONE_DATA);

  function isMobileViewport() {
    return Boolean(global.matchMedia?.("(max-width: 700px)").matches);
  }

  function reclampPinnedScene() {
    if (!viewerCard || !document.body.classList.contains("is-mobile-scene-pinned")) return;
    const rect = viewerCard.getBoundingClientRect();
    const maxWidth = Math.max(140, global.innerWidth - 16);
    if (rect.width > maxWidth) {
      document.documentElement.style.setProperty("--mobile-pip-width", maxWidth + "px");
      requestAnimationFrame(reclampPinnedScene);
      return;
    }
    if (viewerCard.dataset.pipPositioned !== "true") return;
    const current = viewerCard.getBoundingClientRect();
    const left = clamp(current.left, 8, Math.max(8, global.innerWidth - current.width - 8));
    const top = clamp(current.top, 8, Math.max(8, global.innerHeight - current.height - 8));
    document.documentElement.style.setProperty("--mobile-pip-left", left + "px");
    document.documentElement.style.setProperty("--mobile-pip-top", top + "px");
    document.documentElement.style.setProperty("--mobile-pip-right", "auto");
  }

  function syncPinnedSceneUi() {
    const mobile = isMobileViewport();
    const shouldDock = mobile && mobileScenePinEnabled && mobileSceneIsMini;
    if (!shouldDock && viewerCard) mobileSceneAnchorHeight = Math.ceil(viewerCard.getBoundingClientRect().height);
    document.body.classList.toggle("has-mobile-scene-pin", mobile && mobileScenePinEnabled);
    document.body.classList.toggle("is-mobile-scene-pinned", shouldDock);
    document.body.classList.toggle("is-mobile-scene-transparent", shouldDock && mobileSceneTransparent);
    document.documentElement.style.setProperty("--mobile-scene-anchor-height", shouldDock ? mobileSceneAnchorHeight + "px" : "0px");

    if (flowNav) {
      const navBottom = Math.ceil(flowNav.getBoundingClientRect().bottom);
      document.documentElement.style.setProperty("--mobile-flow-nav-bottom", Math.max(0, navBottom) + "px");
    }
    if (viewerCard) requestAnimationFrame(() => {
      const height = Math.ceil(viewerCard.getBoundingClientRect().height);
      document.documentElement.style.setProperty("--mobile-pip-height", shouldDock ? height + "px" : "0px");
      if (shouldDock) reclampPinnedScene();
    });
    if (mobileScenePin) {
      mobileScenePin.setAttribute("aria-pressed", String(mobileScenePinEnabled));
      mobileScenePin.setAttribute("aria-label", mobileScenePinEnabled ? "Liberar mini-cena" : "Fixar mini-cena");
    }
    if (mobileSceneOpacity) {
      mobileSceneOpacity.setAttribute("aria-pressed", String(mobileSceneTransparent));
      mobileSceneOpacity.setAttribute("aria-label", mobileSceneTransparent ? "Usar mini-cena opaca" : "Usar mini-cena transparente");
    }
    if (lastResolved) updateSceneHotspots(lastResolved);
  }

  function setMobileScenePinEnabled(enabled) {
    mobileScenePinEnabled = Boolean(enabled);
    if (mobileScenePinEnabled && isMobileViewport() && viewerPinSentinel) {
      mobileSceneIsMini = viewerPinSentinel.getBoundingClientRect().top < 0;
    } else if (!mobileScenePinEnabled) {
      mobileSceneIsMini = false;
      mobileSceneTransparent = false;
    }
    syncPinnedSceneUi();
    announce(mobileScenePinEnabled ? "Mini-cena fixada para contexto durante a configuração." : "Mini-cena liberada para o fluxo normal.");
  }

  function setMobileSceneTransparency(enabled) {
    mobileSceneTransparent = Boolean(enabled);
    syncPinnedSceneUi();
    announce(mobileSceneTransparent ? "Mini-cena com transparência ativada." : "Mini-cena opaca.");
  }

  function clamp(value, minimum, maximum) {
    return Math.min(Math.max(value, minimum), maximum);
  }

  function installMobilePreviewGestures() {
    if (!viewerCard) return;

    [mobileScenePin, mobileSceneOpacity, mobileSceneResize].filter(Boolean).forEach((control) => {
      ["pointerdown", "pointerup", "click"].forEach((eventName) => {
        control.addEventListener(eventName, (event) => event.stopPropagation());
      });
    });

    viewerCard.addEventListener("pointerdown", (event) => {
      if (!document.body.classList.contains("is-mobile-scene-pinned")) return;
      if (event.button !== 0 || !event.target.closest(".viewer")) return;
      if (event.target.closest(".scene-hotspot, .viewer-pip-control, .viewer-pip-resize")) return;

      const startRect = viewerCard.getBoundingClientRect();
      const startX = event.clientX;
      const startY = event.clientY;
      viewerCard.setPointerCapture?.(event.pointerId);
      event.preventDefault();

      const move = (moveEvent) => {
        const width = viewerCard.getBoundingClientRect().width;
        const height = viewerCard.getBoundingClientRect().height;
        const left = clamp(startRect.left + moveEvent.clientX - startX, 8, Math.max(8, global.innerWidth - width - 8));
        const top = clamp(startRect.top + moveEvent.clientY - startY, 8, Math.max(8, global.innerHeight - height - 8));
        document.documentElement.style.setProperty("--mobile-pip-left", left + "px");
        document.documentElement.style.setProperty("--mobile-pip-top", top + "px");
        document.documentElement.style.setProperty("--mobile-pip-right", "auto");
        viewerCard.dataset.pipPositioned = "true";
      };
      const endDrag = () => {
        global.removeEventListener("pointermove", move);
        global.removeEventListener("pointerup", endDrag);
        global.removeEventListener("pointercancel", endDrag);
      };
      global.addEventListener("pointermove", move);
      global.addEventListener("pointerup", endDrag);
      global.addEventListener("pointercancel", endDrag);
    });

    mobileSceneResize?.addEventListener("pointerdown", (event) => {
      if (!document.body.classList.contains("is-mobile-scene-pinned")) return;
      const startRect = viewerCard.getBoundingClientRect();
      const startWidth = startRect.width;
      const startRight = startRect.right;
      const startX = event.clientX;
      mobileSceneResize.setPointerCapture?.(event.pointerId);
      event.preventDefault();
      event.stopPropagation();

      const move = (moveEvent) => {
        const maxWidth = Math.max(150, Math.min(global.innerWidth - 16, 360));
        const width = clamp(startWidth - (moveEvent.clientX - startX), 140, maxWidth);
        const left = clamp(startRight - width, 8, Math.max(8, global.innerWidth - width - 8));
        document.documentElement.style.setProperty("--mobile-pip-width", width + "px");
        document.documentElement.style.setProperty("--mobile-pip-left", left + "px");
        document.documentElement.style.setProperty("--mobile-pip-right", "auto");
        viewerCard.dataset.pipPositioned = "true";
      };
      const endResize = () => {
        global.removeEventListener("pointermove", move);
        global.removeEventListener("pointerup", endResize);
        global.removeEventListener("pointercancel", endResize);
        syncPinnedSceneUi();
      };
      global.addEventListener("pointermove", move);
      global.addEventListener("pointerup", endResize);
      global.addEventListener("pointercancel", endResize);
    });
  }

  if (viewerPinSentinel && global.IntersectionObserver) {
    const pinObserver = new global.IntersectionObserver((entries) => {
      const entry = entries[0];
      const passedAnchor = entry && entry.boundingClientRect.top < 0 && !entry.isIntersecting;
      const nextMini = Boolean(isMobileViewport() && mobileScenePinEnabled && passedAnchor);
      if (nextMini === mobileSceneIsMini) return;
      mobileSceneIsMini = nextMini;
      syncPinnedSceneUi();
      if (nextMini) announce("Mini-cena disponível abaixo das etapas; toque em um módulo para abrir sua ficha.");
    }, { threshold: 0 });
    pinObserver.observe(viewerPinSentinel);
  }

  if (global.ResizeObserver && viewerCard) {
    new global.ResizeObserver(() => syncPinnedSceneUi()).observe(viewerCard);
  }

  installMobilePreviewGestures();
  global.addEventListener("resize", syncPinnedSceneUi);

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

  function syncFinishAppearance() {
    finishLayers.forEach((layer) => {
      const group = layer.closest(".layer-group");
      const product = catalogByEntityId.get(group?.dataset.entityId);
      if (!product?.commercial?.finishEligible) return;
      const finishId = selectedModuleFinish(product);
      const finish = catalog.options.finishes.find((item) => item.id === finishId) || catalog.options.finishes[0];
      const hasTexture = Boolean(finish.textureAsset);
      layer.classList.add("is-color");
      layer.classList.toggle("is-texture", hasTexture);
      layer.style.backgroundImage = hasTexture ? `url("${finish.textureAsset}")` : "none";
      layer.style.backgroundColor = finish.color;
      layer.style.setProperty("--finish-size", finish.textureSize || "160px 160px");
      layer.style.setProperty("--finish-background-blend", hasTexture ? "luminosity" : "normal");
      layer.style.setProperty("--finish-opacity", String(finishes.resolveOverlayOpacity(finish, finish.color)));
      layer.style.setProperty("--finish-brightness", String(finish.textureBrightness || 1));
      const structure = finishes.resolveStructureStrength(finish, finish.color);
      group.style.setProperty("--structure-shadow-opacity", String(structure.shadowOpacity));
      group.style.setProperty("--structure-highlight-opacity", String(structure.highlightOpacity));
      group.dataset.structureLuminance = structure.luminance.toFixed(4);
    });
  }

  function syncLayerVisibility() {
    const anchorProduct = catalogByEntityId.get(ensureFinishTarget());
    const finishId = selectedModuleFinish(anchorProduct);
    const finishMaterial = catalog.options.finishes.find((item) => item.id === finishId) || catalog.options.finishes[0];
    const stoneId = state.globalSelections?.stonePackageId || "stone-existing";
    const stoneMaterial = catalog.options.stonePackages.find((item) => item.id === stoneId) || catalog.options.stonePackages[0];
    const useStonePlinth = Boolean(state.globalSelections?.serviceIds?.includes("stone-skirting"));
    renderStone(state, { upper: stoneMaterial, plinth: useStonePlinth ? stoneMaterial : finishMaterial });
    const resolved = visibility.resolveVisibility(scene, state);
    lastResolved = resolved;
    syncFinishMasks(resolved);
    syncFinishAppearance();
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
    updateHandleControls();
    updateSelection(resolved);
    renderFinishControlsFromData();
    renderStonePackages();
    renderServices();
    renderCurrentValue(resolved);
    syncStep(resolved);
    syncPinnedSceneUi();
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
        moduleDetail.scrollIntoView({ behavior: "smooth", block: "nearest" });
      });
    }
  }

  function selectAdjacentModule(direction) {
    const nextEntityId = adjacentVisibleModuleId(direction);
    if (!nextEntityId) return;
    selectEntity(nextEntityId, "detail-navigation");
  }

  function setAllVisibility(isVisible) {
    core.setAllControllableVisibility(scene, state, isVisible);
    moduleToggles.forEach((toggle) => {
      toggle.checked = isVisible;
    });
    syncLayerVisibility();
    updateVisibleCount();
  }

  function storeDetailOrigin(entityId, source) {
    const active = document.activeElement;
    const fallback = source === "scene"
      ? sceneHotspots.querySelector('[data-select-scene-entity="' + entityId + '"]')
      : moduleList.querySelector('[data-select-entity="' + entityId + '"]');
    detailOrigin = { entityId, element: active instanceof HTMLElement && active.isConnected ? active : fallback };
  }

  function focusDetailClose() {
    requestAnimationFrame(() => {
      moduleDetail.querySelector("[data-close-module-detail]")?.focus({ preventScroll: true });
    });
  }

  function restoreDetailOrigin(origin) {
    requestAnimationFrame(() => {
      const fallback = moduleList.querySelector('[data-select-entity="' + (origin?.entityId || "") + '"]');
      const target = origin?.element?.isConnected ? origin.element : fallback || document.getElementById("modulesHeading");
      target?.focus({ preventScroll: true });
    });
  }

  function selectEntity(entityId, source) {
    const product = catalogByEntityId.get(entityId);
    if (!product) return;
    const preservePinnedScene = source === "scene" && document.body.classList.contains("is-mobile-scene-pinned");
    if (source !== "detail-navigation") storeDetailOrigin(entityId, source);
    else detailOrigin = { entityId, element: moduleList.querySelector('[data-select-entity="' + entityId + '"]') };
    state.selectedEntityId = entityId;
    if (currentStep !== "modules") currentStep = "modules";
    syncLayerVisibility();
    announce("Ficha de " + product.referenceLabel + ", " + product.title + ", aberta.");
    if (source === "scene" && !preservePinnedScene) {
      requestAnimationFrame(() => moduleDetail.scrollIntoView({ behavior: shouldReduceMotion() ? "auto" : "smooth", block: "nearest" }));
    } else if (preservePinnedScene) {
      requestAnimationFrame(() => {
        mobileSceneIsMini = true;
        syncPinnedSceneUi();
      });
    }
    focusDetailClose();
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

  finishTargetSelect?.addEventListener("change", () => {
    activeFinishModuleId = finishTargetSelect.value;
    renderFinishControlsFromData();
    renderHandleControlsFromData();
  });

  finishSwatches.addEventListener("click", (event) => {
    const button = event.target.closest("[data-finish-id]");
    const product = catalogByEntityId.get(ensureFinishTarget());
    if (!button || !product) return;
    core.setModuleSelection(state, product.entityId, { finishId: button.dataset.finishId });
    syncLayerVisibility();
    announce("Acabamento global atualizado para " + selectedFrontFinishLabel(product) + ".");
  });

  moduleList.addEventListener("click", (event) => {
    const button = event.target.closest("[data-select-entity]");
    if (!button) return;
    event.preventDefault();
    selectEntity(button.dataset.selectEntity, "list");
  });

  moduleDetail.addEventListener("click", (event) => {
    const navigation = event.target.closest("[data-navigate-module]");
    if (navigation) {
      selectAdjacentModule(Number(navigation.dataset.navigateModule));
      return;
    }
    const close = event.target.closest("[data-close-module-detail]");
    if (!close) return;
    const origin = detailOrigin;
    state.selectedEntityId = null;
    syncLayerVisibility();
    announce("Detalhes do módulo fechados.");
    restoreDetailOrigin(origin);
  });

  sceneHotspots.addEventListener("click", (event) => {
    const hotspot = event.target.closest("[data-select-scene-entity]");
    if (!hotspot || hotspot.disabled) return;
    selectEntity(hotspot.dataset.selectSceneEntity, "scene");
  });

  document.querySelectorAll("[data-step]").forEach((button) => {
    const stepName = button.querySelector("[data-compact-label]")?.textContent?.trim();
    if (stepName) {
      button.setAttribute("aria-label", stepName);
      button.title = stepName;
    }
    button.addEventListener("click", () => {
      changeStep(button.dataset.step, true);
    });
  });

  mobileScenePin?.addEventListener("click", () => setMobileScenePinEnabled(!mobileScenePinEnabled));
  mobileSceneOpacity?.addEventListener("click", () => setMobileSceneTransparency(!mobileSceneTransparent));

  nextStepButton.addEventListener("click", () => {
    const nextByStep = { modules: "finishes", finishes: "services", services: "summary", summary: "modules" };
    changeStep(nextByStep[currentStep], true);
  });

  handleOptions?.addEventListener("click", (event) => {
    const button = event.target.closest("[data-handle-id]");
    const product = catalogByEntityId.get(ensureFinishTarget());
    if (!button || !product?.commercial?.handleEligible) return;
    core.setModuleSelection(state, product.entityId, { handleId: button.dataset.handleId });
    syncLayerVisibility();
    const handle = selectedHandle(product);
    announce(handle.id === "none" ? "Puxador será definido depois." : handle.label + " aplicado ao conjunto.");
  });

  lightingToggle.addEventListener("change", () => {
    setEntityVisibility("lighting-08", lightingToggle.checked);
    updateVisibleCount();
  });

  function setStonePackage(stonePackageId) {
    const stone = catalog.options.stonePackages.find((item) => item.id === stonePackageId);
    if (!stone) return;
    state.globalSelections = { ...state.globalSelections, stonePackageId };
    state.stoneFinishId = stonePackageId;
    state.stoneColor = stone.color;
    syncLayerVisibility();
    announce(stone.label + " aplicado ao conjunto.");
  }

  stonePackageOptions?.addEventListener("click", (event) => {
    const button = event.target.closest("[data-stone-package-id]");
    if (button) setStonePackage(button.dataset.stonePackageId);
  });

  stoneSkirtingToggle?.addEventListener("change", () => {
    core.setGlobalService(state, "stone-skirting", stoneSkirtingToggle.checked);
    syncLayerVisibility();
  });

  servicesChecklist?.addEventListener("change", (event) => {
    const input = event.target.closest("[data-global-service-id]");
    if (!input) return;
    core.setGlobalService(state, input.dataset.globalServiceId, input.checked);
    syncLayerVisibility();
  });

  restoreButton.addEventListener("click", () => {
    if (!global.confirm("Recomeçar a configuração? Suas escolhas atuais serão removidas.")) return;
    state = core.createInitialState(scene);
    setAllVisibility(true);
    alignmentGrid.classList.remove("is-visible");
    if (gridButton) gridButton.setAttribute("aria-pressed", "false");
    activeFinishModuleId = null;
    detailOrigin = null;
    syncLayerVisibility();
  });

  syncLayerVisibility();
  updateVisibleCount();
  syncPinnedSceneUi();
  global.CASA_EM_MODULOS_DEBUG = Object.freeze({
    getState: () => state,
    getVisibility: () => visibility.resolveVisibility(scene, state),
    scene
  });
})(window);
