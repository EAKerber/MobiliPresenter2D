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
      await page.waitForFunction(() => window.CASA_KEYBOARD_SHORTCUTS && document.querySelectorAll('#moduleList [data-select-entity]').length > 1, null, {timeout: 5000});
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
  assert.equal(await selectedNumber(), 3, 'single digit opens the matching module');

  assert.equal(await currentStage(), 'modules');
  await page.keyboard.press('Control+ArrowRight');
  await page.waitForFunction(() => document.querySelector('.flow-nav [data-step][aria-current="step"]')?.dataset.step === 'finishes');
  assert.equal(await currentStage(), 'finishes', 'Ctrl+ArrowRight advances one stage');
  await page.keyboard.press('Control+ArrowLeft');
  await page.waitForFunction(() => document.querySelector('.flow-nav [data-step][aria-current="step"]')?.dataset.step === 'modules');
  assert.equal(await currentStage(), 'modules', 'Ctrl+ArrowLeft returns one stage');

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
  await page.screenshot({path: path.join(output, 'keyboard-shortcuts.png'), fullPage: true, animations: 'disabled'});
  fs.writeFileSync(path.join(output, 'result.json'), JSON.stringify({status: 'PASS', targetUrl}, null, 2));
  await browser.close();
})().catch(error => {
  console.error(error);
  process.exit(1);
});
