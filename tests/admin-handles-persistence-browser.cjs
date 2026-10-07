const assert = require("node:assert/strict");
const fs = require("node:fs");
const http = require("node:http");
const path = require("node:path");
const vm = require("node:vm");
const { chromium } = require("playwright");

const repoRoot = path.resolve(__dirname, "..");
const appRoot = path.join(repoRoot, "app");
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
const repair = require(path.join(appRoot, "core/legacy-stage-repair.js"));

let current = configuration.createDefaultAdministration(defaults, catalog, priceBook, scene);
const finishes = current.stages.find((stage) => (stage.kind || stage.id) === "finishes");
finishes.items = finishes.items.filter((id) => id !== "handles-all");
current.revision = 12;

let putCount = 0;
let operationSeen = null;
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

function type(filePath) {
  if (filePath.endsWith(".html")) return "text/html; charset=utf-8";
  if (filePath.endsWith(".css")) return "text/css; charset=utf-8";
  if (filePath.endsWith(".js")) return "text/javascript; charset=utf-8";
  return "application/octet-stream";
}

function adminHarness() {
  const source = fs.readFileSync(path.join(appRoot, "admin.html"), "utf8");
  const moduleTag = '<script type="module" src="admin/admin.bundle.js?v=admin-pricing-v1"></script>';
  assert.equal(source.includes(moduleTag), true, "Puxadores harness expects the current admin bundle revision");
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
      operationSeen = request.headers["x-configuration-operation"] || null;
      lastPut = payload;

      if (payload.revision !== current.revision) {
        response.writeHead(409, { "Content-Type": "application/json; charset=utf-8" });
        response.end(JSON.stringify({ error: "revision_conflict" }));
        return;
      }
      if (operationSeen !== "persist-handles-all") {
        response.writeHead(422, { "Content-Type": "application/json; charset=utf-8" });
        response.end(JSON.stringify({ error: "missing_operation" }));
        return;
      }
      const delta = repair.verifyHandlesOnlyDelta(current, payload, configuration.SCHEMA);
      if (!delta.ok) {
        response.writeHead(422, { "Content-Type": "application/json; charset=utf-8" });
        response.end(JSON.stringify({ error: "invalid_handles_assignment", code: delta.code, message: delta.message }));
        return;
      }

      const normalized = configuration.normalizeConfiguratorSettings(payload, catalog, priceBook, scene);
      normalized.revision = current.revision + 1;
      current = normalized;
      response.writeHead(200, { "Content-Type": "application/json; charset=utf-8" });
      response.end(JSON.stringify(current));
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
  response.writeHead(200, { "Content-Type": type(filePath), "Cache-Control": "no-store" });
  fs.createReadStream(filePath).pipe(response);
});

(async () => {
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const baseUrl = "http://127.0.0.1:" + server.address().port;
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1366, height: 900 } });
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => { if (message.type() === "error") errors.push(message.text()); });

  await page.goto(baseUrl + "/admin-test.html", { waitUntil: "networkidle" });
  await page.waitForSelector("#persistHandlesButton:not([hidden])");
  assert.match(await page.locator("#saveMessage").textContent(), /Puxadores ainda não está atribuído/);
  assert.equal(await page.locator('[data-hierarchy-section="handles"]').count(), 0, "unpublished v3 does not pretend Puxadores is already a persisted section");

  await page.locator('[data-stage-label="finishes"]').fill("Acabamentos rascunho");
  page.once("dialog", async (dialog) => {
    assert.match(dialog.message(), /publicará somente Puxadores no schema v3/);
    await dialog.dismiss();
  });
  await page.locator("#persistHandlesButton").click();
  await page.waitForFunction(() => document.getElementById("saveMessage").textContent.includes("cancelada"));
  assert.equal(putCount, 0, "canceling the local-draft warning performs no PUT");
  assert.equal(await page.locator('[data-stage-label="finishes"]').inputValue(), "Acabamentos rascunho", "cancel keeps the local draft untouched");

  page.once("dialog", async (dialog) => {
    assert.match(dialog.message(), /outras alterações locais não serão publicadas/i);
    await dialog.accept();
  });
  await page.locator("#persistHandlesButton").click();
  await page.waitForFunction(() => document.getElementById("saveMessage").textContent.includes("Puxadores foi persistido"));
  assert.equal(putCount, 1, "confirming performs one isolated handles PUT");
  assert.equal(operationSeen, "persist-handles-all", "dedicated operation header is required");
  assert.equal(lastPut.schemaVersion, "ConfiguratorAdministration2D 3.0");
  assert.deepEqual(lastPut.stages.find((stage) => (stage.kind || stage.id) === "finishes").items, ["fronts-all", "handles-all", "stone-all", "stone-skirting"]);

  const beforeWithoutHandles = structuredClone(lastPut);
  beforeWithoutHandles.stages.find((stage) => (stage.kind || stage.id) === "finishes").items =
    beforeWithoutHandles.stages.find((stage) => (stage.kind || stage.id) === "finishes").items.filter((id) => id !== "handles-all");
  const sourceComparable = structuredClone(current);
  sourceComparable.revision = lastPut.revision;
  sourceComparable.stages.find((stage) => (stage.kind || stage.id) === "finishes").items =
    sourceComparable.stages.find((stage) => (stage.kind || stage.id) === "finishes").items.filter((id) => id !== "handles-all");
  assert.equal(await page.locator("#persistHandlesButton").isHidden(), true, "repair action disappears after readback");
  assert.equal(await page.locator('[data-hierarchy-section="handles"]').count(), 1, "readback now materializes Puxadores from the published v3 assignment");
  assert.equal(await page.locator('[data-stage-label="finishes"]').inputValue(), "Acabamentos", "confirmed isolated repair reloads the panel from published state instead of silently keeping unrelated local edits");
  assert.match(await page.locator("#saveMessage").textContent(), /outras alterações locais não foram enviadas/i);

  assert.deepEqual(errors, []);
  await browser.close();
  server.close();
  console.log("admin handles persistence browser: PASS");
})().catch((error) => {
  console.error(error);
  server.close();
  process.exitCode = 1;
});
