const assert = require("node:assert/strict");
const fs = require("node:fs");
const http = require("node:http");
const path = require("node:path");
const vm = require("node:vm");
const { chromium } = require("playwright");

const repoRoot = path.resolve(__dirname, "..");
const appRoot = path.join(repoRoot, "app");
const reviewDir = process.argv[2] || "/tmp/admin-hierarchy-review";
fs.mkdirSync(reviewDir, { recursive: true });

const sandbox = { window: {} };
vm.createContext(sandbox);
["data/scene-data.js", "data/catalog-data.js", "data/mock-price-book.js"].forEach((relativePath) => {
  vm.runInContext(fs.readFileSync(path.join(appRoot, relativePath), "utf8"), sandbox, { filename: relativePath });
});

const catalog = sandbox.window.CASA_EM_MODULOS_CATALOG;
const priceBook = sandbox.window.CASA_EM_MODULOS_PRICE_BOOK;
const scene = sandbox.window.CASA_EM_MODULOS_SCENE;
const defaults = require(path.join(appRoot, "data/configurator-settings.js"));
const configuration = require(path.join(appRoot, "core/configuration.js"));

let current = configuration.createDefaultAdministration(defaults, catalog, priceBook, scene);
let putCount = 0;
let lastPut = null;

const identityStub = [
  'const admin = { email: "admin@example.test", roles: ["admin"], app_metadata: { roles: ["admin"] } };',
  'export async function getUser() { return admin; }',
  'export async function handleAuthCallback() { return null; }',
  'export async function login() { return admin; }',
  'export async function logout() { return null; }',
  'export function onAuthChange() { return () => {}; }',
  'export async function requestPasswordRecovery() { return null; }',
  'export async function recoverPassword() { return admin; }',
  'export async function acceptInvite() { return admin; }',
  'export async function updateUser() { return admin; }'
].join("\n");

function contentType(filePath) {
  if (filePath.endsWith(".html")) return "text/html; charset=utf-8";
  if (filePath.endsWith(".css")) return "text/css; charset=utf-8";
  if (filePath.endsWith(".js") || filePath.endsWith(".mjs")) return "text/javascript; charset=utf-8";
  if (filePath.endsWith(".json")) return "application/json; charset=utf-8";
  if (filePath.endsWith(".png")) return "image/png";
  if (filePath.endsWith(".webp")) return "image/webp";
  if (filePath.endsWith(".jpg") || filePath.endsWith(".jpeg")) return "image/jpeg";
  return "application/octet-stream";
}

function adminHarness() {
  const source = fs.readFileSync(path.join(appRoot, "admin.html"), "utf8");
  const moduleTag = '<script type="module" src="admin/admin.bundle.js?v=admin-pricing-v1"></script>';
  assert.equal(source.includes(moduleTag), true, "admin harness expects the current admin bundle revision");
  return source.replace(
    moduleTag,
    '<script type="importmap">{"imports":{"@netlify/identity":"/__identity_stub__.js"}}</script><script type="module" src="admin/admin.js"></script>'
  );
}

const server = http.createServer(async (request, response) => {
  const url = new URL(request.url, "http://127.0.0.1");
  if (url.pathname === "/__identity_stub__.js") {
    response.writeHead(200, { "Content-Type": "text/javascript; charset=utf-8" });
    response.end(identityStub);
    return;
  }

  if (url.pathname === "/api/configuration") {
    if (request.method === "GET") {
      response.writeHead(200, { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" });
      response.end(JSON.stringify(current));
      return;
    }
    if (request.method === "PUT") {
      let body = "";
      for await (const chunk of request) body += chunk;
      const payload = JSON.parse(body || "{}");
      putCount += 1;
      lastPut = payload;
      try {
        const normalized = configuration.normalizeConfiguratorSettings(payload, catalog, priceBook, scene);
        normalized.revision = current.revision + 1;
        current = normalized;
        response.writeHead(200, { "Content-Type": "application/json; charset=utf-8" });
        response.end(JSON.stringify(current));
      } catch (error) {
        response.writeHead(422, { "Content-Type": "application/json; charset=utf-8" });
        response.end(JSON.stringify({ error: "invalid_configuration", message: error.message }));
      }
      return;
    }
  }

  if (url.pathname === "/" || url.pathname === "/admin-test.html") {
    response.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
    response.end(adminHarness());
    return;
  }

  const relative = decodeURIComponent(url.pathname).replace(/^\/+/, "");
  const filePath = path.resolve(appRoot, relative);
  if (!filePath.startsWith(appRoot + path.sep) || !fs.existsSync(filePath) || !fs.statSync(filePath).isFile()) {
    response.writeHead(404);
    response.end("not found");
    return;
  }
  response.writeHead(200, { "Content-Type": contentType(filePath), "Cache-Control": "no-store" });
  fs.createReadStream(filePath).pipe(response);
});

async function stageGroupIds(page, stageId) {
  return page.locator('[data-hierarchy-stage="' + stageId + '"] [data-hierarchy-group]').evaluateAll(
    (nodes) => nodes.map((node) => node.dataset.hierarchyGroup)
  );
}

async function groupSectionIds(page, stageId, groupId) {
  return page.locator(
    '[data-hierarchy-stage="' + stageId + '"] [data-hierarchy-group="' + groupId + '"] [data-hierarchy-section]'
  ).evaluateAll((nodes) => nodes.map((node) => node.dataset.hierarchySection));
}

async function sectionItemIds(page, stageId, groupId, sectionId) {
  return page.locator(
    '[data-hierarchy-stage="' + stageId + '"] [data-hierarchy-group="' + groupId + '"] [data-hierarchy-section="' + sectionId + '"] [data-hierarchy-item]'
  ).evaluateAll((nodes) => nodes.map((node) => node.dataset.hierarchyItem));
}

(async () => {
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  const baseUrl = "http://127.0.0.1:" + address.port;

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 1100 } });
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });

  await page.goto(baseUrl + "/admin-test.html", { waitUntil: "networkidle" });
  await page.waitForSelector('[data-hierarchy-stage="finishes"] [data-hierarchy-group="cabinet-finishes"]');

  assert.deepEqual(await stageGroupIds(page, "finishes"), ["cabinet-finishes", "stone"], "Acabamentos opens as two explicit groups");
  assert.deepEqual(await groupSectionIds(page, "finishes", "cabinet-finishes"), ["fronts", "handles"], "cabinet group exposes fronts and handles sections");
  assert.deepEqual(await groupSectionIds(page, "finishes", "stone"), ["stone-packages", "stone-skirting"], "stone group exposes package and skirting sections");
  assert.deepEqual(await groupSectionIds(page, "services", "services"), ["lighting", "additional-services"], "Services exposes lighting and additional-services sections");
  assert.deepEqual(await stageGroupIds(page, "modules"), ["modules-main"], "Modules is represented by a real hierarchy instead of a flat item list");

  const handleComponent = page.locator('[data-section-component="finishes|cabinet-finishes|handles"]');
  assert.equal(await handleComponent.inputValue(), "choice-grid", "admin loads the v3 source as an explicit v5 component");
  assert.deepEqual(
    await handleComponent.locator("option").evaluateAll((options) => options.map((option) => option.value)),
    ["choice-swatches", "choice-grid", "choice-cards", "selection-list"],
    "section editor exposes executable component ids only"
  );
  assert.equal(
    await handleComponent.locator('option[value="auto"]').count(),
    0,
    "legacy auto presentation is not an authored v5 choice"
  );

  const handleChoices = await page.locator('[data-hierarchy-item="handles-all"] [data-hierarchy-choice-option]').evaluateAll((nodes) =>
    nodes.map((node) => ({ id: node.dataset.hierarchyChoiceOption, label: node.querySelector("span")?.textContent?.trim(), available: node.dataset.available }))
  );
  assert.ok(handleChoices.length >= 4, "Puxadores exposes its concrete options inside the hierarchy item");
  assert.ok(handleChoices.some((choice) => /Tango|Íris/i.test(choice.label || "")), "Tango / Íris is visible in the hierarchy option inventory");
  assert.ok(handleChoices.some((choice) => /Ponto/i.test(choice.label || "")), "Ponto is visible in the hierarchy option inventory");

  const frontChoices = await page.locator('[data-hierarchy-item="fronts-all"] [data-hierarchy-choice-option]').count();
  const stoneChoices = await page.locator('[data-hierarchy-item="stone-all"] [data-hierarchy-choice-option]').count();
  assert.ok(frontChoices > 1, "front finish options are exposed consistently");
  assert.ok(stoneChoices > 1, "stone package options are exposed consistently");

  await page.locator('[data-admin-tab="finishes"]').click();
  await page.waitForSelector('[data-admin-panel="finishes"]:not([hidden])');
  await page.locator("#materialPager button").nth(1).click();
  await page.waitForSelector('[data-material-id="stone-existing"]');
  let stoneMaterialCard = page.locator('[data-material-id="stone-existing"]');
  let noColorToggle = stoneMaterialCard.locator('[data-material-no-color]');
  let stoneColorInput = stoneMaterialCard.locator('[data-material-color]');
  assert.equal(await noColorToggle.isChecked(), true, "stone-existing exposes explicit no-authored-color state");
  assert.equal(await stoneColorInput.isDisabled(), true, "color input is disabled while authored color is null");

  await noColorToggle.uncheck();
  stoneMaterialCard = page.locator('[data-material-id="stone-existing"]');
  noColorToggle = stoneMaterialCard.locator('[data-material-no-color]');
  stoneColorInput = stoneMaterialCard.locator('[data-material-color]');
  assert.equal(await noColorToggle.isChecked(), false, "clearing no-color creates an explicit authored color");
  assert.equal(await stoneColorInput.isEnabled(), true, "authored color input becomes editable");
  assert.match(await stoneColorInput.inputValue(), /^#[0-9a-f]{6}$/i, "editor supplies a deterministic authored color choice");

  await noColorToggle.check();
  stoneMaterialCard = page.locator('[data-material-id="stone-existing"]');
  noColorToggle = stoneMaterialCard.locator('[data-material-no-color]');
  stoneColorInput = stoneMaterialCard.locator('[data-material-color]');
  assert.equal(await noColorToggle.isChecked(), true, "material can return to explicit null without retaining editor fallback as authored data");
  assert.equal(await stoneColorInput.isDisabled(), true);

  await page.locator('[data-admin-tab="stages"]').click();
  await page.waitForSelector('[data-admin-panel="stages"]:not([hidden])');
  await page.locator('[data-move-hierarchy-group="finishes|stone|-1"]').click();
  assert.deepEqual(await stageGroupIds(page, "finishes"), ["stone", "cabinet-finishes"], "group reorder updates the in-memory hierarchy and rendered ancestry");

  await page.locator("#saveButton").click();
  await page.waitForFunction(() => document.getElementById("saveMessage").textContent.includes("rascunho"));
  assert.equal(putCount, 0, "hierarchy-changing draft is blocked before the production PUT");

  await page.reload({ waitUntil: "networkidle" });
  await page.waitForSelector('[data-hierarchy-stage="finishes"] [data-hierarchy-group="cabinet-finishes"]');

  const handlesComponentDraft = page.locator('[data-section-component="finishes|cabinet-finishes|handles"]');
  await handlesComponentDraft.selectOption("selection-list");
  await page.locator("#saveButton").click();
  await page.waitForFunction(() => document.getElementById("saveMessage").textContent.includes("rascunho"));
  assert.equal(putCount, 0, "v5 component change is blocked instead of flattening to v3");

  await page.reload({ waitUntil: "networkidle" });
  await page.waitForSelector('[data-hierarchy-stage="finishes"] [data-hierarchy-group="cabinet-finishes"]');

  const moveHandles = page.locator('[data-move-section-group="finishes|cabinet-finishes|handles"]');
  await moveHandles.selectOption("stone");
  assert.deepEqual(await groupSectionIds(page, "finishes", "cabinet-finishes"), ["fronts"], "section can move out of its source group");
  assert.deepEqual(await groupSectionIds(page, "finishes", "stone"), ["stone-packages", "stone-skirting", "handles"], "section move preserves explicit group ancestry");

  await page.reload({ waitUntil: "networkidle" });
  await page.waitForSelector('[data-hierarchy-stage="services"]');
  await page.locator('[data-move-hierarchy-item="tempered-glass:-1"]').click();
  assert.deepEqual(
    await sectionItemIds(page, "services", "services", "additional-services"),
    ["tempered-glass", "move-stone"],
    "item reorder is keyboard-accessible and deterministic"
  );

  await page.reload({ waitUntil: "networkidle" });
  await page.waitForSelector('[data-hierarchy-item="tempered-glass"]');
  await page.locator('[data-remove-hierarchy-item="tempered-glass"]').click();
  await page.waitForSelector('[data-place-hierarchy-item="tempered-glass"]');
  const pool = page.locator('[data-place-hierarchy-item="tempered-glass"]').locator("xpath=..");
  const target = pool.locator('[data-place-hierarchy-item-target="tempered-glass"]');
  await target.selectOption("services|services|additional-services");
  await page.locator('[data-place-hierarchy-item="tempered-glass"]').click();
  assert.deepEqual(
    await sectionItemIds(page, "services", "services", "additional-services"),
    ["move-stone", "tempered-glass"],
    "an unassigned compatible item can be placed back without duplication"
  );

  await page.reload({ waitUntil: "networkidle" });
  await page.waitForSelector('[data-stage-label="finishes"]');
  await page.locator('[data-stage-label="finishes"]').fill("Acabamentos teste");
  await page.locator("#saveButton").click();
  await page.waitForFunction(() => document.getElementById("saveMessage").textContent.includes("Configuração compatível publicada"));
  assert.equal(putCount, 1, "legacy-equivalent edit performs one production-compatible PUT");
  assert.equal(lastPut.schemaVersion, "ConfiguratorAdministration2D 3.0", "admin never sends v5 to the current production endpoint");
  assert.equal(lastPut.stages.find((stage) => stage.id === "finishes").label, "Acabamentos teste", "representable stage edit survives safe v5 -> v3 projection");
  assert.equal(lastPut.materials.find((material) => material.id === "stone-existing").color, null, "explicit null material color survives safe admin save projection");
  assert.deepEqual(
    lastPut.stages.find((stage) => stage.id === "services").items,
    ["move-stone", "tempered-glass", "lighting-08"],
    "unrelated compatible save preserves the original v3 service item order"
  );

  await page.screenshot({ path: path.join(reviewDir, "admin-hierarchy.png"), fullPage: true });
  fs.writeFileSync(path.join(reviewDir, "result.json"), JSON.stringify({
    putCount,
    lastPutSchema: lastPut?.schemaVersion || null,
    errors
  }, null, 2));

  assert.deepEqual(errors, [], "admin hierarchy browser run has no console/page errors");
  await browser.close();
  server.close();
  console.log("admin hierarchy browser: PASS");
})().catch((error) => {
  console.error(error);
  server.close();
  process.exitCode = 1;
});
