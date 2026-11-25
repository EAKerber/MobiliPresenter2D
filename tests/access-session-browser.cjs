const assert = require("node:assert/strict");
const fs = require("node:fs");
const http = require("node:http");
const path = require("node:path");
const { chromium } = require("playwright");

const accessScript = fs.readFileSync(path.join(__dirname, "../app/access/access.js"), "utf8");
const token = "synthetic-one-time-grant-token";
const redemptionBodies = [];
const server = http.createServer(async (request, response) => {
  const url = new URL(request.url, "http://127.0.0.1");
  if (url.pathname === "/access/") {
    response.writeHead(200, { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" });
    response.end(`<!doctype html><html><body><p id="accessStatus"></p><button id="confirmAccess" hidden>Confirmar acesso</button><script src="/access.js"></script></body></html>`);
    return;
  }
  if (url.pathname === "/access.js") {
    response.writeHead(200, { "Content-Type": "text/javascript; charset=utf-8", "Cache-Control": "no-store" });
    response.end(accessScript);
    return;
  }
  if (url.pathname === "/api/access/redeem" && request.method === "POST") {
    let body = "";
    for await (const chunk of request) body += chunk;
    redemptionBodies.push(JSON.parse(body));
    response.writeHead(200, { "Content-Type": "application/json", "Cache-Control": "no-store" });
    response.end(JSON.stringify({ ok: true }));
    return;
  }
  if (url.pathname === "/config/") {
    response.writeHead(200, { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" });
    response.end("<!doctype html><html><body>Configurador</body></html>");
    return;
  }
  response.writeHead(404);
  response.end();
});

async function main() {
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage();
    await page.goto(`http://127.0.0.1:${address.port}/access/#token=${encodeURIComponent(token)}`);
    const button = page.locator("#confirmAccess");
    await button.waitFor({ state: "visible" });

    const preInteraction = await page.evaluate(() => ({
      hash: window.location.hash,
      text: document.body.innerText,
      values: [...document.querySelectorAll("input,textarea")].map((element) => element.value),
    }));
    assert.equal(preInteraction.hash, "", "the one-time token is removed from history before the confirmation UI is shown");
    assert.equal(preInteraction.text.includes(token), false, "the token is never rendered as page text");
    assert.equal(preInteraction.values.some((value) => value.includes(token)), false, "the token is never rendered in a form field");
    const screenshot = await page.screenshot({ fullPage: true });
    assert.ok(screenshot.length > 0, "the token-free page state can be captured");

    await button.click();
    await page.waitForURL("**/config/");
    assert.deepEqual(redemptionBodies, [{ token }], "the token is sent only to the same-origin redemption endpoint");
    assert.equal(new URL(page.url()).hash, "");
    console.log("access invitation token-free browser state: PASS");
  } finally {
    await browser.close();
    await new Promise((resolve) => server.close(resolve));
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
  server.close();
});
