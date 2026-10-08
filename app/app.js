(function startConfigurator(global) {
  "use strict";

  let scene = structuredClone(global.CASA_EM_MODULOS_SCENE);
  const inlineMasks = global.CASA_EM_MODULOS_MASK_DATA;
  const core = global.CasaModulesCore;
  const visibility = global.CasaModulesVisibility;
  const validation = global.CasaModulesValidation;
  const fingerprint = global.CasaModulesFingerprint;
  const finishes = global.CasaModulesFinishes;
  let catalog = structuredClone(global.CASA_EM_MODULOS_CATALOG);
  const configurationCore = global.CasaModulesConfiguration;
  const flowCore = global.CasaModulesFlow;
  const layoutProfiles = global.CasaModulesLayoutProfiles;
  const presentationCore = global.CasaModulesPresentation;
  let presentationPolicy = global.CASA_EM_MODULOS_PRESENTATION_POLICY;
  const administrationV5 = global.CasaModulesAdministrationV5;
  const buyerProjection = global.CasaModulesPublishedBuyerProjection;
  const flowLayout = global.CasaModulesFlowLayout;
  const hierarchyDefaults = global.CASA_EM_MODULOS_HIERARCHY_DEFAULTS;
  const priceBook = structuredClone(global.CASA_EM_MODULOS_PRICE_BOOK);
  const pricingContract = global.CasaModulesPricingContract;
  const pricing = global.CasaModulesPricing;
  let pricingRules = null;
  let configuratorSettings = global.CASA_EM_MODULOS_CONFIGURATOR_DEFAULTS;
  let finishSettings = new Map(catalog.options.finishes.map((finish) => [finish.id, { scope: "global", enabled: finish.status === "published", moduleIds: catalog.modules.map((module) => module.entityId) }]));
  let dynamicDependencies = [];
  let dynamicEvents = [];
  let configuredObjectAssets = {};
  let normalizedFlow = null;
  let flowLayoutErrors = [];
  let initialStateApplied = false;

  function amountPricingCents(role, id) {
    const rule = pricingRules?.roles?.[role]?.[id];
    return rule?.type === "amount" && Number.isSafeInteger(rule.cents) ? rule.cents : 0;
  }

  function handleFrontTotal() {
    return Number.isSafeInteger(pricingRules?.allocation?.handleFrontTotal)
      ? pricingRules.allocation.handleFrontTotal
      : 0;
  }

  if (!scene || !inlineMasks || !core || !visibility || !validation || !fingerprint || !finishes || !catalog || !priceBook || !pricingContract || !pricing || !configurationCore || !flowCore || !layoutProfiles || !presentationCore || !presentationPolicy || !flowLayout || !hierarchyDefaults || !configuratorSettings || !administrationV5 || !buyerProjection) {
    throw new Error("Não foi possível carregar os dados da cena 2D.");
  }
  validation.assertValidScene(scene);

  function publishNormalizedFlow(settings) {
    normalizedFlow = flowCore.normalizeFlow(settings, configurationCore.itemRegistry(catalog), hierarchyDefaults);
    presentationCore.assertValidPolicy(presentationPolicy, layoutProfiles.PROFILES, normalizedFlow);
    global.CASA_NORMALIZED_FLOW = normalizedFlow;
    global.CASA_KEYBOARD_SHORTCUTS?.setFlow?.(normalizedFlow);
    return normalizedFlow;
  }

  const initialAdministration = configurationCore.createDefaultAdministration(configuratorSettings, catalog, priceBook, scene);
  pricingRules = pricingContract.normalize(priceBook.pricing);
  dynamicDependencies = initialAdministration.dependencies;
  dynamicEvents = initialAdministration.events;
  configuredObjectAssets = initialAdministration.objectAssets;
  publishNormalizedFlow(initialAdministration);

  let state = core.createInitialState(scene);
  let currentStep = "modules";
  let detailOrigin = null;
  const moduleViewScrollTopById = new Map();
  let mobileScenePinEnabled = true;
  let mobileSceneIsMini = false;
  let mobileSceneAnchorHeight = 0;
  let mobileSceneTransparent = false;
  let mobilePipSizeIndex = 1;
  let mobilePipPosition = null;
  let mobilePipWidth = null;

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
  const moduleDetailPlaceholder = document.getElementById("moduleDetailPlaceholder");
  const finishesStagePanel = document.getElementById("finishesStagePanel");
  const frontFinishPanel = document.getElementById("frontFinishPanel");
  const stonePanel = document.getElementById("stonePanel");
  const servicesPanel = document.getElementById("servicesPanel");
  const summaryPanel = document.getElementById("summaryPanel");
  const lightingToggle = document.getElementById("lightingToggle");
  const configurationAnnouncement = document.getElementById("configurationAnnouncement");
  const handleOptions = document.getElementById("handleOptions");
  const servicesChecklist = document.getElementById("servicesChecklist");
  const stonePackageOptions = document.getElementById("stonePackageOptions");
  const stoneSkirtingToggle = document.getElementById("stoneSkirtingToggle");
  const viewerCard = document.getElementById("viewerCard");
  const viewerAnchor = document.getElementById("viewerAnchor");
  const viewerPinSentinel = document.getElementById("viewerPinSentinel");
  const mobileScenePin = document.getElementById("mobileScenePin");
  const mobileSceneTransparency = document.getElementById("mobileSceneTransparency");
  const mobileSceneResize = document.getElementById("mobileSceneResize");
  const mobileSceneResizeHandle = document.getElementById("mobileSceneResizeHandle");
  const mobileSceneRepin = document.getElementById("mobileSceneRepin");
  const flowNav = document.querySelector(".flow-nav");
  const flowActions = document.querySelector(".flow-actions");
  const stagePanels = new Map([
    ["modules", modulesPanel], ["finishes", finishesStagePanel], ["services", servicesPanel], ["summary", summaryPanel]
  ]);
  const selectedFinishDescription = document.getElementById("selectedFinishDescription");
  const catalogByEntityId = new Map(catalog.modules.map((module) => [module.entityId, module]));
  const serviceById = new Map(catalog.services.map((service) => [service.id, service]));
  const stageConfig = (id) => configuratorSettings.stages.find((stage) => stage.id === id);
  const stageKind = (stage) => stage?.kind || stage?.id;
  const boundFlowSectionFor = (element) => {
    if (!element) return null;
    const stageId = element.closest("[data-flow-group-grid]")?.dataset.flowGroupGrid;
    const sectionId = element.closest("[data-keyboard-section]")?.dataset.keyboardSection;
    if (!stageId || !sectionId) return null;
    const stage = normalizedFlow?.stages?.find((entry) => entry.id === stageId);
    return stage?.groups.flatMap((group) => group.sections).find((section) => section.id === sectionId) || null;
  };
  const itemAvailable = (itemId) => flowCore.itemAvailable(normalizedFlow, itemId);
  const stageOwns = (stageId, itemId) => flowCore.stageOwns(normalizedFlow, stageId, itemId);
  const enabledStages = () => configuratorSettings.stages.filter((stage) => stage.enabled);
  const moduleIdSet = new Set(catalog.modules.map((item) => item.entityId));
  const configuredModuleIds = () => new Set(enabledStages().flatMap((stage) => stage.items).filter((id) => moduleIdSet.has(id)));
  const requirementsForEntity = (entityId) => [...new Set([
    ...(scene.entities.find((entity) => entity.id === entityId)?.requiresVisibleIds || []),
    ...dynamicDependencies.filter((rule) => rule.dependentId === entityId).flatMap((rule) => rule.requires)
  ])];
  const rawSelectionIsActive = (id) => Object.hasOwn(state.visibilityByEntity, id) ? Boolean(state.visibilityByEntity[id]) : Boolean(state.globalSelections?.serviceIds?.includes(id));
  const eventIsActive = (rule) => rawSelectionIsActive(rule.triggerId) === (rule.when === "enabled");
  const eventOverrideForTarget = (id) => dynamicEvents.find((rule) => rule.action === "set-enabled" && rule.targetId === id && eventIsActive(rule));
  const eventAdjustedState = () => configurationCore.resolveEventState(scene, state, dynamicEvents, dynamicDependencies);
  const selectionIsActive = (id) => {
    const effective = eventAdjustedState();
    return Object.hasOwn(effective.visibilityByEntity, id) ? Boolean(effective.visibilityByEntity[id]) : Boolean(effective.globalSelections?.serviceIds?.includes(id));
  };
  const detailPageByEntity = new Map();
  const detailInteractionByEntity = new Set();
  const detailViewsCollapsedByEntity = new Set();
  const detailSelectionPulseByEntity = new Set();
  const detailNavigationAttentionByEntity = new Set();
  let detailCarouselTimer = null;
  let lastResolved = null;
  const customStagePanels = new Map();
  const originalSceneEntities = new Map(scene.entities.map((entity) => [entity.id, structuredClone(entity)]));

  function configuredEntity(entity) {
    const assets = configuredObjectAssets[entity.id];
    return assets ? { ...entity, asset: assets.imageAsset || originalSceneEntities.get(entity.id)?.asset || entity.asset, maskAsset: assets.maskAsset || originalSceneEntities.get(entity.id)?.maskAsset || entity.maskAsset } : entity;
  }

  function setFlowLayoutErrors(errors) {
    flowLayoutErrors = errors;
    global.CASA_FLOW_LAYOUT_ERRORS = flowLayoutErrors.map((error) => ({ ...error }));
    if (errors.length) console.error("Flow layout invariant failure", errors);
  }

  function validateRendererComponentBinding(stageId, section, element, context = {}) {
    const expected = section?.component;
    const bound = element?.dataset?.renderComponent || "";
    if (!bound) {
      return [{
        code: "missing-component-binding",
        stageId,
        sectionId: section?.id,
        component: expected,
        ...context,
        message: `missing renderer component: ${stageId}/${section?.id}`
      }];
    }
    if (bound !== expected) {
      return [{
        code: "component-binding-mismatch",
        stageId,
        sectionId: section?.id,
        component: expected,
        boundComponent: bound,
        ...context,
        message: `renderer component mismatch: ${stageId}/${section?.id} expected ${expected} but found ${bound}`
      }];
    }
    element.dataset.flowComponent = expected;
    return [];
  }

  function validateCustomStageBindings() {
    const errors = [];
    (normalizedFlow?.stages || []).filter((stage) => stage.kind === "custom" && stage.enabled).forEach((stage) => {
      const plan = flowLayout.stageLayout(normalizedFlow, stage.id);
      const panel = customStagePanels.get(stage.id);
      if (!plan || !panel) {
        errors.push({ code: "missing-custom-stage-binding", stageId: stage.id, message: `missing custom stage renderer: ${stage.id}` });
        return;
      }
      const sections = plan.groups.flatMap((group) => group.sections);
      sections.forEach((section) => {
        const matches = [...panel.querySelectorAll("[data-keyboard-section]")]
          .filter((element) => element.dataset.keyboardSection === section.id);
        if (matches.length !== 1) {
          errors.push({
            code: matches.length ? "duplicate-section-binding" : "missing-section-binding",
            stageId: stage.id,
            sectionId: section.id,
            message: matches.length
              ? `multiple renderer sections: ${stage.id}/${section.id}`
              : `missing renderer section: ${stage.id}/${section.id}`
          });
          return;
        }
        errors.push(...validateRendererComponentBinding(stage.id, section, matches[0]));
      });
    });
    return errors;
  }

  function mountStageGroups(stageId, stageRoot) {
    const plan = flowLayout.stageLayout(normalizedFlow, stageId);
    if (!plan || !stageRoot) return [];
    const grids = [...stageRoot.querySelectorAll(":scope > [data-flow-group-grid]")];
    if (grids.length !== 1) {
      return [{
        code: grids.length ? "ambiguous-group-grid" : "missing-group-grid",
        stageId,
        message: grids.length
          ? `multiple group grids for ${stageId}`
          : `missing group grid for ${stageId}`
      }];
    }
    const grid = grids[0];
    grid.dataset.flowGroupGrid = stageId;

    const errors = [];
    const shells = [...grid.querySelectorAll(":scope > [data-flow-group-shell]")];
    const groupSlots = [...grid.querySelectorAll(":scope > [data-flow-group-slot]")];
    const shellById = new Map(shells.map((shell) => [shell.dataset.flowGroupShell, shell]));
    const expectedGroupIds = new Set(plan.groups.map((group) => group.id));
    const expectedSectionIds = new Set(plan.groups.flatMap((group) => group.sections.map((section) => section.id)));
    const allSectionElements = [...grid.querySelectorAll("[data-keyboard-section]")];
    const sectionSlots = [...grid.querySelectorAll("[data-flow-section-slot]")];

    allSectionElements.forEach((element) => {
      const expected = expectedSectionIds.has(element.dataset.keyboardSection);
      if (!expected && element.dataset.flowGeneratedSection === "true") {
        [...element.querySelectorAll(":scope > [data-flow-section-slot]")].forEach((slot) => {
          slot.hidden = true;
          grid.append(slot);
        });
        element.remove();
        return;
      }
      element.hidden = !expected;
    });
    sectionSlots.forEach((slot) => {
      const owner = slot.closest("[data-keyboard-section]");
      slot.hidden = !owner || !expectedSectionIds.has(owner.dataset.keyboardSection);
    });

    shells.forEach((shell) => {
      const groupId = shell.dataset.flowGroupShell;
      const expected = expectedGroupIds.has(groupId);
      const claimedNeutralSlot = shell.dataset.flowGeneratedGroup === "true" && Boolean(shell.dataset.flowGroupSlot);
      if (!expected && claimedNeutralSlot) {
        shell.hidden = true;
        shell.querySelectorAll("[data-flow-group-label]").forEach((label) => {
          label.textContent = "";
        });
        delete shell.dataset.flowGroupShell;
        delete shell.dataset.flowGeneratedGroup;
        delete shell.dataset.flowGroup;
        delete shell.dataset.flowSpan;
        shellById.delete(groupId);
        return;
      }
      shell.hidden = !expected;
    });
    groupSlots.forEach((slot) => {
      if (!slot.dataset.flowGroupShell) slot.hidden = true;
    });

    const shellClassName = String(grid.dataset.flowGroupClass || "").trim();
    const syncGroupLabel = (shell, group) => {
      shell.querySelectorAll("[data-flow-group-label]").forEach((label) => {
        label.textContent = group.label;
      });
    };
    const createGroupShell = (group) => {
      const affinitySlots = groupSlots.filter((slot) =>
        !slot.dataset.flowGroupShell
        && slot.dataset.flowGroupSlot === group.id
      );
      if (affinitySlots.length > 1) {
        return {
          element: null,
          error: {
            code: "ambiguous-group-slot",
            stageId,
            groupId: group.id,
            message: `multiple neutral renderer group slots match ${stageId}/${group.id}`
          }
        };
      }
      if (affinitySlots.length === 1) {
        const shell = affinitySlots[0];
        shell.dataset.flowGroupShell = group.id;
        shell.dataset.flowGeneratedGroup = "true";
        shell.hidden = false;
        syncGroupLabel(shell, group);
        shellById.set(group.id, shell);
        return { element: shell, error: null };
      }
      if (!shellClassName) {
        return {
          element: null,
          error: {
            code: "missing-group-binding",
            stageId,
            groupId: group.id,
            message: `missing renderer group: ${stageId}/${group.id}`
          }
        };
      }
      const shell = document.createElement("div");
      shell.className = shellClassName;
      shell.dataset.flowGroupShell = group.id;
      shell.dataset.flowGeneratedGroup = "true";
      grid.append(shell);
      shellById.set(group.id, shell);
      return { element: shell, error: null };
    };

    const createSectionShell = (section) => {
      const unclaimedCompatibleSlots = sectionSlots.filter((slot) =>
        !slot.closest("[data-keyboard-section]")
        && slot.dataset.renderComponent === section.component
      );
      const affinitySlots = unclaimedCompatibleSlots.filter((slot) =>
        slot.dataset.flowSlotItem
        && section.itemIds.includes(slot.dataset.flowSlotItem)
      );
      const genericSlots = unclaimedCompatibleSlots.filter((slot) => !slot.dataset.flowSlotItem);
      const compatibleSlots = affinitySlots.length ? affinitySlots : genericSlots;
      if (compatibleSlots.length !== 1) {
        return {
          element: null,
          error: {
            code: compatibleSlots.length ? "ambiguous-section-slot" : "missing-section-binding",
            stageId,
            sectionId: section.id,
            component: section.component,
            message: compatibleSlots.length
              ? `multiple neutral renderer slots match ${stageId}/${section.id}`
              : `missing renderer section: ${stageId}/${section.id}`
          }
        };
      }

      const slot = compatibleSlots[0];
      const sectionClassName = String(slot.dataset.flowSectionClass || "").trim();
      if (!sectionClassName) {
        return {
          element: null,
          error: {
            code: "missing-section-class",
            stageId,
            sectionId: section.id,
            component: section.component,
            message: `missing visual section class for ${stageId}/${section.id}`
          }
        };
      }

      const element = document.createElement("section");
      element.className = sectionClassName;
      element.dataset.keyboardSection = section.id;
      element.dataset.keyboardBehavior = section.behavior;
      element.dataset.renderComponent = section.component;
      element.dataset.flowGeneratedSection = "true";
      const heading = document.createElement("h3");
      heading.id = `flowSectionHeading-${stageId}-${section.id}`;
      const headingClassName = String(slot.dataset.flowSectionHeadingClass || "").trim();
      if (headingClassName) heading.className = headingClassName;
      heading.textContent = section.label;
      element.setAttribute("aria-labelledby", heading.id);
      slot.hidden = false;
      element.append(heading, slot);
      allSectionElements.push(element);
      return { element, error: null };
    };

    plan.groups.forEach((group) => {
      let shell = shellById.get(group.id);
      if (!shell) {
        const generated = createGroupShell(group);
        if (generated.error) {
          errors.push(generated.error);
          return;
        }
        shell = generated.element;
      }

      shell.hidden = false;
      syncGroupLabel(shell, group);
      shell.dataset.flowGroup = group.id;
      shell.dataset.flowSpan = String(group.span);
      grid.append(shell);

      const ordered = [];
      group.sections.forEach((section) => {
        const candidateSections = allSectionElements.filter((element) => {
          if (!grid.contains(element)) return false;
          const owner = element.closest("[data-flow-group-shell]");
          return owner === shell || owner == null;
        });
        let matches = candidateSections.filter((element) => element.dataset.keyboardSection === section.id);
        if (!matches.length) {
          const generated = createSectionShell(section);
          if (generated.element) matches = [generated.element];
          else if (generated.error) {
            errors.push({ ...generated.error, groupId: group.id });
            return;
          }
        }
        if (matches.length !== 1) {
          errors.push({
            code: "duplicate-section-binding",
            stageId,
            groupId: group.id,
            sectionId: section.id,
            message: `multiple renderer sections: ${stageId}/${group.id}/${section.id}`
          });
          return;
        }
        const element = matches[0];
        errors.push(...validateRendererComponentBinding(stageId, section, element, { groupId: group.id }));
        element.dataset.flowSection = section.id;
        element.dataset.flowPresentation = section.presentation || "auto";
        ordered.push(element);
      });

      ordered.forEach((element) => shell.append(element));
    });

    return errors;
  }

  function applyModuleViewMarkers(plan, adapters) {
    plan.views.forEach((view) => {
      const matches = adapters.filter((adapter) => adapter.dataset.stageViewId === view.id);
      if (matches.length !== 1) return;
      const adapter = matches[0];
      adapter.dataset.sourceSection = view.sourceSectionId;
      adapter.dataset.viewRole = view.role;
      if (view.relation) {
        adapter.dataset.viewRelation = view.relation.kind;
        adapter.dataset.viewRelationOf = view.relation.of;
      } else {
        delete adapter.dataset.viewRelation;
        delete adapter.dataset.viewRelationOf;
      }
      if (view.projection) adapter.dataset.viewProjection = view.projection;
      else delete adapter.dataset.viewProjection;
    });
  }

  function rememberModuleViewScrollPositions(profile = document.documentElement.dataset.layoutProfile) {
    if (profile !== "stacked") return;
    const container = modulesPanel?.querySelector("[data-stage-view-layout='modules']");
    if (!container) return;
    container.querySelectorAll(":scope > [data-stage-view-id]").forEach((adapter) => {
      moduleViewScrollTopById.set(adapter.dataset.stageViewId, adapter.scrollTop);
    });
  }

  function restoreModuleViewScrollPositions(profile) {
    if (profile !== "stacked" || !moduleViewScrollTopById.size) return;
    requestAnimationFrame(() => {
      const container = modulesPanel?.querySelector("[data-stage-view-layout='modules']");
      if (!container || document.documentElement.dataset.layoutProfile !== "stacked") return;
      container.querySelectorAll(":scope > [data-stage-view-id]").forEach((adapter) => {
        const stored = moduleViewScrollTopById.get(adapter.dataset.stageViewId);
        if (stored != null) adapter.scrollTop = stored;
      });
    });
  }

  function syncModuleViewVisibility(plan, adapters) {
    if (!plan || !Array.isArray(plan.views)) return;
    const primaryView = plan.views.find((view) => view.role === "primary");
    const companionView = plan.views.find((view) => view.relation?.kind === "companion" || view.role === "companion");
    if (!primaryView || !companionView) return;
    const primary = adapters.find((adapter) => adapter.dataset.stageViewId === primaryView.id);
    const companion = adapters.find((adapter) => adapter.dataset.stageViewId === companionView.id);
    if (!primary || !companion) return;

    const replace = companionView.projection === "replace";
    const detailOpen = Boolean(state.selectedEntityId) && document.body.classList.contains("has-module-detail");
    const primaryWillHide = replace && detailOpen;
    const companionWillHide = replace && !detailOpen;
    const active = document.activeElement;
    const activeInPrimary = active instanceof Element && primary.contains(active);
    const activeInCompanion = active instanceof Element && companion.contains(active);

    primary.hidden = primaryWillHide;
    companion.hidden = companionWillHide;
    primary.dataset.viewVisible = String(!primaryWillHide);
    companion.dataset.viewVisible = String(!companionWillHide);

    if (primaryWillHide && activeInPrimary) focusDetailClose();
    else if (companionWillHide && activeInCompanion) restoreDetailOrigin(detailOrigin);
  }

  function mountModuleViewPanes(profile = currentLayoutProfile()) {
    const plan = flowLayout.moduleViewLayout(normalizedFlow, presentationPolicy, profile);
    const container = modulesPanel?.querySelector("[data-stage-view-layout='modules']");
    if (!plan || !container) return [{ code: "missing-module-view-layout", message: "modules view layout is missing" }];
    if (plan.error) return [{ code: plan.error, stageId: "modules", message: plan.error }];
    const adapters = [...container.querySelectorAll(":scope > [data-stage-view-id]")];
    const expectedIds = new Set(plan.views.map((view) => view.id));
    const errors = [];

    plan.views.forEach((view) => {
      const matches = adapters.filter((adapter) => adapter.dataset.stageViewId === view.id);
      if (matches.length !== 1) {
        errors.push({
          code: matches.length ? "duplicate-view-binding" : "missing-view-binding",
          stageId: "modules",
          viewId: view.id,
          message: matches.length
            ? `multiple Modules view adapters: ${view.id}`
            : `missing Modules view adapter: ${view.id}`
        });
        return;
      }
      const adapter = matches[0];
      const boundComponent = adapter.dataset.renderComponent || "";
      if (!boundComponent) {
        errors.push({ code: "missing-view-component-binding", stageId: "modules", viewId: view.id, component: view.component, message: `missing Modules view component: ${view.id}` });
      } else if (boundComponent !== view.component) {
        errors.push({
          code: "view-component-binding-mismatch",
          stageId: "modules",
          viewId: view.id,
          component: view.component,
          boundComponent,
          message: `Modules view component mismatch: ${view.id} expected ${view.component} but found ${boundComponent}`
        });
      } else {
        adapter.dataset.flowComponent = view.component;
      }
    });

    adapters.forEach((adapter) => {
      if (!expectedIds.has(adapter.dataset.stageViewId)) {
        errors.push({
          code: "unexpected-view-binding",
          stageId: "modules",
          viewId: adapter.dataset.stageViewId,
          message: `unexpected Modules view adapter: ${adapter.dataset.stageViewId}`
        });
      }
    });

    applyModuleViewMarkers(plan, adapters);
    syncModuleViewVisibility(plan, adapters);
    return errors;
  }

  function syncModuleViewProjection(profile = currentLayoutProfile()) {
    const plan = flowLayout.moduleViewLayout(normalizedFlow, presentationPolicy, profile);
    const container = modulesPanel?.querySelector("[data-stage-view-layout='modules']");
    if (!plan || plan.error || !container) return;
    const adapters = [...container.querySelectorAll(":scope > [data-stage-view-id]")];
    applyModuleViewMarkers(plan, adapters);
    syncModuleViewVisibility(plan, adapters);
  }

  function applyBuyerFlowLayout() {
    const errors = [];
    (normalizedFlow?.stages || []).forEach((stage) => {
      const kind = stageKind(stage);
      if (kind === "custom") return;
      if (kind === "modules") {
        errors.push(...mountModuleViewPanes());
        return;
      }
      if (!stagePanels.has(kind)) {
        errors.push({
          code: "missing-core-stage-renderer",
          stageId: stage.id,
          stageKind: kind,
          message: `missing core stage renderer: ${stage.id} (${kind})`
        });
        return;
      }
      errors.push(...mountStageGroups(stage.id, stagePanelFor(stage)));
    });
    errors.push(...validateCustomStageBindings());
    setFlowLayoutErrors(errors);
    return errors;
  }

  function stagePanelFor(stage) {
    const kind = stageKind(stage);
    if (stagePanels.has(kind)) return stagePanels.get(kind);
    let panel = customStagePanels.get(stage.id);
    if (!panel) {
      panel = document.createElement("section");
      panel.className = "panel custom-stage-panel";
      panel.id = `customStage-${stage.id}`;
      panel.setAttribute("aria-labelledby", `${panel.id}-heading`);
      document.querySelector(".controls").insertBefore(panel, document.querySelector(".flow-actions"));
      customStagePanels.set(stage.id, panel);
    }
    return panel;
  }

  function renderSceneFromData() {
    sceneBase.src = scene.baseAsset;
    sceneBase.width = scene.canvas.width;
    sceneBase.height = scene.canvas.height;
    sceneLayers.replaceChildren();

    scene.entities
      .slice()
      .sort((left, right) => left.zIndex - right.zIndex || left.id.localeCompare(right.id))
      .forEach((rawEntity) => {
        const entity = configuredEntity(rawEntity);
        const group = document.createElement("div");
        group.className = "layer-group";
        group.dataset.entityId = entity.id;
        group.dataset.module = entity.alias;
        group.style.zIndex = String(entity.zIndex);

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
              const structureAsset = `assets/kitchen/masks/structure-${moduleKey}-${kind}.png`;
              const structureMask = inlineMasks[structureAsset];
              if (!structureMask) throw new Error(`Máscara estrutural incorporada ausente: ${structureAsset}`);
              const structureLayer = document.createElement("div");
              structureLayer.className = `structure-layer structure-layer--${kind}`;
              structureLayer.style.setProperty("--structure-mask-image", `url("${structureMask}")`);
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
      .filter((entity) => entity.kind === "module" && configuredModuleIds().has(entity.id))
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
        input.checked = eventAdjustedState().visibilityByEntity[entity.id];
        const override = eventOverrideForTarget(entity.id);
        input.disabled = Boolean(override);
        input.title = override ? "Controlado por um evento da configuração." : "";

        const number = document.createElement("span");
        number.className = "module-number";
        number.textContent = entity.alias;

        const copy = document.createElement("span");
        copy.className = "module-card__copy";
        const title = document.createElement("strong");
        title.textContent = product.title;
        const dimensions = document.createElement("small");
        dimensions.textContent = productForCurrentConfiguration(product).dimensions.display;
        copy.append(title, dimensions);

        const inspect = document.createElement("button");
        inspect.type = "button";
        inspect.className = "module-card__inspect";
        inspect.dataset.selectEntity = entity.id;
        inspect.setAttribute("aria-controls", "moduleDetail");
        inspect.setAttribute("aria-expanded", "false");
        inspect.setAttribute("aria-label", `Ver detalhes de ${product.title}`);
        const inspectAffordance = document.createElement("span");
        inspectAffordance.className = "module-card__inspect-affordance";
        inspectAffordance.setAttribute("aria-hidden", "true");
        inspectAffordance.textContent = "›";

        toggleLabel.append(input);
        inspect.append(number, copy, inspectAffordance);
        card.append(toggleLabel, inspect);
        moduleList.append(card);
      });
  }

  function renderSceneHotspotsFromData() {
    sceneHotspots.replaceChildren();
    scene.entities
      .filter((entity) => entity.controllable && entity.kind === "module" && entity.alphaBounds && configuredModuleIds().has(entity.id))
      .sort((left, right) => left.zIndex - right.zIndex || left.id.localeCompare(right.id))
      .forEach((entity) => {
        const product = catalogByEntityId.get(entity.id);
        if (!product) return;
        const hotspot = document.createElement("button");
        hotspot.type = "button";
        hotspot.className = "scene-hotspot";
        hotspot.classList.toggle("scene-hotspot--aerial", product.category === "Aéreo");
        hotspot.dataset.selectSceneEntity = entity.id;
        hotspot.dataset.entityId = entity.id;
        hotspot.dataset.markerSide = resolveMarkerPlacement(entity, product).side;
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

  function selectedModuleFinish(entityId = state.selectedEntityId) {
    return core.finishForEntity(state, entityId);
  }

  function materialBackground(material) {
    return material?.textureAsset ? `url("${material.textureAsset}")` : material?.textureCss || "none";
  }

  function renderFinishControlsFromData() {
    finishSwatches.replaceChildren();
    catalog.options.finishes.filter((finish) => finish.status === "published" && finishSettings.get(finish.id)?.enabled && finishSettings.get(finish.id)?.scope === "global").forEach((finish) => {
      const button = document.createElement("button");
      button.className = "swatch";
      button.type = "button";
      button.dataset.finishId = finish.id;
      button.dataset.color = finish.color;
      button.style.setProperty("--swatch", finish.color);
      button.style.setProperty("--swatch-texture", materialBackground(finish));
      button.style.setProperty("--swatch-size", finish.textureSize || "cover");
      button.title = finish.publicLabel;
      button.setAttribute("aria-label", "Aplicar " + finish.publicLabel + " ao conjunto");
      const selected = core.globalFinishId(state) === finish.id;
      button.classList.toggle("is-selected", selected);
      button.setAttribute("aria-pressed", String(selected));
      finishSwatches.append(button);
    });
    if (selectedFinishDescription) {
      const finish = catalog.options.finishes.find((item) => item.id === core.globalFinishId(state));
      selectedFinishDescription.textContent = finish ? "Selecionada: " + finish.publicLabel + "." : "";
    }
  }

  function renderHandleControlsFromData() {
    if (!handleOptions) return;
    const help = document.getElementById("handleHelp");
    handleOptions.replaceChildren();
    if (help) help.textContent = "Escolha global; o total é distribuído pelas 14 frentes aplicáveis. A basculante não entra no rateio.";
    const current = selectedHandle();
    catalog.options.handles.forEach((handle) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "handle-option";
      button.dataset.handleId = handle.id;
      const active = handle.id === current.id;
      button.classList.toggle("is-selected", active);
      button.setAttribute("aria-pressed", String(active));
      button.setAttribute("aria-label", "Selecionar puxador " + handle.label);

      const orientation = document.createElement("span");
      orientation.className = "handle-option__orientation";
      orientation.setAttribute("aria-hidden", "true");
      orientation.style.setProperty("--handle-swatch", handle.color || "#817c73");
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
      const value = amountPricingCents("handleChoiceTotal", handle.id);
      const fronts = handleFrontTotal();
      const perFront = value && fronts ? formatCurrency(Math.round(value / fronts)) : "";
      description.textContent = value
        ? handle.description + " · " + perFront + " por frente; " + formatCurrency(value) + " no conjunto completo."
        : handle.description;
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
      button.setAttribute("aria-label", "Selecionar pedra " + stone.label);
      const swatch = document.createElement("span");
      swatch.className = "global-option__swatch";
      swatch.setAttribute("aria-hidden", "true");
      swatch.style.backgroundColor = stone.swatchColor || stone.color || "#938d84";
      swatch.style.backgroundImage = materialBackground(stone);
      swatch.style.backgroundSize = stone.textureAsset ? "cover" : "16px 16px";
      const title = document.createElement("strong");
      title.textContent = stone.label;
      const description = document.createElement("small");
      const value = amountPricingCents("globalAdjustment", stone.id);
      description.textContent = stone.description + (value ? " · +" + formatCurrency(value) : " · sem adicional.");
      button.append(swatch, title, description);
      stonePackageOptions.append(button);
    });
    if (stoneSkirtingToggle) {
      stoneSkirtingToggle.checked = Boolean(eventAdjustedState().globalSelections?.serviceIds?.includes("stone-skirting"));
      const override = eventOverrideForTarget("stone-skirting");
      stoneSkirtingToggle.disabled = Boolean(override);
      stoneSkirtingToggle.title = override ? "Controlado por um evento da configuração." : "";
    }
  }

  function renderServiceChecklist() {
    if (!servicesChecklist) return;
    servicesChecklist.replaceChildren();
    const section = boundFlowSectionFor(servicesChecklist);
    if (!section) return;
    const selected = new Set(eventAdjustedState().globalSelections?.serviceIds || []);
    section.itemIds.map((id) => serviceById.get(id)).filter(Boolean).forEach((service) => {
      const card = document.createElement("label");
      card.className = "service-check";
      const input = document.createElement("input");
      input.type = "checkbox";
      input.dataset.globalServiceId = service.id;
      input.dataset.flowItemId = service.id;
      input.checked = selected.has(service.id);
      const override = eventOverrideForTarget(service.id);
      input.disabled = Boolean(override) || service.status === "included";
      input.title = override ? "Controlado por um evento da configuração." : "";
      input.setAttribute("aria-label", service.title);
      const copy = document.createElement("span");
      const title = document.createElement("strong");
      title.textContent = service.title;
      const description = document.createElement("small");
      const value = amountPricingCents("globalAdjustment", service.id);
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

  function resolveMarkerPlacement(entity, product) {
    const inferredSide = product?.category === "Aéreo" ? "bottom" : "top";
    const preferredSide = entity?.markerPlacement?.side;
    return {
      side: ["top", "right", "bottom", "left"].includes(preferredSide) ? preferredSide : inferredSide
    };
  }

  function selectedFrontFinishLabel(product) {
    const id = product ? selectedModuleFinish(product.entityId) : core.globalFinishId(state);
    return catalog.options.finishes.find((finish) => finish.id === id)?.publicLabel || "Base clara";
  }

  function selectedHandle() {
    const id = core.globalHandleId(state);
    return catalog.options.handles.find((handle) => handle.id === id) || catalog.options.handles[0];
  }

  function selectedStonePackage() {
    const id = state.globalSelections?.stonePackageId || "stone-existing";
    return catalog.options.stonePackages.find((stone) => stone.id === id) || catalog.options.stonePackages[0];
  }

  function formatDimension(value) {
    return new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 1 }).format(value);
  }

  function productForCurrentConfiguration(product) {
    if (!product.dimensions?.nominalMm || !product.dimensions?.geometryMm) return product;
    const events = dynamicEvents.filter((rule) => rule.targetId === product.entityId
      && eventIsActive(rule)
      && (rule.action === "set-dimension" || rule.action === "set-depth" && product.entityId === "module-07"));
    if (!events.length) return product;
    const nominalMm = { ...product.dimensions.nominalMm };
    const geometryMm = { ...product.dimensions.geometryMm };
    const applied = [];
    events.forEach((event) => {
      const dimension = event.action === "set-depth" ? "depth" : event.dimension;
      if (!["width", "height", "depth"].includes(dimension) || !Number.isFinite(nominalMm[dimension])) return;
      nominalMm[dimension] = event.valueMm;
      geometryMm[dimension] = event.valueMm;
      applied.push({ dimension, valueMm: event.valueMm });
    });
    if (!applied.length) return product;
    const displayOrder = product.dimensions.displayAxes === "A × P × E" ? ["height", "depth", "width"] : ["width", "height", "depth"];
    const display = `${displayOrder.map((dimension) => formatDimension(nominalMm[dimension])).join(" × ")} mm`;
    const labels = { width: "largura", height: "altura", depth: "profundidade" };
    const changes = applied.map(({ dimension, valueMm }) => `${labels[dimension]} ajustada para ${formatDimension(valueMm)} mm`).join("; ");
    return {
      ...product,
      dimensions: {
        ...product.dimensions,
        display,
        nominalMm,
        geometryMm
      },
      configurationNote: `${changes[0].toLocaleUpperCase("pt-BR")}${changes.slice(1)} pela regra de configuração.`
    };
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
      const handle = selectedHandle();
      const allocations = pricing.distributeCents(itemPricing.handleCents, itemPricing.handleFrontCount);
      const allocationNote = allocations.length
        ? "Cota de " + allocations.length + " frentes: " + allocations.map(formatCurrency).join(" · ") + "."
        : "Sem frentes aplicáveis.";
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
    entity = configuredEntity(entity);
    const bounds = entity.alphaBounds;
    const focus = document.createElement("div");
    focus.className = "module-detail__focus";
    focus.style.setProperty("--focus-ratio", `${bounds.width} / ${bounds.height}`);
    const image = document.createElement("img");
    image.className = "module-detail__focus-image";
    image.src = configuredObjectAssets[entity.id]?.detailImageAsset || entity.asset;
    image.alt = `Recorte isolado de ${product.title}`;
    image.draggable = false;
    image.style.width = `${(scene.canvas.width / bounds.width) * 100}%`;
    image.style.left = `${-(bounds.x / bounds.width) * 100}%`;
    image.style.top = `${-(bounds.y / bounds.height) * 100}%`;
    const maskAsset = finishes.resolveMaskAsset(entity, lastResolved);
    const maskSource = inlineMasks[maskAsset];
    let finishLayer = null;
    if (maskSource) {
      const finish = catalog.options.finishes.find((item) => item.id === selectedModuleFinish(entity.id)) || catalog.options.finishes[0];
      finishLayer = document.createElement("span");
      finishLayer.className = "module-detail__focus-finish";
      finishLayer.setAttribute("aria-hidden", "true");
      finishLayer.style.width = image.style.width;
      finishLayer.style.left = image.style.left;
      finishLayer.style.top = image.style.top;
      finishLayer.style.backgroundImage = materialBackground(finish);
      finishLayer.style.backgroundColor = finish.color;
      finishLayer.style.backgroundSize = finish.textureSize || "160px 160px";
      finishLayer.style.setProperty("--focus-mask-image", `url("${maskSource}")`);
      finishLayer.style.setProperty("--focus-finish-opacity", String(finishes.resolveOverlayOpacity(finish, finish.color)));
    }
    focus.append(image);
    if (finishLayer) focus.append(finishLayer);
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
      return;
    }
    if (layout?.pattern === "two-doors-and-microwave") {
      // M06 has two doors beside a microwave niche and a lift front above it.
      // Exact opening spans are not yet published, so this remains orientative.
      const leftZoneEnd = x + width * 0.54;
      const leftDoorSplit = x + width * 0.27;
      const liftBottom = y + height * 0.42;
      const nicheInset = Math.max(2, width * 0.035);
      make("line", { x1: leftDoorSplit, y1: y, x2: leftDoorSplit, y2: y + height, class: "module-detail__view-shape" });
      make("line", { x1: leftZoneEnd, y1: y, x2: leftZoneEnd, y2: y + height, class: "module-detail__view-shape" });
      make("line", { x1: leftZoneEnd, y1: liftBottom, x2: x + width, y2: liftBottom, class: "module-detail__view-shape" });
      make("rect", {
        x: leftZoneEnd + nicheInset,
        y: liftBottom + nicheInset,
        width: Math.max(4, width * 0.46 - nicheInset * 2),
        height: Math.max(4, height * 0.58 - nicheInset * 2),
        rx: 1.5,
        class: "module-detail__view-shape"
      });
      return;
    }
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
    appendFrontSegments(make, product.frontLayout, left, top, width, height, spec.faceWidthMm);
    make("line", { x1: left, y1: bottom + 14, x2: right, y2: bottom + 14, class: "module-detail__dimension-line" });
    make("line", { x1: left, y1: bottom + 10, x2: left, y2: bottom + 18, class: "module-detail__dimension-line" });
    make("line", { x1: right, y1: bottom + 10, x2: right, y2: bottom + 18, class: "module-detail__dimension-line" });
    make("line", { x1: Math.max(15, left - 19), y1: top, x2: Math.max(15, left - 19), y2: bottom, class: "module-detail__dimension-line" });
    make("line", { x1: Math.max(11, left - 23), y1: top, x2: Math.max(19, left - 15), y2: top, class: "module-detail__dimension-line" });
    make("line", { x1: Math.max(11, left - 23), y1: bottom, x2: Math.max(19, left - 15), y2: bottom, class: "module-detail__dimension-line" });
    const depthDimensionStart = { x: right + 4, y: top - 6 };
    const depthDimensionEnd = { x: right + depthX + 4, y: top + depthY - 6 };
    const depthLength = Math.hypot(depthDimensionEnd.x - depthDimensionStart.x, depthDimensionEnd.y - depthDimensionStart.y) || 1;
    const depthTick = {
      x: (-(depthDimensionEnd.y - depthDimensionStart.y) / depthLength) * 4,
      y: ((depthDimensionEnd.x - depthDimensionStart.x) / depthLength) * 4
    };
    make("line", { x1: depthDimensionStart.x, y1: depthDimensionStart.y, x2: depthDimensionEnd.x, y2: depthDimensionEnd.y, class: "module-detail__dimension-line" });
    [depthDimensionStart, depthDimensionEnd].forEach((point) => {
      make("line", {
        x1: point.x - depthTick.x,
        y1: point.y - depthTick.y,
        x2: point.x + depthTick.x,
        y2: point.y + depthTick.y,
        class: "module-detail__dimension-line"
      });
    });
    svgLabel(make, `${spec.faceHorizontalLabel} ${formatDimension(spec.faceWidthMm)} mm`, left + width / 2, bottom + 27);
    svgLabel(make, `A ${formatDimension(spec.faceHeightMm)} mm`, 4, top + height / 2 + 3, "start");
    svgLabel(make, `${spec.extrusionLabel} ${formatDimension(spec.extrusionMm)} mm`, Math.min(171, right + depthX + 9), Math.max(13, top + depthY - 8), "end");
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
    dots.setAttribute("aria-label", "Páginas de visualização");

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
    const navigation = document.createElement("div");
    navigation.className = "module-detail__carousel-navigation";
    const controls = document.createElement("div");
    controls.className = "module-detail__carousel-controls";
    const previous = document.createElement("button");
    previous.type = "button";
    previous.className = "module-detail__carousel-arrow";
    previous.textContent = "←";
    const next = document.createElement("button");
    next.type = "button";
    next.className = "module-detail__carousel-arrow";
    next.textContent = "→";

    const updateNavigationLabels = () => {
      const previousPage = pages[(currentPage - 1 + pages.length) % pages.length];
      const nextPage = pages[(currentPage + 1) % pages.length];
      previous.setAttribute("aria-label", `Mostrar ${previousPage.label}`);
      previous.title = `Anterior: ${previousPage.shortLabel}`;
      next.setAttribute("aria-label", `Mostrar ${nextPage.label}`);
      next.title = `Próxima: ${nextPage.shortLabel}`;
    };

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
        updateNavigationLabels();
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
    previous.addEventListener("click", () => renderPage((currentPage - 1 + pages.length) % pages.length, true));
    next.addEventListener("click", () => renderPage((currentPage + 1) % pages.length, true));
    stage.replaceChildren(pages[currentPage].node);
    dots.children[currentPage]?.classList.add("is-active");
    dots.children[currentPage]?.setAttribute("aria-current", "true");
    updateNavigationLabels();

    let swipeStartX = null;
    let swipeStartY = null;
    let swipePointerId = null;
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

    collapse.setAttribute("aria-expanded", String(!isCollapsed));
    collapse.setAttribute("aria-label", isCollapsed ? "Expandir visualizações" : "Recolher visualizações");
    collapse.textContent = isCollapsed ? "Mostrar" : "Recolher";
    header.append(heading, collapse);
    section.classList.toggle("is-collapsed", isCollapsed);
    controls.append(previous, next);
    navigation.append(dots, controls);
    section.append(header, note, stage, navigation);

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

  function moduleEntityIds() {
    return catalog.modules.map((product) => product.entityId).filter((id) => configuredModuleIds().has(id));
  }

  function adjacentModuleId(direction) {
    const ids = moduleEntityIds();
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

  function createModuleSelectionControl(entity, isVisible) {
    const control = document.createElement("label");
    control.className = "module-detail__selection-toggle";
    control.classList.toggle("is-selected", isVisible);
    if (!isVisible && detailNavigationAttentionByEntity.has(entity.id)) {
      control.classList.add("is-navigation-attention");
      global.setTimeout(() => detailNavigationAttentionByEntity.delete(entity.id), 1000);
    }
    if (isVisible && detailSelectionPulseByEntity.has(entity.id)) {
      control.classList.add("is-just-selected");
      global.setTimeout(() => detailSelectionPulseByEntity.delete(entity.id), 460);
    }
    const input = document.createElement("input");
    input.type = "checkbox";
    input.checked = isVisible;
    input.dataset.detailVisibility = entity.id;
    input.setAttribute("aria-label", `${isVisible ? "Desselecionar" : "Selecionar"} ${entity.label}`);
    const copy = document.createElement("span");
    copy.textContent = isVisible ? "Selecionado" : "Selecionar";
    control.append(input, copy);
    return control;
  }

  function createLocalFinishControl(product) {
    const options = catalog.options.finishes.filter((finish) => {
      const settings = finishSettings.get(finish.id);
      return finish.status === "published" && settings?.enabled && settings.scope === "local" && settings.moduleIds.includes(product.entityId);
    });
    if (!options.length) return null;
    const fieldset = document.createElement("fieldset");
    fieldset.className = "module-detail__local-finish";
    const legend = document.createElement("legend");
    legend.textContent = "Acabamento deste módulo";
    const choices = document.createElement("div");
    choices.className = "module-detail__local-finish-options";
    options.forEach((finish) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "swatch";
      button.dataset.localFinishId = finish.id;
      button.dataset.localFinishModule = product.entityId;
      button.style.setProperty("--swatch", finish.color);
      button.style.setProperty("--swatch-texture", materialBackground(finish));
      button.style.setProperty("--swatch-size", finish.textureSize || "cover");
      button.title = finish.publicLabel;
      button.setAttribute("aria-label", `Aplicar ${finish.publicLabel} somente em ${product.title}`);
      const selected = selectedModuleFinish(product.entityId) === finish.id;
      button.classList.toggle("is-selected", selected);
      button.setAttribute("aria-pressed", String(selected));
      choices.append(button);
    });
    fieldset.append(legend, choices);
    return fieldset;
  }

  function updateSelection(resolved) {
    const entity = entitiesById.get(state.selectedEntityId);
    const catalogProduct = catalogByEntityId.get(state.selectedEntityId);
    const product = catalogProduct ? productForCurrentConfiguration(catalogProduct) : null;
    const isVisible = Boolean(entity && resolved?.[entity.id]?.visible);
    const style = isVisible ? selectionStyle(entity) : null;
    selectionFrame.hidden = !style;
    if (style) Object.assign(selectionFrame.style, style);
    if (!product) {
      clearDetailCarouselTimer();
      document.body.classList.remove("has-module-detail");
      moduleDetail.replaceChildren();
      if (moduleDetailPlaceholder) moduleDetailPlaceholder.hidden = false;
      viewerHint.textContent = "Selecione um módulo na cena para abrir sua ficha.";
      syncModuleViewProjection();
      return;
    }

    document.body.classList.add("has-module-detail");
    if (moduleDetailPlaceholder) moduleDetailPlaceholder.hidden = true;
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
    const previousId = adjacentModuleId(-1);
    const nextId = adjacentModuleId(1);
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
    detailHeader.append(moduleNumber, headerCopy, headerActions, createModuleSelectionControl(entity, isVisible));

    const compositionEstimate = getEstimate(resolved);
    const itemPricing = compositionEstimate.moduleEstimates?.find((entry) => entry.item.entityId === product.entityId)?.estimate
      || pricing.itemEstimate(product, catalog, state, pricingRules);
    const price = document.createElement("section");
    price.className = "module-detail__price";
    const priceLabel = document.createElement("span");
    priceLabel.textContent = "Valor atual na simulação";
    const priceValue = document.createElement("strong");
    const priceDescription = document.createElement("p");
    if (itemPricing.status === "ready") {
      priceValue.textContent = formatCurrency(itemPricing.totalCents);
      priceDescription.textContent = product.category === "Estrutural"
        ? "Valor local do painel. Pedra e serviços aparecem uma única vez no resumo."
        : "Valor local do módulo. Pedra e serviços aparecem uma única vez no resumo.";
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
    const localFinishControl = createLocalFinishControl(product);

    const dimensions = document.createElement("p");
    dimensions.className = "module-detail__dimensions";
    dimensions.textContent = dimensionSummary(product);
    if (product.configurationNote) dimensions.textContent += ` · ${product.configurationNote}`;

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
    const detailContent = [detailHeader, price, material];
    if (product.description) {
      const description = document.createElement("p");
      description.className = "module-detail__dimensions";
      description.textContent = product.description;
      detailContent.push(description);
    }
    if (localFinishControl) detailContent.push(localFinishControl);
    detailContent.push(dimensions, technical, orientativeViews, benefitsSection, componentsSection);
    if (requirements.textContent) detailContent.push(requirements);
    moduleDetail.replaceChildren(...detailContent);
    syncModuleViewProjection();
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
        input.checked = Boolean(eventAdjustedState().visibilityByEntity[entity.id]);
        const override = eventOverrideForTarget(entity.id);
        input.disabled = Boolean(override);
        input.title = override ? "Controlado por um evento da configuração." : "";
        input.setAttribute("aria-describedby", blocked ? `blocked-${entity.id}` : "");
      }
      const product = catalogByEntityId.get(entityId);
      const dimensionLabel = card.querySelector(".module-card__copy > small");
      if (product && dimensionLabel) dimensionLabel.textContent = productForCurrentConfiguration(product).dimensions.display;
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
    const requirementHidden = requirementsForEntity("lighting-08").some((entityId) => !selectionIsActive(entityId));
    const blocked = requirementHidden || result.reason === "requirement-hidden" || result.reason === "requirement-missing";
    lightingToggle.checked = Boolean(eventAdjustedState().visibilityByEntity["lighting-08"]);
    const override = eventOverrideForTarget("lighting-08");
    lightingToggle.disabled = blocked || Boolean(override);
    lightingToggle.title = override ? "Controlado por um evento da configuração." : blocked ? "Inclua a lateral da geladeira e o aéreo da pia para habilitar a iluminação." : "";
    lightingToggle.closest(".service-check, .accessory-toggle")?.classList.toggle(
      "is-blocked",
      blocked
    );
  }

  function updateHandleControls() {
    renderHandleControlsFromData();
  }

  function formatCurrency(cents) {
    return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(cents / 100);
  }

  function getEstimate(resolved) {
    const effectiveState = eventAdjustedState();
    const activeState = {
      ...effectiveState,
      globalSelections: {
        ...effectiveState.globalSelections,
        finishId: itemAvailable("fronts-all") ? effectiveState.globalSelections.finishId : "base-light",
        handleId: itemAvailable("handles-all") ? effectiveState.globalSelections.handleId : "none",
        stonePackageId: itemAvailable("stone-all") ? effectiveState.globalSelections.stonePackageId : "stone-existing",
        serviceIds: (effectiveState.globalSelections?.serviceIds || []).filter((id) =>
          id === "stone-skirting" ? itemAvailable(id) && itemAvailable("stone-all") : itemAvailable(id)
        )
      }
    };
    const configuredVisibility = { ...resolved };
    scene.entities.forEach((entity) => {
      const moduleOmitted = entity.kind === "module" && !configuredModuleIds().has(entity.id);
      const serviceOmitted = (entity.id === "tempered-glass" || entity.id === "lighting-08") && !itemAvailable(entity.id);
      if (moduleOmitted || serviceOmitted) configuredVisibility[entity.id] = { visible: false, reason: "not-configured" };
    });
    return pricing.calculatePublicEstimate(scene, activeState, catalog, configuredVisibility, pricingRules, {
      label: priceBook.label,
      disclaimer: priceBook.disclaimer
    });
  }

  function renderCurrentValue(resolved) {
    if (!["ready", "offline"].includes(document.documentElement.dataset.configurationAccessState)) {
      configurationValue?.replaceChildren();
      return;
    }
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
    if (id === "lighting-08") return catalog.accessories.find((item) => item.entityId === id)?.title || "Iluminação";
    return catalog.services.find((service) => service.id === id)?.title || id;
  }

  function renderSummary(resolved) {
    if (!["ready", "offline"].includes(document.documentElement.dataset.configurationAccessState)) {
      summaryContent?.replaceChildren();
      return;
    }
    const estimate = getEstimate(resolved);
    const list = document.createElement("ul");
    list.className = "summary-list";
    estimate.moduleEstimates?.forEach(({ item, estimate: itemEstimate }) => {
      const itemRow = document.createElement("li");
      const additions = [];
      if (itemEstimate.finishCents) additions.push("acabamento +" + formatCurrency(itemEstimate.finishCents));
      if (itemEstimate.handleCents) additions.push("puxador rateado +" + formatCurrency(itemEstimate.handleCents));
      if (itemEstimate.localCents) additions.push("pedra de cooktop +" + formatCurrency(itemEstimate.localCents));
      itemRow.textContent = item.referenceLabel + " · " + item.title + " — " + formatCurrency(itemEstimate.totalCents) + (additions.length ? " (" + additions.join(", ") + ")" : "");
      list.append(itemRow);
    });
    if (!estimate.moduleEstimates?.length) {
      const empty = document.createElement("li");
      empty.textContent = "Nenhum módulo incluído.";
      list.append(empty);
    }

    const finish = document.createElement("p");
    finish.className = "summary-note";
    finish.textContent = "As cores podem ser globais ou escolhidas por módulo, conforme as opções publicadas. Pedra e serviços entram uma única vez no conjunto; cada ficha mostra somente o valor local do módulo.";

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
      if (estimate.breakdown.finishesCents) appendPriceBreakdownRow(composition, "Cor global", "+" + formatCurrency(estimate.breakdown.finishesCents), selectedFrontFinishLabel() + " aplicada aos módulos elegíveis.");
      if (estimate.breakdown.handlesCents) appendPriceBreakdownRow(composition, "Puxador global", "+" + formatCurrency(estimate.breakdown.handlesCents), selectedHandle().label + " rateado nas frentes dos módulos incluídos.");
      if (estimate.breakdown.localCents) appendPriceBreakdownRow(composition, "Pedra cooktop", "+" + formatCurrency(estimate.breakdown.localCents), "Inclusa no Módulo 02.");
      estimate.global.items.filter((item) => item.cents).forEach((item) => {
        appendPriceBreakdownRow(composition, globalItemLabel(item.id), "+" + formatCurrency(item.cents), "Impacto global aplicado uma única vez à composição.");
      });
      const disclaimer = document.createElement("p");
      disclaimer.textContent = estimate.disclaimer;
      price.append(label, total, composition, disclaimer);
    } else {
      price.innerHTML = "<span>Valor do conjunto</span><strong>Em configuração</strong>";
    }
    summaryContent.replaceChildren(list, finish, price);
  }

  function customStageItemLabel(id) {
    return catalog.modules.find((item) => item.entityId === id)?.title
      || catalog.accessories.find((item) => item.entityId === id)?.title
      || catalog.services.find((item) => item.id === id)?.title
      || id;
  }

  function renderCustomStage(stage) {
    const panel = stagePanelFor(stage);
    panel.replaceChildren();
    const heading = document.createElement("header"); heading.className = "finish-heading";
    const title = document.createElement("h2"); title.id = `${panel.id}-heading`; title.tabIndex = -1; title.textContent = stage.label;
    const description = document.createElement("p"); description.textContent = "Escolha os itens desta etapa.";
    const copy = document.createElement("div"); copy.append(title, description); heading.append(copy);
    const list = document.createElement("div"); list.className = "custom-stage-options";
    list.dataset.keyboardSection = "items";
    list.dataset.keyboardBehavior = "toggle";
    list.dataset.renderComponent = "toggle-list";
    stage.items.forEach((id) => {
      const item = document.createElement("label"); item.className = "accessory-toggle custom-stage-option";
      const input = document.createElement("input"); input.type = "checkbox"; input.dataset.customStageItem = id; input.dataset.flowItemId = id;
      const effective = eventAdjustedState();
      if (Object.hasOwn(effective.visibilityByEntity, id)) input.checked = Boolean(effective.visibilityByEntity[id]);
      else input.checked = Boolean(effective.globalSelections?.serviceIds?.includes(id));
      const override = eventOverrideForTarget(id);
      input.disabled = Boolean(override);
      input.title = override ? "Controlado por um evento da configuração." : "";
      input.setAttribute("aria-label", customStageItemLabel(id));
      const label = document.createElement("span"); const strong = document.createElement("strong"); strong.textContent = customStageItemLabel(id); const small = document.createElement("small"); small.textContent = catalog.modules.some((module) => module.entityId === id) ? "Módulo" : "Item opcional"; label.append(strong, small);
      item.append(input, label); list.append(item);
    });
    if (!stage.items.length) { const note = document.createElement("p"); note.className = "admin-note"; note.textContent = "Inclua itens na administração para preencher esta etapa."; list.append(note); }
    panel.append(heading, list);
    if (!panel.dataset.eventsBound) {
      panel.addEventListener("change", (event) => {
        const input = event.target.closest("[data-custom-stage-item]"); if (!input) return;
        const id = input.dataset.customStageItem;
        if (Object.hasOwn(state.visibilityByEntity, id)) setEntityVisibility(id, input.checked);
        else { core.setGlobalService(state, id, input.checked); syncLayerVisibility(); }
      });
      panel.dataset.eventsBound = "true";
    }
    return panel;
  }

  function applyMaterialLibrary(settings) {
    const materials = new Map(settings.materials.map((item) => [item.id, item]));
    const handleProducts = new Map(settings.handleProducts.map((item) => [item.id, item]));
    const finishSettingsById = new Map(settings.finishes.map((item) => [item.id, item]));
    const previousFinishes = new Map(catalog.options.finishes.map((item) => [item.id, item]));
    const previousHandles = new Map(catalog.options.handles.map((item) => [item.id, item]));
    const previousStone = new Map(catalog.options.stonePackages.map((item) => [item.id, item]));
    const fronts = settings.materialGroups.find((item) => item.id === "fronts-all");
    const handles = settings.materialGroups.find((item) => item.id === "handles-all");
    const stone = settings.materialGroups.find((item) => item.id === "stone-all");
    catalog.options.finishes = fronts.materialIds.map((id) => {
      const material = materials.get(id); const old = previousFinishes.get(id); const available = finishSettingsById.get(id);
      return { ...old, id, publicLabel: material.label, label: material.label, color: material.color, textureAsset: material.textureAsset || null, textureSize: material.textureSize || "cover", status: available?.enabled ? "published" : "draft" };
    });
    catalog.options.handles = [{ ...(previousHandles.get("none") || { id: "none", label: "Definir depois", description: "Sem adicional na simulação.", isAbsence: true }), isAbsence: true, validMaterialIds: [], validMaterials: [] }, ...handles.materialIds.map((id) => {
      const product = handleProducts.get(id); const old = previousHandles.get(product.priceEntryId);
      if (!pricingRules.roles.handleChoiceTotal[product.priceEntryId]) pricingRules.roles.handleChoiceTotal[product.priceEntryId] = { type: "amount", cents: 0 };
      return { ...old, id: product.priceEntryId, label: product.label, description: product.description || old?.description || "Puxador selecionável.", isAbsence: false, validMaterialIds: [...product.materialIds], validMaterials: product.materialIds.map((materialId) => materials.get(materialId)).filter(Boolean).map((material) => ({ ...material })) };
    })];
    catalog.options.stonePackages = stone.materialIds.map((id) => {
      const material = materials.get(id); const old = previousStone.get(id);
      return { ...old, id, label: material.label, description: old?.description || "Acabamento compartilhado entre bancada e rodapé.", color: material.color, swatchColor: material.color ?? old?.swatchColor ?? null, textureAsset: material.textureAsset || null, textureScale: 1 };
    });
    const frontGroup = scene.finishGroups.find((item) => item.id === "fronts-all");
    if (frontGroup) {
      frontGroup.presets = catalog.options.finishes.map((item) => ({ id: item.id, label: item.publicLabel, strategy: "masked-overlay", color: item.color, overlayOpacity: item.overlayOpacity || 0.84 }));
      frontGroup.defaultPresetId = catalog.options.finishes.find((item) => item.status === "published")?.id || catalog.options.finishes[0]?.id;
    }
  }

  function renderStageNavigation() {
    const repin = mobileSceneRepin;
    flowNav.querySelectorAll("[data-step]").forEach((button) => button.remove());
    const stages = flowLayout.stageNavigation(normalizedFlow);
    flowNav.style.gridTemplateColumns = `repeat(${stages.length}, minmax(0, 1fr))`;
    stages.forEach((stage, index) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "flow-step";
      button.dataset.step = stage.id;
      const panel = stagePanelFor(stage);
      button.setAttribute("aria-controls", panel.id);
      const number = document.createElement("span");
      number.textContent = String(index + 1);
      const label = document.createElement("span");
      label.className = "flow-step__label";
      label.dataset.compactLabel = ({ modules: "Módulos", finishes: "Acab.", services: "Serv.", summary: "Resumo", custom: stage.label })[stageKind(stage)];
      label.textContent = stage.label;
      button.setAttribute("aria-label", stage.label);
      button.append(number, label);
      flowNav.insertBefore(button, repin);
    });
  }

  function applyConfiguratorSettings(value) {
    const prepared = buyerProjection.prepare(value, {
      configuration: configurationCore,
      administrationV5,
      flow: flowCore,
      catalog,
      priceBook,
      scene,
      hierarchyDefaults,
      pricingContract,
      defaultPresentationPolicy: global.CASA_EM_MODULOS_PRESENTATION_POLICY
    });
    const normalized = prepared.displaySettings;
    configuratorSettings = normalized;
    dynamicDependencies = normalized.dependencies;
    dynamicEvents = normalized.events;
    configuredObjectAssets = normalized.objectAssets;
    Object.entries(normalized.objects).forEach(([id, data]) => {
      const object = catalog.modules.find((item) => item.entityId === id)
        || catalog.accessories.find((item) => item.entityId === id)
        || catalog.services.find((item) => item.id === id)
        || catalog.options.handles.find((item) => item.id === id)
        || catalog.options.stonePackages.find((item) => item.id === id);
      if (object) {
        Object.assign(object, data);
        if (Object.hasOwn(object, "label")) object.label = data.title;
      }
    });
    pricingRules = prepared.pricingRules;
    presentationPolicy = prepared.presentationPolicy;
    finishSettings = new Map(normalized.finishes.map((item) => [item.id, item]));
    applyMaterialLibrary(normalized);
    publishNormalizedFlow(prepared.source);
    scene.entities.forEach((entity) => {
      const original = originalSceneEntities.get(entity.id) || entity;
      const assets = normalized.objectAssets[entity.id];
      entity.asset = assets?.imageAsset || original.asset;
      entity.maskAsset = assets?.maskAsset || original.maskAsset;
    });
    if (!initialStateApplied) {
      Object.entries(normalized.initialState.entities).forEach(([id, enabled]) => { if (Object.hasOwn(state.visibilityByEntity, id)) state.visibilityByEntity[id] = enabled; });
      core.setGlobalSelection(state, { serviceIds: [...normalized.initialState.services], finishId: normalized.initialState.finishId, handleId: normalized.initialState.handleId, stonePackageId: normalized.initialState.stonePackageId });
      initialStateApplied = true;
    }
    const globalFinishIds = normalized.finishes.filter((item) => item.enabled && item.scope === "global").map((item) => item.id);
    if (!globalFinishIds.includes(core.globalFinishId(state))) core.setGlobalSelection(state, { finishId: globalFinishIds[0] });
    Object.entries(state.localSelections?.finishByEntityId || {}).forEach(([entityId, finishId]) => {
      const settings = finishSettings.get(finishId);
      if (!settings?.enabled || settings.scope !== "local" || !settings.moduleIds.includes(entityId)) delete state.localSelections.finishByEntityId[entityId];
    });
    const enabled = enabledStages();
    if (!enabled.some((stage) => stage.id === currentStep)) currentStep = enabled[0].id;
    renderSceneFromData();
    layerGroups = [...document.querySelectorAll(".layer-group")];
    finishLayers = [...document.querySelectorAll(".finish-layer")];
    entitiesById = new Map(scene.entities.map((entity) => [entity.id, entity]));
    renderModuleControlsFromData();
    renderFinishControlsFromData();
    renderSceneHotspotsFromData();
    moduleToggles = [...moduleList.querySelectorAll("[data-module-toggle]")];
    renderStageNavigation();
    enabled.filter((stage) => stageKind(stage) === "custom").forEach(renderCustomStage);
    document.querySelectorAll("[data-configurable-item]").forEach((element) => {
      const itemId = element.dataset.configurableItem;
      const visible = configuratorSettings.stages.some((stage) => stage.enabled && stage.items.includes(itemId));
      element.hidden = !visible;
    });
    applyBuyerFlowLayout();
    customStagePanels.forEach((panel, id) => { if (!enabled.some((stage) => stage.id === id)) panel.hidden = true; });
    layerGroups.forEach((layer) => {
      const id = layer.dataset.entityId;
      const entity = entitiesById.get(id);
      const shouldConfigure = entity?.kind === "module"
        ? configuredModuleIds().has(id)
        : id === "tempered-glass"
          ? itemAvailable(id)
          : id === "lighting-08"
            ? itemAvailable(id)
            : true;
      layer.hidden = !shouldConfigure;
    });
    syncLayerVisibility();
  }

  function syncStep(resolved) {
    const activeStage = stageConfig(currentStep);
    const activeKind = stageKind(activeStage);
    stagePanels.forEach((panel, kind) => {
      panel.hidden = kind !== activeKind || !activeStage?.enabled;
    });
    customStagePanels.forEach((panel, id) => { panel.hidden = id !== currentStep || !activeStage?.enabled; });
    document.querySelectorAll("[data-step]").forEach((button) => {
      const active = button.dataset.step === currentStep;
      button.classList.toggle("is-active", active);
      button.setAttribute("aria-current", active ? "step" : "false");
    });
    const stages = enabledStages();
    const index = stages.findIndex((stage) => stage.id === currentStep);
    const next = stages[(index + 1) % stages.length];
    nextStepButton.textContent = activeKind === "summary" ? `Editar ${stages[0].label.toLocaleLowerCase("pt-BR")}` : `Continuar para ${next.label.toLocaleLowerCase("pt-BR")} →`;
    renderSummary(resolved);
  }

  function announce(message) {
    if (configurationAnnouncement) configurationAnnouncement.textContent = message;
  }

  function shouldReduceMotion() {
    return Boolean(global.matchMedia?.("(prefers-reduced-motion: reduce)").matches);
  }

  function focusCurrentStep() {
    const panel = stagePanelFor(stageConfig(currentStep));
    const heading = [...panel.querySelectorAll("h2")].find((candidate) => !candidate.closest("[hidden]"));
    if (!heading) return;
    heading.focus({ preventScroll: true });

    const scroller = global.CASA_KEYBOARD_SHORTCUTS?.scrollContainerFor?.(panel) || null;
    const panelRect = panel.getBoundingClientRect();
    const navRect = flowNav?.getBoundingClientRect();
    if (scroller) {
      const bounds = scroller.getBoundingClientRect();
      const targetTop = flowNav && scroller.contains(flowNav) && navRect
        ? Math.max(bounds.top + 12, navRect.bottom + 12)
        : bounds.top + 12;
      const delta = panelRect.top - targetTop;
      if (Math.abs(delta) >= 2) {
        scroller.scrollBy({
          top: delta,
          left: 0,
          behavior: shouldReduceMotion() ? "auto" : "smooth"
        });
      }
      return;
    }

    const targetTop = navRect ? Math.max(12, navRect.bottom + 12) : 12;
    const delta = panelRect.top - targetTop;
    if (Math.abs(delta) >= 2) {
      global.scrollBy({
        top: delta,
        left: 0,
        behavior: shouldReduceMotion() ? "auto" : "smooth"
      });
    }
  }

  function changeStep(nextStep, moveFocus) {
    if (!enabledStages().some((stage) => stage.id === nextStep)) return;
    const focusOrigin = document.activeElement;
    currentStep = nextStep;
    const focusStep = currentStep;
    global.CASA_KEYBOARD_SHORTCUTS?.resetStageNavigation?.(currentStep);
    syncLayerVisibility();
    if (moveFocus) requestAnimationFrame(() => {
      if (currentStep !== focusStep) return;
      const active = document.activeElement;
      if (active && active !== focusOrigin && !flowNav?.contains(active)) return;
      focusCurrentStep();
    });
  }

  renderSceneFromData();
  renderModuleControlsFromData();
  renderSceneHotspotsFromData();
  renderFinishControlsFromData();
  renderHandleControlsFromData();
  renderStonePackages();
  renderServiceChecklist();

  let moduleToggles = [...document.querySelectorAll("[data-module-toggle]")];
  let layerGroups = [...document.querySelectorAll(".layer-group")];
  let finishLayers = [...document.querySelectorAll(".finish-layer")];
  let entitiesById = new Map(scene.entities.map((entity) => [entity.id, entity]));

  const visibleCount = document.getElementById("visibleCount");
  const totalCount = document.getElementById("totalCount");
  const alignmentGrid = document.getElementById("alignmentGrid");
  const restoreButton = document.getElementById("restoreButton");

  const renderStone = global.CasaStone.createRenderer(
    document.getElementById("stoneCanvas"),
    document.getElementById("plinthCanvas"),
    global.CASA_STONE_DATA
  );

  function currentLayoutProfile() {
    return layoutProfiles.profileForWidth(global.innerWidth);
  }

  function syncLayoutProfileMarker() {
    const previousProfile = document.documentElement.dataset.layoutProfile || null;
    const profile = currentLayoutProfile();
    if (profile !== previousProfile) rememberModuleViewScrollPositions(previousProfile);
    document.documentElement.dataset.layoutProfile = profile;
    syncModuleViewProjection(profile);
    if (profile !== previousProfile) restoreModuleViewScrollPositions(profile);
    return profile;
  }

  function bottomDockPolicy() {
    return presentationPolicy.shell?.bottomDock || { enabled: false, slots: [] };
  }

  function bottomDockViewportRect() {
    if (!flowActions || flowActions.hidden || flowActions.dataset.bottomDockEnabled !== "true") return null;
    const rect = flowActions.getBoundingClientRect();
    if (rect.height <= 0 || rect.bottom <= 0 || rect.top >= global.innerHeight) return null;
    return rect;
  }

  function syncBottomDockClearance() {
    const rect = bottomDockViewportRect();
    const clearance = rect ? Math.ceil(rect.height) : 0;
    document.documentElement.style.setProperty("--bottom-dock-clearance", clearance + "px");
    if (rect && document.body.classList.contains("is-mobile-scene-pinned") && mobilePipPosition) {
      syncPinnedSceneUi();
    }
    return clearance;
  }

  function syncBottomDockUi() {
    if (!flowActions) return;
    const policy = bottomDockPolicy();
    const slotNodes = new Map([
      ["estimate", configurationValue],
      ["primary-action", nextStepButton]
    ]);
    const slots = policy.enabled ? policy.slots.filter((slot) => slotNodes.has(slot)) : [];
    slotNodes.forEach((node, slot) => {
      if (node) node.hidden = !slots.includes(slot);
    });
    slots.forEach((slot) => {
      const node = slotNodes.get(slot);
      if (node) flowActions.append(node);
    });
    flowActions.hidden = !policy.enabled;
    flowActions.dataset.bottomDockEnabled = String(Boolean(policy.enabled));
    flowActions.dataset.bottomDockSlots = slots.join(" ");
    document.body.classList.toggle("has-bottom-dock", Boolean(policy.enabled));
    syncBottomDockClearance();
  }

  function scenePipMode(profile = currentLayoutProfile()) {
    const pip = presentationPolicy.scene?.pip;
    const available = Boolean(pip?.availableProfiles?.includes(profile));
    return {
      profile,
      available,
      activation: available ? pip.activationByProfile?.[profile] || null : null
    };
  }

  function syncPinnedSceneUi() {
    const mode = scenePipMode();
    const shouldDock = mode.available && mobileScenePinEnabled && mobileSceneIsMini;
    const focusedPipControl = document.activeElement?.closest?.(".viewer-pip-controls");
    if (!shouldDock && viewerCard) mobileSceneAnchorHeight = Math.ceil(viewerCard.getBoundingClientRect().height);
    document.body.classList.toggle("has-mobile-scene-pin", mode.available && mobileScenePinEnabled);
    document.body.classList.toggle("is-mobile-scene-pinned", shouldDock);
    document.body.classList.toggle("is-mobile-scene-transparent", shouldDock && mobileSceneTransparent);
    document.documentElement.style.setProperty("--mobile-scene-anchor-height", shouldDock ? mobileSceneAnchorHeight + "px" : "0px");
    const navBounds = flowNav?.getBoundingClientRect();
    const navHeight = Math.ceil(navBounds?.height || 0);
    const navBottom = Math.ceil(navBounds?.bottom || 0);
    const pipWidth = Math.min(mobilePipWidth ?? [176, 208, 240][mobilePipSizeIndex], Math.max(0, global.innerWidth - 16));
    const pipHeight = Math.ceil((pipWidth * 2) / 3) + 2;
    if (shouldDock && mobilePipPosition) {
      const minTop = navBottom + 8;
      const viewportMaxTop = Math.max(minTop, global.innerHeight - pipHeight - 8);
      const dockTop = bottomDockViewportRect()?.top;
      const dockMaxTop = Number.isFinite(dockTop) ? Math.max(minTop, dockTop - pipHeight - 8) : viewportMaxTop;
      const maxTop = Math.min(viewportMaxTop, dockMaxTop);
      mobilePipPosition = {
        ...mobilePipPosition,
        top: Math.min(maxTop, Math.max(minTop, mobilePipPosition.top))
      };
    }
    const pipBottom = Math.max(navBottom, mobilePipPosition?.top || 0) + pipHeight;
    const contentClearance = shouldDock ? pipBottom + 16 : navBottom + 12;
    document.documentElement.style.setProperty("--mobile-flow-nav-height", navHeight + "px");
    document.documentElement.style.setProperty("--mobile-pip-width", pipWidth + "px");
    document.documentElement.style.setProperty("--mobile-content-clearance", contentClearance + "px");
    if (mobilePipPosition) {
      document.documentElement.style.setProperty("--mobile-pip-left", mobilePipPosition.left + "px");
      document.documentElement.style.setProperty("--mobile-pip-top", mobilePipPosition.top + "px");
    } else {
      document.documentElement.style.removeProperty("--mobile-pip-left");
      document.documentElement.style.removeProperty("--mobile-pip-top");
    }
    if (mobileScenePin) {
      mobileScenePin.setAttribute("aria-pressed", String(mobileScenePinEnabled));
      mobileScenePin.setAttribute("aria-label", mobileScenePinEnabled ? "Liberar cena" : "Fixar cena");
      mobileScenePin.title = mobileScenePinEnabled ? "Liberar cena" : "Fixar cena";
    }
    if (mobileSceneTransparency) {
      mobileSceneTransparency.setAttribute("aria-pressed", String(mobileSceneTransparent));
    }
    if (mobileSceneRepin) {
      const manualLauncherVisible = mode.available && mode.activation === "manual" && !shouldDock;
      const autoRepinVisible = mode.available && mode.activation === "auto-after-anchor" && !mobileScenePinEnabled;
      mobileSceneRepin.hidden = !(manualLauncherVisible || autoRepinVisible);
    }
    if (!shouldDock && focusedPipControl) {
      requestAnimationFrame(() => {
        if (mobileSceneRepin && !mobileSceneRepin.hidden) mobileSceneRepin.focus();
        else flowNav?.querySelector(`[data-step="${currentStep}"]`)?.focus();
      });
    }
    if (lastResolved) updateSceneHotspots(lastResolved);
  }

  function setMobileScenePinEnabled(enabled) {
    mobileScenePinEnabled = Boolean(enabled);
    if (!mobileScenePinEnabled) mobileSceneIsMini = false;
    syncPinnedSceneUi();
    announce(mobileScenePinEnabled ? "Cena fixada para contexto durante a configuração." : "Cena liberada para o fluxo normal.");
  }

  function refreshMobileSceneDock(profile = currentLayoutProfile()) {
    const mode = scenePipMode(profile);
    if (!mode.available || mode.activation !== "auto-after-anchor") return;
    const passedAnchor = Boolean(viewerAnchor && viewerAnchor.getBoundingClientRect().bottom < 0);
    const nextMini = Boolean(mobileScenePinEnabled && passedAnchor);
    if (nextMini === mobileSceneIsMini) return;
    mobileSceneIsMini = nextMini;
    syncPinnedSceneUi();
    if (nextMini) announce("Mini-cena disponível abaixo das etapas. Selecione um módulo diretamente na cena.");
  }

  function activateScenePipFromLauncher() {
    const mode = scenePipMode();
    if (!mode.available) return;
    mobileScenePinEnabled = true;
    if (mode.activation === "manual") {
      mobileSceneIsMini = true;
      syncPinnedSceneUi();
      requestAnimationFrame(() => mobileScenePin?.focus());
      announce("Mini-cena fixada para contexto durante a configuração.");
      return;
    }
    refreshMobileSceneDock(mode.profile);
    syncPinnedSceneUi();
  }

  if (viewerPinSentinel && global.IntersectionObserver) {
    const pinObserver = new global.IntersectionObserver((entries) => {
      const mode = scenePipMode();
      if (!mode.available || mode.activation !== "auto-after-anchor") return;
      const entry = entries[0];
      const passedAnchor = entry && entry.boundingClientRect.top < 0 && !entry.isIntersecting;
      const nextMini = Boolean(mobileScenePinEnabled && passedAnchor);
      if (nextMini === mobileSceneIsMini) return;
      mobileSceneIsMini = nextMini;
      syncPinnedSceneUi();
      if (nextMini) announce("Mini-cena disponível abaixo das etapas. Selecione um módulo diretamente na cena.");
    }, { threshold: 0 });
    pinObserver.observe(viewerPinSentinel);
  }

  if (global.ResizeObserver && viewerCard) {
    new global.ResizeObserver(() => syncPinnedSceneUi()).observe(viewerCard);
  }
  if (global.ResizeObserver && flowActions) {
    new global.ResizeObserver(() => syncBottomDockClearance()).observe(flowActions);
  }

  global.addEventListener("resize", () => {
    const previousProfile = document.documentElement.dataset.layoutProfile || currentLayoutProfile();
    const previousMode = scenePipMode(previousProfile);
    const wasOpen = previousMode.available && mobileSceneIsMini;
    const profile = syncLayoutProfileMarker();
    const nextMode = scenePipMode(profile);
    const profileChanged = profile !== previousProfile;
    if (mobilePipPosition) mobilePipPosition = null;
    if (!nextMode.available) mobileSceneIsMini = false;
    else if (profileChanged && previousMode.available && wasOpen) mobileSceneIsMini = true;
    else if (nextMode.activation === "auto-after-anchor") refreshMobileSceneDock(profile);
    else if (profileChanged && !previousMode.available) mobileSceneIsMini = false;
    syncPinnedSceneUi();
  });
  global.addEventListener("scroll", refreshMobileSceneDock, { passive: true });

  function syncFingerprint() {
    const value = fingerprint.computeFingerprint(scene, state);
    document.body.dataset.sceneFingerprint = value;
    global.CASA_EM_MODULOS_CURRENT_FINGERPRINT = value;
  }

  function updateVisibleCount() {
    const configured = new Set([...configuredModuleIds(), ...(itemAvailable("lighting-08") ? ["lighting-08"] : [])]);
    const visible = visibility.getVisibleControllableEntities(scene, state).filter((entity) => configured.has(entity.id));
    visibleCount.textContent = String(visible.length);
    totalCount.textContent = String(scene.entities.filter((entity) => entity.controllable && configured.has(entity.id)).length);
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
      const entity = entitiesById.get(group?.dataset.entityId);
      if (!product?.commercial?.finishEligible && !entity?.tags?.includes("finish-matched-side")) return;
      const finishId = selectedModuleFinish(entity.id);
      const finish = catalog.options.finishes.find((item) => item.id === finishId) || catalog.options.finishes[0];
      const hasTexture = Boolean(finish.textureAsset);
      layer.classList.toggle("is-texture", hasTexture);
      layer.classList.add("is-color");
      layer.style.backgroundImage = materialBackground(finish);
      layer.style.backgroundColor = finish.color;
      layer.style.backgroundSize = finish.textureSize || "160px 160px";
      layer.style.setProperty("--finish-brightness", String(finish.textureBrightness || 1));
      layer.style.setProperty("--finish-opacity", String(finishes.resolveOverlayOpacity(finish, finish.color)));
      const structure = finishes.resolveStructureStrength(finish, finish.color);
      group.style.setProperty("--structure-shadow-opacity", String(structure.shadowOpacity));
      group.style.setProperty("--structure-highlight-opacity", String(structure.highlightOpacity));
      group.dataset.structureLuminance = structure.luminance.toFixed(4);
    });
  }


  function materialDescriptor(material, fallbackType) {
    if (!material?.color && !material?.textureAsset) return null;
    return {
      materialType: material.materialType || fallbackType,
      color: material.color || null,
      textureAsset: material.textureAsset || null,
      textureStrength: Number.isFinite(Number(material.textureStrength)) ? Number(material.textureStrength) : 0.35
    };
  }

  function sceneMaterials() {
    const effectiveState = eventAdjustedState();
    const finish = catalog.options.finishes.find((item) => item.id === core.globalFinishId(effectiveState)) || catalog.options.finishes[0];
    const stone = selectedStonePackage();
    const hasStoneSkirting = itemAvailable("stone-skirting") && itemAvailable("stone-all") && Boolean(effectiveState.globalSelections?.serviceIds?.includes("stone-skirting"));
    const stoneMaterial = materialDescriptor(stone, "stone");
    const mdfMaterial = materialDescriptor(finish, "mdf");
    return {
      upper: stoneMaterial,
      plinth: hasStoneSkirting ? stoneMaterial : mdfMaterial
    };
  }

  function syncLayerVisibility() {
    const effectiveState = eventAdjustedState();
    const resolved = visibility.resolveVisibility(scene, effectiveState);
    scene.entities.forEach((entity) => {
      const missing = requirementsForEntity(entity.id).some((id) => !selectionIsActive(id));
      if (missing && resolved[entity.id]?.visible) resolved[entity.id] = { ...resolved[entity.id], visible: false, reason: "requirement-hidden" };
    });
    lastResolved = resolved;
    renderStone(effectiveState, sceneMaterials());
    syncFinishMasks(resolved);
    syncFinishAppearance();
    layerGroups.forEach((layer) => {
      const result = resolved[layer.dataset.entityId];
      const entity = entitiesById.get(layer.dataset.entityId);
      const configured = entity?.kind === "module"
        ? configuredModuleIds().has(entity.id)
        : entity?.id === "tempered-glass"
          ? itemAvailable(entity.id)
          : entity?.id === "lighting-08"
            ? itemAvailable(entity.id)
            : true;
      const isVisible = configured && Boolean(result?.visible);
      layer.classList.toggle("is-hidden", !isVisible);
      layer.hidden = !configured;
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
    renderServiceChecklist();
    renderCurrentValue(resolved);
    syncStep(resolved);
    syncPinnedSceneUi();
  }

  function setEntityVisibility(entityId, isVisible) {
    if (!core.setEntityVisibility(state, entityId, isVisible)) return;
    const affected = [];
    const applyRequirements = (id) => {
      requirementsForEntity(id).forEach((requirementId) => {
        if (!state.visibilityByEntity[requirementId]) {
          core.setEntityVisibility(state, requirementId, true);
          affected.push(requirementId);
        }
        applyRequirements(requirementId);
      });
    };
    const removeDependents = (id) => {
      scene.entities
        .filter((entity) => requirementsForEntity(entity.id).includes(id) && state.visibilityByEntity[entity.id])
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

  function selectAdjacentModule(direction) {
    const nextEntityId = adjacentModuleId(direction);
    if (!nextEntityId) return;
    if (!lastResolved?.[nextEntityId]?.visible) detailNavigationAttentionByEntity.add(nextEntityId);
    selectEntity(nextEntityId, "detail-navigation");
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

  moduleList.addEventListener("change", (event) => {
    const toggle = event.target.closest("[data-module-toggle]");
    if (!toggle) return;
    setEntityVisibility(toggle.dataset.moduleToggle, toggle.checked);
    updateVisibleCount();
  });

  finishSwatches.addEventListener("click", (event) => {
    const button = event.target.closest("[data-finish-id]");
    if (!button) return;
    core.setGlobalSelection(state, { finishId: button.dataset.finishId });
    syncLayerVisibility();
    announce("Cor das frentes atualizada para o conjunto.");
  });

  moduleDetail.addEventListener("click", (event) => {
    const button = event.target.closest("[data-local-finish-id]");
    if (!button) return;
    const settings = finishSettings.get(button.dataset.localFinishId);
    if (!settings?.enabled || settings.scope !== "local" || !settings.moduleIds.includes(button.dataset.localFinishModule)) return;
    core.setLocalFinish(state, button.dataset.localFinishModule, button.dataset.localFinishId);
    syncLayerVisibility();
    announce("Acabamento aplicado somente ao módulo selecionado.");
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

  moduleDetail.addEventListener("change", (event) => {
    const input = event.target.closest("[data-detail-visibility]");
    if (!input) return;
    if (input.checked) detailSelectionPulseByEntity.add(input.dataset.detailVisibility);
    setEntityVisibility(input.dataset.detailVisibility, input.checked);
    updateVisibleCount();
  });

  sceneHotspots.addEventListener("click", (event) => {
    const hotspot = event.target.closest("[data-select-scene-entity]");
    if (!hotspot || hotspot.disabled) return;
    selectEntity(hotspot.dataset.selectSceneEntity, "scene");
  });

  flowNav.addEventListener("click", (event) => {
    const button = event.target.closest("[data-step]");
    if (button) changeStep(button.dataset.step, true);
  });

  [mobileScenePin, mobileSceneTransparency, mobileSceneResize, mobileSceneResizeHandle].filter(Boolean).forEach((control) => {
    ["pointerdown", "pointerup", "click"].forEach((eventName) => {
      control.addEventListener(eventName, (event) => event.stopPropagation());
    });
  });

  mobileScenePin?.addEventListener("click", () => setMobileScenePinEnabled(!mobileScenePinEnabled));
  mobileSceneRepin?.addEventListener("click", activateScenePipFromLauncher);
  mobileSceneTransparency?.addEventListener("click", () => {
    mobileSceneTransparent = !mobileSceneTransparent;
    syncPinnedSceneUi();
    announce(mobileSceneTransparent ? "Mini-cena com transparência ativada." : "Mini-cena opaca.");
  });
  mobileSceneResize?.addEventListener("click", () => {
    mobilePipSizeIndex = (mobilePipSizeIndex + 1) % 3;
    mobilePipPosition = null;
    mobilePipWidth = null;
    syncPinnedSceneUi();
    announce(["Mini-cena pequena.", "Mini-cena média.", "Mini-cena grande."][mobilePipSizeIndex]);
  });

  mobileSceneResizeHandle?.addEventListener("pointerdown", (event) => {
    if (!document.body.classList.contains("is-mobile-scene-pinned")) return;
    const startRect = viewerCard.getBoundingClientRect();
    const startWidth = startRect.width;
    const startX = event.clientX;
    const startRight = startRect.right;
    const startTop = startRect.top;
    mobileSceneResizeHandle.setPointerCapture?.(event.pointerId);
    event.preventDefault();
    event.stopPropagation();

    const move = (moveEvent) => {
      const maxWidth = Math.max(150, Math.min(global.innerWidth - 16, 360));
      mobilePipWidth = Math.min(maxWidth, Math.max(140, startWidth - (moveEvent.clientX - startX)));
      if (mobilePipPosition) {
        mobilePipPosition = {
          left: Math.min(Math.max(8, global.innerWidth - mobilePipWidth - 8), Math.max(8, startRight - mobilePipWidth)),
          top: mobilePipPosition.top ?? startTop
        };
      }
      syncPinnedSceneUi();
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

  let pipDrag = null;
  viewerCard?.addEventListener("pointerdown", (event) => {
    if (!document.body.classList.contains("is-mobile-scene-pinned")) return;
    if (event.target.closest("button, .scene-hotspot")) return;
    const rect = viewerCard.getBoundingClientRect();
    pipDrag = { pointerId: event.pointerId, originX: event.clientX, originY: event.clientY, left: rect.left, top: rect.top, width: rect.width };
    viewerCard.setPointerCapture?.(event.pointerId);
  });
  viewerCard?.addEventListener("pointermove", (event) => {
    if (!pipDrag || event.pointerId !== pipDrag.pointerId) return;
    const minTop = Math.ceil(flowNav?.getBoundingClientRect().bottom || 0) + 8;
    const maxLeft = Math.max(8, global.innerWidth - pipDrag.width - 8);
    const pipHeight = viewerCard.getBoundingClientRect().height;
    const viewportMaxTop = Math.max(minTop, global.innerHeight - pipHeight - 8);
    const dockTop = bottomDockViewportRect()?.top;
    const dockMaxTop = Number.isFinite(dockTop) ? Math.max(minTop, dockTop - pipHeight - 8) : viewportMaxTop;
    const maxTop = Math.min(viewportMaxTop, dockMaxTop);
    mobilePipPosition = {
      left: Math.min(maxLeft, Math.max(8, Math.round(pipDrag.left + event.clientX - pipDrag.originX))),
      top: Math.min(maxTop, Math.max(minTop, Math.round(pipDrag.top + event.clientY - pipDrag.originY)))
    };
    syncPinnedSceneUi();
  });
  viewerCard?.addEventListener("pointerup", () => { pipDrag = null; });
  viewerCard?.addEventListener("pointercancel", () => { pipDrag = null; });

  nextStepButton.addEventListener("click", () => {
    const stages = enabledStages();
    const index = stages.findIndex((stage) => stage.id === currentStep);
    changeStep(stages[(index + 1) % stages.length].id, true);
  });

  handleOptions?.addEventListener("click", (event) => {
    const button = event.target.closest("[data-handle-id]");
    if (!button) return;
    const handleId = button.dataset.handleId;
    const handleIndex = Math.max(0, catalog.options.handles.findIndex((handle) => handle.id === handleId));
    core.setGlobalSelection(state, { handleId });
    syncLayerVisibility();
    global.CASA_KEYBOARD_SHORTCUTS?.activateSection?.("handles", handleIndex, false);
    const handle = selectedHandle();
    announce(handle.id === "none" ? "Puxador será definido depois." : handle.label + " aplicado ao conjunto.");
  });

  lightingToggle.addEventListener("change", () => {
    setEntityVisibility("lighting-08", lightingToggle.checked);
    updateVisibleCount();
  });

  function setStonePackage(stonePackageId) {
    const stone = catalog.options.stonePackages.find((item) => item.id === stonePackageId);
    if (!stone) return;
    core.setGlobalSelection(state, { stonePackageId });
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
    alignmentGrid.classList.remove("is-visible");
    detailOrigin = null;
    syncLayerVisibility();
  });

  // The HTML and CSS keep the workspace hidden/inert before this script.
  // This gate governs presentation, NOT access to server data or static assets.
  const bootstrap = global.CasaModulesAuthorizedBootstrap;
  const accessWorkspace = document.querySelector(".workspace");
  const accessStatus = document.getElementById("configurationAccessStatus");
  const accessMessage = document.getElementById("configurationAccessMessage");
  const accessRetry = document.getElementById("configurationAccessRetry");
  if (!bootstrap || !accessWorkspace || !accessStatus || !accessMessage || !accessRetry) {
    throw new Error("authorized bootstrap boundary missing");
  }
  const messages = Object.freeze({
    loading: "Validando o acesso e carregando a configuração publicada…",
    unauthorized: "É necessário um link de acesso válido para configurar. Solicite um novo link para continuar.",
    forbidden: "Este acesso não tem permissão para abrir o configurador.",
    invalid: "A configuração publicada não pôde ser validada. O configurador está indisponível.",
    unavailable: "Não foi possível consultar a configuração agora. Tente novamente.",
    offline: "Modo offline de demonstração. Os valores locais não representam uma configuração publicada."
  });
  function setConfigurationAccess(state) {
    const ready = state === "ready";
    const offline = state === "offline" && global.location?.protocol === "file:";
    document.documentElement.dataset.configurationAccessState = state;
    document.documentElement.dataset.publishedConfigurationStatus = ready ? "validated" : state;
    accessWorkspace.inert = !(ready || offline);
    accessWorkspace.hidden = !(ready || offline);
    restoreButton.disabled = !(ready || offline);
    accessStatus.hidden = ready;
    accessStatus.setAttribute("role", state === "loading" || offline ? "status" : "alert");
    accessMessage.textContent = ready ? "" : (messages[state] || messages.unavailable);
    accessRetry.hidden = !["unavailable", "invalid"].includes(state);
    if (ready || offline) {
      // Layout geometry was calculated while hidden. Recompute after unlocking
      // so the mobile PiP/dock measures the actual displayed workspace.
      syncLayerVisibility();
      updateVisibleCount();
      syncLayoutProfileMarker();
      syncBottomDockUi();
      syncPinnedSceneUi();
    } else {
      // A previously authorized (then expired) price must not remain visible.
      configurationValue?.replaceChildren();
      summaryContent?.replaceChildren();
    }
  }
  function fetchPublishedConfiguration() {
    const controller = new AbortController();
    const timeout = global.setTimeout(() => controller.abort(), 12000);
    return fetch("/api/configuration", {
      credentials: "same-origin", cache: "no-store", signal: controller.signal
    }).finally(() => global.clearTimeout(timeout));
  }
  let bootstrapAttempt = 0;
  async function loadAuthorizedConfiguration() {
    const current = ++bootstrapAttempt;
    await bootstrap.load({
      request: fetchPublishedConfiguration,
      apply: applyConfiguratorSettings,
      transition: (state) => {
        if (current === bootstrapAttempt) setConfigurationAccess(state);
      }
    });
  }
  accessRetry.addEventListener("click", () => { void loadAuthorizedConfiguration(); });
  if (global.location?.protocol === "https:" || global.location?.protocol === "http:") {
    void loadAuthorizedConfiguration();
  } else if (global.location?.protocol === "file:") {
    // Deliberate local-only demonstration; never an HTTP fallback.
    setConfigurationAccess("offline");
  } else {
    setConfigurationAccess("unavailable");
  }

  renderStageNavigation();
  applyBuyerFlowLayout();
  syncLayerVisibility();
  updateVisibleCount();
  syncLayoutProfileMarker();
  syncBottomDockUi();
  syncPinnedSceneUi();
  global.CASA_EM_MODULOS_DEBUG = Object.freeze({
    getState: () => state,
    getVisibility: () => visibility.resolveVisibility(scene, eventAdjustedState()),
    getFlowLayoutErrors: () => flowLayoutErrors.map((error) => ({ ...error })),
    getNormalizedFlow: () => normalizedFlow,
    getLayoutProfile: () => currentLayoutProfile(),
    getPresentationPolicy: () => presentationPolicy,
    getBottomDock: () => ({
      enabled: flowActions?.dataset.bottomDockEnabled === "true",
      slots: flowActions?.dataset.bottomDockSlots?.split(/\s+/).filter(Boolean) || [],
      clearance: Number.parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--bottom-dock-clearance")) || 0
    }),
    itemAvailable: (itemId) => itemAvailable(itemId),
    stageOwns: (stageId, itemId) => stageOwns(stageId, itemId),
    scene
  });
})(window);
