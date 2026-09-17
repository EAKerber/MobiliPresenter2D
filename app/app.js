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
  const servicesPanel = document.getElementById("servicesPanel");
  const summaryPanel = document.getElementById("summaryPanel");
  const lightingToggle = document.getElementById("lightingToggle");
  const configurationAnnouncement = document.getElementById("configurationAnnouncement");
  const handleOptions = document.getElementById("handleOptions");
  const servicesChecklist = document.getElementById("servicesChecklist");
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

  function selectedHandle() {
    return catalog.options.handles.find((handle) => handle.id === state.handlePresetId) || catalog.options.handles[0];
  }

  function selectedStoneLabel() {
    if (!state.stoneColor) return "Pedra original";
    return document.querySelector(`[data-stone-color="${state.stoneColor}"]`)?.title || "Cor personalizada";
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

  function mockImpactLabel(cents) {
    if (!cents) return "Sem adicional no mock";
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
    appendPriceBreakdownRow(breakdown, "Módulo", formatCurrency(itemPricing.baseCents), "Valor do módulo no mock.");
    appendPriceBreakdownRow(
      breakdown,
      "Puxador",
      appliesHandle ? formatCurrency(itemPricing.handleCents) : "Não aplicável",
      appliesHandle ? handle.label : "Painel estrutural sem puxador."
    );
    appendPriceBreakdownRow(breakdown, "Frentes", formatCurrency(adjustments.frontCents), `${selectedFrontFinishLabel()} · ${mockImpactLabel(adjustments.frontCents)}.`);
    appendPriceBreakdownRow(breakdown, "Pedra", formatCurrency(adjustments.stoneCents), `${selectedStoneLabel()} · ${mockImpactLabel(adjustments.stoneCents)}.`);
    appendPriceBreakdownRow(breakdown, "Serviço", formatCurrency(adjustments.serviceCents), `${includedServices || "Nenhum"} · ${mockImpactLabel(adjustments.serviceCents)}.`);
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

  function appendFrontSegments(make, layout, x, y, width, height, faceWidthMm) {
    if (!layout?.segments?.length) return;
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
    if (!isSide) appendFrontSegments(make, product.frontLayout, x, y, drawingWidth, drawingHeight, spec.faceWidthMm);
    svgLabel(make, `A ${formatDimension(spec.faceHeightMm)} mm`, Math.max(8, x - 25), y + drawingHeight / 2 + 3);
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
    caption.textContent = "Vista isométrica";
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("viewBox", "0 0 180 126");
    svg.setAttribute("role", "img");
    svg.setAttribute("aria-label", `Vista isométrica: ${spec.faceHorizontalLabel} ${formatDimension(spec.faceWidthMm)} milímetros, A ${formatDimension(spec.faceHeightMm)} milímetros e ${spec.extrusionLabel} ${formatDimension(spec.extrusionMm)} milímetros${isAmplifiedThickness ? ". A espessura foi ampliada apenas para legibilidade." : "."}`);
    const make = svgFactory(svg);
    make("path", { d: `M ${left} ${top} L ${right} ${top} L ${right + depthX} ${top + depthY} L ${left + depthX} ${top + depthY} Z`, class: "module-detail__view-shape" });
    make("path", { d: `M ${right} ${top} L ${right + depthX} ${top + depthY} L ${right + depthX} ${bottom + depthY} L ${right} ${bottom} Z`, class: "module-detail__view-shape" });
    make("rect", { x: left, y: top, width, height, class: "module-detail__view-shape" });
    appendFrontSegments(make, product.frontLayout, left, top, width, height, spec.faceWidthMm);
    make("line", { x1: left, y1: bottom + 14, x2: right, y2: bottom + 14, class: "module-detail__dimension-line" });
    make("line", { x1: left, y1: bottom + 10, x2: left, y2: bottom + 18, class: "module-detail__dimension-line" });
    make("line", { x1: right, y1: bottom + 10, x2: right, y2: bottom + 18, class: "module-detail__dimension-line" });
    make("line", { x1: Math.max(15, left - 19), y1: top, x2: Math.max(15, left - 19), y2: bottom, class: "module-detail__dimension-line" });
    make("line", { x1: Math.max(11, left - 23), y1: top, x2: Math.max(19, left - 15), y2: top, class: "module-detail__dimension-line" });
    make("line", { x1: Math.max(11, left - 23), y1: bottom, x2: Math.max(19, left - 15), y2: bottom, class: "module-detail__dimension-line" });
    make("line", { x1: right + 4, y1: top - 6, x2: right + depthX + 4, y2: top + depthY - 6, class: "module-detail__dimension-line" });
    svgLabel(make, `${spec.faceHorizontalLabel} ${formatDimension(spec.faceWidthMm)} mm`, left + width / 2, bottom + 27);
    svgLabel(make, `A ${formatDimension(spec.faceHeightMm)} mm`, Math.max(8, left - 27), top + height / 2 + 3);
    svgLabel(make, `${spec.extrusionLabel} ${formatDimension(spec.extrusionMm)} mm`, right + depthX + 18, top + depthY - 9);
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
    dots.setAttribute("aria-label", "Páginas de visualização");

    const pages = [
      { label: "Foco no módulo", node: createCarouselPage("Foco no módulo", createModuleFocus(entity, product), "Visual isolado da peça selecionada na cena."), shortLabel: "Foco" },
      { label: "Vista frontal", node: createCarouselPage("Vista frontal", createProportionalView(product, "front"), frontViewNote(product)), shortLabel: "Frontal" },
      { label: "Vista lateral", node: createCarouselPage("Vista lateral", createProportionalView(product, "side"), sideViewNote(product)), shortLabel: "Lateral" },
      ...(product.technicalLayout?.internalFront
        ? [{ label: "Vista interna", node: createCarouselPage("Vista interna", createOrientativeInternalFront(product.dimensions.nominalMm, product.technicalLayout.internalFront), "Vãos internos confirmados; não equivalem ao envelope externo do módulo."), shortLabel: "Interna" }]
        : []),
      { label: "Vista isométrica", node: createCarouselPage("Vista isométrica", createTechnicalIsometricView(product), product.drawingSpec?.kind === "panel" ? "Painel estrutural em proporção; espessura ampliada somente para leitura." : "Projeção proporcional das cotas nominais."), shortLabel: "Isométrica" }
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
        });
        stage.classList.remove("is-fading");
        isTransitioning = false;
      }, 180);
    };

    pages.forEach((page, index) => {
      const dot = document.createElement("button");
      dot.type = "button";
      dot.className = "module-detail__carousel-dot";
      dot.setAttribute("aria-label", `Mostrar ${page.label}, página ${index + 1} de ${pages.length}`);
      dot.title = page.shortLabel;
      dot.addEventListener("click", () => renderPage(index, true));
      dots.append(dot);
    });
    stage.replaceChildren(pages[currentPage].node);
    dots.children[currentPage]?.classList.add("is-active");
    dots.children[currentPage]?.setAttribute("aria-current", "true");
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
        ? "Valor do painel estrutural. Frentes, pedra e serviço aparecem abaixo com o impacto atual do mock."
        : "Módulo e puxador aplicável. Frentes, pedra e serviço aparecem abaixo com o impacto atual do mock.";
      price.append(priceLabel, priceValue, priceDescription, createItemPriceBreakdown(product, itemPricing));
    } else {
      priceValue.textContent = "Em configuração";
      priceDescription.textContent = "O valor aparece quando a tabela de trabalho estiver completa.";
      price.append(priceLabel, priceValue, priceDescription);
    }

    const material = document.createElement("div");
    material.className = "module-detail__material";
    material.append(
      createMaterialFact("Frentes", selectedFrontFinishLabel()),
      createMaterialFact("Caixaria", "Branco TX")
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
    const handle = selectedHandle();
    const includedServices = catalog.services.filter((service) => service.status === "included").map((service) => service.title);
    finish.textContent = `Frentes: ${finishPreset?.label || selectedFrontFinishLabel()}. Caixaria: Branco TX. Puxador: ${handle.label}. Serviço incluso: ${includedServices.join(", ") || "nenhum"}.`;
    const price = document.createElement("div");
    price.className = "price-state";
    if (estimate.status === "demo") {
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
      appendPriceBreakdownRow(composition, "Frentes", formatCurrency(adjustments.frontCents), `${selectedFrontFinishLabel()} · ${mockImpactLabel(adjustments.frontCents)}.`);
      appendPriceBreakdownRow(composition, "Pedra", formatCurrency(adjustments.stoneCents), `${selectedStoneLabel()} · ${mockImpactLabel(adjustments.stoneCents)}.`);
      appendPriceBreakdownRow(composition, "Serviço", formatCurrency(adjustments.serviceCents), `${includedServices.join(", ") || "Nenhum"} · ${mockImpactLabel(adjustments.serviceCents)}.`);
      const reference = document.createElement("p");
      reference.className = "price-state__reference";
      reference.textContent = `Referência de composição do mock: ${formatCurrency(priceBook.compositionBaseReferenceCents)}. Não integra o total.`;
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
  renderHandleControlsFromData();
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
    lastResolved = resolved;
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
    updateHandleControls();
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

  moduleDetail.addEventListener("click", (event) => {
    const navigation = event.target.closest("[data-navigate-module]");
    if (navigation) {
      selectAdjacentModule(Number(navigation.dataset.navigateModule));
      return;
    }
    const close = event.target.closest("[data-close-module-detail]");
    if (!close) return;
    state.selectedEntityId = null;
    syncLayerVisibility();
    announce("Detalhes do módulo fechados.");
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
    const nextByStep = { modules: "finishes", finishes: "services", services: "summary", summary: "modules" };
    changeStep(nextByStep[currentStep], true);
  });

  handleOptions?.addEventListener("click", (event) => {
    const button = event.target.closest("[data-handle-id]");
    if (!button) return;
    state.handlePresetId = button.dataset.handleId;
    syncFingerprint();
    syncLayerVisibility();
    const handle = selectedHandle();
    announce(handle.id === "none" ? "Puxador será definido depois." : `${handle.label} aplicado à simulação.`);
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
