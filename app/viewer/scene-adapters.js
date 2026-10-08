(function (global) {
  "use strict";

  function normalizeModule(product, entity) {
    const id = product.entityId || product.id;
    const number = String(product.referenceLabel || product.sku || id).match(/\d+/)?.[0] || id;
    // Destaques, Componentes e Requisitos são listas editáveis no ADM.
    // Não inferir caixaria, descrição ou resumo de qualquer uma delas.
    const benefits = Array.isArray(product.benefits) ? product.benefits.filter((item) => typeof item === "string" && item.trim()) : [];
    const components = Array.isArray(product.components) ? product.components.filter((item) => typeof item === "string" && item.trim()) : [];
    const dimensions = product.dimensions?.nominalMm || product.dimensions || {};
    const dimensionLabel = product.dimensions?.display || product.dimensionLabel || [dimensions.width, dimensions.height, dimensions.depth].filter(Number.isFinite).join(" × ") + " mm";
    const views = Array.isArray(product.views) ? product.views : ["focus", "front", "side", ...(product.technicalLayout?.internalFront ? ["internal"] : []), "isometric"];
    return {
      id, number, category: product.category || "Módulo", title: product.title || entity?.label || id,
      description: typeof product.description === "string" ? product.description.trim() : "",
      bounds: entity?.alphaBounds || product.bounds || { x: 0, y: 0, width: 1, height: 1 },
      dimensions, dimensionLabel, benefits, components,
      requirements: Array.isArray(product.requirements) ? product.requirements.filter((item) => typeof item === "string" && item.trim()) : [],
      frontLayout: product.frontLayout || null,
      drawingSpec: product.drawingSpec || null,
      internalLayout: product.internalLayout || product.technicalLayout?.internalFront?.segments || null,
      internalLayoutAxis: product.internalLayoutAxis || (product.technicalLayout?.internalFront ? "width" : null),
      views
    };
  }

  function createAdapter(scene, modules, options = {}) {
    const listeners = new Set();
    const stateListeners = new Set();
    let stage = null;
    let keyboardBound = false;
    const renderScene = options.scene || scene;
    const sceneProducts = options.products || modules;
    const core = options.core || global.CasaModulesCore;
    const visibility = options.visibility || global.CasaModulesVisibility;
    const sceneComponent = options.sceneComponent || global.CasaModulesSceneComponent;
    const finishApi = options.finishApi || global.CasaModulesFinishes;
    const finishes = options.finishes || global.CASA_EM_MODULOS_CATALOG?.options?.finishes || [];
    // The same mutable ViewerState2D drives selection, visibility and finishes.
    const sceneState = options.sceneState || core.createInitialState(renderScene);
    let resolvedVisibility = visibility.resolveVisibility(renderScene, sceneState);
    const visibleModules = () => modules.filter((module) => resolvedVisibility[module.id]?.visible);
    const isAvailable = (id) => modules.some((module) => module.id === id) && resolvedVisibility[id]?.visible;
    const selectedIdFromData = [options.initialSelectedId, sceneState.selectedEntityId,
      ...visibleModules().map((module) => module.id)].find((id) => isAvailable(id));
    if (!selectedIdFromData) throw new Error("Nenhum módulo publicado está visível na cena.");
    let selectedId = selectedIdFromData;
    sceneState.selectedEntityId = selectedId;
    const allowedFinishIds = options.allowedFinishIds || finishes.filter((finish) => finish.status === "published").map((finish) => finish.id);
    function getState() {
      return Object.freeze({
        selectedEntityId: selectedId,
        finishId: core.globalFinishId(sceneState),
        visibleModuleIds: Object.freeze(visibleModules().map((module) => module.id))
      });
    }
    function notifyState() { const snapshot = getState(); stateListeners.forEach((listener) => listener(snapshot)); }
    function getSelection() {
      const module = modules.find((item) => item.id === selectedId) || null;
      return Object.freeze({ moduleId: selectedId, module, entity: renderScene.entities.find((entity) => entity.id === selectedId) || null });
    }
    function notify() { const selection = getSelection(); listeners.forEach((listener) => listener(selection)); }
    function renderSurface() {
      if (!stage) return;
      stage.tabIndex = 0;
      stage.dataset.keyboardGlobal = "true";
      stage.setAttribute("aria-label", "Cena da cozinha. Use as setas para percorrer os módulos ou as teclas de 1 a 7 para selecionar pelo número.");
      const base = document.createElement("img"); base.className = "scene-layer"; base.alt = "Composição da cozinha Casa em Módulos"; base.draggable = false;
      const layers = document.createElement("div");
      const hotspots = document.createElement("div"); hotspots.className = "scene-hotspots"; hotspots.setAttribute("aria-label", "Módulos selecionáveis na cena");
      const frame = sceneComponent.createSelectionFrame();
      sceneComponent.renderLayers(renderScene, base, layers, options.inlineMasks || null, options.assetPrefix || "");
      const selectedFinishId = core.globalFinishId(sceneState);
      const baseFinish = finishes.find((finish) => finish.id === selectedFinishId);
      if (!baseFinish) throw new Error("Acabamento inicial ausente do catálogo: " + selectedFinishId);
      if (baseFinish && options.inlineMasks && finishApi) sceneComponent.applyFinishAppearance({
        scene: renderScene, layers, products: sceneProducts, inlineMasks: options.inlineMasks,
        resolved: resolvedVisibility, finish: baseFinish, finishApi, assetPrefix: options.assetPrefix || ""
      });
      sceneComponent.renderHotspots(renderScene, sceneProducts, hotspots, options.assetPrefix || "");
      layers.querySelectorAll(".layer-group").forEach((layer) => {
        const result = resolvedVisibility[layer.dataset.entityId];
        const visible = Boolean(result?.visible);
        layer.classList.toggle("is-hidden", !visible); layer.setAttribute("aria-hidden", String(!visible));
      });
      sceneComponent.updateHotspots(hotspots, resolvedVisibility, selectedId);
      sceneComponent.renderSelectionFrame(frame, renderScene.entities.find((entity) => entity.id === selectedId), renderScene);
      stage.replaceChildren(base, layers, hotspots, frame);
      hotspots.addEventListener("click", (event) => {
        const button = event.target.closest("[data-select-scene-entity]");
        if (button && !button.disabled) select(button.dataset.selectSceneEntity);
      });
    }
    function select(id) {
      if (!isAvailable(id)) return false;
      selectedId = id;
      sceneState.selectedEntityId = id;
      if (stage) {
        const hotspots = stage.querySelector(".scene-hotspots");
        sceneComponent.updateHotspots(hotspots, resolvedVisibility, selectedId);
        sceneComponent.renderSelectionFrame(stage.querySelector(".selection-frame"), renderScene.entities.find((entity) => entity.id === selectedId), renderScene);
      }
      notify(); notifyState(); options.onSelectionChange?.(getSelection()); return true;
    }
    function setGlobalFinish(id) {
      if (!allowedFinishIds.includes(id) || !finishes.some((finish) => finish.id === id)) return false;
      if (id === core.globalFinishId(sceneState)) return true;
      core.setGlobalSelection(sceneState, { finishId: id });
      resolvedVisibility = visibility.resolveVisibility(renderScene, sceneState);
      renderSurface();
      notifyState();
      return true;
    }
    return Object.freeze({
      contractVersion: "PublicSceneAdapter 0.5", modules,
      mount(target) {
        if (stage && stage !== target) throw new Error("Viewer scene already mounted on another element");
        stage = target;
        renderSurface();
        if (!keyboardBound) {
          sceneComponent.bindKeyboard(stage, visibleModules(), () => selectedId, select);
          keyboardBound = true;
        }
      },
      select,
      getSelectedModule() { return modules.find((module) => module.id === selectedId) || null; },
      getSelection,
      getState,
      getFinishes() { return Object.freeze(finishes.filter((finish) => allowedFinishIds.includes(finish.id)).map((finish) => Object.freeze({ id: finish.id, label: finish.label || finish.publicLabel || finish.id, color: finish.color, textureAsset: finish.textureAsset || "" }))); },
      setGlobalFinish,
      subscribeState(listener) { stateListeners.add(listener); return () => stateListeners.delete(listener); },
      getSceneEntity(id) { return renderScene.entities.find((entity) => entity.id === id) || null; },
      getSceneCanvas() { return { width: renderScene.canvas.width, height: renderScene.canvas.height }; },
      getAssetUrl(asset) { return asset?.startsWith("/") || /^[a-z][a-z\d+.-]*:/i.test(asset || "") ? asset : `${options.assetPrefix || ""}${asset || ""}`; },
      subscribe(listener) { listeners.add(listener); return () => listeners.delete(listener); }
    });
  }

  function createStandaloneAdapter(initialSelectedId, publicState, publicModules) {
    return createRepositoryAdapter({
      scene: global.CASA_EM_MODULOS_SCENE,
      catalog: global.CASA_EM_MODULOS_CATALOG,
      core: global.CasaModulesCore,
      visibility: global.CasaModulesVisibility,
      validation: global.CasaModulesValidation,
      initialSelectedId, publicState, publicModules,
      assetPrefix: "../", inlineMasks: global.CASA_EM_MODULOS_MASK_DATA
    });
  }

  // Dormant integration connector. It maps the repository's current data and
  // state contracts to the public adapter without starting configurator UI.
  function createRepositoryAdapter({ scene, catalog, core, visibility, validation, initialSelectedId, publicState = null, publicModules = null, allowedFinishIds = null, sceneComponent, finishApi, inlineMasks = global.CASA_EM_MODULOS_MASK_DATA, assetPrefix = "../", onSelectionChange }) {
    if (!scene?.entities || !catalog?.modules || !core?.createInitialState || !visibility?.resolveVisibility || !validation?.assertValidScene) {
      throw new Error("Contratos Scene2D/ProductCatalog2D incompletos para a integração pública.");
    }
    const sharedSceneComponent = sceneComponent || global.CasaModulesSceneComponent;
    const sharedFinishApi = finishApi || global.CasaModulesFinishes;
    const requiredSceneMethods = ["createSelectionFrame", "renderLayers", "renderHotspots", "updateHotspots", "renderSelectionFrame", "bindKeyboard", "applyFinishAppearance"];
    if (!requiredSceneMethods.every((method) => typeof sharedSceneComponent?.[method] === "function")) {
      throw new Error("Componente compartilhado da cena incompatível com o viewer.");
    }
    if (inlineMasks && catalog.options?.finishes?.length && !["resolveMaskAsset", "resolveOverlayOpacity", "resolveStructureStrength"].every((method) => typeof sharedFinishApi?.[method] === "function")) {
      throw new Error("Contrato de acabamentos incompatível com as máscaras da cena.");
    }
    validation.assertValidScene(scene);
    const entityById = new Map(scene.entities.map((entity) => [entity.id, entity]));
    const catalogById = new Map(catalog.modules.map((product) => [product.entityId, product]));
    // When a server-approved public projection is provided, it owns published
    // order and editable copy. ProductCatalog supplies only physical evidence.
    const sourceProducts = publicModules ? publicModules.map((entry) => {
      const physical = catalogById.get(entry?.id);
      if (!physical || !entityById.has(entry.id) || typeof entry.title !== "string" || !entry.title.trim()) {
        throw new TypeError("Unknown or invalid published module: " + entry?.id);
      }
      return { ...physical, title: entry.title, description: entry.description || "",
        benefits: entry.benefits || [], components: entry.components || [], requirements: entry.requirements || [] };
    }) : catalog.modules;
    const modules = sourceProducts.map((product) =>
      normalizeModule(product, entityById.get(product.entityId))
    ).filter((module) => entityById.has(module.id));
    if (new Set(modules.map((module) => module.id)).size !== modules.length) {
      throw new TypeError("Duplicate published module");
    }
    if (!modules.length) throw new Error("O catálogo não contém módulos associados à cena.");
    const state = core.createInitialState(scene);
    if (publicModules) {
      // A missing module in the published allowlist must not remain visibly
      // rendered just because Scene2D's fallback defaults include it.
      const publishedIds = new Set(modules.map((module) => module.id));
      for (const product of catalog.modules) {
        if (!publishedIds.has(product.entityId)) {
          core.setEntityVisibility(state, product.entityId, false);
        }
      }
    }
    if (publicState) {
      // Public projection only; never inject an entire administrative document.
      if (publicState.entities && typeof publicState.entities === "object") {
        for (const [id, enabled] of Object.entries(publicState.entities)) {
          if (!modules.some((module) => module.id === id) || typeof enabled !== "boolean") {
            throw new TypeError("Invalid public module visibility: " + id);
          }
          core.setEntityVisibility(state, id, enabled);
        }
      }
      if (publicState.selectedEntityId != null) {
        if (typeof publicState.selectedEntityId !== "string") throw new TypeError("Invalid public module selection");
        state.selectedEntityId = publicState.selectedEntityId;
      }
      if (publicState.finishId != null) {
        const initialOptions = publicState.availableFinishes || catalog.options.finishes;
        if (!initialOptions.some((finish) => finish.id === publicState.finishId)) {
          throw new TypeError("Unknown public finish: " + publicState.finishId);
        }
        core.setGlobalSelection(state, { finishId: publicState.finishId });
      }
    }
    const physicalFinishes = catalog.options?.finishes || [];
    const byPhysicalFinish = new Map(physicalFinishes.map((finish) => [finish.id, finish]));
    const authorizedFinishes = publicState?.availableFinishes;
    if (authorizedFinishes != null && (!Array.isArray(authorizedFinishes) || !authorizedFinishes.length)) {
      throw new TypeError("Invalid public finish options");
    }
    const sceneFinishes = authorizedFinishes
      ? authorizedFinishes.map((entry) => {
        if (!entry || typeof entry.id !== "string" || !entry.id
          || typeof entry.label !== "string" || !entry.label.trim()
          || !(entry.color === null || /^#[0-9a-fA-F]{6}$/.test(entry.color || ""))
          || typeof entry.textureAsset !== "string"
          || (entry.textureAsset && (!/^assets\/[A-Za-z0-9_./-]+\.(png|webp|jpe?g)$/i.test(entry.textureAsset)
            || entry.textureAsset.includes("..")))
          || typeof entry.textureSize !== "string") {
          throw new TypeError("Invalid published finish");
        }
        return { ...byPhysicalFinish.get(entry.id), ...entry, status: "published" };
      })
      : physicalFinishes;
    const availability = allowedFinishIds || (authorizedFinishes
      ? authorizedFinishes.map((finish) => finish.id)
      : sceneFinishes.filter((finish) => finish.status === "published").map((finish) => finish.id));
    if (!Array.isArray(availability) || !availability.length || new Set(availability).size !== availability.length
      || availability.some((id) => !sceneFinishes.some((finish) => finish.id === id))
      || !availability.includes(core.globalFinishId(state))) {
      throw new TypeError("Invalid public finish availability or selected finish");
    }
    return createAdapter(scene, modules, {
      initialSelectedId, sceneState: state, allowedFinishIds: availability,
      scene, products: sourceProducts, catalog, finishes: sceneFinishes,
      sceneComponent: sharedSceneComponent, finishApi: sharedFinishApi,
      assetPrefix, inlineMasks, core, visibility, onSelectionChange
    });
  }

  global.CASA_PUBLIC_SCENE_ADAPTERS = Object.freeze({
    contractVersion: "PublicSceneAdapter 0.5",
    createStandaloneAdapter,
    createRepositoryAdapter,
    create(options = {}) {
      if (options.scene && options.catalog) return createRepositoryAdapter(options);
      return createStandaloneAdapter(options.initialSelectedId, options.publicState, options.publicModules);
    }
  });
})(window);
