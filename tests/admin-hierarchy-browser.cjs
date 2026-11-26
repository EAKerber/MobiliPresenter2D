const assert = require("node:assert/strict");
const fs = require("node:fs");
const http = require("node:http");
const path = require("node:path");
const vm = require("node:vm");
const { chromium } = require("playwright");
let browser = null;

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
  'const deniedUser = { email: "staff@example.test", roles: [], app_metadata: { roles: [] } };',
  'export async function getUser() { const query = new URLSearchParams(location.search); return query.has("logged-out") ? null : query.has("denied") ? deniedUser : admin; }',
  'export async function handleAuthCallback() { return new URLSearchParams(location.search).get("auth-callback") === "invite" ? { type: "invite", token: "test-invite-token" } : null; }',
  'export async function login() { if (new URLSearchParams(location.search).has("provider-error")) throw new Error("Provider-owned identity error"); return admin; }',
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
  const moduleTag = source.match(/<script type="module" src="admin\/admin\.bundle\.js(?:\?[^"]*)?"><\/script>/)?.[0];
  assert.ok(moduleTag, "admin harness expects the current admin bundle entry");
  const importMap = '<script type="importmap">{"imports":{"@netlify/identity":"/__identity_stub__.js"}}</script>';
  const withImportMap = source.replace("</head>", importMap + "</head>");
  return withImportMap.replace(moduleTag, '<script type="module" src="admin/admin.js"></script>');
}

const server = http.createServer(async (request, response) => {
  const url = new URL(request.url, "http://127.0.0.1");
  if (url.pathname === "/__identity_stub__.js") {
    response.writeHead(200, { "Content-Type": "text/javascript; charset=utf-8" });
    response.end(identityStub);
    return;
  }

  if (url.pathname === "/api/admin-bootstrap" && request.method === "GET") {
    response.writeHead(200, { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" });
    response.end(JSON.stringify({ priceBook }));
    return;
  }

  if (url.pathname === "/core/private-navigation.bundle.js") {
    const sourceBundle = path.join(appRoot, "core/private-navigation.js");
    response.writeHead(200, { "Content-Type": "text/javascript; charset=utf-8", "Cache-Control": "no-store" });
    fs.createReadStream(sourceBundle).pipe(response);
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

  const browserOptions = { headless: true };
  if (process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH) browserOptions.executablePath = process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH;
  browser = await chromium.launch(browserOptions);
  const authPage = await browser.newPage();
  await authPage.goto("http://127.0.0.1:" + server.address().port + "/admin-test.html?logged-out=1", { waitUntil: "networkidle" });
  const authCopy = await authPage.evaluate(() => window.CASA_UI_COPY.admin.authentication);
  assert.equal(await authPage.locator("#loginPanel .eyebrow").textContent(), authCopy.restrictedEyebrow, "login eyebrow is bound to the auth catalog");
  assert.equal(await authPage.locator("#loginPanel h1").textContent(), authCopy.loginHeading, "login heading is bound to the auth catalog");
  assert.equal((await authPage.locator('label:has(#emailInput)').textContent()).trim(), authCopy.emailLabel, "email label remains associated and catalog-backed");
  assert.equal(await authPage.locator('label[for="passwordInput"]').textContent(), authCopy.passwordLabel, "password label remains explicitly associated");
  assert.equal(await authPage.locator("#loginMessage").getAttribute("aria-live"), "polite", "auth status remains politely announced");
  const revealButton = authPage.locator('[data-password-reveal="passwordInput"]');
  assert.equal(await revealButton.getAttribute("aria-label"), authCopy.showPassword, "password reveal starts with catalog-backed accessible name");
  await revealButton.click();
  assert.equal(await authPage.locator("#passwordInput").getAttribute("type"), "text", "password reveal keeps its existing visibility action");
  assert.equal(await revealButton.getAttribute("aria-label"), authCopy.hidePassword, "revealed password exposes the matching catalog-backed name");
  await authPage.locator("#recoveryButton").click();
  assert.equal(await authPage.locator("#loginMessage").textContent(), authCopy.missingEmail, "blank recovery request keeps its existing validation copy");
  await authPage.locator("#emailInput").fill("private@example.test");
  await authPage.locator("#recoveryButton").click();
  assert.equal(await authPage.locator("#loginMessage").textContent(), authCopy.recoverySuccess, "recovery success remains generic to avoid account enumeration");
  assert.equal((await authPage.locator("#loginMessage").textContent()).includes("private@example.test"), false, "recovery confirmation never reveals the supplied email");
  await authPage.goto("http://127.0.0.1:" + server.address().port + "/admin-test.html?logged-out=1&provider-error=1", { waitUntil: "networkidle" });
  await authPage.locator("#emailInput").fill("admin@example.test");
  await authPage.locator("#passwordInput").fill("not-a-real-password");
  await authPage.locator('#loginForm button[type="submit"]').click();
  await authPage.waitForFunction(() => document.getElementById("loginMessage").textContent === "Provider-owned identity error");
  assert.equal(await authPage.locator("#loginMessage").textContent(), "Provider-owned identity error", "Identity errors remain pass-through instead of being reclassified");
  await authPage.goto("http://127.0.0.1:" + server.address().port + "/admin-test.html#recovery_token=test-recovery-token", { waitUntil: "networkidle" });
  assert.equal(await authPage.locator("#passwordActionTitle").textContent(), authCopy.recoveryTitle, "recovery token selects the existing password recovery presentation");
  assert.equal(await authPage.locator("#passwordActionButton").textContent(), authCopy.updatePassword, "recovery uses the catalog-backed update action");
  await authPage.goto("http://127.0.0.1:" + server.address().port + "/admin-test.html?auth-callback=invite", { waitUntil: "networkidle" });
  assert.equal(await authPage.locator("#passwordActionTitle").textContent(), authCopy.inviteTitle, "invite callback selects the existing invite presentation");
  assert.equal(await authPage.locator("#passwordActionButton").textContent(), authCopy.acceptInvite, "invite uses the catalog-backed acceptance action");
  await authPage.goto("http://127.0.0.1:" + server.address().port + "/admin-test.html?denied=1", { waitUntil: "networkidle" });
  assert.equal(await authPage.locator("#deniedPanel h1").textContent(), authCopy.deniedHeading, "non-admin role displays the catalog-backed denied heading");
  assert.equal(await authPage.locator("#deniedPanel .intro").textContent(), authCopy.deniedIntroBefore + "admin" + authCopy.deniedIntroAfter, "denied guidance preserves the named Identity role");
  await authPage.close();
  const defaultCurrent = structuredClone(current);
  const finishPolicyFixture = structuredClone(current);
  const globalFinish = finishPolicyFixture.finishes[0];
  const localFinish = finishPolicyFixture.finishes[1];
  assert.ok(globalFinish && localFinish, "finish policy fixture needs two catalog finishes");
  finishPolicyFixture.finishes.forEach((finish) => {
    finish.enabled = false;
    finish.scope = "global";
    finish.moduleIds = catalog.modules.map((module) => module.entityId);
  });
  globalFinish.enabled = true;
  finishPolicyFixture.initialState.finishId = globalFinish.id;
  localFinish.enabled = true;
  localFinish.scope = "local";
  localFinish.moduleIds = [catalog.modules[0].entityId];
  current = finishPolicyFixture;
  const finishPolicyPage = await browser.newPage({ viewport: { width: 1440, height: 1100 } });
  const finishPolicyErrors = [];
  finishPolicyPage.on("pageerror", (error) => finishPolicyErrors.push(error.message));
  await finishPolicyPage.goto("http://127.0.0.1:" + server.address().port + "/admin-test.html", { waitUntil: "networkidle" });
  await finishPolicyPage.locator('[data-admin-tab="finishes"]').click();
  await finishPolicyPage.waitForSelector('[data-admin-panel="finishes"]:not([hidden])');
  await finishPolicyPage.waitForSelector('#finishesList [data-finish-enabled]');
  const globalFinishToggle = finishPolicyPage.locator(`[data-finish-enabled="${globalFinish.id}"]`);
  const globalFinishScope = finishPolicyPage.locator(`[data-finish-scope="${globalFinish.id}"]`);
  const globalPolicyNote = finishPolicyPage.locator(`#finish-policy-${globalFinish.id}`);
  assert.equal(await globalFinishToggle.isDisabled(), true, "the last global client finish cannot be disabled");
  assert.equal(await globalFinishToggle.getAttribute("aria-label"), `${sandbox.window.CASA_EM_MODULOS_CATALOG.options.finishes[0].publicLabel}: disponível para clientes`, "global finish availability names the finish");
  assert.equal(await globalFinishScope.isDisabled(), true, "the last global finish cannot change scope");
  assert.equal(await globalFinishScope.getAttribute("aria-label"), `${sandbox.window.CASA_EM_MODULOS_CATALOG.options.finishes[0].publicLabel}: aplicação`, "finish scope names the finish");
  assert.deepEqual(await globalFinishScope.locator("option").allTextContents(), ["Global · conjunto todo", "Local · módulo individual"], "finish scope keeps global and module-local policies distinct");
  assert.equal(await globalPolicyNote.textContent(), "Mantenha pelo menos um acabamento global disponível para clientes.", "last global finish explains both protected actions");
  assert.equal(await globalPolicyNote.isVisible(), true, "global finish policy reason is visible");
  assert.equal(await globalFinishToggle.getAttribute("aria-describedby"), `finish-policy-${globalFinish.id}`, "global availability references its policy reason");
  assert.equal(await globalFinishScope.getAttribute("aria-describedby"), `finish-policy-${globalFinish.id}`, "global scope references its policy reason");
  const localModuleId = catalog.modules[0].entityId;
  assert.equal(await finishPolicyPage.locator(`[data-finish-module="${localFinish.id}:${localModuleId}"]`).locator("xpath=../..").getAttribute("aria-label"), `Módulos que aceitam ${catalog.options.finishes[1].publicLabel}`, "local module associations remain grouped under their own finish");
  const localFinishModule = finishPolicyPage.locator(`[data-finish-module="${localFinish.id}:${localModuleId}"]`);
  assert.equal(await localFinishModule.isDisabled(), true, "the last module association for a local finish cannot be removed");
  assert.equal(await localFinishModule.getAttribute("aria-label"), `${sandbox.window.CASA_EM_MODULOS_CATALOG.options.finishes[1].publicLabel}: disponível para o módulo ${catalog.modules[0].referenceLabel}`, "local finish association names both finish and module");
  assert.equal(await finishPolicyPage.locator(`#finish-module-policy-${localFinish.id}`).textContent(), "Mantenha este acabamento associado a pelo menos um módulo.", "last local module association explains its guard");
  assert.equal(await localFinishModule.getAttribute("aria-describedby"), `finish-module-policy-${localFinish.id}`, "local association references its policy reason");
  assert.equal(await finishPolicyPage.locator(`#finish-module-policy-${localFinish.id}`).isVisible(), true, "local association policy reason is visible");
  assert.deepEqual(finishPolicyErrors, [], "finish availability policy fixture has no browser errors");
  assert.equal(putCount, 0, "reviewing finish availability policies performs no save");
  await finishPolicyPage.close();
  current = defaultCurrent;

  const page = await browser.newPage({ viewport: { width: 1440, height: 1100 } });
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });

  await page.goto(baseUrl + "/admin-test.html", { waitUntil: "networkidle" });
  await page.waitForSelector('[data-hierarchy-stage="finishes"] [data-hierarchy-group="cabinet-finishes"]');

  await page.locator('[data-admin-tab="rules"]').click();
  await page.waitForSelector('[data-admin-panel="rules"]:not([hidden])');
  const rulesCopy = await page.evaluate(() => window.CASA_UI_COPY.admin.rules);
  assert.deepEqual(rulesCopy, {
    dependenciesHeading: "Regras de dependência",
    dependenciesHint: "Um objeto pode exigir outros módulos ou itens visíveis para ser habilitado.",
    addDependency: "Adicionar dependência",
    dependencyItemHeading: "Item dependente",
    dependencyEntityLabel: "Este item",
    dependencyRequirementsLabel: "Requer todos estes itens",
    removeDependency: "Remover dependência",
    eventsHeading: "Eventos de configuração",
    eventsHint: "Altere dimensões ou ative/desative um módulo ou serviço quando outro item for ligado ou desligado.",
    addEvent: "Adicionar evento",
    eventHeadings: { legacyDepth: "Ajuste legado de profundidade", stateChange: "Ativar ou desativar item", dimension: "Ajuste de dimensão" },
    eventActionLabel: "Ação",
    eventActions: { setDimension: "Alterar dimensão de módulo", setEnabled: "Ativar ou desativar módulo ou serviço", setDepth: "Profundidade fixa" },
    eventTriggerLabel: "Quando este item",
    eventConditionLabel: "Estiver",
    eventConditions: { enabled: "Ativado", disabled: "Desativado" },
    eventTargetLabel: "Aplicar a",
    eventStateLabel: "Definir estado",
    eventStates: { enabled: "Ativado", disabled: "Desativado" },
    eventModuleLabel: "Aplicar ao módulo",
    eventDimensionLabel: "Dimensão",
    eventDimensions: { width: "Largura", height: "Altura", depth: "Profundidade" },
    eventValueMmLabel: "Valor em mm",
    legacyDepthTargetLabel: "Aplicar ao {target} · Profundidade em mm",
    removeEvent: "Remover evento"
  }, "dependency and event UI copy stays in its own canonical catalog family");
  assert.equal(await page.locator("#dependenciesHeading").textContent(), rulesCopy.dependenciesHeading);
  assert.equal(await page.locator("#dependenciesHint").textContent(), rulesCopy.dependenciesHint);
  assert.equal(await page.locator("#addDependencyButton").textContent(), rulesCopy.addDependency);
  const dependencyCard = page.locator("#dependenciesList [data-dependency-id]").first();
  assert.equal(await dependencyCard.locator("h2").textContent(), rulesCopy.dependencyItemHeading);
  assert.ok((await dependencyCard.locator('label:has([data-dependency-dependent])').textContent()).startsWith(rulesCopy.dependencyEntityLabel));
  assert.ok((await dependencyCard.locator('label:has([data-dependency-requires])').textContent()).startsWith(rulesCopy.dependencyRequirementsLabel));
  assert.equal(await dependencyCard.locator("[data-remove-dependency]").textContent(), rulesCopy.removeDependency);
  const dependentId = await dependencyCard.locator("[data-dependency-dependent]").inputValue();
  assert.equal(await dependencyCard.locator(`[data-dependency-dependent] option[value="${dependentId}"]`).textContent(), scene.entities.find((entity) => entity.id === dependentId).label, "dependency entity names remain scene-backed");
  assert.equal(await page.locator("#eventsHeading").textContent(), rulesCopy.eventsHeading);
  assert.equal(await page.locator("#eventsHint").textContent(), rulesCopy.eventsHint);
  assert.equal(await page.locator("#addEventButton").textContent(), rulesCopy.addEvent);
  const eventCard = page.locator("#eventsList [data-event-id]").first();
  assert.equal(await eventCard.locator("h2").textContent(), rulesCopy.eventHeadings.legacyDepth, "default legacy depth event remains supported");
  assert.deepEqual(await eventCard.locator("[data-event-action] option").evaluateAll((options) => options.map((option) => [option.value, option.textContent])), [
    ["set-dimension", rulesCopy.eventActions.setDimension],
    ["set-enabled", rulesCopy.eventActions.setEnabled],
    ["set-depth", rulesCopy.eventActions.setDepth]
  ], "event action values and order remain stable while labels come from the catalog");
  assert.equal(await eventCard.locator("[data-event-action]").inputValue(), "set-depth");
  assert.ok((await eventCard.locator('label:has([data-event-action])').textContent()).startsWith(rulesCopy.eventActionLabel));
  assert.ok((await eventCard.locator('label:has([data-event-trigger])').textContent()).startsWith(rulesCopy.eventTriggerLabel));
  assert.ok((await eventCard.locator('label:has([data-event-when])').textContent()).startsWith(rulesCopy.eventConditionLabel));
  assert.deepEqual(await eventCard.locator("[data-event-when] option").evaluateAll((options) => options.map((option) => [option.value, option.textContent])), [
    ["enabled", rulesCopy.eventConditions.enabled],
    ["disabled", rulesCopy.eventConditions.disabled]
  ], "event condition enum values remain unchanged");
  assert.equal(await eventCard.locator("[data-remove-event]").textContent(), rulesCopy.removeEvent);
  const module07Trigger = await eventCard.locator('[data-event-trigger] option[value="module-07"]').textContent();
  assert.equal(await eventCard.locator('label:has([data-event-depth])').textContent(), rulesCopy.legacyDepthTargetLabel.replace("{target}", module07Trigger), "legacy target wording keeps its entity name data-backed");
  const triggerOptions = await eventCard.locator("[data-event-trigger] option").evaluateAll((options) => options.map((option) => [option.value, option.textContent]));
  const triggerIds = triggerOptions.map(([id]) => id);
  assert.equal(new Set(triggerIds).size, triggerIds.length, "event trigger options have unique IDs across scene entities and services");
  assert.equal(triggerOptions.filter(([id]) => id === "stone-skirting").length, 1, "stone-skirting uses its catalog-backed service option once");
  assert.deepEqual(triggerOptions.filter(([id]) => id === "tempered-glass").map(([, label]) => label), [scene.entities.find((entity) => entity.id === "tempered-glass").label], "scene entity label keeps precedence over a duplicate service entry");
  await eventCard.locator("[data-event-action]").selectOption("set-dimension");
  const dimensionEvent = page.locator("#eventsList [data-event-id]").first();
  assert.equal(await dimensionEvent.locator("h2").textContent(), rulesCopy.eventHeadings.dimension);
  assert.ok((await dimensionEvent.locator('label:has([data-event-target])').textContent()).startsWith(rulesCopy.eventModuleLabel));
  assert.ok((await dimensionEvent.locator('label:has([data-event-dimension])').textContent()).startsWith(rulesCopy.eventDimensionLabel));
  assert.deepEqual(await dimensionEvent.locator("[data-event-dimension] option").evaluateAll((options) => options.map((option) => [option.value, option.textContent])), [
    ["width", rulesCopy.eventDimensions.width],
    ["height", rulesCopy.eventDimensions.height],
    ["depth", rulesCopy.eventDimensions.depth]
  ], "dimension enum values remain stable while labels come from the catalog");
  assert.ok((await dimensionEvent.locator('label:has([data-event-value])').textContent()).startsWith(rulesCopy.eventValueMmLabel));
  await dimensionEvent.locator("[data-event-action]").selectOption("set-enabled");
  const stateEvent = page.locator("#eventsList [data-event-id]").first();
  assert.equal(await stateEvent.locator("h2").textContent(), rulesCopy.eventHeadings.stateChange);
  assert.ok((await stateEvent.locator('label:has([data-event-target])').textContent()).startsWith(rulesCopy.eventTargetLabel));
  assert.ok((await stateEvent.locator('label:has([data-event-enabled])').textContent()).startsWith(rulesCopy.eventStateLabel));
  assert.equal(putCount, 0, "reviewing rule copy and switching event editor variants performs no save");
  await page.reload({ waitUntil: "networkidle" });
  await page.waitForSelector('[data-hierarchy-stage="finishes"] [data-hierarchy-group="cabinet-finishes"]');

  await page.locator('[data-admin-tab="objects"]').click();
  await page.waitForSelector('[data-admin-panel="objects"]:not([hidden])');
  assert.deepEqual(
    await page.locator("#objectsList .object-editor-card > label.data-field").allTextContents(),
    ["Nome público", "Descrição", "Destaques (um por linha)", "Componentes (um por linha)", "Requisitos (um por linha)"],
    "object content fields retain distinct labels in the authoring form"
  );
  await page.locator("#objectSelector").selectOption({ label: "Mover pedra" });
  await page.locator('[data-object-tab="assets"]').click();
  const moveStoneAssets = page.locator('[data-asset-object-id="move-stone"]');
  const moveStoneAssetReason = moveStoneAssets.locator("#object-asset-policy-move-stone");
  assert.equal(await moveStoneAssetReason.isVisible(), true, "object asset policy reason is visible");
  assert.equal(await moveStoneAssetReason.textContent(), "Este item não possui camada visual própria na cena. Configure cores e texturas na biblioteca de materiais.", "non-visual service explains why scene asset selectors are unavailable");
  for (const field of ["imageAsset", "detailImageAsset", "maskAsset"]) {
    const selector = moveStoneAssets.locator(`[data-object-asset="${field}"]`);
    assert.equal(await selector.isDisabled(), true, `${field} is disabled without a scene entity`);
    assert.equal(await selector.getAttribute("aria-describedby"), "object-asset-policy-move-stone", `${field} references its visible reason`);
  }
  await page.locator("#objectSelector").selectOption("0");
  const visualObjectAssets = page.locator(`[data-asset-object-id="${catalog.modules[0].entityId}"]`);
  const objectAssetsCopy = await page.evaluate(() => window.CASA_UI_COPY.admin.objectAssets);
  const firstObjectLabel = `${catalog.modules[0].referenceLabel} · ${catalog.modules[0].title}`;
  assert.equal(await visualObjectAssets.locator("h2").textContent(),
    objectAssetsCopy.heading.replace("{item}", firstObjectLabel),
    "scene asset heading is catalog-backed while the object name remains authored data");
  assert.deepEqual(await visualObjectAssets.locator("label.data-field").evaluateAll((labels) =>
    labels.map((label) => label.firstChild?.textContent)),
  [objectAssetsCopy.fields.sceneImage, objectAssetsCopy.fields.detailImage, objectAssetsCopy.fields.finishMask],
  "scene asset labels come from the shared catalog");
  assert.equal(await visualObjectAssets.locator("#object-asset-policy-" + catalog.modules[0].entityId).textContent(),
    "A lista contém apenas arquivos já presentes na cena. O painel não carrega arquivos novos nem permite caminhos externos.",
    "scene-backed asset selectors explain their bounded file list");
  for (const field of ["imageAsset", "detailImageAsset", "maskAsset"]) {
    const selector = page.locator(`[data-asset-object-id="${catalog.modules[0].entityId}"] [data-object-asset="${field}"]`);
    assert.equal(await selector.isEnabled(), true, `${field} remains editable when an object has a scene entity`);
    assert.equal(await selector.getAttribute("aria-describedby"), null, `${field} exposes no disabled reason while enabled`);
    assert.equal(await selector.locator("option").first().textContent(), objectAssetsCopy.defaultSelection,
      `${field} keeps the catalog-backed default choice`);
  }
  assert.equal(await visualObjectAssets.locator("img").first().getAttribute("alt"),
    objectAssetsCopy.previewAlt.replace("{asset}", objectAssetsCopy.fields.sceneImage).replace("{item}", firstObjectLabel),
    "scene asset preview alternative text keeps the authored object name");

  await page.locator('[data-admin-tab="stages"]').click();
  await page.waitForSelector('[data-admin-panel="stages"]:not([hidden])');
  const hierarchyEditorCopy = await page.evaluate(() => window.CASA_UI_COPY.admin.hierarchyEditor);
  assert.deepEqual(hierarchyEditorCopy, {
    stagePanelNote: "Arraste os itens entre etapas. Itens sem etapa aparecem na lista de disponíveis. Etapas de módulos e resumo são essenciais.",
    newStageTypeLabel: "Tipo da nova etapa",
    newStageTypes: { custom: "Personalizada", finishes: "Acabamentos", services: "Serviços" },
    addStage: "Adicionar etapa",
    newStagePrompt: "Nome da nova etapa",
    newSectionPrompt: "Nome da nova seção",
    newGroupPrompt: "Nome do novo grupo",
    stageLimitValidation: "O limite é {limit} etapas.",
    moveUpAriaLabel: "Mover {item} para cima",
    moveDownAriaLabel: "Mover {item} para baixo",
    choiceOptionsSummary: "Opções do item · {count} disponível(is)",
    choiceOptionsNote: "Estas são opções do item, não itens hierárquicos independentes. Disponibilidade e dados comerciais continuam nas abas próprias.",
    choiceAvailable: "Disponível",
    choiceUnavailable: "Indisponível",
    moveItemLabel: "Mover para",
    newSection: "Nova seção",
    removeItem: "Retirar",
    sectionName: "Seção",
    componentLabel: "Componente",
    moveSectionToGroup: "Mover seção para grupo",
    moveSectionToNewGroup: "Mover para novo grupo",
    mergeSection: "Remover seção e unir",
    groupName: "Grupo",
    groupWidth: "Largura",
    groupColumnOptions: { one: "1 coluna", two: "2 colunas" },
    mergeGroup: "Remover grupo e unir conteúdo",
    availableItemsAriaLabel: "Itens do catálogo sem seção",
    availableItemsHeading: "Itens disponíveis",
    availableItemsHint: "Itens pertencem a seções explícitas. Escolha uma seção compatível ou crie a estrutura inicial de uma etapa vazia.",
    emptyStageDestination: "criar grupo/seção inicial",
    addItem: "Adicionar",
    allItemsPlaced: "Todos os itens compatíveis já pertencem a uma seção.",
    stageNameLabel: "Nome da etapa",
    stageNameAriaLabel: "Nome da etapa {stage}",
    removeStage: "Remover etapa",
    emptyStageHint: "Etapa vazia. Adicione um item disponível para criar o primeiro grupo e seção."
  }, "hierarchy editor copy stays in its own canonical catalog family");
  assert.equal(await page.locator("#stagePanelNote").textContent(), hierarchyEditorCopy.stagePanelNote, "stage guidance is supplied by the copy catalog");
  assert.equal(await page.locator("#stageKindInput").getAttribute("aria-label"), hierarchyEditorCopy.newStageTypeLabel, "new-stage type selector has catalog-backed accessible text");
  assert.deepEqual(await page.locator("#stageKindInput option").allTextContents(), Object.values(hierarchyEditorCopy.newStageTypes), "stage types use catalog labels");
  assert.equal(await page.locator("#addStageButton").textContent(), hierarchyEditorCopy.addStage, "stage creation action uses catalog copy");
  const availableItems = page.locator(".stage-unassigned");
  assert.equal(await availableItems.getAttribute("aria-label"), hierarchyEditorCopy.availableItemsAriaLabel, "unassigned item region uses catalog accessible text");
  assert.equal(await availableItems.locator("h2").textContent(), hierarchyEditorCopy.availableItemsHeading, "unassigned item heading uses catalog copy");
  assert.equal(await availableItems.locator("p.admin-note").textContent(), hierarchyEditorCopy.availableItemsHint, "unassigned item guidance uses catalog copy");
  const finishesStage = page.locator('[data-hierarchy-stage="finishes"]');
  const stageLabel = await finishesStage.locator("[data-stage-label]").inputValue();
  assert.equal(await finishesStage.locator("[data-stage-label]").getAttribute("aria-label"), hierarchyEditorCopy.stageNameAriaLabel.replace("{stage}", stageLabel), "stage accessible name interpolates the data-backed stage label");
  assert.ok((await finishesStage.locator('label:has([data-stage-label])').textContent()).startsWith(hierarchyEditorCopy.stageNameLabel), "stage name field label comes from the copy catalog");
  const hierarchyDefaultsInBrowser = await page.evaluate(() => window.CASA_EM_MODULOS_HIERARCHY_DEFAULTS);
  const cabinetGroup = finishesStage.locator('[data-hierarchy-group="cabinet-finishes"]');
  const expectedCabinetGroup = hierarchyDefaultsInBrowser.stages.finishes.groups.find((group) => group.id === "cabinet-finishes");
  assert.equal(await cabinetGroup.locator("[data-group-label]").inputValue(), expectedCabinetGroup.label, "group name remains sourced from hierarchy defaults");
  assert.ok((await cabinetGroup.locator('label:has([data-group-label])').textContent()).startsWith(hierarchyEditorCopy.groupName), "group name control label comes from the copy catalog");
  assert.ok((await cabinetGroup.locator('label:has([data-group-span])').textContent()).startsWith(hierarchyEditorCopy.groupWidth), "group width control label comes from the copy catalog");
  assert.deepEqual(await cabinetGroup.locator("[data-group-span] option").allTextContents(), [hierarchyEditorCopy.groupColumnOptions.one, hierarchyEditorCopy.groupColumnOptions.two], "group column choices use catalog labels");
  const frontSection = finishesStage.locator('[data-hierarchy-section="fronts"]');
  const expectedFrontSection = expectedCabinetGroup.sections.find((section) => section.id === "fronts");
  assert.equal(await frontSection.locator("[data-section-label]").inputValue(), expectedFrontSection.label, "section name remains sourced from hierarchy defaults");
  assert.ok((await frontSection.locator('label:has([data-section-label])').textContent()).startsWith(hierarchyEditorCopy.sectionName), "section name control label comes from the copy catalog");
  assert.ok((await frontSection.locator('label:has([data-section-component])').textContent()).startsWith(hierarchyEditorCopy.componentLabel), "component control label comes from the copy catalog");
  assert.ok((await finishesStage.locator('label:has([data-move-section-group])').first().textContent()).startsWith(hierarchyEditorCopy.moveSectionToGroup), "section group selector uses catalog copy");
  assert.equal(await frontSection.locator("[data-split-hierarchy-section]").textContent(), hierarchyEditorCopy.moveSectionToNewGroup, "section split action uses catalog copy");
  assert.equal(await frontSection.locator("[data-merge-hierarchy-section]").textContent(), hierarchyEditorCopy.mergeSection, "section merge action uses catalog copy");
  assert.equal(await cabinetGroup.locator("[data-merge-hierarchy-group]").textContent(), hierarchyEditorCopy.mergeGroup, "group merge action uses catalog copy");
  assert.equal(await finishesStage.locator('[data-remove-hierarchy-item="fronts-all"]').textContent(), hierarchyEditorCopy.removeItem, "item removal action uses catalog copy");
  assert.ok((await page.locator('[data-hierarchy-item="tempered-glass"] [data-split-hierarchy-item]').first().textContent()) === hierarchyEditorCopy.newSection, "item section split action uses catalog copy");
  assert.equal(await finishesStage.locator('[data-move-hierarchy-group="finishes|cabinet-finishes|-1"]').getAttribute("aria-label"), hierarchyEditorCopy.moveUpAriaLabel.replace("{item}", () => expectedCabinetGroup.label), "ordering control exposes a catalog-backed accessible action with the authored group name");
  const frontChoicesPanel = page.locator('[data-hierarchy-choice-list="fronts-all"]');
  const frontChoiceCount = await frontChoicesPanel.locator("[data-hierarchy-choice-option][data-available=true]").count();
  assert.equal(await frontChoicesPanel.locator("summary").textContent(), hierarchyEditorCopy.choiceOptionsSummary.replace("{count}", String(frontChoiceCount)), "hierarchy option summary uses catalog copy and live availability count");
  assert.equal(await frontChoicesPanel.locator(".hierarchy-choice-options__note").textContent(), hierarchyEditorCopy.choiceOptionsNote, "hierarchy option note uses catalog copy");
  assert.equal(await frontChoicesPanel.locator('[data-available="true"] small').first().textContent(), hierarchyEditorCopy.choiceAvailable, "available hierarchy option status uses catalog copy");
  if (await frontChoicesPanel.locator('[data-available="false"]').count()) {
    assert.equal(await frontChoicesPanel.locator('[data-available="false"] small').first().textContent(), hierarchyEditorCopy.choiceUnavailable, "unavailable hierarchy option status uses catalog copy when that state is present");
  } else {
    assert.equal(hierarchyEditorCopy.choiceUnavailable, "Indisponível", "unavailable hierarchy status remains in the catalog for states absent from this fixture");
  }
  assert.ok((await page.locator('[data-move-hierarchy-item-target="fronts-all"]').locator("xpath=..").textContent()).trim().startsWith(hierarchyEditorCopy.moveItemLabel), "item destination selector label comes from the copy catalog");
  assert.equal(await page.locator('[data-remove-stage="finishes"]').textContent(), hierarchyEditorCopy.removeStage, "stage removal action uses catalog copy");
  const initialEntity = page.locator('[data-initial-configurator-entity="module-01"]');
  const initialObject = page.locator('[data-initial-configurator-entity="lighting-08"]');
  const stageAvailability = page.locator('[data-stage-enabled="finishes"]');
  assert.equal(await initialEntity.getAttribute("type"), "checkbox", "initial configurator state remains a checkbox preference");
  assert.equal(await initialEntity.locator("xpath=..").getAttribute("class"), "initial-state-option", "initial state keeps its own presentation label");
  assert.equal(await initialObject.getAttribute("type"), "checkbox", "accessory object keeps the same initial-visibility control");
  assert.equal(await initialEntity.locator("xpath=..").innerText(), "Iniciar visível no configurador", "module label names its initial configurator visibility");
  assert.equal(await initialObject.locator("xpath=..").innerText(), "Iniciar visível no configurador", "object shares the same visibility wording for the same state map");
  assert.match(await initialObject.getAttribute("aria-label"), /visível inicialmente no configurador/, "object accessible name describes entity visibility");
  assert.equal(await stageAvailability.getAttribute("type"), "checkbox", "stage availability remains a native checkbox");
  assert.equal(await stageAvailability.locator("xpath=..").getAttribute("class"), "switch", "stage availability keeps its switch presentation");
  assert.match(await initialEntity.getAttribute("aria-label"), /visível inicialmente no configurador/, "module accessible text names configurator visibility");
  assert.match(await page.locator('[data-initial-viewer-entity="module-01"]').getAttribute("aria-label"), /visível inicialmente no viewer/, "viewer initial-state text names the public viewer policy");
  assert.match(await page.locator('[data-initial-service]').first().getAttribute("aria-label"), /ativo inicialmente/, "initial service state remains a separate active-by-default preference");
  const nominalDimensionsCopy = await page.evaluate(() => window.CASA_UI_COPY.admin.nominalDimensions);
  assert.deepEqual(nominalDimensionsCopy, {
    legend: "Medidas nominais (mm)",
    note: "Atualiza as cotas e vistas técnicas; não altera a geometria da cena.",
    axisLabels: { width: "Largura", height: "Altura", depth: "Profundidade" },
    axisAriaLabel: "{module}: {axis} nominal em milímetros",
    invalidValueMessage: "Informe uma medida nominal entre 1 e 5.000 mm, com até uma casa decimal."
  }, "nominal dimension controls use their dedicated fixed-copy family");
  const nominalDimensions = page.locator('[data-module-dimension="module-01"]');
  const module = catalog.modules.find((item) => item.entityId === "module-01");
  const moduleName = `${module.referenceLabel} · ${module.title}`;
  assert.equal(await nominalDimensions.count(), 3, "nominal dimensions preserve the width, height and depth axes");
  assert.deepEqual(await nominalDimensions.evaluateAll((inputs) => inputs.map((input) => [
    input.dataset.dimensionAxis, input.getAttribute("aria-label"), input.min, input.max, input.step
  ])), [
    ["width", `${moduleName}: ${nominalDimensionsCopy.axisLabels.width} nominal em milímetros`, "1", "5000", "0.1"],
    ["height", `${moduleName}: ${nominalDimensionsCopy.axisLabels.height} nominal em milímetros`, "1", "5000", "0.1"],
    ["depth", `${moduleName}: ${nominalDimensionsCopy.axisLabels.depth} nominal em milímetros`, "1", "5000", "0.1"]
  ], "axis keys, accessible names, and numeric constraints remain stable and module names remain data-backed");
  const nominalFieldset = nominalDimensions.first().locator("xpath=ancestor::fieldset");
  assert.equal(await nominalFieldset.locator("legend").textContent(), nominalDimensionsCopy.legend, "nominal dimension legend comes from the copy catalog");
  assert.equal(await nominalFieldset.locator(".module-nominal-dimensions__note").textContent(), nominalDimensionsCopy.note, "nominal dimension guidance comes from the copy catalog");
  assert.deepEqual(await nominalFieldset.locator(".module-nominal-dimensions__field").evaluateAll((labels) => labels.map((label) => label.firstChild.textContent)),
    Object.values(nominalDimensionsCopy.axisLabels), "visible axis labels come from the copy catalog");
  const originalWidth = current.moduleDimensions["module-01"].width;
  const nominalWidth = page.locator('[data-module-dimension="module-01"][data-dimension-axis="width"]');
  await nominalWidth.fill("0");
  await nominalWidth.dispatchEvent("change");
  assert.equal(await nominalWidth.inputValue(), String(originalWidth), "invalid nominal dimensions restore the existing model value");
  assert.equal(await page.locator("#saveMessage").textContent(), nominalDimensionsCopy.invalidValueMessage, "invalid nominal dimensions use catalog validation copy");
  assert.equal(current.moduleDimensions["module-01"].width, originalWidth, "invalid nominal dimensions do not alter the persisted configuration fixture");
  await nominalWidth.fill("800.5");
  await nominalWidth.dispatchEvent("change");
  assert.equal(await nominalWidth.inputValue(), "800.5", "valid fractional nominal dimensions remain accepted in the unsaved draft");
  assert.equal(putCount, 0, "reviewing nominal dimension constraints performs no save");
  await page.reload({ waitUntil: "networkidle" });
  await page.waitForSelector('[data-hierarchy-stage="finishes"] [data-hierarchy-group="cabinet-finishes"]');
  assert.match(await stageAvailability.getAttribute("aria-label"), /^Ativar etapa /, "stage text describes whether the step is available");
  assert.equal((await stageAvailability.locator("xpath=..").textContent()).trim(),
    await stageAvailability.isChecked() ? "Ativa" : "Inativa", "stage status text follows its stored enabled state");
  for (const theme of ["light", "dark"]) {
    await page.evaluate((mode) => window.CASA_UI_THEME.setMode(mode), theme);
    const [entityAccent, stageAccent] = await Promise.all([
      initialEntity.evaluate((input) => getComputedStyle(input).accentColor),
      stageAvailability.evaluate((input) => getComputedStyle(input).accentColor)
    ]);
    assert.equal(entityAccent, stageAccent, `initial-state and stage-availability controls share the ${theme} theme accent`);
  }
  await page.evaluate(() => window.CASA_UI_THEME.setMode("auto"));

  for (const stageId of ["modules", "summary"]) {
    const card = page.locator(`[data-hierarchy-stage="${stageId}"]`);
    const reason = card.locator(`#stage-policy-${stageId}`);
    const enabled = card.locator(`[data-stage-enabled="${stageId}"]`);
    const remove = card.locator(`[data-remove-stage="${stageId}"]`);
    assert.equal(await enabled.isDisabled(), true, `${stageId} availability is locked by the required-flow policy`);
    assert.equal(await remove.isDisabled(), true, `${stageId} removal is locked by the required-flow policy`);
    assert.equal(await reason.textContent(), "Etapa obrigatória: não pode ser desativada nem removida.", `${stageId} exposes the policy that disables both controls`);
    assert.equal(await reason.isVisible(), true, `${stageId} disabled reason is visible in the editor`);
    assert.equal(await enabled.getAttribute("aria-describedby"), `stage-policy-${stageId}`, `${stageId} availability references its disabled reason`);
    assert.equal(await remove.getAttribute("aria-describedby"), `stage-policy-${stageId}`, `${stageId} removal references its disabled reason`);
  }

  await page.locator("#stageKindInput").selectOption("custom");
  page.once("dialog", (dialog) => {
    assert.equal(dialog.message(), hierarchyEditorCopy.newStagePrompt, "new stage prompt comes from the copy catalog");
    dialog.accept("Etapa vazia");
  });
  await page.locator("#addStageButton").click();
  const emptyStage = page.locator('[data-hierarchy-stage="stage-etapa-vazia"]');
  const emptyStageToggle = emptyStage.locator('[data-stage-enabled="stage-etapa-vazia"]');
  const emptyStageReason = emptyStage.locator("#stage-policy-stage-etapa-vazia");
  assert.equal(await emptyStageToggle.isDisabled(), true, "an empty custom stage cannot be activated");
  assert.equal(await emptyStage.locator('[data-remove-stage="stage-etapa-vazia"]').isDisabled(), false, "the empty custom stage remains removable");
  assert.equal(await emptyStageReason.textContent(), "Adicione pelo menos um item antes de ativar esta etapa.", "empty stage explains the prerequisite for activation");
  assert.equal(await emptyStageToggle.getAttribute("aria-describedby"), "stage-policy-stage-etapa-vazia", "empty stage availability references its prerequisite");
  assert.equal(await emptyStage.locator(".stage-drop-hint").textContent(), hierarchyEditorCopy.emptyStageHint, "empty hierarchy prompt uses catalog copy");
  assert.equal(await emptyStage.locator("[data-stage-label]").getAttribute("aria-label"), hierarchyEditorCopy.stageNameAriaLabel.replace("{stage}", "Etapa vazia"), "custom stage accessible name uses its authored label");
  assert.equal(await page.locator('[data-move-hierarchy-item-target="tempered-glass"] option[value="stage-etapa-vazia||"]').textContent(), `Etapa vazia · ${hierarchyEditorCopy.emptyStageDestination}`, "empty-stage destination label combines fixed copy with the data-backed stage name");
  assert.equal(putCount, 0, "adding a local stage and viewing its policy reason do not save implicitly");

  const accentColors = {};
  for (const theme of ["light", "dark"]) {
    await page.evaluate((nextTheme) => window.CASA_UI_THEME.setMode(nextTheme), theme);
    accentColors[theme] = await page.evaluate(() => {
      const entity = document.querySelector('[data-initial-configurator-entity="module-01"]');
      const stage = document.querySelector('[data-stage-enabled="finishes"]');
      return {
        entity: getComputedStyle(entity).accentColor,
        stage: getComputedStyle(stage).accentColor
      };
    });
    assert.notEqual(accentColors[theme].entity, "auto", `initial-state checkbox uses a defined ${theme} theme color`);
    assert.equal(accentColors[theme].entity, accentColors[theme].stage, `${theme} initial-state color follows the existing stage accent`);
  }
  assert.notEqual(accentColors.light.entity, accentColors.dark.entity, "initial-state checkbox responds to the selected theme");
  await page.evaluate(() => window.CASA_UI_THEME.setMode("auto"));

  const initialBefore = await initialEntity.isChecked();
  const stageBefore = await stageAvailability.isChecked();
  await initialEntity.setChecked(!initialBefore);
  await stageAvailability.setChecked(!stageBefore);
  assert.equal(putCount, 0, "editing initial visibility and stage availability never saves implicitly");
  await page.reload({ waitUntil: "networkidle" });
  await page.waitForSelector('[data-hierarchy-stage="finishes"] [data-hierarchy-group="cabinet-finishes"]');
  assert.equal(await page.locator('[data-initial-configurator-entity="module-01"]').isChecked(), initialBefore, "initial state is discarded when the unsaved editor is reloaded");
  assert.equal(await page.locator('[data-stage-enabled="finishes"]').isChecked(), stageBefore, "stage availability is discarded when the unsaved editor is reloaded");

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

  await page.locator('[data-admin-tab="pricing"]').click();
  await page.waitForSelector('[data-admin-panel="pricing"]:not([hidden])');
  const publicationToggle = page.locator('[data-viewer-base-price-publication]');
  const publicationReason = page.locator("#viewer-base-price-publication-note");
  const publicationCopy = await page.evaluate(() => window.CASA_UI_COPY.admin.pricing.viewerBasePricePublication);
  assert.equal(await page.locator(".pricing-publication-card h2").textContent(), publicationCopy.title, "publication title comes from the shared copy catalog");
  assert.equal((await publicationToggle.locator("xpath=..").textContent()).trim(), publicationCopy.label, "publication checkbox name comes from the shared copy catalog");
  assert.equal(await publicationToggle.isDisabled(), true, "legacy configuration cannot enable V5 base-price publication");
  assert.equal(await publicationReason.textContent(), publicationCopy.requiresV5, "disabled publication explains its V5 prerequisite from the shared copy catalog");
  assert.equal(await publicationReason.isVisible(), true, "publication prerequisite stays visible beside the control");
  assert.equal(await publicationToggle.getAttribute("aria-describedby"), "viewer-base-price-publication-note", "publication control references its explanatory note");
  const module01Price = page.locator('input[data-price-role="itemBase"][data-price-id="module-01"]');
  const cocoaPrice = page.locator('input[data-price-role="frontFinishAdjustment"][data-price-id="cocoa"]');
  const cocoaType = page.locator('[data-price-rule-type][data-price-role="frontFinishAdjustment"][data-price-id="cocoa"]');
  const cocoaRow = cocoaPrice.locator("xpath=..");
  const finishTypeSelectors = page.locator('[data-price-rule-type][data-price-role="frontFinishAdjustment"]');
  const finishPriceInputs = page.locator('input[data-price-role="frontFinishAdjustment"]');

  assert.equal(await module01Price.inputValue(), "900.00", "amount-only module row preserves the current BRL value");
  assert.equal(await module01Price.locator("xpath=..").locator(".pricing-unit").textContent(), "R$", "amount-only rule renders as BRL");
  assert.equal(await module01Price.locator("xpath=..").locator("[data-price-rule-type]").count(), 0, "amount-only roles expose no type selector");
  assert.equal(await finishTypeSelectors.count(), await finishPriceInputs.count(), "every front-finish row derives a type selector from the dual-type role capability");
  assert.equal(await page.locator('[data-price-rule-type]:not([data-price-role="frontFinishAdjustment"])').count(), 0, "no other pricing role exposes a type selector");

  assert.equal(await cocoaType.inputValue(), "percentage", "migrated front-finish pricing starts as percentage");
  assert.equal(await cocoaPrice.inputValue(), "15.00", "migrated cocoa BPS displays as 15 percent");
  assert.equal(await cocoaRow.locator(".pricing-unit").textContent(), "%", "percentage rule renders a percent unit");
  assert.equal(await cocoaRow.locator(".pricing-basis").textContent(), "Base: valor base de cada módulo elegível", "percentage authoring exposes the explicit calculation basis");

  await cocoaType.selectOption("amount");
  assert.equal(await cocoaType.inputValue(), "amount", "front-finish type can switch to fixed amount");
  assert.equal(await cocoaPrice.inputValue(), "0.00", "percentage-to-amount switch resets the numeric value");
  assert.equal(await cocoaRow.locator(".pricing-unit").textContent(), "R$", "fixed finish amount renders as BRL");
  assert.equal(await cocoaRow.locator(".pricing-basis").count(), 0, "fixed amount has no percentage basis");
  assert.ok((await page.locator("#saveMessage").textContent()).includes("zerado"), "admin explains that type switching resets the value");

  await page.locator("#saveButton").click();
  await page.waitForFunction(() => document.getElementById("saveMessage").textContent.includes("futura publicação consolidada"));
  assert.equal(putCount, 0, "non-representable finish amount is blocked before any production PUT");

  await cocoaType.selectOption("percentage");
  assert.equal(await cocoaType.inputValue(), "percentage", "finish can return to percentage authoring");
  assert.equal(await cocoaPrice.inputValue(), "0.00", "amount-to-percentage switch resets BPS instead of converting currency");
  assert.equal(await cocoaRow.locator(".pricing-unit").textContent(), "%", "percentage unit returns after switching back");
  assert.equal(await cocoaRow.locator(".pricing-basis").textContent(), "Base: valor base de cada módulo elegível", "percentage basis returns after switching back");

  await cocoaPrice.fill("15.00");
  await cocoaPrice.press("Tab");
  await page.locator("#saveButton").click();
  await page.waitForFunction(() => document.getElementById("saveMessage").textContent.includes("Configuração compatível publicada"));
  assert.equal(putCount, 1, "representable percentage pricing performs one v3-compatible PUT");
  assert.equal(lastPut.schemaVersion, "ConfiguratorAdministration2D 3.0", "admin still sends only v3 to the current production-compatible harness");
  assert.equal(lastPut.pricing.frontFinishRatesBps.cocoa, 1500, "restored percentage projects to exact basis points");

  current = configuration.createDefaultAdministration(defaults, catalog, priceBook, scene);
  putCount = 0;
  lastPut = null;
  await page.reload({ waitUntil: "networkidle" });
  await page.waitForSelector('[data-hierarchy-stage="finishes"] [data-hierarchy-group="cabinet-finishes"]');

  await page.locator('[data-admin-tab="finishes"]').click();
  await page.waitForSelector('[data-admin-panel="finishes"]:not([hidden])');
  const materialStateCopy = await page.evaluate(() => window.CASA_UI_COPY.admin.materials);
  assert.deepEqual(materialStateCopy, {
    name: "Nome",
    groupName: "Nome da opção",
    kindLabel: "Tipo de material",
    kindOptions: { solidColor: "Cor sólida", texture: "Textura" },
    textureAssetLabel: "Textura (arquivo existente)",
    onlyColor: "Somente cor",
    texturePreviewAlt: "Textura de {material}",
    validForSummary: "Válido para…",
    removeMaterial: "Remover material",
    validOptionsSuffix: "opções válidas",
    frontTarget: "Frentes",
    stoneTarget: "Pedra e rodapé",
    handleTargetPrefix: "Puxador",
    handleAvailabilityNote: "Definir depois não é um puxador e não recebe materiais.",
    handleMaterialsHeading: "Cores e materiais deste puxador",
    initialHandleLabel: "Puxador selecionado inicialmente",
    defineLater: "Definir depois",
    stoneAvailabilityHeading: "Pedras e texturas disponíveis para bancada e rodapé",
    frontMaterialsLabel: "Materiais válidos para frentes",
    initialColorLabel: "Cor selecionada inicialmente",
    initialStoneLabel: "Pedra selecionada inicialmente",
    baseboardAvailabilityNote: "A disponibilidade do serviço de rodapé é controlada separadamente na etapa; pedra e rodapé compartilham o material escolhido.",
    lastMaterialValidation: "Mantenha pelo menos um material nesta opção.",
    lastHandleAvailabilityValidation: "Mantenha pelo menos um puxador disponível.",
    availableCountSuffix: "disponível(is)",
    selectedCountSuffix: "selecionado(s)",
    baseColor: "Cor base",
    noColor: "Sem cor/tinta base",
    colorDisabledReason: "Cor base indisponível enquanto “Sem cor/tinta base” estiver marcado.",
    noColorDisabledReason: "Sem cor/tinta base está disponível apenas para materiais do tipo Textura."
  }, "fixed material editor copy stays in the canonical pt-BR catalog");
  const solidMaterialCard = page.locator('[data-material-id="base-light"]');
  const authoredBaseLabel = await page.evaluate(() => window.CASA_EM_MODULOS_CATALOG.options.finishes.find((item) => item.id === "base-light").publicLabel);
  assert.equal((await solidMaterialCard.locator("h2").textContent()).trim(), authoredBaseLabel, "material names continue to come from authored data");
  assert.equal(await solidMaterialCard.locator(".material-texture-preview").getAttribute("alt"), materialStateCopy.texturePreviewAlt.replace("{material}", authoredBaseLabel), "texture preview alt preserves the data-backed material name through a catalog template");
  assert.ok((await solidMaterialCard.locator('label:has([data-material-label])').textContent()).startsWith(materialStateCopy.name), "material name field label comes from the catalog");
  assert.ok((await solidMaterialCard.locator('label:has([data-material-kind])').textContent()).startsWith(materialStateCopy.kindLabel), "material kind field label comes from the catalog");
  assert.deepEqual(await solidMaterialCard.locator("[data-material-kind] option").allTextContents(), [materialStateCopy.kindOptions.solidColor, materialStateCopy.kindOptions.texture], "material kinds use catalog values");
  assert.ok((await solidMaterialCard.locator('label:has([data-material-texture])').textContent()).startsWith(materialStateCopy.textureAssetLabel), "existing texture field label comes from the catalog");
  assert.equal(await solidMaterialCard.locator("[data-material-texture] option").first().textContent(), materialStateCopy.onlyColor, "empty texture option comes from the catalog");
  assert.equal(await solidMaterialCard.locator(".material-targets > summary").textContent(), materialStateCopy.validForSummary, "valid-target summary comes from the catalog");
  assert.equal(await solidMaterialCard.locator("[data-remove-material]").textContent(), materialStateCopy.removeMaterial, "remove action comes from the catalog");
  assert.equal((await solidMaterialCard.locator('label:has([data-material-color])').textContent()).trim(), materialStateCopy.baseColor, "base color label comes from the catalog");
  assert.equal((await solidMaterialCard.locator('label:has([data-material-no-color])').textContent()).trim(), materialStateCopy.noColor, "no-color label comes from the catalog");
  const solidNoColorToggle = solidMaterialCard.locator('[data-material-no-color]');
  assert.equal(await solidNoColorToggle.isDisabled(), true, "solid material cannot opt out of its authored base color");
  const solidNoColorReasonId = await solidNoColorToggle.getAttribute("aria-describedby");
  assert.ok(solidNoColorReasonId, "disabled no-color control is associated with its reason");
  assert.equal(await page.locator(`#${solidNoColorReasonId}`).isVisible(), true, "solid material reason is visible beside the disabled control");
  assert.equal(await page.locator(`#${solidNoColorReasonId}`).textContent(), materialStateCopy.noColorDisabledReason, "solid material reason matches the catalog exactly");
  const targetCard = page.locator("#materialGroupsList .material-target-page");
  assert.equal(await targetCard.locator("h2").textContent(), `${materialStateCopy.frontTarget} · ${materialStateCopy.validOptionsSuffix}`, "front group heading is composed from catalog copy");
  assert.ok((await targetCard.locator('label:has([data-material-group-label])').textContent()).startsWith(materialStateCopy.groupName), "material group field label comes from the catalog");
  assert.equal(await targetCard.locator('[data-material-group-label]').inputValue(), "Frentes", "group names continue to come from authored data");
  assert.ok((await targetCard.locator('label:has(select[data-initial-finish])').textContent()).startsWith(materialStateCopy.initialColorLabel), "initial color field label comes from the catalog");
  const frontSelectionSummary = await targetCard.locator(".multi-picker > summary").textContent();
  assert.ok(frontSelectionSummary.startsWith(`${materialStateCopy.frontMaterialsLabel} · `) && frontSelectionSummary.endsWith(` ${materialStateCopy.selectedCountSuffix}`), "front-material selection count uses catalog copy");
  await page.locator("#materialTargetPager button").last().click();
  assert.equal(await targetCard.locator("h2").textContent(), `${materialStateCopy.stoneTarget} · ${materialStateCopy.validOptionsSuffix}`, "stone group heading is composed from catalog copy");
  const stoneAvailabilityHeading = await targetCard.locator(".material-availability-list h3").textContent();
  assert.ok(stoneAvailabilityHeading.startsWith(`${materialStateCopy.stoneAvailabilityHeading} · `) && stoneAvailabilityHeading.endsWith(` ${materialStateCopy.availableCountSuffix}`), "stone availability count uses catalog copy");
  assert.ok((await targetCard.locator('label:has(select[data-initial-stone])').textContent()).startsWith(materialStateCopy.initialStoneLabel), "initial stone field label comes from the catalog");
  assert.equal(await targetCard.locator(".admin-note").first().textContent(), materialStateCopy.baseboardAvailabilityNote, "baseboard availability note comes from the catalog");
  await page.locator("#materialTargetPager button").last().click();
  assert.match(await targetCard.locator("h2").textContent(), new RegExp(`^${materialStateCopy.handleTargetPrefix} · .+ · ${materialStateCopy.validOptionsSuffix}$`), "handle target keeps its data-backed name and uses catalog prefix/suffix");
  assert.ok((await targetCard.locator(".material-availability-list h3").first().textContent()).startsWith(`${materialStateCopy.handleMaterialsHeading} · `), "handle availability heading comes from the catalog");
  assert.equal(await targetCard.locator(".admin-note").first().textContent(), materialStateCopy.handleAvailabilityNote, "handle availability note comes from the catalog");
  const customerAvailability = await page.evaluate(() => window.CASA_UI_COPY.admin.finishes.customerAvailability);
  assert.equal((await targetCard.locator('label:has([data-handle-availability])').textContent()).trim(), customerAvailability, "customer availability reuses the existing canonical catalog label");
  assert.ok((await targetCard.locator('label:has(select[data-initial-handle])').textContent()).startsWith(materialStateCopy.initialHandleLabel), "initial handle field label comes from the catalog");
  assert.equal(await targetCard.locator('select[data-initial-handle] option[value="none"]').textContent(), materialStateCopy.defineLater, "initial handle empty option comes from the catalog");
  const targetPager = page.locator("#materialTargetPager");
  await targetPager.locator("button").first().click();
  await targetPager.locator("button").first().click();
  const frontPicker = targetCard.locator(".multi-picker");
  while (await frontPicker.locator('input[type="checkbox"]:checked').count() > 1) {
    if (!await frontPicker.evaluate((details) => details.open)) await frontPicker.locator("summary").click();
    const checkedMaterial = frontPicker.locator('input[type="checkbox"]:checked').first();
    const checkedMaterialId = await checkedMaterial.getAttribute("data-material-id");
    await frontPicker.locator(`input[data-material-id="${checkedMaterialId}"]`).uncheck();
  }
  if (!await frontPicker.evaluate((details) => details.open)) await frontPicker.locator("summary").click();
  const finalMaterial = frontPicker.locator('input[type="checkbox"]:checked').first();
  await finalMaterial.click();
  assert.equal(await page.locator("#saveMessage").textContent(), materialStateCopy.lastMaterialValidation, "last material validation uses the catalog");
  assert.equal(await frontPicker.locator('input[type="checkbox"]:checked').count(), 1, "the last available material remains selected after the blocked change");

  const targetPages = Number((await targetPager.locator("span").textContent()).split("/")[1].trim());
  for (let pageIndex = 0; pageIndex < targetPages; pageIndex += 1) {
    const heading = await targetCard.locator("h2").textContent();
    if (heading.startsWith(`${materialStateCopy.handleTargetPrefix} · `)) {
      const handleAvailability = targetCard.locator("[data-handle-availability]");
      if (pageIndex < targetPages - 1 && await handleAvailability.isChecked()) await handleAvailability.uncheck();
      if (pageIndex === targetPages - 1) {
        assert.equal(await handleAvailability.isChecked(), true, "one available handle remains before the final blocked change");
        await handleAvailability.click();
        assert.equal(await page.locator("#saveMessage").textContent(), materialStateCopy.lastHandleAvailabilityValidation, "last handle validation uses the catalog");
        assert.equal(await targetCard.locator("[data-handle-availability]").isChecked(), true, "the last available handle remains selected after the blocked change");
      }
    }
    if (pageIndex < targetPages - 1) await targetPager.locator("button").last().click();
  }
  await page.reload({ waitUntil: "networkidle" });
  await page.waitForSelector('[data-hierarchy-stage="finishes"] [data-hierarchy-group="cabinet-finishes"]');
  await page.locator('[data-admin-tab="finishes"]').click();
  await page.waitForSelector('[data-admin-panel="finishes"]:not([hidden])');
  await page.locator("#materialPager button").nth(1).click();
  await page.waitForSelector('[data-material-id="stone-existing"]');
  let stoneMaterialCard = page.locator('[data-material-id="stone-existing"]');
  let noColorToggle = stoneMaterialCard.locator('[data-material-no-color]');
  let stoneColorInput = stoneMaterialCard.locator('[data-material-color]');
  assert.equal(await noColorToggle.isChecked(), true, "stone-existing exposes explicit no-authored-color state");
  assert.equal(await stoneColorInput.isDisabled(), true, "color input is disabled while authored color is null");
  const stoneColorReasonId = await stoneColorInput.getAttribute("aria-describedby");
  assert.ok(stoneColorReasonId, "disabled color input is associated with its reason");
  assert.equal(await page.locator(`#${stoneColorReasonId}`).isVisible(), true, "no-color reason is visible beside the disabled control");
  assert.equal(await page.locator(`#${stoneColorReasonId}`).textContent(), materialStateCopy.colorDisabledReason, "no-color state reason matches the catalog exactly");

  await noColorToggle.uncheck();
  stoneMaterialCard = page.locator('[data-material-id="stone-existing"]');
  noColorToggle = stoneMaterialCard.locator('[data-material-no-color]');
  stoneColorInput = stoneMaterialCard.locator('[data-material-color]');
  assert.equal(await noColorToggle.isChecked(), false, "clearing no-color creates an explicit authored color");
  assert.equal(await stoneColorInput.isEnabled(), true, "authored color input becomes editable");
  assert.equal(await stoneColorInput.getAttribute("aria-describedby"), null, "enabled color input no longer exposes a disabled-state reason");
  assert.match(await stoneColorInput.inputValue(), /^#[0-9a-f]{6}$/i, "editor supplies a deterministic authored color choice");

  await noColorToggle.check();
  stoneMaterialCard = page.locator('[data-material-id="stone-existing"]');
  noColorToggle = stoneMaterialCard.locator('[data-material-no-color]');
  stoneColorInput = stoneMaterialCard.locator('[data-material-color]');
  assert.equal(await noColorToggle.isChecked(), true, "material can return to explicit null without retaining editor fallback as authored data");
  assert.equal(await stoneColorInput.isDisabled(), true);

  await page.locator('[data-admin-tab="stages"]').click();
  await page.waitForSelector('[data-admin-panel="stages"]:not([hidden])');
  const frontSectionLabel = await frontSection.locator("[data-section-label]").inputValue();
  page.once("dialog", (dialog) => {
    assert.equal(dialog.message(), hierarchyEditorCopy.newGroupPrompt, "new-group prompt comes from the copy catalog");
    assert.equal(dialog.defaultValue(), frontSectionLabel, "new group suggestion remains the current section's data-backed name");
    dialog.accept("Grupo de teste");
  });
  await frontSection.locator("[data-split-hierarchy-section]").click();
  assert.ok((await page.locator("[data-group-label]").evaluateAll((nodes) => nodes.map((node) => node.value))).includes("Grupo de teste"), "group creation uses the authored prompt value");
  assert.equal(putCount, 0, "creating a local group does not save implicitly");
  await page.reload({ waitUntil: "networkidle" });
  await page.waitForSelector('[data-hierarchy-stage="finishes"] [data-hierarchy-group="cabinet-finishes"]');
  await page.locator('[data-admin-tab="stages"]').click();
  await page.waitForSelector('[data-admin-panel="stages"]:not([hidden])');
  const glassItem = page.locator('[data-hierarchy-item="tempered-glass"]');
  const glassLabel = await glassItem.locator("strong").textContent();
  page.once("dialog", (dialog) => {
    assert.equal(dialog.message(), hierarchyEditorCopy.newSectionPrompt, "new-section prompt comes from the copy catalog");
    assert.equal(dialog.defaultValue(), glassLabel, "new section suggestion remains the item data-backed label");
    dialog.accept("Vidro em seção nova");
  });
  await glassItem.locator("[data-split-hierarchy-item]").click();
  assert.equal(await page.locator('[data-hierarchy-section] [data-section-label]').evaluateAll((nodes) => nodes.map((node) => node.value).includes("Vidro em seção nova")), true, "section creation uses the authored prompt value");
  assert.equal(putCount, 0, "creating a local section does not save implicitly");
  await page.reload({ waitUntil: "networkidle" });
  await page.waitForSelector('[data-hierarchy-stage="finishes"] [data-hierarchy-group="cabinet-finishes"]');
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
  assert.equal(await page.locator(".stage-unassigned h2").textContent(), hierarchyEditorCopy.availableItemsHeading, "available item heading remains visible after an item is unassigned");
  assert.equal(await page.locator(".stage-unassigned button[data-place-hierarchy-item='tempered-glass']").textContent(), hierarchyEditorCopy.addItem, "pool action uses catalog copy");
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
  await page.locator('[data-admin-tab="stages"]').click();
  await page.waitForSelector('[data-admin-panel="stages"]:not([hidden])');
  const initialModule = page.locator('[data-initial-configurator-entity="module-01"]');
  const initialModuleBeforeSave = await initialModule.isChecked();
  await initialModule.setChecked(!initialModuleBeforeSave);
  assert.equal(putCount, 0, "initial configurator visibility remains an unsaved editor preference");
  await page.locator('[data-stage-label="finishes"]').fill("Acabamentos teste");
  await page.locator("#saveButton").click();
  await page.waitForFunction(() => document.getElementById("saveMessage").textContent.includes("Configuração compatível publicada"));
  assert.equal(putCount, 1, "legacy-equivalent edit performs one production-compatible PUT");
  assert.equal(lastPut.schemaVersion, "ConfiguratorAdministration2D 3.0", "admin never sends v5 to the current production endpoint");
  assert.equal(lastPut.initialState.entities["module-01"], !initialModuleBeforeSave, "explicit save publishes configurator visibility independently from viewer visibility");
  assert.equal(lastPut.stages.find((stage) => stage.id === "finishes").label, "Acabamentos teste", "representable stage edit survives safe v5 -> v3 projection");
  assert.equal(lastPut.materials.find((material) => material.id === "stone-existing").color, null, "explicit null material color survives safe admin save projection");
  assert.deepEqual(
    lastPut.stages.find((stage) => stage.id === "services").items,
    ["move-stone", "tempered-glass", "lighting-08"],
    "unrelated compatible save preserves the original v3 service item order"
  );

  await page.reload({ waitUntil: "networkidle" });
  await page.waitForSelector('[data-admin-panel="stages"]');
  await page.locator('[data-admin-tab="stages"]').click();
  await page.waitForSelector('[data-admin-panel="stages"]:not([hidden])');
  assert.equal(await page.locator('[data-initial-configurator-entity="module-01"]').isChecked(), !initialModuleBeforeSave, "reloaded Admin reads back the saved configurator visibility");
  assert.equal(current.initialState.entities["module-01"], !initialModuleBeforeSave, "mocked published state retains the explicit configurator visibility write");
  assert.equal(putCount, 1, "readback reload performs no additional write");

  const initialStageCount = await page.locator("[data-hierarchy-stage]").count();
  for (let stageIndex = initialStageCount; stageIndex < 12; stageIndex += 1) {
    page.once("dialog", (dialog) => {
      assert.equal(dialog.message(), hierarchyEditorCopy.newStagePrompt, "every stage creation uses the catalog prompt");
      dialog.accept(`Etapa de teste ${stageIndex}`);
    });
    await page.locator("#addStageButton").click();
  }
  assert.equal(await page.locator("[data-hierarchy-stage]").count(), 12, "the existing stage limit remains unchanged");
  await page.locator("#addStageButton").click();
  assert.equal(await page.locator("#saveMessage").textContent(), hierarchyEditorCopy.stageLimitValidation.replace("{limit}", "12"), "stage limit validation uses catalog copy");
  assert.equal(putCount, 1, "stage-limit validation does not write configuration");
  await page.reload({ waitUntil: "networkidle" });
  await page.waitForSelector('[data-hierarchy-stage="finishes"]');
  await page.locator('[data-admin-tab="stages"]').click();
  await page.waitForSelector('[data-admin-panel="stages"]:not([hidden])');

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
})().catch(async (error) => {
  console.error(error);
  try { await browser?.close(); } catch { /* Preserve the original test failure. */ }
  server.close();
  process.exitCode = 1;
});
