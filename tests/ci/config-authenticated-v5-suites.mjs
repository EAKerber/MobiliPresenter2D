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
        const browserHttpFailures = [];
        probe.on("pageerror", error => pageErrorClasses.push(error.name || "Error"));
        probe.on("response", response => {
          if (response.status() >= 400 && browserHttpFailures.length < 10) {
            let pathname = null;
            try { pathname = new URL(response.url()).pathname; } catch {}
            browserHttpFailures.push({status: response.status(), pathname});
          }
        });
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
        report.browserHttpFailures = browserHttpFailures;
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
        const navStateLine = combined.split(/\r?\n/).find(line => line.includes("CI_AUTH_STAGE_NAV_STATE "));
        if (navStateLine) {
          try {
            const state = JSON.parse(
              navStateLine.slice(navStateLine.indexOf("CI_AUTH_STAGE_NAV_STATE ") + "CI_AUTH_STAGE_NAV_STATE ".length)
            );
            const allowedSteps = new Set(["modules", "finishes", "services", "summary"]);
            const safeRect = value => value && typeof value === "object" ? Object.fromEntries(
              ["x", "y", "width", "height"].filter(key => Number.isFinite(value[key])).map(key => [key, value[key]])
            ) : null;
            const safeStep = value => allowedSteps.has(value) ? value : null;
            const safeElement = value => value && typeof value === "object" ? {
              tag: typeof value.tag === "string" ? value.tag.slice(0, 24) : null,
              id: typeof value.id === "string" && /^[a-zA-Z0-9_-]{1,80}$/.test(value.id) ? value.id : null,
              className: typeof value.className === "string" ? value.className.slice(0, 80) : null
            } : null;
            const safeViewport = state.viewport && typeof state.viewport === "object" ? Object.fromEntries(
              ["width", "height", "scrollY"].filter(key => Number.isFinite(state.viewport[key])).map(key => [key, state.viewport[key]])
            ) : null;
            const safeLayoutNode = value => value && typeof value === "object" ? {
              tag: typeof value.tag === "string" ? value.tag.slice(0,24) : null,
              className: typeof value.className === "string" ? value.className.slice(0,80) : null,
              connected: value.connected === true,
              display: typeof value.display === "string" ? value.display.slice(0,24) : null,
              visibility: typeof value.visibility === "string" ? value.visibility.slice(0,24) : null,
              position: typeof value.position === "string" ? value.position.slice(0,24) : null,
              width: typeof value.width === "string" ? value.width.slice(0,32) : null,
              height: typeof value.height === "string" ? value.height.slice(0,32) : null,
              minHeight: typeof value.minHeight === "string" ? value.minHeight.slice(0,32) : null,
              gridTemplateRows: typeof value.gridTemplateRows === "string" ? value.gridTemplateRows.slice(0,120) : null,
              gridAutoRows: typeof value.gridAutoRows === "string" ? value.gridAutoRows.slice(0,32) : null,
              gridAutoFlow: typeof value.gridAutoFlow === "string" ? value.gridAutoFlow.slice(0,24) : null,
              contentVisibility: typeof value.contentVisibility === "string" ? value.contentVisibility.slice(0,24) : null,
              contain: typeof value.contain === "string" ? value.contain.slice(0,32) : null,
              overflow: typeof value.overflow === "string" ? value.overflow.slice(0,32) : null,
              clientRectCount: Number.isInteger(value.clientRectCount) ? value.clientRectCount : null,
              rect: safeRect(value.rect),
              offsetParentTag: typeof value.offsetParentTag === "string" ? value.offsetParentTag.slice(0,24) : null,
              childCount: Number.isInteger(value.childCount) ? value.childCount : null
            } : null;
            result.failureSignals.stageNavigation = {
              suite: ["keyboard", "flow"].includes(state.suite) ? state.suite : null,
              currentStep: safeStep(state.currentStep),
              navVisible: state.navVisible === true,
              navDisplay: typeof state.navDisplay === "string" ? state.navDisplay.slice(0, 24) : null,
              navGridColumns: typeof state.navGridColumns === "string" ? state.navGridColumns.slice(0, 120) : null,
              viewport: safeViewport,
              navRect: safeRect(state.navRect),
              buttons: Array.isArray(state.buttons) ? state.buttons.slice(0, 8).map(button => ({
                step: safeStep(button.step),
                current: ["step", "false"].includes(button.current) ? button.current : null,
                hidden: button.hidden === true,
                disabled: button.disabled === true,
                display: typeof button.display === "string" ? button.display.slice(0, 24) : null,
                visibility: typeof button.visibility === "string" ? button.visibility.slice(0, 24) : null,
                position: typeof button.position === "string" ? button.position.slice(0, 24) : null,
                computedWidth: typeof button.computedWidth === "string" ? button.computedWidth.slice(0, 32) : null,
                computedHeight: typeof button.computedHeight === "string" ? button.computedHeight.slice(0, 32) : null,
                minWidth: typeof button.minWidth === "string" ? button.minWidth.slice(0, 32) : null,
                minHeight: typeof button.minHeight === "string" ? button.minHeight.slice(0, 32) : null,
                gridColumn: typeof button.gridColumn === "string" ? button.gridColumn.slice(0, 32) : null,
                gridRow: typeof button.gridRow === "string" ? button.gridRow.slice(0, 32) : null,
                clientRectCount: Number.isInteger(button.clientRectCount) ? button.clientRectCount : null,
                rect: safeRect(button.rect)
              })) : [],
              target: state.target && typeof state.target === "object" ? {
                current: ["step", "false"].includes(state.target.current) ? state.target.current : null,
                hidden: state.target.hidden === true,
                disabled: state.target.disabled === true,
                display: typeof state.target.display === "string" ? state.target.display.slice(0, 24) : null,
                visibility: typeof state.target.visibility === "string" ? state.target.visibility.slice(0, 24) : null,
                position: typeof state.target.position === "string" ? state.target.position.slice(0, 24) : null,
                computedWidth: typeof state.target.computedWidth === "string" ? state.target.computedWidth.slice(0, 32) : null,
                computedHeight: typeof state.target.computedHeight === "string" ? state.target.computedHeight.slice(0, 32) : null,
                minHeight: typeof state.target.minHeight === "string" ? state.target.minHeight.slice(0, 32) : null,
                gridColumn: typeof state.target.gridColumn === "string" ? state.target.gridColumn.slice(0, 32) : null,
                gridRow: typeof state.target.gridRow === "string" ? state.target.gridRow.slice(0, 32) : null,
                clientRectCount: Number.isInteger(state.target.clientRectCount) ? state.target.clientRectCount : null,
                rect: safeRect(state.target.rect),
                centerHit: safeElement(state.target.centerHit)
              } : null,
              activeElement: safeElement(state.activeElement),
              activeInputType: typeof state.activeElement?.inputType === "string" ? state.activeElement.inputType.slice(0, 16) : null,
              keyEvents: Array.isArray(state.keyEvents) ? state.keyEvents.slice(0, 4).map(event => ({
                defaultPrevented: event.defaultPrevented === true,
                targetTag: typeof event.targetTag === "string" ? event.targetTag.slice(0, 24) : null,
                targetType: typeof event.targetType === "string" ? event.targetType.slice(0, 16) : null,
                activeStage: safeStep(event.activeStage)
              })) : [],
              layoutProfile: ["wide","stacked","compact"].includes(state.layoutProfile) ? state.layoutProfile : null,
              nodeChain: Array.isArray(state.nodeChain) ? state.nodeChain.slice(0,5).map(node => ({
                tag: typeof node.tag === "string" ? node.tag.slice(0,24) : null,
                id: typeof node.id === "string" && /^[a-zA-Z0-9_-]{1,80}$/.test(node.id) ? node.id : null,
                className: typeof node.className === "string" ? node.className.slice(0,80) : null,
                display: typeof node.display === "string" ? node.display.slice(0,24) : null,
                visibility: typeof node.visibility === "string" ? node.visibility.slice(0,24) : null,
                width: Number.isFinite(node.width) ? node.width : null,
                height: Number.isFinite(node.height) ? node.height : null,
                minHeight: typeof node.minHeight === "string" ? node.minHeight.slice(0,32) : null,
                contentVisibility: typeof node.contentVisibility === "string" ? node.contentVisibility.slice(0,24) : null,
                position: typeof node.position === "string" ? node.position.slice(0,24) : null,
                zoom: typeof node.zoom === "string" ? node.zoom.slice(0,24) : null,
                transform: typeof node.transform === "string" ? node.transform.slice(0,48) : null,
                childCount: Number.isInteger(node.childCount) ? node.childCount : null
              })) : [],
              layoutProbe: state.layoutProbe && typeof state.layoutProbe === "object" ? {
                nav: safeLayoutNode(state.layoutProbe.nav),
                existing: safeLayoutNode(state.layoutProbe.existing),
                probes: Array.isArray(state.layoutProbe.probes) ? state.layoutProbe.probes.slice(0,3).map(item => ({
                  location: ["nav","controls","body"].includes(item.location) ? item.location : null,
                  parent: safeLayoutNode(item.parent), button: safeLayoutNode(item.button)
                })) : [],
                stylesheets: Array.isArray(state.layoutProbe.stylesheets) ? state.layoutProbe.stylesheets.slice(0,16).map(sheet => ({
                  path: ["/styles.css","/config/styles.css","/ui-theme.css","/config/ui-theme.css"].includes(sheet.path) ? sheet.path : null,
                  disabled: sheet.disabled === true,
                  hasFlowStepRule: sheet.hasFlowStepRule === true
                })) : []
              } : null,
              modulesPanelHidden: state.modulesPanelHidden === true
            };
          } catch {}
        }
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
    browserHttpFailures: report.browserHttpFailures || [],
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
