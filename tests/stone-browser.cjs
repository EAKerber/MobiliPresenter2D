const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {pathToFileURL} = require('node:url');
const {chromium} = require('playwright');

(async () => {
  const output = process.argv[2] || '/tmp/stone-browser';
  fs.mkdirSync(output, {recursive: true});
  const targetUrl = process.env.STONE_BROWSER_URL || pathToFileURL(path.resolve(__dirname, '../app/index.html')).href;
  const mode = process.env.STONE_BROWSER_URL ? 'deployed' : 'local';
  const browser = await chromium.launch({
    headless: true,
    args: mode === 'local' ? ['--allow-file-access-from-files'] : []
  });
  const page = await browser.newPage({viewport: {width: 1366, height: 900}});
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });

  async function openCurrentRuntime() {
    let lastError;
    for (let attempt = 0; attempt < 18; attempt += 1) {
      try {
        await page.goto(targetUrl, {waitUntil: 'domcontentloaded', timeout: 15000});
        await page.waitForFunction(() => {
          const defaults = window.CASA_EM_MODULOS_CONFIGURATOR_DEFAULTS;
          const finishes = defaults?.stages?.find(stage => stage.id === 'finishes');
          return Boolean(
            window.CASA_EM_MODULOS_DEBUG &&
            window.CASA_RUNTIME_CONTRACTS?.repairSkirtingStageContract &&
            finishes?.items?.includes('stone-skirting')
          );
        }, null, {timeout: 5000});
        await page.evaluate(() => Promise.all(Array.from(document.images, image => image.decode().catch(() => {}))));
        return;
      } catch (error) {
        lastError = error;
        if (mode === 'local') break;
        await page.waitForTimeout(3000);
      }
    }
    throw lastError;
  }

  await openCurrentRuntime();

  const settle = () => page.waitForTimeout(350);
  const screenshot = name => page.screenshot({path: path.join(output, `${name}.png`), fullPage: true, animations: 'disabled'});
  const state = () => page.evaluate(() => structuredClone(window.CASA_EM_MODULOS_DEBUG.getState()));
  const waitState = predicateSource => page.waitForFunction(source => {
    const current = window.CASA_EM_MODULOS_DEBUG.getState();
    return Function('state', `return (${source})(state)`)(current);
  }, predicateSource, {timeout: 10000});
  const canvasPixel = (id, x, y) => page.evaluate(([canvasId, px, py]) => {
    const canvas = document.getElementById(canvasId);
    return Array.from(canvas.getContext('2d').getImageData(px, py, 1, 1).data);
  }, [id, x, y]);
  const waitCanvasAlpha = (id, x, y, visible = true) => page.waitForFunction(([canvasId, px, py, expected]) => {
    const canvas = document.getElementById(canvasId);
    const alpha = canvas.getContext('2d').getImageData(px, py, 1, 1).data[3];
    return expected ? alpha > 0 : alpha === 0;
  }, [id, x, y, visible], {timeout: 20000});
  const waitCanvasAnyAlpha = id => page.waitForFunction(canvasId => {
    const canvas = document.getElementById(canvasId);
    const data = canvas.getContext('2d').getImageData(0, 0, canvas.width, canvas.height).data;
    for (let index = 3; index < data.length; index += 4) if (data[index] > 0) return true;
    return false;
  }, id, {timeout: 30000});
  const findAlphaPoint = (id, bounds) => page.evaluate(([canvasId, [x0, y0, x1, y1]]) => {
    const canvas = document.getElementById(canvasId);
    const ctx = canvas.getContext('2d');
    const width = x1 - x0;
    const height = y1 - y0;
    const data = ctx.getImageData(x0, y0, width, height).data;
    let bestPixel = -1;
    let bestAlpha = -1;
    for (let pixel = 0, index = 0; pixel < width * height; pixel += 1, index += 4) {
      const alpha = data[index + 3];
      if (alpha <= bestAlpha) continue;
      bestAlpha = alpha;
      bestPixel = pixel;
      if (alpha === 255) break;
    }
    if (bestPixel < 0 || bestAlpha <= 0) return null;
    return [x0 + (bestPixel % width), y0 + Math.floor(bestPixel / width), bestAlpha];
  }, [id, bounds]);
  const waitCanvasPixelChange = (id, x, y, before) => page.waitForFunction(([canvasId, px, py, previous]) => {
    const canvas = document.getElementById(canvasId);
    const pixel = Array.from(canvas.getContext('2d').getImageData(px, py, 1, 1).data);
    return pixel.some((value, index) => value !== previous[index]);
  }, [id, x, y, before], {timeout: 20000});
  const canvasStats = id => page.evaluate(canvasId => {
    const canvas = document.getElementById(canvasId);
    const data = canvas.getContext('2d').getImageData(0, 0, canvas.width, canvas.height).data;
    let nonzero = 0, minX = canvas.width, minY = canvas.height, maxX = -1, maxY = -1;
    let hash = 2166136261 >>> 0;
    for (let i = 0; i < data.length; i += 4) {
      const alpha = data[i + 3];
      if (!alpha) continue;
      nonzero += 1;
      const pixel = i >> 2;
      const x = pixel % canvas.width;
      const y = Math.floor(pixel / canvas.width);
      if (x < minX) minX = x; if (x > maxX) maxX = x;
      if (y < minY) minY = y; if (y > maxY) maxY = y;
      for (let channel = 0; channel < 4; channel += 1) {
        hash ^= data[i + channel];
        hash = Math.imul(hash, 16777619) >>> 0;
      }
    }
    return {
      nonzero,
      bbox: nonzero ? [minX, minY, maxX, maxY] : null,
      hash: hash.toString(16).padStart(8, '0')
    };
  }, id);

  await page.locator('[data-step="finishes"]').click();
  await settle();

  const defaultContract = await page.evaluate(() => {
    const finishes = window.CASA_EM_MODULOS_CONFIGURATOR_DEFAULTS.stages.find(stage => stage.id === 'finishes');
    const label = document.getElementById('stoneSkirtingToggle').closest('[data-configurable-item]');
    const handleField = document.querySelector('[data-configurable-item="handles-all"]');
    return {
      items: finishes.items,
      skirtingHidden: label.hidden,
      handlesHidden: handleField.hidden
    };
  });
  assert(defaultContract.items.includes('handles-all'), 'default finishes stage must expose handles');
  assert(defaultContract.items.includes('stone-skirting'), 'default finishes stage must expose stone skirting');
  assert.equal(defaultContract.skirtingHidden, false, 'stone skirting control must be visible');

  const stoneExistingSwatch = await page.locator('[data-stone-package-id="stone-existing"] .global-option__swatch').evaluate(element => ({
    backgroundColor: getComputedStyle(element).backgroundColor,
    backgroundImage: getComputedStyle(element).backgroundImage
  }));
  assert.equal(stoneExistingSwatch.backgroundColor, 'rgb(183, 176, 167)',
    'null authored stone color keeps the catalog swatch fallback as display-only metadata');

  const repairProbe = await page.evaluate(() => {
    const legacy = {
      stages: [
        {id: 'finishes', kind: 'finishes', enabled: true, items: ['fronts-all', 'stone-all']},
        {id: 'services', kind: 'services', enabled: true, items: ['move-stone']}
      ],
      initialState: {services: ['move-stone', 'stone-skirting']}
    };
    const intentional = structuredClone(legacy);
    intentional.initialState.services = ['move-stone'];
    return {
      repaired: window.CASA_RUNTIME_CONTRACTS.repairSkirtingStageContract(legacy).stages[0].items,
      intentional: window.CASA_RUNTIME_CONTRACTS.repairSkirtingStageContract(intentional).stages[0].items
    };
  });
  assert(repairProbe.repaired.includes('stone-skirting'), 'legacy active skirting must self-heal into the stone stage');
  assert.equal(repairProbe.intentional.includes('stone-skirting'), false, 'explicit admin removal must remain removed');

  const stack = await page.evaluate(() => {
    const z = id => Number.parseInt(getComputedStyle(document.getElementById(id)).zIndex, 10);
    const maxScene = Math.max(...Array.from(document.querySelectorAll('.layer-group')).map(element => Number.parseInt(getComputedStyle(element).zIndex, 10) || 0));
    return {maxScene, grid: z('alignmentGrid'), hotspots: z('sceneHotspots'), selection: z('selectionFrame')};
  });
  assert(stack.grid > stack.maxScene, 'alignment grid must stay above every scene entity');
  assert(stack.hotspots > stack.grid, 'hotspots must stay above the alignment grid');
  assert(stack.selection > stack.hotspots, 'selection frame must stay above hotspots');

  const toggle = page.locator('#stoneSkirtingToggle');
  await toggle.setChecked(false);
  await waitState("state => !state.globalSelections.serviceIds.includes('stone-skirting')");
  await page.locator('[data-finish-id="cocoa"]').click();
  await waitState("state => state.globalSelections.finishId === 'cocoa'");
  await page.locator('[data-stone-package-id="stone-cloud"]').click();
  await waitState("state => state.globalSelections.stonePackageId === 'stone-cloud'");
  await waitCanvasAnyAlpha('plinthCanvas');

  const leftPoint = await findAlphaPoint('plinthCanvas', [480, 840, 760, 920]);
  const rightPoint = await findAlphaPoint('plinthCanvas', [900, 840, 1240, 920]);
  assert(leftPoint, 'left plinth territory must expose at least one rendered pixel');
  assert(rightPoint, 'right plinth territory must expose at least one rendered pixel');

  const offBase = {state: await state(), plinth: await canvasStats('plinthCanvas')};
  assert.equal(offBase.state.globalSelections.serviceIds.includes('stone-skirting'), false);
  assert(offBase.plinth.nonzero > 0, 'OFF uses the MDF material canvas');

  await page.locator('[data-stone-package-id="stone-grove"]').click();
  await waitState("state => state.globalSelections.stonePackageId === 'stone-grove'");
  await settle();
  const offAfterStone = {state: await state(), plinth: await canvasStats('plinthCanvas')};
  assert.equal(offBase.plinth.hash, offAfterStone.plinth.hash, 'OFF + stone change must leave the plinth unchanged');

  const beforeMdf = await canvasPixel('plinthCanvas', leftPoint[0], leftPoint[1]);
  await page.locator('[data-finish-id="mist"]').click();
  await waitState("state => state.globalSelections.finishId === 'mist'");
  await waitCanvasPixelChange('plinthCanvas', leftPoint[0], leftPoint[1], beforeMdf);
  const offAfterMdf = {state: await state(), plinth: await canvasStats('plinthCanvas')};
  assert.notEqual(offAfterStone.plinth.hash, offAfterMdf.plinth.hash, 'OFF + MDF change must recolor the plinth');
  await screenshot('01-skirting-off-mdf');

  const beforeToggleOn = await canvasPixel('plinthCanvas', leftPoint[0], leftPoint[1]);
  await toggle.setChecked(true);
  await waitState("state => state.globalSelections.serviceIds.includes('stone-skirting')");
  await waitCanvasPixelChange('plinthCanvas', leftPoint[0], leftPoint[1], beforeToggleOn);
  const onBase = {state: await state(), plinth: await canvasStats('plinthCanvas')};
  assert.equal(onBase.state.globalSelections.serviceIds.includes('stone-skirting'), true);
  assert.notEqual(onBase.plinth.hash, offAfterMdf.plinth.hash, 'ON must switch the plinth from MDF to stone');

  await page.locator('[data-finish-id="steel"]').click();
  await waitState("state => state.globalSelections.finishId === 'steel'");
  await settle();
  const onAfterMdf = {state: await state(), plinth: await canvasStats('plinthCanvas')};
  assert.equal(onBase.plinth.hash, onAfterMdf.plinth.hash, 'ON + MDF change must leave the stone plinth unchanged');

  const beforeStone = await canvasPixel('plinthCanvas', leftPoint[0], leftPoint[1]);
  await page.locator('[data-stone-package-id="stone-night"]').click();
  await waitState("state => state.globalSelections.stonePackageId === 'stone-night'");
  await waitCanvasPixelChange('plinthCanvas', leftPoint[0], leftPoint[1], beforeStone);
  const onAfterStone = {state: await state(), plinth: await canvasStats('plinthCanvas')};
  assert.notEqual(onAfterMdf.plinth.hash, onAfterStone.plinth.hash, 'ON + stone change must recolor the plinth');
  await screenshot('02-skirting-on-stone');

  await page.locator('[data-step="modules"]').click();
  await settle();
  const visibilityCases = [];
  for (const [module02, module03, label] of [
    [true, true, 'both-visible'],
    [false, true, 'module-02-hidden'],
    [true, false, 'module-03-hidden'],
    [false, false, 'both-hidden']
  ]) {
    await page.locator('[data-module-toggle="module-02"]').setChecked(module02);
    await page.locator('[data-module-toggle="module-03"]').setChecked(module03);
    await waitState(`state => state.visibilityByEntity['module-02'] === ${module02} && state.visibilityByEntity['module-03'] === ${module03}`);
    await waitCanvasAlpha('plinthCanvas', leftPoint[0], leftPoint[1], module02);
    await waitCanvasAlpha('plinthCanvas', rightPoint[0], rightPoint[1], module03);
    const plinth = await canvasStats('plinthCanvas');
    if (module02 && module03) {
      assert(plinth.nonzero > 0 && plinth.bbox[0] < 700 && plinth.bbox[2] > 900, 'both visible must render both plinth territories');
    } else if (!module02 && module03) {
      assert(plinth.nonzero > 0 && plinth.bbox[0] > 700, 'module 02 hidden must leave only the sink-side plinth');
    } else if (module02 && !module03) {
      assert(plinth.nonzero > 0 && plinth.bbox[2] < 800, 'module 03 hidden must leave only the cooktop-side plinth');
    } else {
      assert.equal(plinth.nonzero, 0, 'both stone hosts hidden must clear the plinth canvas');
    }
    visibilityCases.push({label, module02, module03, plinth});
  }

  assert.deepEqual(errors, [], 'browser console must remain clean');
  fs.writeFileSync(path.join(output, 'result.json'), JSON.stringify({
    status: 'PASS',
    mode,
    targetUrl,
    stack,
    defaultContract,
    samplePoints: {leftPoint, rightPoint},
    matrix: {offBase, offAfterStone, offAfterMdf, onBase, onAfterMdf, onAfterStone},
    visibilityCases,
    pageErrors: errors
  }, null, 2));

  await browser.close();
})().catch(error => {
  console.error(error);
  process.exit(1);
});
