const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { chromium } = require("playwright");

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

  assert.deepEqual(await page.evaluate(() => window.CASA_EM_MODULOS_DEBUG.getFlowLayoutErrors()), [], "initial flow layout has no renderer invariant errors");
  assert.equal(await page.evaluate(() => window.CASA_EM_MODULOS_DEBUG.getLayoutProfile()), "side-rail", "1366px resolves to side-rail");
  assert.equal(await page.evaluate(() => document.documentElement.dataset.layoutProfile), "side-rail", "resolved profile is exposed on the document");
  assert.equal(await page.evaluate(() => window.CASA_EM_MODULOS_DEBUG.getPresentationPolicy().stageViews.modules.views.find((view) => view.id === "modules-detail").relation.of), "modules-list", "buyer exposes the validated module companion policy");
  assert.equal(await page.locator('[data-stage-pane="detail"]').count(), 1);
  assert.equal(await page.locator('[data-stage-pane="list"]').count(), 1);
  assert.equal(await page.locator("#moduleDetailPlaceholder").isVisible(), true, "modules detail pane has an intentional empty-state view");
  assert.deepEqual(await renderedComponents(), {
    list: "selection-list",
    fronts: "choice-swatches",
    handles: "choice-grid",
    "stone-packages": "choice-cards",
    "stone-skirting": "toggle-list",
    lighting: "toggle-list",
    "additional-services": "toggle-list",
    summaryPanel: "action-list"
  }, "buyer renderer bindings expose the executable presentation contract");

  await page.locator("#moduleList [data-select-entity]").first().click();
  await page.waitForFunction(() => document.body.classList.contains("has-module-detail"));
  const detailDesktop = await rect('[data-stage-pane="detail"]');
  const listDesktop = await rect('[data-stage-pane="list"]');
  assert.ok(listDesktop.top >= detailDesktop.bottom - 2, "while controls are beside the scene, Modules uses one internal column");
  assert.equal(await page.locator("#moduleDetailPlaceholder").isHidden(), true, "selected module replaces the detail placeholder");
  assert.equal(await noOverflow("#modulesPanel"), true, "desktop side-panel Modules does not overflow horizontally");
  await page.screenshot({ path: path.join(output, "modules-desktop.png"), fullPage: true });

  await page.locator('.flow-nav [data-step="finishes"]').click();
  await page.waitForFunction(() => !document.getElementById("finishesStagePanel").hidden);
  assert.deepEqual(await stageGroupOrder("finishes"), await modelGroupOrder("finishes"), "Acabamentos group order comes from normalized flow");
  assert.deepEqual(await renderedSectionOrder("cabinet-finishes"), await modelSectionOrder("finishes", "cabinet-finishes"), "cabinet section order follows normalized flow");
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
  assert.equal(await page.evaluate(() => document.documentElement.dataset.layoutProfile), "stacked", "stacked profile marker follows viewport");
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
  await page.screenshot({ path: path.join(output, "modules-stacked.png"), fullPage: true });

  await page.setViewportSize({ width: 1366, height: 900 });
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
  assert.equal(await page.evaluate(() => document.documentElement.dataset.layoutProfile), "compact", "compact profile marker follows viewport");
  await page.locator('.flow-nav [data-step="modules"]').click();
  await page.waitForFunction(() => !document.getElementById("modulesPanel").hidden);
  const detailMobile = await rect('[data-stage-pane="detail"]');
  const listMobile = await rect('[data-stage-pane="list"]');
  assert.ok(listMobile.top >= detailMobile.bottom - 2, "narrow Modules collapses detail then list vertically");
  assert.equal(await noOverflow("#modulesPanel"), true, "narrow Modules does not overflow horizontally");
  await page.screenshot({ path: path.join(output, "modules-mobile.png"), fullPage: true });

  await page.locator('.flow-nav [data-step="finishes"]').click();
  await page.waitForFunction(() => !document.getElementById("finishesStagePanel").hidden);
  const cabinetMobile = await rect('[data-flow-group-shell="cabinet-finishes"]');
  const stoneMobile = await rect('[data-flow-group-shell="stone"]');
  assert.ok(stoneMobile.top >= cabinetMobile.bottom - 2, "narrow Acabamentos collapses groups in semantic order");
  assert.deepEqual(await stageGroupOrder("finishes"), await modelGroupOrder("finishes"), "responsive collapse does not change semantic group order");
  assert.equal(await noOverflow("#finishesStagePanel"), true, "narrow Acabamentos does not overflow horizontally");
  await page.screenshot({ path: path.join(output, "finishes-mobile.png"), fullPage: true });

  const uniqueness = await page.evaluate(() => ({
    moduleDetail: document.querySelectorAll("#moduleDetail").length,
    moduleList: document.querySelectorAll("#moduleList").length,
    fronts: document.querySelectorAll('[data-keyboard-section="fronts"]').length,
    handles: document.querySelectorAll('[data-keyboard-section="handles"]').length,
    lighting: document.querySelectorAll('[data-keyboard-section="lighting"]').length
  }));
  assert.deepEqual(uniqueness, { moduleDetail: 1, moduleList: 1, fronts: 1, handles: 1, lighting: 1 }, "layout remounting reuses controls instead of duplicating them");
  assert.deepEqual(errors, [], "flow layout browser run has no console/page errors");

  const sourceConfiguration = await page.evaluate(async () => {
    const response = await fetch("/api/configuration", { cache: "no-store" });
    if (!response.ok) throw new Error("failed to load configuration fixture");
    return response.json();
  });
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

  await stoneNegativePage.locator('.flow-nav [data-step="finishes"]').click();
  await stoneNegativePage.waitForFunction(() => !document.getElementById("finishesStagePanel").hidden);

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

  fs.writeFileSync(path.join(output, "result.json"), JSON.stringify({ targetUrl, uniqueness, errors, negativeErrors, lightingNegativeErrors, frontsNegativeErrors, handlesNegativeErrors, stoneNegativeErrors }, null, 2));
  await browser.close();
  console.log("flow layout browser: PASS");
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
