const assert = require("node:assert/strict");
const fs = require("node:fs");
const http = require("node:http");
const path = require("node:path");
const { chromium } = require("playwright");

const menuSource = fs.readFileSync(path.join(__dirname, "../app/core/private-navigation.js"), "utf8");
let logoutRequests = 0;
const server = http.createServer((request, response) => {
  const target = new URL(request.url, "http://127.0.0.1");
  if (target.pathname === "/access/") {
    response.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
    response.end(`<!doctype html><html><head><script type="importmap">{"imports":{"@netlify/identity":"/identity.js"}}</script></head><body>
      <header data-private-header><button data-private-menu-toggle aria-expanded="false">Menu</button>
      <nav data-private-menu hidden><div data-private-links></div><div data-private-account hidden>
      <p data-private-email></p><button id="logoutButton" data-private-logout="" hidden>Sair</button></div></nav></header>
      <script type="module" src="/private-navigation.js"></script></body></html>`);
    return;
  }
  if (target.pathname === "/identity.js") {
    response.writeHead(200, { "Content-Type": "text/javascript; charset=utf-8" });
    response.end('export async function getUser(){return null} export async function logout(){} export function onAuthChange(){}');
    return;
  }
  if (target.pathname === "/private-navigation.js") {
    response.writeHead(200, { "Content-Type": "text/javascript; charset=utf-8" });
    response.end(menuSource);
    return;
  }
  if (target.pathname === "/api/access/session") {
    const authenticated = (request.headers.cookie || "").includes("synthetic_session=active");
    response.writeHead(200, { "Content-Type": "application/json", "Cache-Control": "no-store" });
    response.end(JSON.stringify({ authenticated, ...(authenticated ? { email: "fixture@example.test", accessType: "temporary" } : {}) }));
    return;
  }
  if (target.pathname === "/api/access/session/logout") {
    logoutRequests += 1;
    if (logoutRequests === 1) {
      // A gateway error never reaches the handler and does not clear the cookie.
      response.writeHead(503, { "Content-Type": "text/plain" });
      response.end("unavailable");
    } else {
      response.writeHead(200, { "Content-Type": "application/json", "Set-Cookie": "synthetic_session=; Max-Age=0; HttpOnly; Path=/" });
      response.end('{"ok":true}');
    }
    return;
  }
  response.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
  response.end("Public page");
});

async function main() {
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const origin = `http://127.0.0.1:${server.address().port}`;
  const browser = await chromium.launch({ headless: true });
  try {
    const context = await browser.newContext();
    await context.addCookies([{ name: "synthetic_session", value: "active", url: origin, httpOnly: true }]);
    const page = await context.newPage();
    await page.goto(`${origin}/access/`, { waitUntil: "networkidle" });
    await page.locator("[data-private-menu-toggle]").click();
    const button = page.locator("#logoutButton");
    await button.waitFor({ state: "visible" });
    await button.click();
    await page.getByRole("status").waitFor({ state: "visible" });
    assert.equal(new URL(page.url()).pathname, "/access/", "gateway failure does not redirect");
    assert.equal((await context.cookies()).some((cookie) => cookie.name === "synthetic_session"), true,
      "a gateway failure leaves the temporary cookie present");
    assert.equal(await button.isEnabled(), true, "failure can be retried");
    await button.click();
    await page.waitForURL(origin + "/");
    assert.equal((await context.cookies()).some((cookie) => cookie.name === "synthetic_session"), false,
      "successful logout clears the temporary cookie before redirect");
    assert.equal(logoutRequests, 2);
    await context.close();
    console.log("private temporary logout browser: PASS");
  } finally {
    await browser.close();
    await new Promise((resolve) => server.close(resolve));
  }
}
main().catch((error) => { console.error(error); process.exitCode = 1; server.close(); });
