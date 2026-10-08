(function (global) {
  "use strict";

  function normalizeModule(product, entity) {
    const id = product.entityId || product.id;
    const number = String(product.referenceLabel || product.sku || id).match(/\d+/)?.[0] || id;
    const sourceBenefits = Array.isArray(product.benefits) ? product.benefits : [];
    const components = Array.isArray(product.components) ? product.components : [];
    const presentation = product.publicPresentation && typeof product.publicPresentation === "object" ? product.publicPresentation : {};
    const carcass = (typeof presentation.carcass === "string" && presentation.carcass.trim()) || product.carcass || sourceBenefits.find((item) => /caixaria/i.test(item)) || null;
    const description = typeof presentation.description === "string" ? presentation.description.trim() : "";
    const benefits = carcass ? sourceBenefits.filter((item) => !/caixaria/i.test(item)) : sourceBenefits;
    const dimensions = product.dimensions?.nominalMm || product.dimensions || {};
    const dimensionLabel = product.dimensions?.display || product.dimensionLabel || [dimensions.width, dimensions.height, dimensions.depth].filter(Number.isFinite).join(" × ") + " mm";
    const views = Array.isArray(product.views) ? product.views : ["focus", "front", "side", ...(product.technicalLayout?.internalFront ? ["internal"] : []), "isometric"];
    return {
      id, number, category: product.category || "Módulo", title: product.title || entity?.label || id,
      summary: description || product.publicDescription || product.summary || benefits[0] || "Informações do módulo.",
      bounds: entity?.alphaBounds || product.bounds || { x: 0, y: 0, width: 1, height: 1 },
      dimensions, dimensionLabel, carcass, benefits, components,
      requirements: Array.isArray(product.requirements) ? product.requirements : [],
      frontLayout: product.frontLayout || null,
      drawingSpec: product.drawingSpec || null,
      internalLayout: product.internalLayout || product.technicalLayout?.internalFront?.segments || null,
      internalLayoutAxis: product.internalLayoutAxis || (product.technicalLayout?.internalFront ? "width" : null),
      views
    };
  }

  function createAdapter(scene, modules, options = {}) {
    const listeners = new Set();
    let selectedId = options.initialSelectedId || modules[0]?.id || null;
    let stage = null;
    const renderScene = options.scene || scene;
    const sceneProducts = options.products || modules;
    const core = options.core || global.CasaModulesCore;
    const visibility = options.visibility || global.CasaModulesVisibility;
    const sceneComponent = options.sceneComponent || global.CasaModulesSceneComponent;
    const finishApi = options.finishApi || global.CasaModulesFinishes;
    const finishes = options.finishes || global.CASA_EM_MODULOS_CATALOG?.options?.finishes || [];
    const sceneState = core.createInitialState(renderScene);
    const resolvedVisibility = visibility.resolveVisibility(renderScene, sceneState);
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
      const selectedFinishId = core.globalFinishId?.(sceneState) || "base-light";
      const baseFinish = finishes.find((finish) => finish.id === selectedFinishId) || finishes[0];
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
      sceneComponent.bindKeyboard(stage, modules, () => selectedId, select);
    }
    function select(id) {
      if (!modules.some((module) => module.id === id)) return false;
      selectedId = id; options.onSelect?.(id);
      if (stage) {
        const hotspots = stage.querySelector(".scene-hotspots");
        sceneComponent.updateHotspots(hotspots, resolvedVisibility, selectedId);
        sceneComponent.renderSelectionFrame(stage.querySelector(".selection-frame"), renderScene.entities.find((entity) => entity.id === selectedId), renderScene);
      }
      notify(); options.onSelectionChange?.(getSelection()); return true;
    }
    return Object.freeze({
      contractVersion: "PublicSceneAdapter 0.5", modules,
      mount(target) { stage = target; renderSurface(); },
      select,
      getSelectedModule() { return modules.find((module) => module.id === selectedId) || null; },
      getSelection,
      getSceneEntity(id) { return renderScene.entities.find((entity) => entity.id === id) || null; },
      getSceneCanvas() { return { width: renderScene.canvas.width, height: renderScene.canvas.height }; },
      getAssetUrl(asset) { return asset?.startsWith("/") || /^[a-z][a-z\d+.-]*:/i.test(asset || "") ? asset : `${options.assetPrefix || ""}${asset || ""}`; },
      subscribe(listener) { listeners.add(listener); return () => listeners.delete(listener); }
    });
  }

  function createStandaloneAdapter(initialSelectedId) {
    return createRepositoryAdapter({
      scene: global.CASA_EM_MODULOS_SCENE,
      catalog: global.CASA_EM_MODULOS_CATALOG,
      core: global.CasaModulesCore,
      visibility: global.CasaModulesVisibility,
      validation: global.CasaModulesValidation,
      initialSelectedId: initialSelectedId || global.CASA_EM_MODULOS_SCENE?.entities.find((entity) => entity.controllable)?.id,
      assetPrefix: "../", inlineMasks: global.CASA_EM_MODULOS_MASK_DATA
    });
  }

  // Dormant integration connector. It maps the repository's current data and
  // state contracts to the public adapter without starting configurator UI.
  function createRepositoryAdapter({ scene, catalog, core, visibility, validation, initialSelectedId, sceneComponent, finishApi, inlineMasks = global.CASA_EM_MODULOS_MASK_DATA, assetPrefix = "../", onSelectionChange }) {
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
    const modules = catalog.modules.map((product) => {
      return normalizeModule(product, entityById.get(product.entityId));
    }).filter((module) => entityById.has(module.id));
    if (!modules.length) throw new Error("O catálogo não contém módulos associados à cena.");
    const state = core.createInitialState(scene);
    state.selectedEntityId = modules.some((module) => module.id === initialSelectedId) ? initialSelectedId : modules[0].id;
    visibility.resolveVisibility(scene, state);
    return createAdapter(scene, modules, {
      initialSelectedId: state.selectedEntityId,
      scene, products: catalog.modules, catalog, finishes: catalog.options?.finishes || [],
      sceneComponent: sharedSceneComponent, finishApi: sharedFinishApi,
      assetPrefix, inlineMasks, core, visibility,
      onSelectionChange,
      onSelect(id) { state.selectedEntityId = id; visibility.resolveVisibility(scene, state); }
    });
  }

  global.CASA_PUBLIC_SCENE_ADAPTERS = Object.freeze({
    contractVersion: "PublicSceneAdapter 0.5",
    createStandaloneAdapter,
    createRepositoryAdapter,
    create(options = {}) {
      if (options.scene && options.catalog) return createRepositoryAdapter(options);
      return createStandaloneAdapter(options.initialSelectedId);
    }
  });
})(window);
