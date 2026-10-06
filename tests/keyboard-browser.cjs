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
      await page.waitForFunction(() => window.CASA_KEYBOARD_SHORTCUTS?.discoverStageSections && window.CASA_KEYBOARD_SHORTCUTS?.navigationInvariantErrors && window.CASA_NORMALIZED_FLOW?.stages?.length && document.querySelectorAll('#moduleList [data-select-entity]').length > 1, null, {timeout: 5000});
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
    return element?.dataset.keyboardSection || null;
  });
  const sectionSnapshot = () => page.evaluate(() => window.CASA_KEYBOARD_SHORTCUTS.discoverStageSections().map(section => ({
    id: section.id,
    keyboardSection: section.element.dataset.keyboardSection || null,
    behavior: section.behavior,
    itemCount: section.items.length,
    modeledItemIds: [...section.itemIds],
    itemIds: section.items.map(item => item.id || item.dataset.handleId || item.dataset.finishId || item.dataset.stonePackageId || item.dataset.globalServiceId || item.tagName)
  })));
  const modeledSectionIds = stageId => page.evaluate((id) => {
    const stage = window.CASA_NORMALIZED_FLOW.stages.find(entry => entry.id === id);
    return stage ? stage.groups.flatMap(group => group.sections).filter(section => section.keyboard).map(section => section.id) : [];
  }, stageId);
  const navigationErrors = () => page.evaluate(() => window.CASA_KEYBOARD_SHORTCUTS.navigationInvariantErrors());
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

  await page.setViewportSize({width: 1050, height: 650});
  await page.waitForTimeout(80);
  await page.locator('#moduleList .module-card.is-selected [data-module-toggle]').focus();
  const moduleScrollBefore = await page.evaluate(() => {
    const pane = document.querySelector('[data-stage-pane="list"]');
    window.scrollTo(0, Math.min(160, Math.max(0, document.documentElement.scrollHeight - innerHeight)));
    pane.scrollTop = 0;
    return {windowY: window.scrollY, paneTop: pane.scrollTop, paneMax: Math.max(0, pane.scrollHeight - pane.clientHeight)};
  });
  assert.ok(moduleScrollBefore.paneMax > 0, 'stacked Modules list exposes an independent vertical scroller');
  await page.keyboard.press('ArrowDown');
  await page.waitForTimeout(260);
  const moduleScrollAfterDown = await page.evaluate(() => ({
    windowY: window.scrollY,
    paneTop: document.querySelector('[data-stage-pane="list"]').scrollTop
  }));
  assert.ok(Math.abs(moduleScrollAfterDown.windowY - moduleScrollBefore.windowY) < 2, 'ArrowDown in Modules does not scroll the window');
  assert.ok(moduleScrollAfterDown.paneTop > moduleScrollBefore.paneTop, 'ArrowDown scrolls the focused Modules column instead');
  await page.keyboard.press('ArrowUp');
  await page.waitForTimeout(260);
  const moduleScrollAfterUp = await page.evaluate(() => ({
    windowY: window.scrollY,
    paneTop: document.querySelector('[data-stage-pane="list"]').scrollTop
  }));
  assert.ok(Math.abs(moduleScrollAfterUp.windowY - moduleScrollBefore.windowY) < 2, 'ArrowUp in Modules does not scroll the window');
  assert.ok(moduleScrollAfterUp.paneTop < moduleScrollAfterDown.paneTop, 'ArrowUp reverses the focused Modules column scroll');
  await page.setViewportSize({width: 1366, height: 900});
  await page.waitForTimeout(80);

  // Ctrl shortcuts are global and move between stages.
  assert.equal(await currentStage(), 'modules');
  await page.keyboard.press('Control+ArrowRight');
  await page.waitForFunction(() => document.querySelector('.flow-nav [data-step][aria-current="step"]')?.dataset.step === 'finishes');
  assert.equal(await currentStage(), 'finishes', 'Ctrl+ArrowRight advances one stage');
  await page.waitForTimeout(450);
  const finishStageGeometry = await page.evaluate(() => {
    const nav = document.querySelector('.flow-nav').getBoundingClientRect();
    const panel = document.getElementById('frontFinishPanel').getBoundingClientRect();
    const heading = document.getElementById('frontFinishHeading');
    return {
      panelTop: panel.top,
      expectedTop: nav.bottom + 12,
      headingOutline: getComputedStyle(heading).outlineStyle
    };
  });
  assert.ok(Math.abs(finishStageGeometry.panelTop - finishStageGeometry.expectedTop) < 36, 'stage entry establishes a predictable top context below the sticky step rail');
  assert.equal(finishStageGeometry.headingOutline, 'none', 'programmatic stage heading focus does not look like an option selection');

  // A Ctrl chord must not arm the fallback numeric buffer. Plain digits still belong to the active stage.
  const selectedBeforeForeignDigit = await selectedNumber();
  await page.keyboard.press('4');
  await page.waitForTimeout(650);
  assert.equal(await currentStage(), 'finishes', 'unmodified digits do not leave non-module stages after a Ctrl chord');
  assert.equal(await selectedNumber(), selectedBeforeForeignDigit, 'unmodified digits outside Modules do not change the selected module');
  await page.keyboard.press('Escape');
  assert.equal(await currentStage(), 'finishes', 'Escape remains local to visible module details');
  assert.equal(await selectedNumber(), selectedBeforeForeignDigit, 'Escape outside Modules preserves the latent module selection');

  // Finishes expose explicit semantic sections; layout does not define ownership.
  const finishSections = await sectionSnapshot();
  assert.ok(finishSections.some(section => section.id === 'section:fronts' && section.behavior === 'selection'), 'front finishes expose a selection section');
  assert.ok(finishSections.some(section => section.id === 'section:handles' && section.behavior === 'selection'), 'handles expose a selection section');
  assert.ok(finishSections.some(section => section.id === 'section:stone-packages' && section.behavior === 'selection'), 'stone packages expose a selection section');
  assert.ok(finishSections.some(section => section.id === 'section:stone-skirting' && section.behavior === 'toggle'), 'stone skirting exposes a toggle section');
  const finishModelOrder = await modeledSectionIds('finishes');
  assert.deepEqual(finishSections.map(section => section.keyboardSection), finishModelOrder, 'rendered finish navigation follows normalized flow order');
  assert.deepEqual(await navigationErrors(), [], 'finish renderer satisfies normalized flow invariants');

  await page.evaluate(() => {
    const fronts = document.querySelector('[data-keyboard-section="fronts"]');
    const handles = document.querySelector('[data-keyboard-section="handles"]');
    handles.parentElement.insertBefore(handles, fronts);
  });
  const reorderedFinishSections = await sectionSnapshot();
  assert.deepEqual(reorderedFinishSections.map(section => section.keyboardSection), finishModelOrder, 'DOM reorder cannot change semantic section order');
  await page.evaluate(() => {
    const fronts = document.querySelector('[data-keyboard-section="fronts"]');
    const handles = document.querySelector('[data-keyboard-section="handles"]');
    fronts.parentElement.insertBefore(fronts, handles);
    handles.dataset.keyboardBehavior = 'toggle';
  });
  const behaviorOverrideAttempt = await sectionSnapshot();
  assert.equal(behaviorOverrideAttempt.find(section => section.keyboardSection === 'handles').behavior, 'selection', 'DOM behavior hints cannot override the normalized flow model');
  await page.evaluate(() => { document.querySelector('[data-keyboard-section="handles"]').dataset.keyboardBehavior = 'selection'; });

  await page.evaluate(() => { document.querySelector('[data-keyboard-section="fronts"]').removeAttribute('data-flow-item-id'); });
  await sectionSnapshot();
  const missingOwnerErrors = await navigationErrors();
  assert.ok(missingOwnerErrors.some(entry => entry.code === 'missing-flow-item' && entry.itemId === 'fronts-all'), 'missing rendered model ownership is surfaced as an invariant error');
  await page.evaluate(() => { document.querySelector('[data-keyboard-section="fronts"]').dataset.flowItemId = 'fronts-all'; });
  await sectionSnapshot();
  assert.deepEqual(await navigationErrors(), [], 'restoring the flow ownership bridge clears invariant errors');

  await page.keyboard.press('ArrowDown');
  assert.equal(await activeSection(), 'fronts', 'ArrowDown enters the first visible finish section');
  const finishBefore = await pressedId('[data-finish-id]');
  await page.keyboard.press('ArrowRight');
  const finishAfter = await pressedId('[data-finish-id]');
  assert.notEqual(finishAfter, finishBefore, 'ArrowRight selects the next item in a selection section');

  await page.keyboard.press('ArrowDown');
  assert.equal(await activeSection(), 'handles', 'one ArrowDown from Frentes selects Puxadores as the next modeled section');
  await page.keyboard.press('ArrowUp');
  assert.equal(await activeSection(), 'fronts', 'one ArrowUp from Puxadores returns to Frentes');

  const handleOrder = await page.locator('[data-handle-id]').evaluateAll(items => items.map(item => item.dataset.handleId));
  assert.ok(handleOrder.length >= 3, 'handle grid exposes enough options to cross a visual row boundary');
  await page.locator(`[data-handle-id="${handleOrder[0]}"]`).click();
  await page.waitForFunction(() =>
    document.querySelector('[data-keyboard-section="handles"]')?.dataset.keyboardActiveSection === "true"
  );
  assert.equal(await activeSection(), 'handles', 'Puxadores remains active after the handle controls redraw');
  await moveToSection('handles');
  assert.equal(await activeSection(), 'handles', 'Puxadores is a first-class keyboard section');
  await page.keyboard.press('ArrowRight');
  assert.equal(await pressedId('[data-handle-id]'), handleOrder[1], 'first horizontal handle move follows canonical data order');
  await page.keyboard.press('ArrowRight');
  assert.equal(await pressedId('[data-handle-id]'), handleOrder[2], 'handle traversal crosses the two-column row boundary in row-major order');
  await page.keyboard.press('ArrowLeft');
  assert.equal(await pressedId('[data-handle-id]'), handleOrder[1], 'Left is the inverse row-major handle traversal');

  await moveToSection('stone-packages');
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
  assert.equal(await activeSection(), 'stone-packages', 'ArrowUp returns to the previous section');

  // Services own two explicit peer sections instead of inferring semantics from the panel DOM.
  await page.keyboard.press('Control+ArrowRight');
  await page.waitForFunction(() => document.querySelector('.flow-nav [data-step][aria-current="step"]')?.dataset.step === 'services');
  const serviceSections = await sectionSnapshot();
  assert.ok(serviceSections.some(section => section.id === 'section:lighting' && section.behavior === 'toggle'), 'lighting is an explicit toggle section');
  assert.ok(serviceSections.some(section => section.id === 'section:additional-services' && section.behavior === 'toggle'), 'additional services are an explicit toggle section');
  assert.equal(serviceSections.some(section => section.itemIds.includes('servicesHeading')), false, 'the stage heading is never discovered as a section item');
  const serviceModelOrder = await modeledSectionIds('services');
  assert.deepEqual(serviceSections.map(section => section.keyboardSection), serviceModelOrder, 'rendered service navigation follows normalized flow order');
  assert.deepEqual(serviceSections.find(section => section.keyboardSection === 'lighting').modeledItemIds, ['lighting-08'], 'lighting section ownership comes from normalized flow');
  assert.deepEqual(serviceSections.find(section => section.keyboardSection === 'additional-services').modeledItemIds, ['move-stone', 'tempered-glass'], 'additional-service membership comes from normalized flow');
  assert.deepEqual(await navigationErrors(), [], 'services renderer satisfies normalized flow invariants');

  const serviceCardContract = await page.evaluate(() => {
    const lighting = document.getElementById('lightingToggle');
    const additional = document.querySelector('[data-global-service-id]');
    const lightingStyle = getComputedStyle(lighting);
    const additionalStyle = getComputedStyle(additional);
    return {
      lightingCard: lighting.closest('.service-check')?.classList.contains('service-check') || false,
      additionalCard: additional?.closest('.service-check')?.classList.contains('service-check') || false,
      lightingWidth: lightingStyle.width,
      lightingHeight: lightingStyle.height,
      additionalWidth: additionalStyle.width,
      additionalHeight: additionalStyle.height
    };
  });
  assert.equal(serviceCardContract.lightingCard, true, 'lighting uses the shared service card contract');
  assert.equal(serviceCardContract.additionalCard, true, 'additional services use the shared service card contract');
  assert.equal(serviceCardContract.lightingWidth, serviceCardContract.additionalWidth, 'service checkboxes share one width');
  assert.equal(serviceCardContract.lightingHeight, serviceCardContract.additionalHeight, 'service checkboxes share one height');

  const sectionShellContract = await page.evaluate(() => {
    const fronts = getComputedStyle(document.querySelector('[data-keyboard-section="fronts"]'));
    const handles = getComputedStyle(document.querySelector('[data-keyboard-section="handles"]'));
    const lighting = getComputedStyle(document.querySelector('[data-keyboard-section="lighting"]'));
    return {
      fronts: { padding: fronts.paddingTop, borderRadius: fronts.borderTopLeftRadius, borderWidth: fronts.borderTopWidth },
      handles: { padding: handles.paddingTop, borderRadius: handles.borderTopLeftRadius, borderWidth: handles.borderTopWidth },
      lighting: { padding: lighting.paddingTop, borderRadius: lighting.borderTopLeftRadius, borderWidth: lighting.borderTopWidth }
    };
  });
  assert.deepEqual(sectionShellContract.fronts, sectionShellContract.lighting, 'front finishes use the same section shell geometry as Services');
  assert.deepEqual(sectionShellContract.handles, sectionShellContract.lighting, 'Puxadores uses the same section shell geometry as Services');

  await page.keyboard.press('ArrowDown');
  assert.equal(await activeSection(), 'lighting', 'first service section is lighting');
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

  // Reproduce the reported friction: the final section already fits, but is visually stranded
  // above the viewport end. Section navigation must still establish an intentional end position.
  const beforeLastSection = await page.evaluate(() => {
    const element = document.querySelector('[data-keyboard-section="additional-services"]');
    const scroller = document.querySelector('.controls');
    const bounds = scroller.getBoundingClientRect();
    const rect = element.getBoundingClientRect();
    const maxScroll = Math.max(0, scroller.scrollHeight - scroller.clientHeight);
    const targetBottom = bounds.bottom - 140;
    scroller.scrollTop = Math.max(0, Math.min(maxScroll, scroller.scrollTop + rect.bottom - targetBottom));
    const positioned = element.getBoundingClientRect();
    const navBottom = document.querySelector('.flow-nav').getBoundingClientRect().bottom;
    return {
      top: positioned.top,
      bottom: positioned.bottom,
      viewportTop: navBottom + 12,
      viewportBottom: bounds.bottom - 16,
      fullyVisible: positioned.top >= navBottom + 12 && positioned.bottom <= bounds.bottom - 16
    };
  });
  assert.equal(beforeLastSection.fullyVisible, true, 'test setup keeps the final service section fully visible before section navigation');

  await page.keyboard.press('ArrowDown');
  assert.equal(await activeSection(), 'additional-services', 'ArrowDown moves the active section marker to additional services');
  await page.waitForTimeout(450);
  const lastSectionGeometry = await page.evaluate(() => {
    const element = document.querySelector('[data-keyboard-section="additional-services"]');
    const scroller = document.querySelector('.controls');
    const rect = element.getBoundingClientRect();
    const bounds = scroller.getBoundingClientRect();
    const maxScroll = Math.max(0, scroller.scrollHeight - scroller.clientHeight);
    return {
      bottomGap: (bounds.bottom - 16) - rect.bottom,
      atDocumentEnd: Math.abs(scroller.scrollTop - maxScroll) < 3
    };
  });
  assert.ok(Math.abs(lastSectionGeometry.bottomGap) < 42 || lastSectionGeometry.atDocumentEnd, 'last-section navigation aligns the final section with the usable viewport end');

  const focusedAdditionalService = await page.evaluate(() => ({
    id: document.activeElement?.id || null,
    serviceId: document.activeElement?.dataset?.globalServiceId || null,
    checked: document.activeElement?.checked ?? null,
    disabled: document.activeElement?.disabled ?? null
  }));
  assert.equal(focusedAdditionalService.disabled, false, 'additional service navigation lands on an enabled control');
  await page.keyboard.press('Space');
  assert.equal(await serviceChecked(focusedAdditionalService), !focusedAdditionalService.checked, 'Space toggles an additional service');
  await page.keyboard.press('Space');
  assert.equal(await serviceChecked(focusedAdditionalService), focusedAdditionalService.checked, 'Space restores an additional service');

  await page.keyboard.press('ArrowUp');
  assert.equal(await activeSection(), 'lighting', 'ArrowUp restores the previous explicit service section');
  await page.emulateMedia({reducedMotion: 'reduce'});
  await page.evaluate(() => {
    const element = document.querySelector('[data-keyboard-section="additional-services"]');
    const scroller = document.querySelector('.controls');
    const bounds = scroller.getBoundingClientRect();
    const rect = element.getBoundingClientRect();
    const maxScroll = Math.max(0, scroller.scrollHeight - scroller.clientHeight);
    scroller.scrollTop = Math.max(0, Math.min(maxScroll, scroller.scrollTop + rect.bottom - (bounds.bottom - 140)));
  });
  await page.keyboard.press('ArrowDown');
  await page.waitForTimeout(30);
  const reducedMotionGeometry = await page.evaluate(() => {
    const element = document.querySelector('[data-keyboard-section="additional-services"]');
    const scroller = document.querySelector('.controls');
    const rect = element.getBoundingClientRect();
    const bounds = scroller.getBoundingClientRect();
    const maxScroll = Math.max(0, scroller.scrollHeight - scroller.clientHeight);
    return {
      bottomGap: (bounds.bottom - 16) - rect.bottom,
      atDocumentEnd: Math.abs(scroller.scrollTop - maxScroll) < 3
    };
  });
  assert.ok(Math.abs(reducedMotionGeometry.bottomGap) < 42 || reducedMotionGeometry.atDocumentEnd, 'reduced motion reaches the same final section geometry without relying on animation');
  await page.emulateMedia({reducedMotion: 'no-preference'});

  // DOM structure is now a rendering bridge, not semantic authority. A rogue section cannot
  // create new keyboard semantics unless it exists in the normalized flow model.
  await page.keyboard.press('Control+ArrowRight');
  await page.waitForFunction(() => document.querySelector('.flow-nav [data-step][aria-current="step"]')?.dataset.step === 'summary');
  assert.deepEqual(await modeledSectionIds('summary'), [], 'summary has no keyboard-managed section in the normalized flow');
  await page.evaluate(() => {
    const section = document.createElement('div');
    section.dataset.keyboardSection = 'future-summary-action';
    section.dataset.keyboardBehavior = 'action';
    section.dataset.flowItemId = 'summary';
    const button = document.createElement('button');
    button.type = 'button';
    button.textContent = 'Future action';
    button.addEventListener('click', () => { window.__KEYBOARD_FUTURE_ACTION__ = true; });
    section.append(button);
    document.getElementById('summaryPanel').append(section);
  });
  assert.deepEqual(await sectionSnapshot(), [], 'DOM-only sections do not enter keyboard navigation without normalized-flow ownership');
  assert.deepEqual(await navigationErrors(), [], 'unmodeled DOM sections are ignored rather than changing semantic ownership');
  await page.keyboard.press('Enter');
  assert.equal(await page.evaluate(() => window.__KEYBOARD_FUTURE_ACTION__ === true), false, 'Enter cannot activate an unmodeled DOM-only section');
  await page.evaluate(() => document.querySelector('[data-keyboard-section="future-summary-action"]')?.remove());

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
