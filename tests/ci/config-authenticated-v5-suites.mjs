import assert from "node:assert/strict";
import {randomUUID} from "node:crypto";
import {mkdtemp, chmod, rm} from "node:fs/promises";
import {tmpdir} from "node:os";
import {join} from "node:path";
import {spawnSync} from "node:child_process";
import pg from "pg";
import {chromium} from "playwright";
import {SUPABASE_DATABASE_CA} from "../../netlify/access/supabase-database-ca.mjs";
import {createOpaqueToken, hashOpaqueToken, ACCESS_COOKIE_NAME} from "../../netlify/access/tokens.mjs";
import {validateFixtureEnvironment, safeErrorClass, ISOLATION_TAG} from "./config-auth-isolation.mjs";

const suites = [
  {name: "mobile-pip", file: "tests/mobile-pip-main-browser.cjs", urlEnv: "MOBILE_INTERACTIONS_URL"},
  {name: "keyboard", file: "tests/keyboard-browser.cjs", urlEnv: "KEYBOARD_BROWSER_URL"},
  {name: "flow", file: "tests/flow-layout-browser.cjs", urlEnv: "FLOW_LAYOUT_URL"},
  {name: "summary-pricing", file: "tests/summary-pricing-browser.cjs", urlEnv: "SUMMARY_PRICING_BROWSER_URL"},
  {name: "stone", file: "tests/stone-browser.cjs", urlEnv: "STONE_BROWSER_URL"}
];
const origin = process.env.CI_STAGING_PREVIEW_ORIGIN;
const expectedHost = "deploy-preview-238--m2d-auth-ci-isolated.netlify.app";
const configUrl = new URL("/config/", expectedHost ? "https://" + expectedHost : origin).toString();
const reportPath = "artifacts/ci-baseline-01/authenticated-v5-suites.json";
const delay = milliseconds => new Promise(resolve => setTimeout(resolve, milliseconds));
const report = {
  schema: "M2DAuthenticatedV5Suites/1", classification: "BLOCKED_AUTH_FIXTURE",
  fixtureVerified: false, suites: {}, grantsRevoked: true, tokenReplayDenied: true,
  revokedSessionsRedirected: true
};
let db, browser;
await import("node:fs/promises").then(({mkdir}) => mkdir("artifacts/ci-baseline-01", {recursive: true}));

try {
  const gate = validateFixtureEnvironment({
    origin: process.env.CI_STAGING_ORIGIN,
    databaseUrl: process.env.CI_STAGING_DATABASE_URL,
    projectRef: process.env.CI_STAGING_SUPABASE_REF,
    expectedHost: process.env.CI_STAGING_EXPECTED_HOST,
    isolationTag: process.env.CI_STAGING_ISOLATION_TAG
  });
  assert.equal(origin, "https://" + expectedHost, "BLOCKED_AUTH_FIXTURE: preview origin is not the approved #238 deploy preview");
  assert.equal(process.env.CI_STAGING_PREVIEW_REVIEW_ID, "238",
    "BLOCKED_AUTH_FIXTURE: preview review ID is not the approved #238");
  report.stage = "preview-fixture-preflight";
  const markerUrl = new URL("/ci-validation/published-v5-status.json", origin);
  const markerDeadline = Date.now() + 180000;
  let marker = null;
  while (Date.now() < markerDeadline && !marker) {
    try {
      const response = await fetch(markerUrl, {signal: AbortSignal.timeout(5000)});
      if (response.status === 200) marker = await response.json();
    } catch {}
    if (!marker) await delay(5000);
  }
  assert.ok(marker, "BLOCKED_AUTH_FIXTURE: preview V5 marker did not become ready");
  assert.equal(marker.schema, "M2DPreviewPublishedFixtureStatus/1");
  assert.equal(marker.reviewId, 238);
  assert.equal(marker.verified, true);
  assert.equal(marker.sourceBranch, "ci/ci-baseline-01-isolated-auth-extraction-20261024");
  assert.equal(marker.v5Schema, "ConfiguratorAdministration2D 5.0");
  assert.match(marker.sha256 || "", /^[a-f0-9]{64}$/);
  report.fixtureVerified = true;
  report.fixtureSha256 = marker.sha256;
  report.previewReviewId = marker.reviewId;

  db = new pg.Client({
    connectionString: process.env.CI_STAGING_DATABASE_URL,
    ssl: {ca: SUPABASE_DATABASE_CA, rejectUnauthorized: true},
    connectionTimeoutMillis: 6000,
    application_name: "m2d-ci-authenticated-v5-suites"
  });
  await db.connect();
  const role = await db.query("select current_user as name");
  assert.equal(role.rows[0]?.name, "access_ci_fixture",
    "BLOCKED_AUTH_FIXTURE: database connection role is not access_ci_fixture");
  const functions = await db.query(
    "select to_regprocedure('access_control.ci_create_config_fixture_grant(uuid,text)') as create_fn, " +
    "to_regprocedure('access_control.ci_revoke_config_fixture_grant(uuid)') as revoke_fn"
  );
  assert.ok(functions.rows[0]?.create_fn && functions.rows[0]?.revoke_fn,
    "BLOCKED_AUTH_FIXTURE: fixture functions are absent");

  browser = await chromium.launch({headless: true});
  for (const suite of suites) {
    const grantId = randomUUID();
    const grantToken = createOpaqueToken();
    let context, tempDir, revoked = false;
    const result = {passed: false, revoked: false, tokenReplayDenied: false, revokedSessionRedirected: false, redeemStatus: null, replayStatus: null, revokedStatus: null, revokedPath: null, failureLocation: null, childExitCode: null};
    try {
      await db.query("SELECT access_control.ci_create_config_fixture_grant($1::uuid,$2::text)",
        [grantId, hashOpaqueToken(grantToken)]);
      context = await browser.newContext({
        viewport: {width: 1366, height: 900}, serviceWorkers: "block"
      });
      const redeem = await context.request.post(new URL("/api/access/redeem", origin).toString(), {
        headers: {Origin: origin, "Content-Type": "application/json"},
        data: {token: grantToken}, timeout: 15000
      });
      result.redeemStatus = redeem.status();
      assert.equal(redeem.status(), 200, "Access redeem rejected the short-lived V5 suite grant");
      const redeemBody = await redeem.json();
      assert.equal(redeemBody?.ok, true);
      const cookies = await context.cookies(origin);
      assert.ok(cookies.some(cookie => cookie.name === ACCESS_COOKIE_NAME),
        "BLOCKED_AUTH_FIXTURE: redeem did not establish the scoped session cookie");
      const buyerResponse = await context.request.get(new URL("/api/buyer-configuration", origin).toString(), {timeout: 15000});
      result.buyerConfigurationStatus = buyerResponse.status();
      assert.equal(buyerResponse.status(), 200,
        "BLOCKED_AUTH_FIXTURE: authenticated preview buyer configuration endpoint is unavailable");
      if (!report.browserBootstrap) {
        const probe = await context.newPage();
        const pageErrorClasses = [];
        probe.on("pageerror", error => pageErrorClasses.push(error.name || "Error"));
        await probe.goto(new URL("/config/", origin).toString(), {waitUntil: "domcontentloaded", timeout: 20000});
        try {
          await probe.waitForFunction(() => ["validated", "invalid"].includes(document.documentElement.dataset.publishedConfigurationStatus), null, {timeout: 15000});
        } catch {}
        report.browserBootstrap = await probe.evaluate(() => ({
          publishedConfigurationStatus: document.documentElement.dataset.publishedConfigurationStatus || null,
          publishedConfigurationErrorPresent: Boolean(document.querySelector(".published-config-error")),
          workspaceHidden: Boolean(document.querySelector(".workspace")?.hidden)
        }));
        report.browserPageErrorClasses = [...new Set(pageErrorClasses)].slice(0, 5);
        await probe.close();
        assert.equal(report.browserBootstrap.publishedConfigurationStatus, "validated",
          "BLOCKED_AUTH_FIXTURE: authenticated browser could not apply published V5 configuration");
      }

      tempDir = await mkdtemp(join(tmpdir(), "m2d-auth-v5-"));
      await chmod(tempDir, 0o700);
      const statePath = join(tempDir, "playwright-state.json");
      await context.storageState({path: statePath});
      await chmod(statePath, 0o600);
      const target = new URL("/config/", origin).toString();
      const childEnv = {
        PATH: process.env.PATH, HOME: process.env.HOME, CI: "true",
        NODE_PATH: "/tmp/m2d-ci-config-auth/node_modules",
        PLAYWRIGHT_BROWSERS_PATH: process.env.PLAYWRIGHT_BROWSERS_PATH,
        PLAYWRIGHT_AUTH_STATE_FILE: statePath, CI_EXPECT_PUBLISHED_V5: "1",
        [suite.urlEnv]: target
      };
      const child = spawnSync(process.execPath, [suite.file, join(tempDir, "output")], {
        cwd: process.cwd(), env: childEnv, encoding: "utf8", timeout: 180000, maxBuffer: 2 * 1024 * 1024
      });
      const passed = child.status === 0 && !child.error;
      let errorClass = null;
      let combined = "";
      if (!passed) {
        combined = String(child.stderr || "") + "\n" + String(child.stdout || "");
        errorClass = child.error?.code === "ETIMEDOUT" || child.signal === "SIGTERM"
          ? "SUITE_TIMEOUT"
          : /Timeout|timed out/i.test(combined)
            ? "PLAYWRIGHT_TIMEOUT"
            : "SUITE_ASSERTION_OR_RUNTIME_FAILURE";
        result.failureSignals = {
          timeoutMs: [...combined.matchAll(/Timeout ([0-9]+)ms exceeded/gi)].map(match => Number(match[1])).slice(0, 5),
          consoleHttpStatuses: [...combined.matchAll(/server responded with a status of ([0-9]{3})/gi)].map(match => Number(match[1])).slice(0, 10),
          networkErrorCodes: [...combined.matchAll(/net::(ERR_[A-Z0-9_]+)/g)].map(match => match[1]).slice(0, 10)
        };
      }
      result.passed = passed;
      result.errorClass = errorClass;
      result.childExitCode = child.status ?? null;
      const location = combined.match(/tests[^\s)]+\.cjs:\d+:\d+/);
      result.failureLocation = location ? location[0].replaceAll("\\", "/") : null;
      result.targetPath = "/config/";
    } catch (error) {
      result.errorClass = safeErrorClass(error);
    } finally {
      try {
        const revoke = await db.query(
          "SELECT access_control.ci_revoke_config_fixture_grant($1::uuid) AS revoked", [grantId]
        );
        revoked = revoke.rows[0]?.revoked === true;
        assert.equal(revoked, true, "Fixture grant was not revoked");
        result.revoked = true;
        const replay = await fetch(new URL("/api/access/redeem", origin), {
          method: "POST",
          headers: {Origin: origin, "Content-Type": "application/json"},
          body: JSON.stringify({token: grantToken})
        });
        result.replayStatus = replay.status;
        result.tokenReplayDenied = [400, 401, 403].includes(replay.status);
        assert.equal(result.tokenReplayDenied, true, "Revoked fixture token was accepted for replay");
        if (context) {
          const page = await context.newPage();
          const response = await page.goto(configUrl, {waitUntil: "domcontentloaded", timeout: 20000});
          result.revokedStatus = response?.status() ?? null;
          result.revokedPath = new URL(page.url()).pathname;
          result.revokedSessionRedirected =
            result.revokedPath === "/access/" && result.revokedStatus === 200;
          assert.equal(result.revokedSessionRedirected, true,
            "Revoked browser session still reached protected Config");
        }
      } catch (error) {
        result.errorClass = result.errorClass || safeErrorClass(error);
      }
      if (!revoked) report.grantsRevoked = false;
      if (!result.tokenReplayDenied) report.tokenReplayDenied = false;
      if (context && !result.revokedSessionRedirected) report.revokedSessionsRedirected = false;
      report.suites[suite.name] = result;
      try { await context?.close(); } catch {}
      if (tempDir) try { await rm(tempDir, {recursive: true, force: true}); } catch {}
    }
  }
  report.stage = "complete";
  const allPassed = suites.every(suite => report.suites[suite.name]?.passed === true);
  assert.equal(report.grantsRevoked, true, "One or more fixture grants could not be revoked");
  assert.equal(report.tokenReplayDenied, true, "One or more revoked tokens could be replayed");
  assert.equal(report.revokedSessionsRedirected, true, "One or more revoked sessions still reached Config");
  assert.equal(allPassed, true, "One or more authenticated V5 browser suites failed");
  report.classification = "AUTHENTICATED_V5_SUITES_PASS";
  console.log("CI_AUTHENTICATED_V5_SUITES_PASS " + JSON.stringify({
    fixtureVerified: report.fixtureVerified, suites: report.suites,
    grantsRevoked: report.grantsRevoked, tokenReplayDenied: report.tokenReplayDenied,
    revokedSessionsRedirected: report.revokedSessionsRedirected
  }));
} catch (error) {
  report.errorClass = safeErrorClass(error);
  report.classification = report.stage === "preview-fixture-preflight" || report.stage === undefined
    ? "BLOCKED_AUTH_FIXTURE" : "AUTHENTICATED_V5_SUITES_FAIL";
  console.error(report.classification + " stage=" + (report.stage || "preflight") + " errorClass=" + report.errorClass);
  if (report.suites) console.error("AUTHENTICATED_V5_SUITES_RESULT " + JSON.stringify({
    fixtureVerified: report.fixtureVerified,
    browserBootstrap: report.browserBootstrap || null,
    browserPageErrorClasses: report.browserPageErrorClasses || [],
    suites: Object.fromEntries(Object.entries(report.suites).map(([name, suite]) => [name, {
      passed: suite.passed === true,
      revoked: suite.revoked === true,
      replayDenied: suite.tokenReplayDenied === true,
      revokedSessionRedirected: suite.revokedSessionRedirected === true,
      redeemStatus: suite.redeemStatus,
      buyerConfigurationStatus: suite.buyerConfigurationStatus ?? null,
      replayStatus: suite.replayStatus,
      revokedStatus: suite.revokedStatus,
      revokedPath: suite.revokedPath,
      childExitCode: suite.childExitCode,
      failureLocation: suite.failureLocation,
      failureSignals: suite.failureSignals || null,
      errorClass: suite.errorClass || null
    }]))
  }));
  process.exitCode = 1;
} finally {
  try { await browser?.close(); } catch {}
  try { await db?.end(); } catch {}
  const {writeFile} = await import("node:fs/promises");
  await writeFile(reportPath, JSON.stringify(report, null, 2) + "\n", {mode: 0o600});
}
