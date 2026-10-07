const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('playwright');

function parseBrl(text) {
  const normalized = String(text || '').replace(/[^0-9,.-]/g, '').replace(/\./g, '').replace(',', '.');
  const value = Number(normalized);
  if (!Number.isFinite(value)) throw new Error(`invalid BRL value: ${text}`);
  return Math.round(value * 100);
}

function createV5BuyerFixture() {
  const repoRoot = path.resolve(__dirname, '..');
  const appRoot = path.join(repoRoot, 'app');
  const vm = require('node:vm');
  const sandbox = { window: {} };
  vm.createContext(sandbox);
  ['data/scene-data.js', 'data/catalog-data.js', 'data/mock-price-book.js'].forEach(relativePath => {
    vm.runInContext(fs.readFileSync(path.join(appRoot, relativePath), 'utf8'), sandbox, { filename: relativePath });
  });
  const scene = sandbox.window.CASA_EM_MODULOS_SCENE;
  const catalog = sandbox.window.CASA_EM_MODULOS_CATALOG;
  const priceBook = sandbox.window.CASA_EM_MODULOS_PRICE_BOOK;
  const defaults = require(path.join(appRoot, 'data/configurator-settings.js'));
  const hierarchyDefaults = require(path.join(appRoot, 'data/hierarchy-defaults.js'));
  const configuration = require(path.join(appRoot, 'core/configuration.js'));
  const flow = require(path.join(appRoot, 'core/flow-model.js'));
  const v5 = require(path.join(appRoot, 'core/administration-v5.js'));
  const legacy = configuration.createDefaultAdministration(defaults, catalog, priceBook, scene);
  const candidate = v5.upgrade(legacy, configuration, flow, catalog, priceBook, scene, hierarchyDefaults);
  candidate.stages.find(stage => stage.id === 'modules').label = 'Módulos v5';
  candidate.objects['module-01'].title = 'Módulo 01 v5';
  candidate.pricing.roles.itemBase['module-01'].cents += 1000;
  const errors = v5.validate(candidate, configuration, catalog, priceBook, scene);
  assert.deepEqual(errors, [], 'synthetic buyer v5 fixture remains schema-valid');
  return v5.normalize(candidate);
}

(async () => {
  const output = process.argv[2] || '/tmp/summary-pricing-browser';
  fs.mkdirSync(output, { recursive: true });
  const targetUrl = process.env.SUMMARY_PRICING_BROWSER_URL || 'https://mobilipresenter2d.netlify.app/';
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1366, height: 900 } });
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });

  let lastError;
  for (let attempt = 0; attempt < 18; attempt += 1) {
    try {
      await page.goto(targetUrl, { waitUntil: 'domcontentloaded', timeout: 15000 });
      await page.waitForFunction(() => {
        const debug = window.CASA_EM_MODULOS_DEBUG;
        const value = document.querySelector('#configurationValue strong')?.textContent || '';
        return Boolean(debug?.getState && /R\$/.test(value));
      }, null, { timeout: 6000 });
      lastError = null;
      break;
    } catch (error) {
      lastError = error;
      await page.waitForTimeout(3000);
    }
  }
  if (lastError) throw lastError;

  const valueText = () => page.locator('#configurationValue strong').textContent();
  const currentTotal = async () => parseBrl(await valueText());
  const waitTotalChange = before => page.waitForFunction(previous => {
    const text = document.querySelector('#configurationValue strong')?.textContent || '';
    return /R\$/.test(text) && text !== previous;
  }, before);
  const go = async stage => {
    await page.locator(`.flow-nav [data-step="${stage}"]`).click();
    await page.waitForFunction(id => document.querySelector(`.flow-nav [data-step="${id}"]`)?.getAttribute('aria-current') === 'step', stage);
  };
  const summarySnapshot = () => page.evaluate(() => ({
    totalText: document.querySelector('#summaryContent .price-state > strong')?.textContent || '',
    rows: Array.from(document.querySelectorAll('#summaryContent .price-state__breakdown > div')).map(row => ({
      label: row.querySelector('dt')?.textContent?.trim() || '',
      amount: row.querySelector('dd strong')?.textContent?.trim() || '',
      detail: row.querySelector('dd small')?.textContent?.trim() || ''
    })),
    modules: Array.from(document.querySelectorAll('#summaryContent .summary-list li')).map(item => item.textContent.trim()),
    note: document.querySelector('#summaryContent .summary-note')?.textContent?.trim() || ''
  }));
  const visibleModuleCount = () => page.evaluate(() => {
    const resolved = window.CASA_EM_MODULOS_DEBUG.getVisibility();
    return window.CASA_EM_MODULOS_DEBUG.scene.entities.filter(entity => entity.kind === 'module' && resolved?.[entity.id]?.visible).length;
  });

  const baselineTotal = await currentTotal();
  assert.ok(baselineTotal > 0, 'published estimate is visible in the persistent value');

  await go('summary');
  await page.waitForFunction(() => /R\$/.test(document.querySelector('#summaryContent .price-state > strong')?.textContent || ''));
  const baselineSummary = await summarySnapshot();
  assert.equal(parseBrl(baselineSummary.totalText), baselineTotal, 'summary total equals persistent composition total');
  assert.equal(baselineSummary.modules.length, await visibleModuleCount(), 'summary lists each visible module exactly once');
  assert.ok(baselineSummary.rows.some(row => row.label === 'Módulos'), 'summary exposes a modules subtotal');
  assert.ok(baselineSummary.note.includes('Pedra e serviços entram uma única vez'), 'summary states global-charge ownership');

  // The skirting service is the cleanest global-charge probe: its entire impact must occur once.
  await go('finishes');
  const skirting = page.locator('#stoneSkirtingToggle');
  await skirting.waitFor({ state: 'visible' });
  const initiallyChecked = await skirting.isChecked();
  if (!initiallyChecked) {
    const before = await valueText();
    await skirting.click();
    await waitTotalChange(before);
  }
  const totalWithSkirting = await currentTotal();

  await go('summary');
  const withSkirting = await summarySnapshot();
  const skirtingRows = withSkirting.rows.filter(row => row.label === 'Rodapé de pedra');
  assert.equal(skirtingRows.length, 1, 'stone skirting appears exactly once in the global breakdown');
  const skirtingCents = parseBrl(skirtingRows[0].amount);
  assert.ok(skirtingCents > 0, 'stone skirting exposes a positive global charge');
  assert.equal(parseBrl(withSkirting.totalText), totalWithSkirting, 'summary and persistent total remain synchronized with skirting on');

  await go('finishes');
  const beforeSkirtingOff = await valueText();
  await skirting.click();
  await waitTotalChange(beforeSkirtingOff);
  const totalWithoutSkirting = await currentTotal();
  assert.equal(totalWithSkirting - totalWithoutSkirting, skirtingCents, 'removing skirting subtracts exactly its single global breakdown row');

  await go('summary');
  const withoutSkirting = await summarySnapshot();
  assert.equal(withoutSkirting.rows.filter(row => row.label === 'Rodapé de pedra').length, 0, 'skirting row disappears when the service is off');
  assert.equal(parseBrl(withoutSkirting.totalText), totalWithoutSkirting, 'summary total follows the skirting toggle');

  // Restore the user-visible state and prove exact round-trip of the total.
  await go('finishes');
  await skirting.click();
  await page.waitForFunction(expected => {
    const text = document.querySelector('#configurationValue strong')?.textContent || '';
    const normalized = text.replace(/[^0-9,.-]/g, '').replace(/\./g, '').replace(',', '.');
    return Math.round(Number(normalized) * 100) === expected;
  }, totalWithSkirting);
  assert.equal(await currentTotal(), totalWithSkirting, 'restoring skirting restores the exact prior total');

  // A priced stone package is also global and must appear only once, never once per module.
  const cloud = page.locator('[data-stone-package-id="stone-cloud"]');
  if (await cloud.count() && await cloud.isVisible()) {
    const previousStoneId = await page.evaluate(() => window.CASA_EM_MODULOS_DEBUG.getState().globalSelections?.stonePackageId || null);
    await cloud.click();
    await page.waitForFunction(() => window.CASA_EM_MODULOS_DEBUG.getState().globalSelections?.stonePackageId === 'stone-cloud');
    await go('summary');
    const cloudSummary = await summarySnapshot();
    assert.equal(cloudSummary.rows.filter(row => row.label === 'Clara mineral').length, 1, 'selected priced stone appears exactly once in the global breakdown');
    assert.equal(parseBrl(cloudSummary.totalText), await currentTotal(), 'stone selection keeps summary and persistent total synchronized');

    if (previousStoneId && previousStoneId !== 'stone-cloud') {
      await go('finishes');
      const previous = page.locator(`[data-stone-package-id="${previousStoneId}"]`);
      if (await previous.count() && await previous.isVisible()) {
        await previous.click();
        await page.waitForFunction(id => window.CASA_EM_MODULOS_DEBUG.getState().globalSelections?.stonePackageId === id, previousStoneId);
      }
    }
  }

  // Restore the original skirting state when production/default administration had it disabled.
  if (!initiallyChecked) {
    await go('finishes');
    if (await skirting.isChecked()) await skirting.click();
  }

  assert.deepEqual(errors, [], 'browser console must remain clean');
  await go('summary');
  await page.screenshot({ path: path.join(output, 'summary-pricing.png'), fullPage: true, animations: 'disabled' });

  const v5Fixture = createV5BuyerFixture();
  const v5Page = await browser.newPage({ viewport: { width: 1366, height: 900 } });
  const v5Errors = [];
  v5Page.on('pageerror', error => v5Errors.push(error.message));
  v5Page.on('console', message => { if (message.type() === 'error') v5Errors.push(message.text()); });
  await v5Page.route('**/api/configuration', route => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify(v5Fixture)
  }));
  await v5Page.goto(targetUrl, { waitUntil: 'domcontentloaded', timeout: 15000 });
  await v5Page.waitForFunction(() =>
    window.CASA_EM_MODULOS_DEBUG?.getNormalizedFlow?.().stages?.find(stage => stage.id === 'modules')?.label === 'Módulos v5'
  );
  const v5NavLabel = await v5Page.locator('.flow-nav [data-step="modules"] .flow-step__label').textContent();
  assert.equal(v5NavLabel, 'Módulos v5', 'buyer applies v5 stage copy instead of retaining v3/default flow');
  await v5Page.locator('[data-select-entity="module-01"]').first().click();
  await v5Page.waitForFunction(() => document.querySelector('#moduleDetail')?.textContent?.includes('Módulo 01 v5'));
  assert.ok((await v5Page.locator('#moduleDetail').textContent()).includes('Módulo 01 v5'), 'buyer applies v5 object content');
  const v5TotalText = await v5Page.locator('#configurationValue strong').textContent();
  assert.equal(parseBrl(v5TotalText), 875000, 'buyer consumes typed v5 pricing without legacy projection');
  assert.deepEqual(v5Errors, [], 'buyer v5 smoke has no console/page errors');
  await v5Page.close();

  const result = {
    status: 'PASS',
    targetUrl,
    baselineTotal,
    totalWithSkirting,
    totalWithoutSkirting,
    skirtingCents,
    baselineSummary,
    v5Buyer: { totalCents: 875000, modulesLabel: v5NavLabel }
  };
  fs.writeFileSync(path.join(output, 'result.json'), JSON.stringify(result, null, 2));
  await browser.close();
})().catch(error => {
  console.error(error);
  process.exit(1);
});
