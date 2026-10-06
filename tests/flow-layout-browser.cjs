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
  const rect = (selector) => page.locator(selector).evaluate((element) => {
    const box = element.getBoundingClientRect();
    return { left: box.left, right: box.right, top: box.top, bottom: box.bottom, width: box.width, height: box.height };
  });
  const noOverflow = (selector) => page.locator(selector).evaluate((element) => element.scrollWidth <= element.clientWidth + 2);

  assert.deepEqual(await page.evaluate(() => window.CASA_EM_MODULOS_DEBUG.getFlowLayoutErrors()), [], "initial flow layout has no renderer invariant errors");
  assert.equal(await page.locator('[data-stage-pane="detail"]').count(), 1);
  assert.equal(await page.locator('[data-stage-pane="list"]').count(), 1);
  assert.equal(await page.locator("#moduleDetailPlaceholder").isVisible(), true, "modules detail pane has an intentional empty-state view");

  await page.locator("#moduleList [data-select-entity]").first().click();
  await page.waitForFunction(() => document.body.classList.contains("has-module-detail"));
  const detailDesktop = await rect('[data-stage-pane="detail"]');
  const listDesktop = await rect('[data-stage-pane="list"]');
  assert.ok(Math.abs(detailDesktop.top - listDesktop.top) < 4, "desktop module detail and list start on the same row");
  assert.ok(detailDesktop.right <= listDesktop.left + 4, "desktop Modules uses side-by-side detail and list panes");
  assert.equal(await page.locator("#moduleDetailPlaceholder").isHidden(), true, "selected module replaces the detail placeholder");
  assert.equal(await noOverflow("#modulesPanel"), true, "desktop Modules does not overflow horizontally");
  await page.screenshot({ path: path.join(output, "modules-desktop.png"), fullPage: true });

  await page.locator('.flow-nav [data-step="finishes"]').click();
  await page.waitForFunction(() => !document.getElementById("finishesStagePanel").hidden);
  assert.deepEqual(await stageGroupOrder("finishes"), await modelGroupOrder("finishes"), "Acabamentos group order comes from normalized flow");
  assert.deepEqual(await renderedSectionOrder("cabinet-finishes"), await modelSectionOrder("finishes", "cabinet-finishes"), "cabinet section order follows normalized flow");
  assert.deepEqual(await renderedSectionOrder("stone"), await modelSectionOrder("finishes", "stone"), "stone section order follows normalized flow");
  const cabinet = await rect('[data-flow-group-shell="cabinet-finishes"]');
  const stone = await rect('[data-flow-group-shell="stone"]');
  assert.ok(Math.abs(cabinet.top - stone.top) < 4, "wide Acabamentos renders peer groups on one row");
  assert.ok(cabinet.right <= stone.left + 4, "Acabamentos groups occupy separate desktop columns");
  assert.equal(await noOverflow("#finishesStagePanel"), true, "desktop Acabamentos does not overflow horizontally");
  assert.deepEqual(await page.evaluate(() => window.CASA_EM_MODULOS_DEBUG.getFlowLayoutErrors()), [], "finish layout has no renderer invariant errors");
  await page.screenshot({ path: path.join(output, "finishes-desktop.png"), fullPage: true });

  await page.locator('.flow-nav [data-step="services"]').click();
  await page.waitForFunction(() => !document.getElementById("servicesPanel").hidden);
  assert.deepEqual(await stageGroupOrder("services"), await modelGroupOrder("services"), "Services group ownership comes from normalized flow");
  assert.deepEqual(await renderedSectionOrder("services"), await modelSectionOrder("services", "services"), "Services section order follows normalized flow");
  const lighting = await rect('[data-keyboard-section="lighting"]');
  const additional = await rect('[data-keyboard-section="additional-services"]');
  assert.ok(Math.abs(lighting.top - additional.top) < 4, "wide Services renders peer sections on one row");
  assert.ok(lighting.right <= additional.left + 4, "Services sections occupy distinct desktop columns");
  assert.deepEqual(await page.evaluate(() => window.CASA_EM_MODULOS_DEBUG.getFlowLayoutErrors()), [], "service layout has no renderer invariant errors");

  await page.setViewportSize({ width: 390, height: 844 });
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

  fs.writeFileSync(path.join(output, "result.json"), JSON.stringify({ targetUrl, uniqueness, errors }, null, 2));
  await browser.close();
  console.log("flow layout browser: PASS");
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
