const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {chromium} = require('playwright');

(async () => {
  const output = process.argv[2] || '/tmp/keyboard-browser';
  fs.mkdirSync(output, {recursive: true});
  const targetUrl = process.env.KEYBOARD_BROWSER_URL || 'https://mobilipresenter2d.netlify.app/';
  const browser = await chromium.launch({headless: true});
  const page = await browser.newPage({viewport: {width: 1366, height: 900}});
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });

  let lastError;
  for (let attempt = 0; attempt < 18; attempt += 1) {
    try {
      await page.goto(targetUrl, {waitUntil: 'domcontentloaded', timeout: 15000});
      await page.waitForFunction(() => window.CASA_KEYBOARD_SHORTCUTS?.discoverStageSections && document.querySelectorAll('#moduleList [data-select-entity]').length > 1, null, {timeout: 5000});
      lastError = null;
      break;
    } catch (error) {
      lastError = error;
      await page.waitForTimeout(3000);
    }
  }
  if (lastError) throw lastError;

  const selectedNumber = () => page.evaluate(() => {
    const card = document.querySelector('#moduleList .module-card.is-selected');
    return card ? Number.parseInt(card.querySelector('.module-number')?.textContent || '', 10) : null;
  });
  const currentStage = () => page.evaluate(() => document.querySelector('.flow-nav [data-step][aria-current="step"]')?.dataset.step || null);
  const activeSection = () => page.evaluate(() => {
    const element = document.querySelector('[data-keyboard-active-section="true"]');
    return element?.dataset.configurableItem || element?.id || null;
  });
  const sectionSnapshot = () => page.evaluate(() => window.CASA_KEYBOARD_SHORTCUTS.discoverStageSections().map(section => ({
    id: section.id,
    behavior: section.behavior,
    itemCount: section.items.length
  })));
  const moveToSection = async (id) => {
    for (let index = 0; index < 12; index += 1) {
      if (await activeSection() === id) return;
      await page.keyboard.press('ArrowDown');
    }
    throw new Error(`keyboard section not reached: ${id}; active=${await activeSection()}`);
  };
  const pressedId = selector => page.evaluate((css) => {
    const selected = Array.from(document.querySelectorAll(css)).find(item => item.getAttribute('aria-pressed') === 'true');
    return selected?.dataset.finishId || selected?.dataset.handleId || selected?.dataset.stonePackageId || selected?.id || null;
  }, selector);
  const serviceChecked = descriptor => page.evaluate(({id, serviceId}) => {
    const control = id ? document.getElementById(id) : document.querySelector(`[data-global-service-id="${serviceId}"]`);
    return control?.checked ?? null;
  }, descriptor);

  // Modules own their unmodified arrows, space and numeric shortcuts.
  await page.keyboard.press('ArrowRight');
  await page.waitForFunction(() => document.body.classList.contains('has-module-detail'));
  assert.equal(await selectedNumber(), 1, 'ArrowRight with no current module opens module 01');

  await page.keyboard.press('ArrowRight');
  assert.equal(await selectedNumber(), 2, 'ArrowRight advances to the next module');

  await page.keyboard.press('ArrowLeft');
  assert.equal(await selectedNumber(), 1, 'ArrowLeft returns to the previous module');

  const initialChecked = await page.locator('#moduleList .module-card.is-selected [data-module-toggle]').isChecked();
  await page.keyboard.press('Space');
  assert.equal(await page.locator('#moduleList .module-card.is-selected [data-module-toggle]').isChecked(), !initialChecked, 'Space toggles the current module');
  await page.keyboard.press('Space');
  assert.equal(await page.locator('#moduleList .module-card.is-selected [data-module-toggle]').isChecked(), initialChecked, 'Space toggles the current module back');

  await page.keyboard.press('Escape');
  await page.waitForFunction(() => !document.body.classList.contains('has-module-detail'));
  assert.equal(await selectedNumber(), null, 'Escape closes module details');

  await page.keyboard.press('3');
  assert.equal(await selectedNumber(), 3, 'single digit belongs to the Modules stage');

  // Ctrl shortcuts are global and move between stages.
  assert.equal(await currentStage(), 'modules');
  await page.keyboard.press('Control+ArrowRight');
  await page.waitForFunction(() => document.querySelector('.flow-nav [data-step][aria-current="step"]')?.dataset.step === 'finishes');
  assert.equal(await currentStage(), 'finishes', 'Ctrl+ArrowRight advances one stage');

  // A Ctrl chord must not arm the fallback numeric buffer. Plain digits still belong to the active stage.
  const selectedBeforeForeignDigit = await selectedNumber();
  await page.keyboard.press('4');
  await page.waitForTimeout(650);
  assert.equal(await currentStage(), 'finishes', 'unmodified digits do not leave non-module stages after a Ctrl chord');
  assert.equal(await selectedNumber(), selectedBeforeForeignDigit, 'unmodified digits outside Modules do not change the selected module');
  await page.keyboard.press('Escape');
  assert.equal(await currentStage(), 'finishes', 'Escape remains local to visible module details');
  assert.equal(await selectedNumber(), selectedBeforeForeignDigit, 'Escape outside Modules preserves the latent module selection');

  // Finishes are discovered from visible configurable groups rather than hard-coded option IDs.
  const finishSections = await sectionSnapshot();
  assert.ok(finishSections.some(section => section.id === 'item:fronts-all' && section.behavior === 'selection'), 'front finishes expose a selection section');
  assert.ok(finishSections.some(section => section.id === 'item:stone-all' && section.behavior === 'selection'), 'stone packages expose a selection section');
  assert.ok(finishSections.some(section => section.id === 'item:stone-skirting' && section.behavior === 'toggle'), 'stone skirting exposes a toggle section');

  await page.keyboard.press('ArrowDown');
  assert.equal(await activeSection(), 'fronts-all', 'ArrowDown enters the first visible finish section');
  const finishBefore = await pressedId('[data-finish-id]');
  await page.keyboard.press('ArrowRight');
  const finishAfter = await pressedId('[data-finish-id]');
  assert.notEqual(finishAfter, finishBefore, 'ArrowRight selects the next item in a selection section');

  await moveToSection('stone-all');
  const stoneBefore = await pressedId('[data-stone-package-id]');
  await page.keyboard.press('ArrowRight');
  const stoneAfter = await pressedId('[data-stone-package-id]');
  assert.notEqual(stoneAfter, stoneBefore, 'horizontal navigation changes stone inside the stone section');

  await moveToSection('stone-skirting');
  const skirtingBefore = await page.locator('#stoneSkirtingToggle').isChecked();
  await page.keyboard.press('Space');
  assert.equal(await page.locator('#stoneSkirtingToggle').isChecked(), !skirtingBefore, 'Space toggles a binary section');
  await page.keyboard.press('Space');
  assert.equal(await page.locator('#stoneSkirtingToggle').isChecked(), skirtingBefore, 'Space restores the binary section');
  await page.keyboard.press('ArrowUp');
  assert.equal(await activeSection(), 'stone-all', 'ArrowUp returns to the previous section');

  // Services use the same generic section/item mechanism. Published configuration may choose
  // which specific controls are visible, so assert behavior from the discovered contract.
  await page.keyboard.press('Control+ArrowRight');
  await page.waitForFunction(() => document.querySelector('.flow-nav [data-step][aria-current="step"]')?.dataset.step === 'services');
  const serviceSections = await sectionSnapshot();
  assert.ok(serviceSections.length >= 1, 'Services expose at least one keyboard section');
  await page.keyboard.press('ArrowDown');
  const focusedService = await page.evaluate(() => ({
    tag: document.activeElement?.tagName,
    type: document.activeElement?.type || null,
    id: document.activeElement?.id || null,
    serviceId: document.activeElement?.dataset?.globalServiceId || null,
    checked: document.activeElement?.checked ?? null,
    disabled: document.activeElement?.disabled ?? null
  }));
  assert.equal(focusedService.tag, 'INPUT', 'section navigation focuses the actionable service control');
  assert.equal(focusedService.type, 'checkbox', 'service item is represented as a binary control');
  assert.equal(focusedService.disabled, false, 'disabled controls are omitted from keyboard navigation');
  await page.keyboard.press('Space');
  assert.equal(await serviceChecked(focusedService), !focusedService.checked, 'Space toggles the focused service item across redraws');
  await page.keyboard.press('Space');
  assert.equal(await serviceChecked(focusedService), focusedService.checked, 'Space can restore the focused service item across redraws');

  // Summary currently has no required local action. Inject one declarative section to prove a
  // future stage gains Enter behavior from DOM data without another controller branch.
  await page.keyboard.press('Control+ArrowRight');
  await page.waitForFunction(() => document.querySelector('.flow-nav [data-step][aria-current="step"]')?.dataset.step === 'summary');
  await page.evaluate(() => {
    const section = document.createElement('div');
    section.dataset.configurableItem = 'future-summary-action';
    const button = document.createElement('button');
    button.type = 'button';
    button.textContent = 'Future action';
    button.addEventListener('click', () => { window.__KEYBOARD_FUTURE_ACTION__ = true; });
    section.append(button);
    document.getElementById('summaryPanel').append(section);
  });
  await moveToSection('future-summary-action');
  assert.equal(await activeSection(), 'future-summary-action', 'a future declarative section is discovered automatically');
  await page.keyboard.press('Enter');
  assert.equal(await page.evaluate(() => window.__KEYBOARD_FUTURE_ACTION__ === true), true, 'Enter executes an action item in a data-driven section');

  // A quick Ctrl tap arms the global numeric buffer; this avoids browser-reserved Ctrl+digit
  // combinations while preserving the Ctrl scope of global module access.
  await page.keyboard.down('Control');
  await page.keyboard.up('Control');
  await page.keyboard.press('2');
  await page.waitForFunction(() => document.querySelector('.flow-nav [data-step][aria-current="step"]')?.dataset.step === 'modules' && document.querySelector('#moduleList .module-card.is-selected .module-number')?.textContent.trim() === '02');
  assert.equal(await selectedNumber(), 2, 'Ctrl numeric access is global and returns to Modules');

  // Future 10+ module furniture: keep Ctrl held while entering the complete module number.
  const multiDigit = await page.evaluate(async () => {
    const list = document.getElementById('moduleList');
    const fake = document.createElement('article');
    fake.className = 'module-card';
    fake.innerHTML = '<span class="module-number">10</span><button type="button" data-select-entity="module-10-test">Ver</button>';
    let clicked = false;
    fake.querySelector('button').addEventListener('click', () => { clicked = true; });
    list.append(fake);
    document.dispatchEvent(new KeyboardEvent('keydown', {key: '1', ctrlKey: true, bubbles: true, cancelable: true}));
    document.dispatchEvent(new KeyboardEvent('keydown', {key: '0', ctrlKey: true, bubbles: true, cancelable: true}));
    document.dispatchEvent(new KeyboardEvent('keyup', {key: 'Control', bubbles: true, cancelable: true}));
    await new Promise(resolve => setTimeout(resolve, 20));
    fake.remove();
    return clicked;
  });
  assert.equal(multiDigit, true, 'Ctrl digit buffer resolves a two-digit module number');

  assert.deepEqual(errors, [], 'browser console must remain clean');
  await page.screenshot({path: path.join(output, 'keyboard-stage-navigation.png'), fullPage: true, animations: 'disabled'});
  fs.writeFileSync(path.join(output, 'result.json'), JSON.stringify({
    status: 'PASS',
    targetUrl,
    finishSections,
    serviceSections
  }, null, 2));
  await browser.close();
})().catch(error => {
  console.error(error);
  process.exit(1);
});

// near-official candidate gate trigger; audit branch only
