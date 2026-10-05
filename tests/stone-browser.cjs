const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('playwright');

(async () => {
  const output = process.argv[2] || '/tmp/stone-browser';
  fs.mkdirSync(output, { recursive: true });
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1366, height: 900 } });
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });

  const targetUrl = 'https://mobilipresenter2d.netlify.app/';
  await page.goto(targetUrl, { waitUntil: 'networkidle' });
  await page.evaluate(() => Promise.all(Array.from(document.images, image => image.decode().catch(() => {}))));

  const screenshot = name => page.screenshot({ path: path.join(output, `${name}.png`), fullPage: true, animations: 'disabled' });
  const state = () => page.evaluate(() => window.CASA_EM_MODULOS_DEBUG?.getState?.() || null);
  const canvasStats = id => page.evaluate(canvasId => {
    const canvas = document.getElementById(canvasId);
    const ctx = canvas.getContext('2d');
    const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
    let nonzero = 0, minX = canvas.width, minY = canvas.height, maxX = -1, maxY = -1;
    let hash = 2166136261 >>> 0;
    for (let i = 0; i < data.length; i += 4) {
      const a = data[i + 3];
      if (!a) continue;
      nonzero += 1;
      const p = i >> 2;
      const x = p % canvas.width;
      const y = Math.floor(p / canvas.width);
      if (x < minX) minX = x; if (x > maxX) maxX = x;
      if (y < minY) minY = y; if (y > maxY) maxY = y;
      hash ^= data[i]; hash = Math.imul(hash, 16777619) >>> 0;
      hash ^= data[i + 1]; hash = Math.imul(hash, 16777619) >>> 0;
      hash ^= data[i + 2]; hash = Math.imul(hash, 16777619) >>> 0;
      hash ^= a; hash = Math.imul(hash, 16777619) >>> 0;
    }
    return {
      nonzero,
      bbox: nonzero ? [minX, minY, maxX, maxY] : null,
      hash: hash.toString(16).padStart(8, '0'),
      zIndex: getComputedStyle(canvas).zIndex
    };
  }, id);
  const settle = () => page.waitForTimeout(900);

  await screenshot('01-production-initial');
  await page.locator('[data-step="finishes"]').click();
  await settle();

  const inventory = await page.evaluate(() => ({
    stoneButtons: Array.from(document.querySelectorAll('[data-stone-package-id]')).map(el => ({ id: el.dataset.stonePackageId, text: el.textContent.trim(), hidden: el.hidden })),
    finishButtons: Array.from(document.querySelectorAll('[data-finish-id]')).map(el => ({ id: el.dataset.finishId, text: el.textContent.trim(), hidden: el.hidden })),
    skirting: {
      exists: Boolean(document.getElementById('stoneSkirtingToggle')),
      checked: document.getElementById('stoneSkirtingToggle')?.checked ?? null,
      disabled: document.getElementById('stoneSkirtingToggle')?.disabled ?? null,
      hiddenByLabel: document.getElementById('stoneSkirtingToggle')?.closest('[data-configurable-item]')?.hidden ?? null
    },
    stack: {
      stoneCanvas: getComputedStyle(document.getElementById('stoneCanvas')).zIndex,
      plinthCanvas: getComputedStyle(document.getElementById('plinthCanvas')).zIndex,
      hotspots: getComputedStyle(document.getElementById('sceneHotspots')).zIndex,
      alignmentGrid: getComputedStyle(document.getElementById('alignmentGrid')).zIndex,
      selectionFrame: getComputedStyle(document.getElementById('selectionFrame')).zIndex,
      layerGroups: Array.from(document.querySelectorAll('.layer-group')).map(el => ({ id: el.dataset.entityId, z: getComputedStyle(el).zIndex }))
    }
  }));

  const toggle = page.locator('#stoneSkirtingToggle');
  const initialState = await state();
  const initialPlinth = await canvasStats('plinthCanvas');
  await screenshot('02-finishes-initial');

  // OFF: plinth must use MDF and be insensitive to stone package changes.
  await toggle.setChecked(false);
  await settle();
  const offBase = { state: await state(), plinth: await canvasStats('plinthCanvas') };
  await screenshot('03-skirting-off');

  const stoneButtons = page.locator('[data-stone-package-id]');
  const stoneIds = await stoneButtons.evaluateAll(nodes => nodes.map(n => n.dataset.stonePackageId));
  const coloredStoneIds = stoneIds.filter(id => id && !['stone-existing', 'stone-light-sink'].includes(id));
  if (coloredStoneIds.length) {
    await page.locator(`[data-stone-package-id="${coloredStoneIds[0]}"]`).click();
    await settle();
  }
  const offAfterStone = { state: await state(), plinth: await canvasStats('plinthCanvas') };
  await screenshot('04-off-after-stone-change');

  const finishIds = await page.locator('[data-finish-id]').evaluateAll(nodes => nodes.map(n => n.dataset.finishId));
  const currentFinish = offAfterStone.state?.globalSelections?.finishId;
  const alternateFinish = finishIds.find(id => id && id !== currentFinish);
  if (alternateFinish) {
    await page.locator(`[data-finish-id="${alternateFinish}"]`).click();
    await settle();
  }
  const offAfterMdf = { state: await state(), plinth: await canvasStats('plinthCanvas') };
  await screenshot('05-off-after-mdf-change');

  // ON: plinth must use stone and be insensitive to MDF changes.
  await toggle.setChecked(true);
  await settle();
  const onBase = { state: await state(), plinth: await canvasStats('plinthCanvas') };
  await screenshot('06-skirting-on');

  const secondFinish = finishIds.find(id => id && id !== offAfterMdf.state?.globalSelections?.finishId);
  if (secondFinish) {
    await page.locator(`[data-finish-id="${secondFinish}"]`).click();
    await settle();
  }
  const onAfterMdf = { state: await state(), plinth: await canvasStats('plinthCanvas') };
  await screenshot('07-on-after-mdf-change');

  const secondStone = coloredStoneIds.find(id => id !== onAfterMdf.state?.globalSelections?.stonePackageId);
  if (secondStone) {
    await page.locator(`[data-stone-package-id="${secondStone}"]`).click();
    await settle();
  }
  const onAfterStone = { state: await state(), plinth: await canvasStats('plinthCanvas') };
  await screenshot('08-on-after-stone-change');

  const maxLayerZ = Math.max(...inventory.stack.layerGroups.map(item => Number(item.z) || 0));
  const report = {
    status: 'AUDIT',
    targetUrl,
    inventory,
    initialState,
    initialPlinth,
    matrix: { offBase, offAfterStone, offAfterMdf, onBase, onAfterMdf, onAfterStone },
    contracts: {
      offStoneInvariant: offBase.plinth.hash === offAfterStone.plinth.hash,
      offMdfResponsive: offAfterStone.plinth.hash !== offAfterMdf.plinth.hash,
      onMdfInvariant: onBase.plinth.hash === onAfterMdf.plinth.hash,
      onStoneResponsive: onAfterMdf.plinth.hash !== onAfterStone.plinth.hash,
      serviceToggleMutatesState: Boolean(offBase.state && onBase.state) && !offBase.state.globalSelections.serviceIds.includes('stone-skirting') && onBase.state.globalSelections.serviceIds.includes('stone-skirting'),
      plinthVisible: onBase.plinth.nonzero > 0 || offBase.plinth.nonzero > 0,
      hotspotParentAboveScene: (Number(inventory.stack.hotspots) || 0) > maxLayerZ,
      gridAboveScene: (Number(inventory.stack.alignmentGrid) || 0) > maxLayerZ
    },
    maxLayerZ,
    pageErrors: errors
  };
  fs.writeFileSync(path.join(output, 'result.json'), JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
  await browser.close();
})().catch(error => { console.error(error); process.exit(1); });
