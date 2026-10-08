"use strict";
const assert = require("node:assert/strict");
const fs = require("node:fs");
const http = require("node:http");
const path = require("node:path");
const { chromium } = require("playwright");
const root = path.resolve(__dirname, "..");
const appRoot = path.join(root, "app");
const configuration = require("../app/core/configuration.js");
const administrationV5 = require("../app/core/administration-v5.js");
const flow = require("../app/core/flow-model.js");
const defaults = require("../app/data/configurator-settings.js");
const hierarchyDefaults = require("../app/data/hierarchy-defaults.js");
const catalog = require("../app/data/catalog-data.js");
const priceBook = require("../app/data/mock-price-book.js");
const scene = require("../app/data/scene-data.js");

let current = administrationV5.upgrade(
  configuration.createDefaultAdministration(defaults, catalog, priceBook, scene),
  configuration, flow, catalog, priceBook, scene, hierarchyDefaults
);
let putCount = 0;
let lastPut = null;
let forceConflict = false;
let wrongReadback = false;
let tamperNextReadback = false;
const stub = [
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

function adminPage() {
  const html = fs.readFileSync(path.join(appRoot, "admin.html"), "utf8");
  const tag = '<script type="module" src="admin/admin.bundle.js?v=admin-pricing-v3"></script>';
  assert(html.includes(tag));
  return html.replace(tag,
    '<script type="importmap">{"imports":{"@netlify/identity":"/__identity_stub__.js"}}</script><script type="module" src="admin/admin.js"></script>');
}
const server = http.createServer(async (req, res) => {
  const target = new URL(req.url, "http://127.0.0.1");
  function json(body, status = 200) {
    res.writeHead(status, { "Content-Type": "application/json", "Cache-Control": "no-store" });
    res.end(JSON.stringify(body));
  }
  if (target.pathname === "/__identity_stub__.js") {
    res.writeHead(200, { "Content-Type": "text/javascript" });
    res.end(stub);
    return;
  }
  if (target.pathname === "/api/configuration") {
    if (req.method === "GET") {
      if (wrongReadback && tamperNextReadback) {
        tamperNextReadback = false;
        json({ ...current, revision: current.revision + 7 });
      } else json(current);
      return;
    }
    if (req.method === "PUT") {
      let body = "";
      for await (const chunk of req) body += chunk;
      lastPut = JSON.parse(body);
      putCount++;
      if (forceConflict || lastPut.revision !== current.revision) {
        json({ error: "revision_conflict" }, 409);
        return;
      }
      if (lastPut.schemaVersion !== administrationV5.SCHEMA) {
        json({ error: "schema_downgrade_forbidden" }, 409);
        return;
      }
      const problems = administrationV5.validate(lastPut, configuration, catalog, priceBook, scene);
      if (problems.length) {
        json({ error: "invalid_v5_configuration", message: problems[0] }, 422);
        return;
      }
      current = administrationV5.normalize({ ...lastPut, revision: current.revision + 1 });
      tamperNextReadback = wrongReadback;
      json(current);
      return;
    }
  }
  if (target.pathname === "/" || target.pathname === "/admin-test.html") {
    res.writeHead(200, { "Content-Type": "text/html" });
    res.end(adminPage());
    return;
  }
  const relative = decodeURIComponent(target.pathname).replace(/^\/+/, "");
  const filePath = path.resolve(appRoot, relative);
  if (!filePath.startsWith(appRoot + path.sep) || !fs.existsSync(filePath) || !fs.statSync(filePath).isFile()) {
    res.writeHead(404);res.end("not found");return;
  }
  const type = filePath.endsWith(".js") ? "text/javascript" : filePath.endsWith(".css") ? "text/css" : "application/octet-stream";
  res.writeHead(200, { "Content-Type": type, "Cache-Control": "no-store" });
  fs.createReadStream(filePath).pipe(res);
});

async function main() {
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const base = "http://127.0.0.1:" + server.address().port;
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage({ viewport: { width: 1366, height: 900 } });
    const errors = [];
    page.on("pageerror", (err) => errors.push(err.message));
    await page.goto(base + "/admin-test.html", { waitUntil: "networkidle" });
    await page.waitForSelector('[data-hierarchy-stage="finishes"] [data-hierarchy-group="cabinet-finishes"]');

    assert.equal(await page.locator("#persistHandlesButton").isHidden(), true, "v3-only repair action must stay hidden for v5");
    await page.locator('[data-admin-tab="pricing"]').click();
    const cocoa = page.locator('input[data-price-role="frontFinishAdjustment"][data-price-id="cocoa"]');
    const type = page.locator('[data-price-rule-type][data-price-role="frontFinishAdjustment"][data-price-id="cocoa"]');
    await type.selectOption("amount");
    await cocoa.fill("12.34");
    await cocoa.press("Tab");
    await page.locator("#saveButton").click();
    await page.waitForFunction(() => document.querySelector("#saveMessage")?.textContent.includes("v5 publicada e verificada"));
    assert.equal(lastPut.schemaVersion, administrationV5.SCHEMA, "native v5 payload, never flattened");
    assert.equal(lastPut.pricing.roles.frontFinishAdjustment.cocoa.type, "amount");
    assert.equal(current.pricing.roles.frontFinishAdjustment.cocoa.cents, 1234);
    assert.equal(putCount, 1);
    assert.equal(await page.locator("#persistHandlesButton").isHidden(), true);
    assert.equal(await page.locator("#revisionLabel").textContent(), "Versão " + current.revision + " · editor hierárquico");

    await page.locator('[data-admin-tab="stages"]').click();
    await page.locator('[data-move-hierarchy-group="finishes|stone|-1"]').click();
    await page.locator("#saveButton").click();
    await page.waitForFunction(() => document.querySelector("#saveMessage")?.textContent.includes("v5 publicada e verificada"));
    assert.equal(current.stages.find((s) => s.id === "finishes").groups[0].id, "stone",
      "v5 structural editing persists without projecting to v3");
    assert.equal(putCount, 2);
    assert.equal(current.pricing.roles.frontFinishAdjustment.cocoa.type, "amount");

    await page.locator('[data-stage-label="finishes"]').fill("Acabamentos rejeitados");
    forceConflict = true;
    await page.locator("#saveButton").click();
    await page.waitForFunction(() => document.querySelector("#saveMessage")?.textContent.includes("Recarregue o painel"));
    assert.equal(putCount, 3);
    assert.equal(current.stages.find((s) => s.id === "finishes").label !== "Acabamentos rejeitados", true);
    forceConflict = false;

    await page.reload({ waitUntil: "networkidle" });
    await page.waitForSelector('[data-stage-label="finishes"]');
    wrongReadback = true;
    await page.locator('[data-stage-label="finishes"]').fill("Publicação sem confirmação");
    await page.locator("#saveButton").click();
    await page.waitForFunction(() => document.querySelector("#saveMessage")?.textContent.includes("releitura v5 não corresponde"));
    assert.equal(putCount, 4);
    assert.notEqual((await page.locator("#saveMessage").getAttribute("data-kind")), "success",
      "readback mismatch may not be reported as success");
    assert.deepEqual(errors, [], "v5 admin Save fixture has no uncaught browser errors");
    await page.close();
    console.log("admin native v5 browser save: PASS");
  } finally {
    await browser.close();
    await new Promise((resolve) => server.close(resolve));
  }
}
main().catch((err) => { console.error(err); process.exitCode = 1; server.close(); });
