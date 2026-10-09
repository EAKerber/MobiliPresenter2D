const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { chromium } = require("playwright");
const configuration = require("../app/core/configuration.js");
const defaultSettings = require("../app/data/configurator-settings.js");
const catalog = require("../app/data/catalog-data.js");
const priceBook = require("../app/data/mock-price-book.js");
const scene = require("../app/data/scene-data.js");
// Local test fixture ONLY; published v5 stage groups do not have legacy .items.
const flatV3 = configuration.normalizeConfiguratorSettings(
  configuration.createDefaultAdministration(defaultSettings, catalog, priceBook, scene),
  catalog, priceBook, scene
);


(async () => {
  const output = process.argv[2] || "/tmp/flow-layout-browser";
  fs.mkdirSync(output, { recursive: true });
  const targetUrl = process.env.FLOW_LAYOUT_URL || "https://mobilipresenter2d.netlify.app/";
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1366, height: 900 } });
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => { if (message.type() === "error") errors.push(message.text()); });

  let lastError;
  for (let attempt = 0; attempt < 18; attempt += 1) {
    try {
      await page.goto(targetUrl, { waitUntil: "domcontentloaded", timeout: 15000 });
      await page.waitForFunction(() =>
        window.CASA_NORMALIZED_FLOW?.stages?.length
        && window.CASA_EM_MODULOS_DEBUG?.getFlowLayoutErrors
        && document.querySelectorAll("#moduleList [data-select-entity]").length > 1,
        null,
        { timeout: 6000 }
      );
      lastError = null;
      break;
    } catch (error) {
      lastError = error;
      await page.waitForTimeout(3000);
    }
  }
  if (lastError) throw lastError;

  const stageGroupOrder = (stageId) => page.evaluate((id) => {
    const grid = document.querySelector('[data-flow-group-grid="' + id + '"]');
    return grid ? [...grid.children].filter((node) => node.dataset.flowGroupShell).map((node) => node.dataset.flowGroupShell) : [];
  }, stageId);
  const modelGroupOrder = (stageId) => page.evaluate((id) => {
    const stage = window.CASA_NORMALIZED_FLOW.stages.find((entry) => entry.id === id);
    return stage ? stage.groups.map((group) => group.id) : [];
  }, stageId);
  const renderedSectionOrder = (groupId) => page.evaluate((id) => {
    const shell = document.querySelector('[data-flow-group-shell="' + id + '"]');
    return shell ? [...shell.querySelectorAll("[data-keyboard-section]")]
      .filter((node) => node.closest("[data-flow-group-shell]") === shell && !node.hidden)
      .map((node) => node.dataset.keyboardSection) : [];
  }, groupId);
  const modelSectionOrder = (stageId, groupId) => page.evaluate(({ stageId: sid, groupId: gid }) => {
    const stage = window.CASA_NORMALIZED_FLOW.stages.find((entry) => entry.id === sid);
    const group = stage?.groups.find((entry) => entry.id === gid);
    return group ? group.sections.map((section) => section.id) : [];
  }, { stageId, groupId });
  const renderedComponents = () => page.evaluate(() => Object.fromEntries(
    [...document.querySelectorAll("[data-flow-component]")].map((node) => [
      node.dataset.keyboardSection || node.dataset.stagePane || node.id,
      node.dataset.flowComponent
    ])
  ));
  const rect = (selector) => page.locator(selector).evaluate((element) => {
    const box = element.getBoundingClientRect();
    return { left: box.left, right: box.right, top: box.top, bottom: box.bottom, width: box.width, height: box.height };
  });
  const noOverflow = (selector) => page.locator(selector).evaluate((element) => element.scrollWidth <= element.clientWidth + 2);
  const modulePaneState = () => page.evaluate(() => {
    const list = document.querySelector('[data-stage-view-id="modules-list"]');
    const detail = document.querySelector('[data-stage-view-id="modules-detail"]');
    const activeView = document.activeElement?.closest?.("[data-stage-view-id]")?.dataset.stageViewId || null;
    return {
      listHidden: Boolean(list?.hidden),
      detailHidden: Boolean(detail?.hidden),
      listScrollTop: list?.scrollTop || 0,
      detailScrollTop: detail?.scrollTop || 0,
      activeView,
      activeClose: Boolean(document.activeElement?.matches?.("[data-close-module-detail]"))
    };
  });
  const bottomDockState = () => page.evaluate(() => {
    const dock = document.querySelector(".flow-actions");
    const dockRect = dock.getBoundingClientRect();
    const controls = document.querySelector(".controls");
    const controlsRect = controls.getBoundingClientRect();
    return {
      profile: document.documentElement.dataset.layoutProfile,
      enabled: dock.dataset.bottomDockEnabled === "true",
      slots: dock.dataset.bottomDockSlots?.split(/\s+/).filter(Boolean) || [],
      position: getComputedStyle(dock).position,
      visible: !dock.hidden && dockRect.height > 0,
      dock: { top: dockRect.top, bottom: dockRect.bottom, height: dockRect.height },
      controls: { top: controlsRect.top, bottom: controlsRect.bottom, scrollTop: controls.scrollTop, scrollHeight: controls.scrollHeight, clientHeight: controls.clientHeight },
      viewportHeight: window.innerHeight,
      directChildIds: [...dock.children].map((node) => node.id),
      estimateCount: document.querySelectorAll("#configurationValue").length,
      actionCount: document.querySelectorAll("#nextStepButton").length,
      clearance: window.CASA_EM_MODULOS_DEBUG.getBottomDock().clearance
    };
  });

  assert.deepEqual(await page.evaluate(() => window.CASA_EM_MODULOS_DEBUG.getFlowLayoutErrors()), [], "initial flow layout has no renderer invariant errors");
  assert.deepEqual(
    await page.evaluate(() => window.CASA_EM_MODULOS_DEBUG.getPresentationPolicy().shell.bottomDock),
    { enabled: true, slots: ["estimate", "primary-action"] },
    "bottom dock shell policy is frozen and explicit"
  );
  const dockInitial = await bottomDockState();
  assert.equal(dockInitial.enabled, true, "bottom dock policy is executable");
  assert.equal(dockInitial.position, "sticky", "one stable footer owns persistent positioning");
  assert.deepEqual(dockInitial.slots, ["estimate", "primary-action"], "dock runtime preserves policy slot order");
  assert.deepEqual(dockInitial.directChildIds, ["configurationValue", "nextStepButton"], "dock reuses existing estimate and primary action nodes");
  assert.equal(dockInitial.estimateCount, 1, "estimate adapter remains unique");
  assert.equal(dockInitial.actionCount, 1, "primary action adapter remains unique");
  assert.ok(Math.abs(dockInitial.clearance - dockInitial.dock.height) <= 2, "live bottom clearance follows the rendered dock height");
  await page.evaluate(() => { document.querySelector(".controls").scrollTop = 0; });
  await page.waitForTimeout(30);
  const dockSideRailTop = await bottomDockState();
  assert.ok(Math.abs(dockSideRailTop.controls.bottom - dockSideRailTop.dock.bottom) <= 4,
    "side-rail dock sticks to the controls scrollport bottom");
  await page.evaluate(() => {
    const controls = document.querySelector(".controls");
    controls.scrollTop = Math.max(0, Math.min(controls.scrollHeight - controls.clientHeight, Math.round(controls.scrollHeight * 0.4)));
  });
  await page.waitForTimeout(30);
  const dockSideRailScrolled = await bottomDockState();
  assert.ok(Math.abs(dockSideRailScrolled.controls.bottom - dockSideRailScrolled.dock.bottom) <= 4,
    "side-rail dock remains persistent while controls scroll");
  assert.equal(await page.evaluate(() => window.CASA_EM_MODULOS_DEBUG.getLayoutProfile()), "side-rail", "1366px resolves to side-rail");
  assert.equal(await page.evaluate(() => document.documentElement.dataset.layoutProfile), "side-rail", "resolved profile is exposed on the document");
  assert.equal(await page.evaluate(() => window.CASA_EM_MODULOS_DEBUG.getPresentationPolicy().stageViews.modules.views.find((view) => view.id === "modules-detail").relation.of), "modules-list", "buyer exposes the validated module companion policy");
  assert.equal(await page.locator('[data-stage-pane="detail"]').count(), 1);
  assert.equal(await page.locator('[data-stage-pane="list"]').count(), 1);
  assert.equal(await page.locator("#moduleDetailPlaceholder").isVisible(), true, "modules detail pane has an intentional empty-state view");
  assert.deepEqual(
    { listHidden: (await modulePaneState()).listHidden, detailHidden: (await modulePaneState()).detailHidden },
    { listHidden: false, detailHidden: false },
    "side-rail keeps both stable Modules panes visible with no detail open"
  );

  const firstModuleCard = page.locator("#moduleList .module-card").first();
  const moduleAffordanceShape = await firstModuleCard.evaluate((card) => {
    const toggle = card.querySelector("[data-module-toggle]");
    const inspect = card.querySelector("[data-select-entity]");
    return {
      interactiveCount: card.querySelectorAll("input,button").length,
      toggleTag: toggle?.tagName || null,
      inspectTag: inspect?.tagName || null,
      nestedInteractive: Boolean(card.querySelector("button input, button button, label button, label [role='button']")),
      labelContainsCopy: Boolean(card.querySelector(".module-card__toggle .module-card__copy")),
      inspectContainsCopy: Boolean(card.querySelector(".module-card__inspect .module-card__copy")),
      visibleVerButton: [...card.querySelectorAll("button")].some((button) => button.textContent.trim() === "Ver")
    };
  });
  assert.deepEqual(moduleAffordanceShape, {
    interactiveCount: 2,
    toggleTag: "INPUT",
    inspectTag: "BUTTON",
    nestedInteractive: false,
    labelContainsCopy: false,
    inspectContainsCopy: true,
    visibleVerButton: false
  }, "module card exposes exactly one inclusion control plus one non-nested inspection body");

  const firstInspect = firstModuleCard.locator("[data-select-entity]");
  const firstToggle = firstModuleCard.locator("[data-module-toggle]");
  const firstEntityId = await firstInspect.getAttribute("data-select-entity");
  const checkedBeforeInspect = await firstToggle.isChecked();
  await firstModuleCard.locator(".module-card__copy").click();
  await page.waitForFunction((entityId) => window.CASA_EM_MODULOS_DEBUG.getState().selectedEntityId === entityId, firstEntityId);
  assert.equal(await firstToggle.isChecked(), checkedBeforeInspect, "clicking module body opens detail without changing inclusion");
  await page.keyboard.press("Escape");
  await page.waitForFunction(() => window.CASA_EM_MODULOS_DEBUG.getState().selectedEntityId === null);

  await firstModuleCard.locator(".module-card__toggle").click();
  await page.waitForFunction(({ entityId, checked }) => {
    const toggle = document.querySelector(`[data-module-toggle="${entityId}"]`);
    return toggle && toggle.checked !== checked;
  }, { entityId: firstEntityId, checked: checkedBeforeInspect });
  assert.equal(await page.evaluate(() => window.CASA_EM_MODULOS_DEBUG.getState().selectedEntityId), null,
    "checkbox hit area changes inclusion without opening detail");
  await firstModuleCard.locator(".module-card__toggle").click();
  await page.waitForFunction(({ entityId, checked }) => {
    const toggle = document.querySelector(`[data-module-toggle="${entityId}"]`);
    return toggle && toggle.checked === checked;
  }, { entityId: firstEntityId, checked: checkedBeforeInspect });

  await firstToggle.evaluate((input) => { input.disabled = true; });
  assert.equal(await firstToggle.isDisabled(), true, "blocked-inclusion fixture disables the checkbox before inspection");
  assert.equal(await firstInspect.isEnabled(), true, "inspection remains independently enabled beside a disabled inclusion checkbox");
  await firstInspect.click();
  await page.waitForFunction((entityId) => window.CASA_EM_MODULOS_DEBUG.getState().selectedEntityId === entityId, firstEntityId);
  await page.keyboard.press("Escape");
  assert.deepEqual(await renderedComponents(), {
    detail: "detail-panel",
    list: "selection-list",
    fronts: "choice-swatches",
    handles: "choice-grid",
    "stone-packages": "choice-cards",
    "stone-skirting": "toggle-list",
    lighting: "toggle-list",
    "additional-services": "toggle-list",
    summary: "action-list"
  }, "buyer renderer bindings expose the executable presentation contract");

  const generatedSummary = page.locator('[data-keyboard-section="summary"]');
  assert.equal(
    await generatedSummary.getAttribute("data-flow-generated-section"),
    "true",
    "Summary semantic section shell is created from normalized flow"
  );
  assert.equal(await generatedSummary.getAttribute("data-keyboard-behavior"), "action", "generated Summary behavior comes from normalized flow");
  assert.equal(await generatedSummary.getAttribute("data-render-component"), "action-list", "generated Summary component comes from normalized flow");
  assert.equal(await generatedSummary.locator("h3").textContent(), "Resumo", "generated Summary semantic heading comes from normalized flow label");
  assert.equal(await generatedSummary.locator("h3").getAttribute("class"), "sr-only", "Summary semantic heading is accessible without duplicating visible stage copy");
  assert.equal(await generatedSummary.locator("#summaryContent").count(), 1, "Summary domain content host belongs to the generated semantic section");
  assert.equal(await page.locator("#summaryContent").count(), 1, "Summary domain content host remains unique");
  assert.equal(await page.locator("#summaryHeading").textContent(), "Sua composição", "accepted visible Summary stage heading is preserved");
  assert.deepEqual(await stageGroupOrder("summary"), await modelGroupOrder("summary"), "Summary group order comes from normalized flow");
  assert.deepEqual(await renderedSectionOrder("summary-main"), await modelSectionOrder("summary", "summary-main"), "Summary section order follows normalized flow");

  const modulesViewContract = async () => page.evaluate(() => {
    const list = document.querySelector('[data-stage-view-id="modules-list"]');
    const detail = document.querySelector('[data-stage-view-id="modules-detail"]');
    return {
      profile: document.documentElement.dataset.layoutProfile,
      selectedEntityId: window.CASA_EM_MODULOS_DEBUG.getState().selectedEntityId,
      list: {
        pane: list?.dataset.stagePane || null,
        role: list?.dataset.viewRole || null,
        source: list?.dataset.sourceSection || null,
        component: list?.dataset.flowComponent || null,
        projection: list?.dataset.viewProjection || null
      },
      detail: {
        pane: detail?.dataset.stagePane || null,
        role: detail?.dataset.viewRole || null,
        source: detail?.dataset.sourceSection || null,
        component: detail?.dataset.flowComponent || null,
        relation: detail?.dataset.viewRelation || null,
        relationOf: detail?.dataset.viewRelationOf || null,
        projection: detail?.dataset.viewProjection || null
      }
    };
  });

  const initialModulesContract = await modulesViewContract();
  assert.equal(initialModulesContract.profile, "side-rail", "Modules view plan starts on the canonical side-rail profile");
  assert.deepEqual(initialModulesContract.list, {
    pane: "list",
    role: "primary",
    source: "modules",
    component: "selection-list",
    projection: null
  }, "Modules primary list adapter is bound from presentation policy");
  assert.deepEqual(initialModulesContract.detail, {
    pane: "detail",
    role: "companion",
    source: "modules",
    component: "detail-panel",
    relation: "companion",
    relationOf: "modules-list",
    projection: "side-panel"
  }, "Modules companion adapter exposes the policy relation and side-rail projection");

  await page.locator("#moduleList [data-select-entity]").first().click();
  await page.waitForFunction(() => document.body.classList.contains("has-module-detail"));
  const selectedModuleBeforeProfileChanges = await page.evaluate(() => window.CASA_EM_MODULOS_DEBUG.getState().selectedEntityId);
  const detailDesktop = await rect('[data-stage-pane="detail"]');
  const listDesktop = await rect('[data-stage-pane="list"]');
  assert.ok(listDesktop.top >= detailDesktop.bottom - 2, "while controls are beside the scene, Modules uses one internal column");
  assert.equal(await page.locator("#moduleDetailPlaceholder").isHidden(), true, "selected module replaces the detail placeholder");
  assert.equal(await noOverflow("#modulesPanel"), true, "desktop side-panel Modules does not overflow horizontally");
  await page.screenshot({ path: path.join(output, "modules-desktop.png"), fullPage: true });

  await page.locator('.flow-nav [data-step="finishes"]').click();
  await page.waitForFunction(() => !document.getElementById("finishesStagePanel").hidden);
  assert.deepEqual(await stageGroupOrder("finishes"), await modelGroupOrder("finishes"), "Acabamentos group order comes from normalized flow");
  const generatedCabinetGroup = page.locator('[data-flow-group-shell="cabinet-finishes"]');
  assert.equal(await generatedCabinetGroup.getAttribute("data-flow-generated-group"), "true", "Cabinet Finishes group shell is claimed from normalized flow");
  assert.equal(await generatedCabinetGroup.getAttribute("id"), "frontFinishPanel", "Cabinet Finishes keeps the accepted stable visual adapter id");
  assert.equal(await page.locator("#frontFinishHeading").textContent(), "Acabamentos do conjunto", "Cabinet Finishes visible group heading comes from normalized group label");
  assert.deepEqual(await renderedSectionOrder("cabinet-finishes"), await modelSectionOrder("finishes", "cabinet-finishes"), "cabinet section order follows normalized flow");
  const generatedStoneGroup = page.locator('[data-flow-group-shell="stone"]');
  assert.equal(await generatedStoneGroup.getAttribute("data-flow-generated-group"), "true", "Stone group shell is claimed from normalized flow");
  assert.equal(await generatedStoneGroup.getAttribute("id"), "stonePanel", "Stone keeps the accepted stable visual adapter id");
  assert.equal(await page.locator("#stoneHeading").textContent(), "Pedra do conjunto", "Stone visible group heading comes from normalized group label");
  assert.deepEqual(await renderedSectionOrder("stone"), await modelSectionOrder("finishes", "stone"), "stone section order follows normalized flow");
  const generatedFronts = page.locator('[data-keyboard-section="fronts"]');
  assert.equal(
    await generatedFronts.getAttribute("data-flow-generated-section"),
    "true",
    "Fronts section shell is created from normalized flow"
  );
  assert.equal(await generatedFronts.getAttribute("data-keyboard-behavior"), "selection", "generated Fronts behavior comes from normalized flow");
  assert.equal(await generatedFronts.getAttribute("data-render-component"), "choice-swatches", "generated Fronts component comes from normalized flow");
  assert.equal(await generatedFronts.locator("h3").textContent(), "Cor das frentes", "generated Fronts heading comes from normalized flow label");
  assert.equal(
    await generatedFronts.locator('[data-flow-item-id="fronts-all"] #finishSwatches').count(),
    1,
    "Fronts swatch adapter remains owned by the generated semantic section"
  );
  assert.equal(
    await generatedFronts.locator('[data-flow-item-id="fronts-all"] #selectedFinishDescription').count(),
    1,
    "Fronts selected-description adapter remains owned by the generated semantic section"
  );
  const generatedHandles = page.locator('[data-keyboard-section="handles"]');
  assert.equal(
    await generatedHandles.getAttribute("data-flow-generated-section"),
    "true",
    "Handles section shell is created from normalized flow"
  );
  assert.equal(await generatedHandles.getAttribute("data-keyboard-behavior"), "selection", "generated Handles behavior comes from normalized flow");
  assert.equal(await generatedHandles.getAttribute("data-render-component"), "choice-grid", "generated Handles component comes from normalized flow");
  assert.equal(await generatedHandles.locator("h3").textContent(), "Puxadores", "generated Handles heading comes from normalized flow label");
  assert.equal(
    await generatedHandles.locator('[data-flow-item-id="handles-all"] #handleHelp').count(),
    1,
    "Handles help adapter remains owned by the generated semantic section"
  );
  assert.equal(
    await generatedHandles.locator('[data-flow-item-id="handles-all"] #handleOptions').count(),
    1,
    "Handles options adapter remains owned by the generated semantic section"
  );
  const generatedStonePackages = page.locator('[data-keyboard-section="stone-packages"]');
  assert.equal(
    await generatedStonePackages.getAttribute("data-flow-generated-section"),
    "true",
    "Stone Packages section shell is created from normalized flow"
  );
  assert.equal(await generatedStonePackages.getAttribute("data-keyboard-behavior"), "selection", "generated Stone Packages behavior comes from normalized flow");
  assert.equal(await generatedStonePackages.getAttribute("data-render-component"), "choice-cards", "generated Stone Packages component comes from normalized flow");
  assert.equal(await generatedStonePackages.locator("h3").textContent(), "Pacote de pedra", "generated Stone Packages heading comes from normalized flow label");
  assert.equal(
    await generatedStonePackages.locator('[data-flow-item-id="stone-all"] #stonePackageOptions').count(),
    1,
    "Stone Packages options adapter remains owned by the generated semantic section"
  );
  const generatedStoneSkirting = page.locator('[data-keyboard-section="stone-skirting"]');
  assert.equal(
    await generatedStoneSkirting.getAttribute("data-flow-generated-section"),
    "true",
    "Stone Skirting section shell is created from normalized flow"
  );
  assert.equal(await generatedStoneSkirting.getAttribute("data-keyboard-behavior"), "toggle", "generated Stone Skirting behavior comes from normalized flow");
  assert.equal(await generatedStoneSkirting.getAttribute("data-render-component"), "toggle-list", "generated Stone Skirting component comes from normalized flow");
  assert.equal(await generatedStoneSkirting.locator("h3").textContent(), "Rodapé de pedra", "generated Stone Skirting heading comes from normalized flow label");
  assert.equal(
    await generatedStoneSkirting.locator('[data-flow-item-id="stone-skirting"] #stoneSkirtingToggle').count(),
    1,
    "Stone Skirting toggle adapter remains owned by the generated semantic section"
  );
  const cabinet = await rect('[data-flow-group-shell="cabinet-finishes"]');
  const stone = await rect('[data-flow-group-shell="stone"]');
  assert.ok(stone.top >= cabinet.bottom - 2, "while controls are beside the scene, Acabamentos remains one column");
  assert.equal(await noOverflow("#finishesStagePanel"), true, "desktop side-panel Acabamentos does not overflow horizontally");

  await page.setViewportSize({ width: 1050, height: 900 });
  await page.waitForTimeout(80);
  assert.equal(await page.evaluate(() => window.CASA_EM_MODULOS_DEBUG.getLayoutProfile()), "stacked", "1050px resolves to stacked");
  assert.equal((await modulesViewContract()).detail.projection, "side-panel", "stacked profile updates Modules companion projection marker from policy");
  assert.equal((await modulesViewContract()).selectedEntityId, selectedModuleBeforeProfileChanges, "selected module survives side-rail -> stacked profile marker update");
  assert.equal(await page.evaluate(() => document.documentElement.dataset.layoutProfile), "stacked", "stacked profile marker follows viewport");
  await page.evaluate(() => window.scrollTo(0, Math.min(320, Math.max(0, document.scrollingElement.scrollHeight - window.innerHeight))));
  await page.waitForTimeout(30);
  const dockStacked = await bottomDockState();
  assert.equal(dockStacked.position, "fixed", "stacked document-scroll profile keeps the same footer persistently fixed to the viewport");
  assert.ok(dockStacked.dock.bottom <= dockStacked.viewportHeight + 2 && dockStacked.dock.bottom >= dockStacked.viewportHeight - 4,
    "stacked dock remains pinned to the document viewport bottom while controls content scrolls");
  const cabinetMedium = await rect('[data-flow-group-shell="cabinet-finishes"]');
  const stoneMedium = await rect('[data-flow-group-shell="stone"]');
  assert.ok(Math.abs(cabinetMedium.top - stoneMedium.top) < 4, "when controls move below the scene, Acabamentos switches to two columns");
  assert.ok(cabinetMedium.right <= stoneMedium.left + 4, "stacked workspace groups occupy separate columns");
  const handleGeometry = await page.locator('[data-handle-id]').evaluateAll((nodes) => nodes.map((node) => {
    const box = node.getBoundingClientRect();
    const copy = node.querySelector(".handle-option__copy")?.getBoundingClientRect();
    return { width: box.width, copyWidth: copy?.width || 0 };
  }));
  assert.ok(handleGeometry.every((entry) => entry.width >= 190 && entry.copyWidth >= 125), "Puxadores stays readable in the two-column stacked-workspace layout");

  await page.locator('.flow-nav [data-step="modules"]').click();
  await page.waitForFunction(() => !document.getElementById("modulesPanel").hidden);
  await page.locator("#moduleList [data-select-entity]").first().click();
  await page.waitForFunction(() => document.body.classList.contains("has-module-detail"));
  const detailStacked = await rect('[data-stage-pane="detail"]');
  const listStacked = await rect('[data-stage-pane="list"]');
  assert.ok(Math.abs(detailStacked.top - listStacked.top) < 4, "stacked workspace gives Modules two peer columns");
  assert.ok(detailStacked.right <= listStacked.left + 4, "stacked Modules columns remain visually separate");
  const paneScrollContract = await page.locator('[data-stage-pane]').evaluateAll((panes) => panes.map((pane) => ({
    id: pane.dataset.stagePane,
    overflowY: getComputedStyle(pane).overflowY,
    clientHeight: pane.clientHeight,
    scrollHeight: pane.scrollHeight
  })));
  assert.ok(paneScrollContract.every((pane) => pane.overflowY === "auto"), "each stacked Modules column owns its vertical scroller");
  assert.ok(paneScrollContract.some((pane) => pane.scrollHeight > pane.clientHeight + 2), "at least one stacked Modules column has independent scrollable content");
  const paneScrollBeforeReplace = await page.evaluate(() => {
    const list = document.querySelector('[data-stage-view-id="modules-list"]');
    const detail = document.querySelector('[data-stage-view-id="modules-detail"]');
    list.scrollTop = Math.min(96, Math.max(0, list.scrollHeight - list.clientHeight));
    detail.scrollTop = Math.min(72, Math.max(0, detail.scrollHeight - detail.clientHeight));
    return { list: list.scrollTop, detail: detail.scrollTop };
  });
  await page.locator('#moduleList .module-card.is-selected [data-select-entity]').evaluate((element) => element.focus({ preventScroll: true }));
  assert.equal((await modulePaneState()).activeView, "modules-list", "stacked focus hazard fixture starts inside the primary list pane");
  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForFunction(() =>
    document.documentElement.dataset.layoutProfile === "compact"
    && document.querySelector('[data-stage-view-id="modules-list"]').hidden
    && !document.querySelector('[data-stage-view-id="modules-detail"]').hidden
  );
  await page.waitForTimeout(30);
  const compactFocusedReplace = await modulePaneState();
  assert.equal(compactFocusedReplace.listHidden, true, "compact replace hides the primary list while detail is open");
  assert.equal(compactFocusedReplace.detailHidden, false, "compact replace keeps the companion detail visible while detail is open");
  assert.equal(compactFocusedReplace.activeClose, true, "entering compact replace moves focus out of the newly hidden list to the detail close action");
  await page.setViewportSize({ width: 1050, height: 900 });
  await page.waitForFunction(() =>
    document.documentElement.dataset.layoutProfile === "stacked"
    && !document.querySelector('[data-stage-view-id="modules-list"]').hidden
    && !document.querySelector('[data-stage-view-id="modules-detail"]').hidden
  );
  await page.waitForTimeout(30);
  const stackedAfterReplaceRoundTrip = await modulePaneState();
  assert.equal(stackedAfterReplaceRoundTrip.listScrollTop, paneScrollBeforeReplace.list, "stacked return restores the remembered primary pane scroll position");
  assert.equal(stackedAfterReplaceRoundTrip.detailScrollTop, paneScrollBeforeReplace.detail, "stacked return restores the remembered companion pane scroll position");
  await page.screenshot({ path: path.join(output, "modules-stacked.png"), fullPage: true });

  await page.setViewportSize({ width: 1366, height: 900 });
  await page.waitForTimeout(80);
  assert.equal(await page.evaluate(() => document.documentElement.dataset.layoutProfile), "side-rail", "stacked -> side-rail resize restores the canonical profile marker");
  assert.equal((await modulesViewContract()).detail.projection, "side-panel", "stacked -> side-rail resize restores the policy projection marker");
  assert.equal((await modulesViewContract()).selectedEntityId, selectedModuleBeforeProfileChanges, "selected module survives stacked -> side-rail topology transition");
  assert.deepEqual(await page.evaluate(() => window.CASA_EM_MODULOS_DEBUG.getFlowLayoutErrors()), [], "finish layout has no renderer invariant errors");
  await page.screenshot({ path: path.join(output, "finishes-desktop.png"), fullPage: true });

  await page.locator('.flow-nav [data-step="services"]').click();
  await page.waitForFunction(() => !document.getElementById("servicesPanel").hidden);
  assert.deepEqual(await stageGroupOrder("services"), await modelGroupOrder("services"), "Services group ownership comes from normalized flow");
  assert.equal(
    await page.locator('[data-flow-group-shell="services"]').getAttribute("data-flow-generated-group"),
    "true",
    "Services group shell is created at runtime from normalized flow"
  );
  assert.deepEqual(await renderedSectionOrder("services"), await modelSectionOrder("services", "services"), "Services section order follows normalized flow");
  const generatedLighting = page.locator('[data-keyboard-section="lighting"]');
  assert.equal(
    await generatedLighting.getAttribute("data-flow-generated-section"),
    "true",
    "Lighting section shell is created from normalized flow"
  );
  assert.equal(await generatedLighting.getAttribute("data-keyboard-behavior"), "toggle", "generated Lighting behavior comes from normalized flow");
  assert.equal(await generatedLighting.getAttribute("data-render-component"), "toggle-list", "generated Lighting component comes from normalized flow");
  assert.equal(await generatedLighting.locator("h3").textContent(), "Iluminação", "generated Lighting heading comes from normalized flow label");
  assert.equal(
    await generatedLighting.locator('[data-flow-item-id="lighting-08"] #lightingToggle').count(),
    1,
    "specialized Lighting item adapter remains owned by the generated semantic section"
  );
  const generatedAdditionalServices = page.locator('[data-keyboard-section="additional-services"]');
  assert.equal(
    await generatedAdditionalServices.getAttribute("data-flow-generated-section"),
    "true",
    "additional-services section shell is created from normalized flow"
  );
  assert.equal(
    await generatedAdditionalServices.getAttribute("data-keyboard-behavior"),
    "toggle",
    "generated section behavior comes from normalized flow"
  );
  assert.equal(
    await generatedAdditionalServices.getAttribute("data-render-component"),
    "toggle-list",
    "generated section component comes from normalized flow"
  );
  assert.equal(
    await generatedAdditionalServices.locator("h3").textContent(),
    "Serviços adicionais",
    "generated section heading comes from normalized flow label"
  );
  const defaultAdditionalServiceOrder = await page.locator("#servicesChecklist [data-global-service-id]").evaluateAll((nodes) =>
    nodes.map((node) => node.dataset.globalServiceId)
  );
  const defaultModeledAdditionalServiceOrder = await page.evaluate(() => {
    const stage = window.CASA_NORMALIZED_FLOW.stages.find((entry) => entry.id === "services");
    return stage?.groups.flatMap((group) => group.sections).find((section) => section.id === "additional-services")?.itemIds || [];
  });
  assert.deepEqual(defaultAdditionalServiceOrder, defaultModeledAdditionalServiceOrder, "generic service cards follow their bound normalized section membership/order");
  assert.deepEqual(defaultAdditionalServiceOrder, ["move-stone", "tempered-glass"], "default generic service order remains unchanged");
  const lighting = await rect('[data-keyboard-section="lighting"]');
  const additional = await rect('[data-keyboard-section="additional-services"]');
  assert.ok(additional.top >= lighting.bottom - 2, "while controls are beside the scene, Services uses one internal column");

  await page.setViewportSize({ width: 1050, height: 900 });
  await page.waitForTimeout(80);
  const lightingStacked = await rect('[data-keyboard-section="lighting"]');
  const additionalStacked = await rect('[data-keyboard-section="additional-services"]');
  assert.ok(Math.abs(lightingStacked.top - additionalStacked.top) < 4, "stacked workspace restores the two-column Services composition");
  assert.ok(lightingStacked.right <= additionalStacked.left + 4, "stacked Services sections occupy separate columns");
  assert.deepEqual(await page.evaluate(() => window.CASA_EM_MODULOS_DEBUG.getFlowLayoutErrors()), [], "service layout has no renderer invariant errors");

  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForTimeout(80);
  assert.equal(await page.evaluate(() => window.CASA_EM_MODULOS_DEBUG.getLayoutProfile()), "compact", "390px resolves to compact");
  assert.equal((await modulesViewContract()).detail.projection, "replace", "compact profile updates Modules companion projection marker from policy");
  assert.equal((await modulesViewContract()).selectedEntityId, selectedModuleBeforeProfileChanges, "selected module survives stacked -> compact profile marker update");
  assert.equal(await page.evaluate(() => document.documentElement.dataset.layoutProfile), "compact", "compact profile marker follows viewport");
  await page.evaluate(() => window.scrollTo(0, Math.min(320, Math.max(0, document.scrollingElement.scrollHeight - window.innerHeight))));
  await page.waitForTimeout(30);
  const dockCompact = await bottomDockState();
  assert.equal(dockCompact.position, "fixed", "compact document-scroll profile keeps the same footer persistently fixed to the viewport");
  assert.ok(dockCompact.dock.bottom <= dockCompact.viewportHeight + 2 && dockCompact.dock.bottom >= dockCompact.viewportHeight - 4,
    "compact dock remains pinned to the document viewport bottom");
  assert.ok(dockCompact.clearance >= dockCompact.dock.height - 2, "compact safe-area-aware dock keeps live clearance synchronized");
  await page.locator('.flow-nav [data-step="modules"]').click();
  await page.waitForFunction(() => !document.getElementById("modulesPanel").hidden);
  const compactOpenPanes = await modulePaneState();
  assert.equal(compactOpenPanes.listHidden, true, "compact replace hides Modules list while a detail is open");
  assert.equal(compactOpenPanes.detailHidden, false, "compact replace shows Modules detail while a detail is open");
  assert.equal(await noOverflow("#modulesPanel"), true, "narrow Modules does not overflow horizontally");

  await page.keyboard.press("Escape");
  await page.waitForFunction(() =>
    !document.body.classList.contains("has-module-detail")
    && !document.querySelector('[data-stage-view-id="modules-list"]').hidden
    && document.querySelector('[data-stage-view-id="modules-detail"]').hidden
  );
  await page.waitForTimeout(30);
  const compactClosedPanes = await modulePaneState();
  assert.equal(compactClosedPanes.listHidden, false, "compact replace shows the primary list after detail closes");
  assert.equal(compactClosedPanes.detailHidden, true, "compact replace hides the companion detail after detail closes");
  assert.equal(compactClosedPanes.activeView, "modules-list", "Escape restores focus into the newly visible primary list");
  assert.equal(await page.evaluate(() => window.CASA_EM_MODULOS_DEBUG.getState().selectedEntityId), null, "compact Escape clears only detail inspection");

  await page.locator(`#moduleList [data-select-entity="${selectedModuleBeforeProfileChanges}"]`).click();
  await page.waitForFunction((entityId) =>
    window.CASA_EM_MODULOS_DEBUG.getState().selectedEntityId === entityId
    && document.querySelector('[data-stage-view-id="modules-list"]').hidden
    && !document.querySelector('[data-stage-view-id="modules-detail"]').hidden,
    selectedModuleBeforeProfileChanges
  );
  await page.screenshot({ path: path.join(output, "modules-mobile.png"), fullPage: true });

  await page.locator('.flow-nav [data-step="finishes"]').click();
  await page.waitForFunction(() => !document.getElementById("finishesStagePanel").hidden);
  const cabinetMobile = await rect('[data-flow-group-shell="cabinet-finishes"]');
  const stoneMobile = await rect('[data-flow-group-shell="stone"]');
  assert.ok(stoneMobile.top >= cabinetMobile.bottom - 2, "narrow Acabamentos collapses groups in semantic order");
  assert.deepEqual(await stageGroupOrder("finishes"), await modelGroupOrder("finishes"), "responsive collapse does not change semantic group order");
  assert.equal(await noOverflow("#finishesStagePanel"), true, "narrow Acabamentos does not overflow horizontally");
  await page.screenshot({ path: path.join(output, "finishes-mobile.png"), fullPage: true });

  await page.setViewportSize({ width: 1366, height: 900 });
  await page.waitForTimeout(80);
  assert.equal(await page.evaluate(() => document.documentElement.dataset.layoutProfile), "side-rail", "compact -> side-rail resize restores the canonical profile marker");
  assert.equal((await modulesViewContract()).detail.projection, "side-panel", "compact -> side-rail resize restores the policy projection marker");
  assert.equal((await modulesViewContract()).selectedEntityId, selectedModuleBeforeProfileChanges, "selected module survives compact -> side-rail topology transition");
  assert.equal(await noOverflow("#modulesPanel"), true, "side-rail Modules remains overflow-safe after a full profile round trip");

  const uniqueness = await page.evaluate(() => ({
    moduleDetail: document.querySelectorAll("#moduleDetail").length,
    moduleList: document.querySelectorAll("#moduleList").length,
    fronts: document.querySelectorAll('[data-keyboard-section="fronts"]').length,
    handles: document.querySelectorAll('[data-keyboard-section="handles"]').length,
    lighting: document.querySelectorAll('[data-keyboard-section="lighting"]').length
  }));
  assert.deepEqual(uniqueness, { moduleDetail: 1, moduleList: 1, fronts: 1, handles: 1, lighting: 1 }, "layout remounting reuses controls instead of duplicating them");
  assert.deepEqual(errors, [], "flow layout browser run has no console/page errors");

  // The baseline above exercises real production v5. The following variants
  // intentionally mutate legacy flat stages.items using an isolated fixture;
  // each variant intercepts its own GET. No production write or seed.
  const sourceConfiguration = structuredClone(flatV3);
  const renamedCoreStages = structuredClone(sourceConfiguration);
  const renamedIdsByKind = {
    finishes: "finishes-layout",
    services: "services-layout",
    summary: "review-layout"
  };
  renamedCoreStages.stages.forEach((stage) => {
    const kind = stage.kind || stage.id;
    if (!renamedIdsByKind[kind]) return;
    stage.id = renamedIdsByKind[kind];
    stage.kind = kind;
  });
  const expectedRenamedNavigation = renamedCoreStages.stages.filter((stage) => stage.enabled).map((stage) => stage.id);

  const renamedErrors = [];
  const renamedPage = await browser.newPage({ viewport: { width: 1366, height: 900 } });
  renamedPage.on("pageerror", (error) => renamedErrors.push(error.message));
  renamedPage.on("console", (message) => { if (message.type() === "error") renamedErrors.push(message.text()); });
  await renamedPage.route("**/api/configuration", async (route) => {
    if (route.request().method() !== "GET") return route.continue();
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(renamedCoreStages)
    });
  });
  await renamedPage.goto(targetUrl, { waitUntil: "domcontentloaded", timeout: 15000 });
  await renamedPage.waitForFunction(() => {
    const flow = window.CASA_NORMALIZED_FLOW;
    const byKind = Object.fromEntries((flow?.stages || []).map((stage) => [stage.kind, stage]));
    return byKind.finishes?.id === "finishes-layout"
      && byKind.services?.id === "services-layout"
      && byKind.summary?.id === "review-layout"
      && document.querySelector("#finishesStagePanel > [data-flow-group-grid]")?.dataset.flowGroupGrid === "finishes-layout"
      && document.querySelector("#servicesPanel > [data-flow-group-grid]")?.dataset.flowGroupGrid === "services-layout"
      && document.querySelector("#summaryPanel > [data-flow-group-grid]")?.dataset.flowGroupGrid === "review-layout"
      && window.CASA_EM_MODULOS_DEBUG?.getFlowLayoutErrors;
  }, null, { timeout: 10000 });

  assert.deepEqual(
    await renamedPage.locator(".flow-nav [data-step]").evaluateAll((nodes) => nodes.map((node) => node.dataset.step)),
    expectedRenamedNavigation,
    "navigation uses normalized renamed stage ids in configured order"
  );
  assert.equal(await renamedPage.locator('.flow-nav [data-step="finishes"]').count(), 0, "historical Finishes stage id is not fabricated");
  assert.equal(await renamedPage.locator('.flow-nav [data-step="services"]').count(), 0, "historical Services stage id is not fabricated");
  assert.equal(await renamedPage.locator('.flow-nav [data-step="summary"]').count(), 0, "historical Summary stage id is not fabricated");
  assert.deepEqual(
    await renamedPage.evaluate(() => Object.fromEntries(
      window.CASA_NORMALIZED_FLOW.stages
        .filter((stage) => ["finishes", "services", "summary"].includes(stage.kind))
        .map((stage) => [stage.kind, { id: stage.id, enabled: stage.enabled }])
    )),
    {
      finishes: { id: "finishes-layout", enabled: true },
      services: { id: "services-layout", enabled: true },
      summary: { id: "review-layout", enabled: true }
    },
    "renamed core stages preserve canonical kinds and mandatory Summary enabled state"
  );
  assert.deepEqual(
    await renamedPage.evaluate(() => ({
      finishes: document.querySelector("#finishesStagePanel > [data-flow-group-grid]")?.dataset.flowGroupGrid,
      services: document.querySelector("#servicesPanel > [data-flow-group-grid]")?.dataset.flowGroupGrid,
      summary: document.querySelector("#summaryPanel > [data-flow-group-grid]")?.dataset.flowGroupGrid
    })),
    {
      finishes: "finishes-layout",
      services: "services-layout",
      summary: "review-layout"
    },
    "stable visual roots are claimed by actual normalized stage ids"
  );

  await renamedPage.locator('.flow-nav [data-step="finishes-layout"]').click();
  await renamedPage.waitForFunction(() => !document.getElementById("finishesStagePanel").hidden);
  assert.equal(await renamedPage.locator('[data-keyboard-section="fronts"]').count(), 1, "renamed Finishes stage still materializes Fronts");
  assert.equal(await renamedPage.locator('[data-keyboard-section="handles"]').count(), 1, "renamed Finishes stage still materializes Handles");

  await renamedPage.locator('.flow-nav [data-step="services-layout"]').click();
  await renamedPage.waitForFunction(() => !document.getElementById("servicesPanel").hidden);
  assert.equal(await renamedPage.locator('[data-keyboard-section="lighting"]').count(), 1, "renamed Services stage still materializes Lighting");
  assert.equal(await renamedPage.locator('[data-keyboard-section="additional-services"]').count(), 1, "renamed Services stage still materializes Additional Services");

  await renamedPage.locator('.flow-nav [data-step="review-layout"]').click();
  await renamedPage.waitForFunction(() => !document.getElementById("summaryPanel").hidden);
  assert.equal(await renamedPage.locator('[data-keyboard-section="summary"]').count(), 1, "renamed Summary stage still materializes its semantic section");
  assert.deepEqual(await renamedPage.evaluate(() => window.CASA_EM_MODULOS_DEBUG.getFlowLayoutErrors()), [], "renamed non-Modules core stage ids create no renderer invariant errors");
  assert.deepEqual(renamedErrors, [], "renamed non-Modules core stage fixture has no console/page errors");
  await renamedPage.close();

  const reorderedServices = structuredClone(sourceConfiguration);
  const reorderedServicesStage = reorderedServices.stages.find((stage) => (stage.kind || stage.id) === "services");
  assert.ok(reorderedServicesStage, "Services order fixture has Services stage");
  const reorderedGenericServiceIds = ["tempered-glass", "move-stone"];
  reorderedServicesStage.items = [
    ...reorderedGenericServiceIds,
    ...reorderedServicesStage.items.filter((id) => !reorderedGenericServiceIds.includes(id))
  ];

  const reorderErrors = [];
  const reorderPage = await browser.newPage({ viewport: { width: 1366, height: 900 } });
  reorderPage.on("pageerror", (error) => reorderErrors.push(error.message));
  reorderPage.on("console", (message) => { if (message.type() === "error") reorderErrors.push(message.text()); });
  await reorderPage.route("**/api/configuration", async (route) => {
    if (route.request().method() !== "GET") return route.continue();
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(reorderedServices)
    });
  });
  await reorderPage.goto(targetUrl, { waitUntil: "domcontentloaded", timeout: 15000 });
  await reorderPage.waitForFunction(() => {
    const stage = window.CASA_NORMALIZED_FLOW?.stages?.find((entry) => entry.id === "services");
    const section = stage?.groups?.flatMap((group) => group.sections).find((entry) => entry.id === "additional-services");
    return section
      && section.itemIds[0] === "tempered-glass"
      && section.itemIds[1] === "move-stone"
      && window.CASA_EM_MODULOS_DEBUG?.getFlowLayoutErrors;
  }, null, { timeout: 10000 });

  await reorderPage.locator('.flow-nav [data-step="services"]').click();
  await reorderPage.waitForFunction(() => !document.getElementById("servicesPanel").hidden);
  const modeledReorderedServices = await reorderPage.evaluate(() => {
    const stage = window.CASA_NORMALIZED_FLOW.stages.find((entry) => entry.id === "services");
    return stage.groups.flatMap((group) => group.sections).find((section) => section.id === "additional-services").itemIds;
  });
  const renderedReorderedServices = await reorderPage.locator("#servicesChecklist [data-global-service-id]").evaluateAll((nodes) =>
    nodes.map((node) => node.dataset.globalServiceId)
  );
  assert.deepEqual(modeledReorderedServices, ["tempered-glass", "move-stone"], "normalized Additional Services preserves configured item order");
  assert.deepEqual(renderedReorderedServices, modeledReorderedServices, "generic service cards render in normalized section item order instead of catalog order");
  const firstReorderedService = reorderPage.locator("#servicesChecklist [data-global-service-id]").first();
  const firstReorderedChecked = await firstReorderedService.isChecked();
  await firstReorderedService.click();
  await reorderPage.waitForFunction(
    ({ id, before }) => document.querySelector(`[data-global-service-id="${id}"]`)?.checked !== before,
    { id: modeledReorderedServices[0], before: firstReorderedChecked }
  );
  assert.equal(await reorderPage.locator(`[data-global-service-id="${modeledReorderedServices[0]}"]`).isChecked(), !firstReorderedChecked, "reordered service retains generic state toggle behavior");
  await reorderPage.locator(`[data-global-service-id="${modeledReorderedServices[0]}"]`).click();
  await reorderPage.waitForFunction(
    ({ id, before }) => document.querySelector(`[data-global-service-id="${id}"]`)?.checked === before,
    { id: modeledReorderedServices[0], before: firstReorderedChecked }
  );
  assert.deepEqual(await reorderPage.evaluate(() => window.CASA_EM_MODULOS_DEBUG.getFlowLayoutErrors()), [], "reordered service membership creates no renderer invariant errors");
  assert.deepEqual(reorderErrors, [], "Services order fixture has no console/page errors");
  await reorderPage.close();

  const withoutAdditionalServices = structuredClone(sourceConfiguration);
  const servicesStage = withoutAdditionalServices.stages.find((stage) => (stage.kind || stage.id) === "services");
  assert.ok(servicesStage, "negative fixture has Services stage");
  servicesStage.items = servicesStage.items.filter((id) => id === "lighting-08");

  const negativeErrors = [];
  const negativePage = await browser.newPage({ viewport: { width: 1366, height: 900 } });
  negativePage.on("pageerror", (error) => negativeErrors.push(error.message));
  negativePage.on("console", (message) => { if (message.type() === "error") negativeErrors.push(message.text()); });
  await negativePage.route("**/api/configuration", async (route) => {
    if (route.request().method() !== "GET") return route.continue();
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(withoutAdditionalServices)
    });
  });
  await negativePage.goto(targetUrl, { waitUntil: "domcontentloaded", timeout: 15000 });
  await negativePage.waitForFunction(() => {
    const services = window.CASA_NORMALIZED_FLOW?.stages?.find((stage) => stage.id === "services");
    return services
      && services.groups.flatMap((group) => group.sections).every((section) => section.id !== "additional-services")
      && window.CASA_EM_MODULOS_DEBUG?.getFlowLayoutErrors;
  }, null, { timeout: 10000 });

  assert.equal(
    await negativePage.locator('[data-keyboard-section="additional-services"]').count(),
    0,
    "omitted normalized section creates no semantic section shell"
  );
  assert.equal(
    await negativePage.locator("#servicesChecklist").isHidden(),
    true,
    "unclaimed neutral renderer slot stays hidden"
  );
  assert.equal(
    await negativePage.locator("#servicesChecklist [data-global-service-id]").count(),
    0,
    "absent Additional Services section leaves no generic service cards behind"
  );
  assert.deepEqual(
    await negativePage.evaluate(() => window.CASA_EM_MODULOS_DEBUG.getFlowLayoutErrors()),
    [],
    "omitted normalized section does not trigger a fabricated fallback binding"
  );
  assert.deepEqual(negativeErrors, [], "negative section-absence fixture has no console/page errors");
  await negativePage.close();

  const withoutLighting = structuredClone(sourceConfiguration);
  const lightingServicesStage = withoutLighting.stages.find((stage) => (stage.kind || stage.id) === "services");
  assert.ok(lightingServicesStage, "Lighting negative fixture has Services stage");
  lightingServicesStage.items = lightingServicesStage.items.filter((id) => id !== "lighting-08");

  const lightingNegativeErrors = [];
  const lightingNegativePage = await browser.newPage({ viewport: { width: 1366, height: 900 } });
  lightingNegativePage.on("pageerror", (error) => lightingNegativeErrors.push(error.message));
  lightingNegativePage.on("console", (message) => { if (message.type() === "error") lightingNegativeErrors.push(message.text()); });
  await lightingNegativePage.route("**/api/configuration", async (route) => {
    if (route.request().method() !== "GET") return route.continue();
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(withoutLighting)
    });
  });
  await lightingNegativePage.goto(targetUrl, { waitUntil: "domcontentloaded", timeout: 15000 });
  await lightingNegativePage.waitForFunction(() => {
    const services = window.CASA_NORMALIZED_FLOW?.stages?.find((stage) => stage.id === "services");
    return services
      && services.groups.flatMap((group) => group.sections).every((section) => section.id !== "lighting")
      && services.groups.flatMap((group) => group.sections).some((section) => section.id === "additional-services")
      && window.CASA_EM_MODULOS_DEBUG?.getFlowLayoutErrors;
  }, null, { timeout: 10000 });

  await lightingNegativePage.locator('.flow-nav [data-step="services"]').click();
  await lightingNegativePage.waitForFunction(() => !document.getElementById("servicesPanel").hidden);

  assert.equal(
    await lightingNegativePage.locator('[data-keyboard-section="lighting"]').count(),
    0,
    "omitted Lighting data creates no semantic Lighting section shell"
  );
  assert.equal(
    await lightingNegativePage.locator('[data-flow-section-slot][data-flow-slot-item="lighting-08"]').isHidden(),
    true,
    "unclaimed Lighting item-affinity slot stays hidden"
  );
  assert.equal(
    await lightingNegativePage.locator('[data-keyboard-section="additional-services"]').count(),
    1,
    "Additional Services remains materialized when Lighting is omitted"
  );
  assert.equal(
    await lightingNegativePage.locator('[data-keyboard-section="additional-services"]').isVisible(),
    true,
    "Additional Services remains visible in the Services stage"
  );
  assert.equal(
    await lightingNegativePage.locator('.layer-group[data-entity-id="lighting-08"]').getAttribute("hidden"),
    "",
    "Lighting scene layer is not configurable when Lighting is absent from normalized data"
  );
  assert.deepEqual(
    await lightingNegativePage.evaluate(() => window.CASA_EM_MODULOS_DEBUG.getFlowLayoutErrors()),
    [],
    "omitted Lighting data does not trigger a fabricated renderer fallback"
  );
  assert.deepEqual(lightingNegativeErrors, [], "Lighting absence fixture has no console/page errors");
  await lightingNegativePage.close();

  const withoutFronts = structuredClone(sourceConfiguration);
  const frontsFinishesStage = withoutFronts.stages.find((stage) => (stage.kind || stage.id) === "finishes");
  assert.ok(frontsFinishesStage, "Fronts negative fixture has Acabamentos stage");
  frontsFinishesStage.items = frontsFinishesStage.items.filter((id) => id !== "fronts-all");

  const frontsNegativeErrors = [];
  const frontsNegativePage = await browser.newPage({ viewport: { width: 1366, height: 900 } });
  frontsNegativePage.on("pageerror", (error) => frontsNegativeErrors.push(error.message));
  frontsNegativePage.on("console", (message) => { if (message.type() === "error") frontsNegativeErrors.push(message.text()); });
  await frontsNegativePage.route("**/api/configuration", async (route) => {
    if (route.request().method() !== "GET") return route.continue();
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(withoutFronts)
    });
  });
  await frontsNegativePage.goto(targetUrl, { waitUntil: "domcontentloaded", timeout: 15000 });
  await frontsNegativePage.waitForFunction(() => {
    const finishes = window.CASA_NORMALIZED_FLOW?.stages?.find((stage) => stage.id === "finishes");
    const sectionIds = finishes?.groups?.flatMap((group) => group.sections.map((section) => section.id)) || [];
    return finishes
      && !sectionIds.includes("fronts")
      && sectionIds.includes("handles")
      && sectionIds.includes("stone-packages")
      && sectionIds.includes("stone-skirting")
      && window.CASA_EM_MODULOS_DEBUG?.getFlowLayoutErrors;
  }, null, { timeout: 10000 });

  await frontsNegativePage.locator('.flow-nav [data-step="finishes"]').click();
  await frontsNegativePage.waitForFunction(() => !document.getElementById("finishesStagePanel").hidden);

  assert.equal(
    await frontsNegativePage.locator('[data-keyboard-section="fronts"]').count(),
    0,
    "omitted Fronts data creates no semantic Fronts section shell"
  );
  assert.equal(
    await frontsNegativePage.locator('[data-flow-section-slot][data-flow-slot-item="fronts-all"]').isHidden(),
    true,
    "unclaimed Fronts item-affinity slot stays hidden"
  );
  assert.equal(
    await frontsNegativePage.locator('[data-keyboard-section="handles"]').count(),
    1,
    "Handles remains materialized when Fronts is omitted"
  );
  assert.equal(
    await frontsNegativePage.locator('[data-keyboard-section="handles"]').isVisible(),
    true,
    "Handles remains visible when Fronts is omitted"
  );
  assert.equal(
    await frontsNegativePage.locator('[data-keyboard-section="stone-packages"]').count(),
    1,
    "Stone packages remains materialized when Fronts is omitted"
  );
  assert.equal(
    await frontsNegativePage.locator('[data-keyboard-section="stone-skirting"]').count(),
    1,
    "Stone skirting remains materialized when Fronts is omitted"
  );
  assert.deepEqual(
    await frontsNegativePage.evaluate(() => window.CASA_EM_MODULOS_DEBUG.getFlowLayoutErrors()),
    [],
    "omitted Fronts data does not trigger a fabricated renderer fallback"
  );
  assert.deepEqual(frontsNegativeErrors, [], "Fronts absence fixture has no console/page errors");
  await frontsNegativePage.close();

  const withoutHandles = structuredClone(sourceConfiguration);
  const handlesFinishesStage = withoutHandles.stages.find((stage) => (stage.kind || stage.id) === "finishes");
  assert.ok(handlesFinishesStage, "Handles negative fixture has Acabamentos stage");
  handlesFinishesStage.items = handlesFinishesStage.items.filter((id) => id !== "handles-all");

  const handlesNegativeErrors = [];
  const handlesNegativePage = await browser.newPage({ viewport: { width: 1366, height: 900 } });
  handlesNegativePage.on("pageerror", (error) => handlesNegativeErrors.push(error.message));
  handlesNegativePage.on("console", (message) => { if (message.type() === "error") handlesNegativeErrors.push(message.text()); });
  await handlesNegativePage.route("**/api/configuration", async (route) => {
    if (route.request().method() !== "GET") return route.continue();
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(withoutHandles)
    });
  });
  await handlesNegativePage.goto(targetUrl, { waitUntil: "domcontentloaded", timeout: 15000 });
  await handlesNegativePage.waitForFunction(() => {
    const finishes = window.CASA_NORMALIZED_FLOW?.stages?.find((stage) => stage.id === "finishes");
    const sectionIds = finishes?.groups?.flatMap((group) => group.sections.map((section) => section.id)) || [];
    return finishes
      && sectionIds.includes("fronts")
      && !sectionIds.includes("handles")
      && sectionIds.includes("stone-packages")
      && sectionIds.includes("stone-skirting")
      && window.CASA_EM_MODULOS_DEBUG?.getFlowLayoutErrors;
  }, null, { timeout: 10000 });

  await handlesNegativePage.locator('.flow-nav [data-step="finishes"]').click();
  await handlesNegativePage.waitForFunction(() => !document.getElementById("finishesStagePanel").hidden);

  assert.equal(
    await handlesNegativePage.locator('[data-keyboard-section="handles"]').count(),
    0,
    "omitted Handles data creates no semantic Handles section shell"
  );
  assert.equal(
    await handlesNegativePage.locator('[data-flow-section-slot][data-flow-slot-item="handles-all"]').isHidden(),
    true,
    "unclaimed Handles item-affinity slot stays hidden"
  );
  assert.equal(
    await handlesNegativePage.locator('[data-keyboard-section="fronts"]').count(),
    1,
    "Fronts remains materialized when Handles is omitted"
  );
  assert.equal(
    await handlesNegativePage.locator('[data-keyboard-section="fronts"]').isVisible(),
    true,
    "Fronts remains visible when Handles is omitted"
  );
  assert.equal(
    await handlesNegativePage.locator('[data-keyboard-section="stone-packages"]').count(),
    1,
    "Stone packages remains materialized when Handles is omitted"
  );
  assert.equal(
    await handlesNegativePage.locator('[data-keyboard-section="stone-skirting"]').count(),
    1,
    "Stone skirting remains materialized when Handles is omitted"
  );
  assert.deepEqual(
    await handlesNegativePage.evaluate(() => window.CASA_EM_MODULOS_DEBUG.getFlowLayoutErrors()),
    [],
    "omitted Handles data does not trigger a fabricated renderer fallback"
  );
  assert.deepEqual(handlesNegativeErrors, [], "Handles absence fixture has no console/page errors");
  await handlesNegativePage.close();

  const withoutCabinetFinishes = structuredClone(sourceConfiguration);
  const cabinetFinishesStage = withoutCabinetFinishes.stages.find((stage) => (stage.kind || stage.id) === "finishes");
  assert.ok(cabinetFinishesStage, "Cabinet Finishes absence fixture has Acabamentos stage");
  cabinetFinishesStage.items = cabinetFinishesStage.items.filter((id) => id !== "fronts-all" && id !== "handles-all");

  const cabinetNegativeErrors = [];
  const cabinetNegativePage = await browser.newPage({ viewport: { width: 1366, height: 900 } });
  cabinetNegativePage.on("pageerror", (error) => cabinetNegativeErrors.push(error.message));
  cabinetNegativePage.on("console", (message) => { if (message.type() === "error") cabinetNegativeErrors.push(message.text()); });
  await cabinetNegativePage.route("**/api/configuration", async (route) => {
    if (route.request().method() !== "GET") return route.continue();
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(withoutCabinetFinishes)
    });
  });
  await cabinetNegativePage.goto(targetUrl, { waitUntil: "domcontentloaded", timeout: 15000 });
  await cabinetNegativePage.waitForFunction(() => {
    const finishes = window.CASA_NORMALIZED_FLOW?.stages?.find((stage) => stage.id === "finishes");
    const groupIds = finishes?.groups?.map((group) => group.id) || [];
    const sectionIds = finishes?.groups?.flatMap((group) => group.sections.map((section) => section.id)) || [];
    return finishes
      && !groupIds.includes("cabinet-finishes")
      && groupIds.includes("stone")
      && !sectionIds.includes("fronts")
      && !sectionIds.includes("handles")
      && sectionIds.includes("stone-packages")
      && window.CASA_EM_MODULOS_DEBUG?.getFlowLayoutErrors;
  }, null, { timeout: 10000 });

  assert.equal(
    await cabinetNegativePage.locator('[data-flow-group-shell="cabinet-finishes"]').count(),
    0,
    "omitted Cabinet Finishes data creates no semantic cabinet group shell"
  );
  assert.equal(
    await cabinetNegativePage.locator('[data-flow-group-slot="cabinet-finishes"]').isHidden(),
    true,
    "unclaimed Cabinet Finishes neutral group slot stays hidden"
  );
  assert.equal(
    await cabinetNegativePage.locator('[data-flow-group-shell="stone"]').isVisible(),
    false,
    "Stone group remains semantically available before entering Acabamentos"
  );

  await cabinetNegativePage.keyboard.press("Control+ArrowRight");
  await cabinetNegativePage.waitForFunction(() =>
    document.querySelector('.flow-nav [data-step="finishes"]')?.getAttribute("aria-current") === "step"
    && document.activeElement?.id === "stoneHeading",
    null,
    { timeout: 10000 }
  );

  assert.equal(await cabinetNegativePage.locator("#frontFinishPanel").isHidden(), true, "hidden cabinet adapter is never used as the stage-entry focus target");
  assert.equal(await cabinetNegativePage.locator("#stonePanel").isVisible(), true, "Stone group remains visible when Cabinet Finishes is omitted");
  assert.equal(await cabinetNegativePage.evaluate(() => document.activeElement?.id), "stoneHeading", "stage entry focuses the first visible group heading");
  assert.deepEqual(
    await cabinetNegativePage.evaluate(() => window.CASA_EM_MODULOS_DEBUG.getFlowLayoutErrors()),
    [],
    "Cabinet Finishes absence creates no renderer fallback"
  );
  assert.deepEqual(cabinetNegativeErrors, [], "Cabinet Finishes absence fixture has no console/page errors");
  await cabinetNegativePage.close();

  const withoutStone = structuredClone(sourceConfiguration);
  const stoneFinishesStage = withoutStone.stages.find((stage) => (stage.kind || stage.id) === "finishes");
  assert.ok(stoneFinishesStage, "Stone absence fixture has Acabamentos stage");
  stoneFinishesStage.items = stoneFinishesStage.items.filter((id) => id !== "stone-all" && id !== "stone-skirting");
  if (Array.isArray(withoutStone.initialState?.services)) {
    withoutStone.initialState.services = withoutStone.initialState.services.filter((id) => id !== "stone-skirting");
  }

  const stoneNegativeErrors = [];
  const stoneNegativePage = await browser.newPage({ viewport: { width: 1366, height: 900 } });
  stoneNegativePage.on("pageerror", (error) => stoneNegativeErrors.push(error.message));
  stoneNegativePage.on("console", (message) => { if (message.type() === "error") stoneNegativeErrors.push(message.text()); });
  await stoneNegativePage.route("**/api/configuration", async (route) => {
    if (route.request().method() !== "GET") return route.continue();
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(withoutStone)
    });
  });
  await stoneNegativePage.goto(targetUrl, { waitUntil: "domcontentloaded", timeout: 15000 });
  await stoneNegativePage.waitForFunction(() => {
    const finishes = window.CASA_NORMALIZED_FLOW?.stages?.find((stage) => stage.id === "finishes");
    const sectionIds = finishes?.groups?.flatMap((group) => group.sections.map((section) => section.id)) || [];
    return finishes
      && finishes.groups.every((group) => group.id !== "stone")
      && !sectionIds.includes("stone-packages")
      && !sectionIds.includes("stone-skirting")
      && sectionIds.includes("fronts")
      && sectionIds.includes("handles")
      && window.CASA_EM_MODULOS_DEBUG?.getFlowLayoutErrors;
  }, null, { timeout: 10000 });

  await stoneNegativePage.keyboard.press("Control+ArrowRight");
  await stoneNegativePage.waitForFunction(() =>
    document.querySelector('.flow-nav [data-step="finishes"]')?.getAttribute("aria-current") === "step"
    && document.activeElement?.id === "frontFinishHeading",
    null,
    { timeout: 10000 }
  );

  assert.equal(
    await stoneNegativePage.locator('[data-flow-group-shell="stone"]').count(),
    0,
    "omitted Stone data leaves no runtime semantic Stone group shell"
  );
  assert.equal(
    await stoneNegativePage.locator('[data-flow-group-slot="stone"]').isHidden(),
    true,
    "unclaimed Stone neutral group slot stays hidden"
  );
  assert.equal(
    await stoneNegativePage.evaluate(() => document.activeElement?.id),
    "frontFinishHeading",
    "Stone absence keeps stage-entry focus on the visible Cabinet heading"
  );
  assert.equal(
    await stoneNegativePage.locator('[data-keyboard-section="stone-packages"]').count(),
    0,
    "omitted Stone data creates no semantic Stone Packages section shell"
  );
  assert.equal(
    await stoneNegativePage.locator('[data-flow-section-slot][data-flow-slot-item="stone-all"]').isHidden(),
    true,
    "unclaimed Stone Packages item-affinity slot stays hidden"
  );
  assert.equal(
    await stoneNegativePage.locator("#stonePanel").isHidden(),
    true,
    "Stone group is hidden when both canonical Stone items are absent"
  );
  assert.equal(
    await stoneNegativePage.locator('[data-keyboard-section="fronts"]').isVisible(),
    true,
    "Fronts remains visible when Stone is omitted"
  );
  assert.equal(
    await stoneNegativePage.locator('[data-keyboard-section="handles"]').isVisible(),
    true,
    "Handles remains visible when Stone is omitted"
  );
  assert.deepEqual(
    await stoneNegativePage.evaluate(() => window.CASA_EM_MODULOS_DEBUG.getFlowLayoutErrors()),
    [],
    "schema-valid Stone absence creates no renderer fallback"
  );
  assert.deepEqual(stoneNegativeErrors, [], "Stone absence fixture has no console/page errors");
  await stoneNegativePage.close();

  const withoutSkirting = structuredClone(sourceConfiguration);
  const skirtingFinishesStage = withoutSkirting.stages.find((stage) => (stage.kind || stage.id) === "finishes");
  assert.ok(skirtingFinishesStage, "Stone Skirting absence fixture has Acabamentos stage");
  skirtingFinishesStage.items = skirtingFinishesStage.items.filter((id) => id !== "stone-skirting");
  if (Array.isArray(withoutSkirting.initialState?.services)) {
    withoutSkirting.initialState.services = withoutSkirting.initialState.services.filter((id) => id !== "stone-skirting");
  }

  const skirtingNegativeErrors = [];
  const skirtingNegativePage = await browser.newPage({ viewport: { width: 1366, height: 900 } });
  skirtingNegativePage.on("pageerror", (error) => skirtingNegativeErrors.push(error.message));
  skirtingNegativePage.on("console", (message) => { if (message.type() === "error") skirtingNegativeErrors.push(message.text()); });
  await skirtingNegativePage.route("**/api/configuration", async (route) => {
    if (route.request().method() !== "GET") return route.continue();
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(withoutSkirting)
    });
  });
  await skirtingNegativePage.goto(targetUrl, { waitUntil: "domcontentloaded", timeout: 15000 });
  await skirtingNegativePage.waitForFunction(() => {
    const finishes = window.CASA_NORMALIZED_FLOW?.stages?.find((stage) => stage.id === "finishes");
    const stone = finishes?.groups?.find((group) => group.id === "stone");
    const sectionIds = stone?.sections?.map((section) => section.id) || [];
    return stone
      && sectionIds.includes("stone-packages")
      && !sectionIds.includes("stone-skirting")
      && window.CASA_EM_MODULOS_DEBUG?.getFlowLayoutErrors;
  }, null, { timeout: 10000 });

  await skirtingNegativePage.locator('.flow-nav [data-step="finishes"]').click();
  await skirtingNegativePage.waitForFunction(() => !document.getElementById("finishesStagePanel").hidden);

  assert.equal(
    await skirtingNegativePage.locator('[data-keyboard-section="stone-packages"]').count(),
    1,
    "Stone Packages remains materialized when Stone Skirting is omitted"
  );
  assert.equal(
    await skirtingNegativePage.locator('[data-keyboard-section="stone-packages"]').isVisible(),
    true,
    "Stone Packages remains visible when Stone Skirting is omitted"
  );
  assert.equal(
    await skirtingNegativePage.locator('[data-keyboard-section="stone-skirting"]').count(),
    0,
    "omitted Stone Skirting data creates no semantic Stone Skirting section shell"
  );
  assert.equal(
    await skirtingNegativePage.locator('[data-flow-section-slot][data-flow-slot-item="stone-skirting"]').isHidden(),
    true,
    "unclaimed Stone Skirting item-affinity slot stays hidden"
  );
  assert.equal(
    await skirtingNegativePage.locator("#stonePanel").isVisible(),
    true,
    "Stone group remains visible while stone-all / Stone Packages remain modeled"
  );
  assert.deepEqual(
    await skirtingNegativePage.evaluate(() => window.CASA_EM_MODULOS_DEBUG.getFlowLayoutErrors()),
    [],
    "intentional Stone Skirting absence creates no renderer fallback"
  );
  assert.deepEqual(skirtingNegativeErrors, [], "Stone Skirting absence fixture has no console/page errors");
  await skirtingNegativePage.close();

  fs.writeFileSync(path.join(output, "result.json"), JSON.stringify({ targetUrl, uniqueness, errors, renamedErrors, reorderErrors, negativeErrors, lightingNegativeErrors, frontsNegativeErrors, handlesNegativeErrors, cabinetNegativeErrors, stoneNegativeErrors, skirtingNegativeErrors }, null, 2));
  await browser.close();
  console.log("flow layout browser: PASS");
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
