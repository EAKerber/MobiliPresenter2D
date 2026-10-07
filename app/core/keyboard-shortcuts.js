(function registerKeyboardShortcuts(global) {
  "use strict";

  // CP-UX-02: semantic section order/ownership comes from the normalized flow model.

  const MULTI_DIGIT_ARM_MS = 900;
  const MULTI_DIGIT_GAP_MS = 500;
  const INTERACTIVE_SELECTOR = [
    "button",
    "input:not([type='hidden'])",
    "select",
    "textarea",
    "[role='button']",
    "[role='switch']",
    "[role='radio']",
    "[tabindex]:not([tabindex='-1'])"
  ].join(",");

  let numericBuffer = "";
  let numericTimer = null;
  let multiDigitArmedUntil = 0;
  let controlChordUsed = false;
  let flowModel = null;
  let lastInvariantErrors = [];
  const sectionCursorByStage = new Map();
  const itemCursorBySection = new Map();

  function activeStageId() {
    return document.querySelector(".flow-nav [data-step][aria-current='step']")?.dataset.step
      || document.querySelector(".flow-nav [data-step].is-active")?.dataset.step
      || "modules";
  }

  function moduleButtons() {
    return Array.from(document.querySelectorAll("#moduleList [data-select-entity]"))
      .sort((left, right) => {
        const leftNumber = moduleNumber(left);
        const rightNumber = moduleNumber(right);
        if (Number.isFinite(leftNumber) && Number.isFinite(rightNumber)) return leftNumber - rightNumber;
        return 0;
      });
  }

  function moduleNumber(button) {
    const raw = button?.closest(".module-card")?.querySelector(".module-number")?.textContent?.trim();
    if (!raw) return Number.NaN;
    const parsed = Number.parseInt(raw, 10);
    return Number.isFinite(parsed) ? parsed : Number.NaN;
  }

  function selectedModuleButton() {
    return document.querySelector("#moduleList .module-card.is-selected [data-select-entity]");
  }

  function openAdjacentModule(direction) {
    const buttons = moduleButtons();
    if (!buttons.length) return false;
    const selected = selectedModuleButton();
    const selectedIndex = selected ? buttons.indexOf(selected) : -1;
    const baseIndex = selectedIndex >= 0 ? selectedIndex : direction > 0 ? -1 : 0;
    const targetIndex = (baseIndex + direction + buttons.length) % buttons.length;
    buttons[targetIndex]?.click();
    return true;
  }

  function openModuleNumber(number) {
    if (!Number.isInteger(number) || number < 0) return false;
    const target = moduleButtons().find((button) => moduleNumber(button) === number);
    if (!target) return false;
    target.click();
    return true;
  }

  function toggleSelectedModule() {
    if (!document.body.classList.contains("has-module-detail")) return false;
    const card = document.querySelector("#moduleList .module-card.is-selected");
    const toggle = card?.querySelector("[data-module-toggle]");
    if (!toggle || toggle.disabled) return false;
    toggle.click();
    return true;
  }

  function closeModuleDetail() {
    if (activeStageId() !== "modules" || !document.body.classList.contains("has-module-detail")) return false;
    const panel = document.getElementById("modulesPanel");
    if (panel && !isVisible(panel)) return false;
    const close = document.querySelector("#moduleDetail [data-close-module-detail]");
    if (!close || !isVisible(close)) return false;
    close.click();
    return true;
  }

  function changeStage(direction) {
    const steps = Array.from(document.querySelectorAll(".flow-nav [data-step]"))
      .filter((button) => isUsable(button));
    if (!steps.length) return false;
    const currentIndex = steps.findIndex((button) => button.getAttribute("aria-current") === "step" || button.classList.contains("is-active"));
    const baseIndex = currentIndex >= 0 ? currentIndex : 0;
    const targetIndex = Math.min(steps.length - 1, Math.max(0, baseIndex + direction));
    if (targetIndex === baseIndex) return false;
    steps[targetIndex].click();
    return true;
  }

  function isVisible(element) {
    if (!(element instanceof Element) || element.hidden) return false;
    const style = getComputedStyle(element);
    if (style.display === "none" || style.visibility === "hidden") return false;
    return element.getClientRects().length > 0;
  }

  function isUsable(element) {
    if (!isVisible(element)) return false;
    if (element.matches(":disabled") || element.getAttribute("aria-disabled") === "true") return false;
    return true;
  }

  function isTextEntryTarget(target) {
    if (!(target instanceof Element)) return false;
    if (target.closest("[contenteditable='true']")) return true;
    if (target.closest("textarea, select")) return true;
    const input = target.closest("input");
    if (!input) return false;
    return !["button", "checkbox", "radio", "range", "color", "file", "reset", "submit"].includes(input.type);
  }

  function visibleStageRoots() {
    const activeStep = document.querySelector(".flow-nav [data-step][aria-current='step']");
    const controlledId = activeStep?.getAttribute("aria-controls");
    const controlled = controlledId ? document.getElementById(controlledId) : null;
    if (controlled && isVisible(controlled)) return [controlled];
    return Array.from(document.querySelectorAll(".controls > .panel, .controls > .flow-stage-layout"))
      .filter((panel) => isVisible(panel));
  }

  function setFlow(nextFlow) {
    flowModel = nextFlow && Array.isArray(nextFlow.stages) ? nextFlow : null;
    sectionCursorByStage.clear();
    itemCursorBySection.clear();
    lastInvariantErrors = [];
    markActiveSection(null);
    return flowModel;
  }

  function navigationInvariantErrors() {
    return lastInvariantErrors.map((item) => ({ ...item }));
  }

  function activeFlowStage() {
    const stageId = activeStageId();
    return flowModel?.stages?.find((stage) => stage.id === stageId && stage.enabled) || null;
  }

  function sectionElementsFor(sectionId, roots) {
    const matches = [];
    roots.forEach((root) => {
      if (root.matches("[data-keyboard-section]") && root.dataset.keyboardSection === sectionId) matches.push(root);
      root.querySelectorAll("[data-keyboard-section]").forEach((element) => {
        if (element.dataset.keyboardSection === sectionId) matches.push(element);
      });
    });
    return matches.filter((element) => isVisible(element));
  }

  function sectionInteractiveCandidates(section) {
    return Array.from(section.querySelectorAll(INTERACTIVE_SELECTOR))
      .filter((item) => item.closest("[data-keyboard-section]") === section);
  }

  function flowItemIdFor(item, section) {
    const owner = item.closest("[data-flow-item-id]");
    if (!owner) return null;
    if (owner !== section && !section.contains(owner)) return null;
    return owner.dataset.flowItemId || null;
  }

  function resolveModelSection(stageId, modelSection, roots, errors) {
    const elements = sectionElementsFor(modelSection.id, roots);
    if (elements.length !== 1) {
      errors.push({
        code: elements.length ? "duplicate-section-element" : "missing-section-element",
        stageId,
        sectionId: modelSection.id,
        message: elements.length
          ? `multiple rendered elements own section ${modelSection.id}`
          : `missing rendered element for section ${modelSection.id}`
      });
      return null;
    }

    const element = elements[0];
    const modelItems = new Set(modelSection.itemIds);
    const candidates = sectionInteractiveCandidates(element);
    const candidateIds = candidates.map((item) => flowItemIdFor(item, element));

    candidates.forEach((item, index) => {
      const itemId = candidateIds[index];
      if (!itemId) {
        errors.push({
          code: "unowned-section-control",
          stageId,
          sectionId: modelSection.id,
          message: `interactive control in section ${modelSection.id} has no flow item owner`
        });
      } else if (!modelItems.has(itemId)) {
        errors.push({
          code: "unexpected-flow-item",
          stageId,
          sectionId: modelSection.id,
          itemId,
          message: `rendered flow item ${itemId} is not owned by section ${modelSection.id}`
        });
      }
    });

    modelSection.itemIds.forEach((itemId) => {
      if (!candidateIds.includes(itemId)) {
        errors.push({
          code: "missing-flow-item",
          stageId,
          sectionId: modelSection.id,
          itemId,
          message: `modeled flow item ${itemId} is not represented in section ${modelSection.id}`
        });
      }
    });

    const items = candidates.filter((item, index) => modelItems.has(candidateIds[index]) && isUsable(item));
    return {
      id: `section:${modelSection.id}`,
      modelId: modelSection.id,
      element,
      items,
      itemIds: [...modelSection.itemIds],
      behavior: modelSection.behavior
    };
  }

  function discoverStageSections() {
    const stageId = activeStageId();
    const errors = [];
    if (!flowModel) {
      lastInvariantErrors = [{ code: "missing-flow-model", stageId, message: "normalized flow model is not installed" }];
      return [];
    }

    const stage = activeFlowStage();
    if (!stage) {
      lastInvariantErrors = [{ code: "missing-flow-stage", stageId, message: `active stage is absent from normalized flow: ${stageId}` }];
      return [];
    }

    const roots = visibleStageRoots();
    const modeledSections = stage.groups
      .flatMap((group) => group.sections)
      .filter((section) => section.keyboard);

    const sections = modeledSections
      .map((modelSection) => resolveModelSection(stageId, modelSection, roots, errors))
      .filter(Boolean)
      .filter((section) => section.items.length);

    lastInvariantErrors = errors;
    return sections;
  }

  function itemCursorKey(stageId, sectionId) {
    return `${stageId}:${sectionId}`;
  }

  function preferredItemIndex(stageId, section) {
    const stored = itemCursorBySection.get(itemCursorKey(stageId, section.id));
    if (Number.isInteger(stored) && stored >= 0 && stored < section.items.length) return stored;
    const focused = section.items.indexOf(document.activeElement);
    if (focused >= 0) return focused;
    const selected = section.items.findIndex((item) => item.getAttribute("aria-pressed") === "true" || item.checked === true);
    return selected >= 0 ? selected : 0;
  }

  function currentSectionIndex(stageId, sections) {
    const focused = sections.findIndex((section) => section.items.includes(document.activeElement));
    if (focused >= 0) return focused;
    const storedId = sectionCursorByStage.get(stageId);
    return storedId ? sections.findIndex((section) => section.id === storedId) : -1;
  }

  function markActiveSection(section) {
    document.querySelectorAll("[data-keyboard-active-section='true']").forEach((element) => {
      delete element.dataset.keyboardActiveSection;
    });
    if (section?.element) section.element.dataset.keyboardActiveSection = "true";
  }

  function resetStageNavigation(stageId = activeStageId()) {
    sectionCursorByStage.delete(stageId);
    markActiveSection(null);
  }

  function scrollContainerFor(element) {
    let node = element?.parentElement || null;
    while (node && node !== document.body && node !== document.documentElement) {
      const style = getComputedStyle(node);
      const overflowY = style.overflowY;
      if (/(auto|scroll|overlay)/.test(overflowY) && node.scrollHeight > node.clientHeight + 2) return node;
      node = node.parentElement;
    }
    return null;
  }

  function bottomDockViewportRect() {
    const dock = document.querySelector('.flow-actions[data-bottom-dock-enabled="true"]');
    if (!dock || !isVisible(dock)) return null;
    const rect = dock.getBoundingClientRect();
    if (rect.height <= 0 || rect.bottom <= 0 || rect.top >= window.innerHeight) return null;
    return rect;
  }

  function dockAwareBottom(baseBottom, bounds, top) {
    const dock = bottomDockViewportRect();
    if (!dock) return Math.max(top + 1, baseBottom);
    const overlapsHorizontally = dock.right > bounds.left && dock.left < bounds.right;
    const overlapsVertically = dock.top < baseBottom && dock.bottom > bounds.top;
    if (!overlapsHorizontally || !overlapsVertically) return Math.max(top + 1, baseBottom);
    return Math.max(top + 1, Math.min(baseBottom, dock.top - 12));
  }

  function scrollViewport(sectionElement) {
    const scroller = scrollContainerFor(sectionElement);
    const nav = document.querySelector(".flow-nav");
    const navRect = nav && isVisible(nav) ? nav.getBoundingClientRect() : null;

    if (scroller) {
      const bounds = scroller.getBoundingClientRect();
      const navInsideScroller = nav && scroller.contains(nav);
      const top = navInsideScroller && navRect
        ? Math.max(bounds.top + 12, navRect.bottom + 12)
        : bounds.top + 12;
      return {
        scroller,
        top,
        bottom: dockAwareBottom(bounds.bottom - 16, bounds, top)
      };
    }

    const top = navRect ? Math.max(12, navRect.bottom + 12) : 12;
    const bounds = { top: 0, right: window.innerWidth, bottom: window.innerHeight, left: 0 };
    return {
      scroller: null,
      top,
      bottom: dockAwareBottom(window.innerHeight - 16, bounds, top)
    };
  }

  function scrollSectionIntoView(section, sectionIndex, sectionCount) {
    if (!section?.element || sectionIndex < 0 || !sectionCount) return;
    const rect = section.element.getBoundingClientRect();
    const viewport = scrollViewport(section.element);
    const availableHeight = viewport.bottom - viewport.top;
    let targetTop = viewport.top;

    if (rect.height < availableHeight) {
      if (sectionIndex === sectionCount - 1) targetTop = viewport.bottom - rect.height;
      else if (sectionIndex > 0) targetTop = viewport.top + (availableHeight - rect.height) / 2;
    }

    const delta = rect.top - targetTop;
    if (Math.abs(delta) < 2) return;
    const options = {
      top: delta,
      left: 0,
      behavior: global.matchMedia?.("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth"
    };
    if (viewport.scroller) viewport.scroller.scrollBy(options);
    else window.scrollBy(options);
  }

  function syncActiveSectionFromTarget(target) {
    if (!(target instanceof Element)) return false;
    const sections = discoverStageSections();
    const section = sections.find((entry) => entry.element === target || entry.element.contains(target));
    if (!section) return false;
    const stageId = activeStageId();
    const itemIndex = section.items.findIndex((item) => item === target || item.contains?.(target));
    sectionCursorByStage.set(stageId, section.id);
    if (itemIndex >= 0) itemCursorBySection.set(itemCursorKey(stageId, section.id), itemIndex);
    markActiveSection(section);
    return true;
  }

  document.addEventListener("focusin", (event) => {
    syncActiveSectionFromTarget(event.target);
  });

  document.addEventListener("pointerdown", (event) => {
    syncActiveSectionFromTarget(event.target);
  });

  function activateSection(sectionId, itemIndex = null, focus = false) {
    const stageId = activeStageId();
    const sections = discoverStageSections();
    const section = sections.find((entry) => entry.id === sectionId);
    if (!section) return false;
    const index = Number.isInteger(itemIndex)
      ? Math.max(0, Math.min(itemIndex, section.items.length - 1))
      : preferredItemIndex(stageId, section);
    sectionCursorByStage.set(stageId, section.id);
    if (section.items.length) itemCursorBySection.set(itemCursorKey(stageId, section.id), index);
    markActiveSection(section);
    if (focus && section.items[index]) section.items[index].focus({ preventScroll: true });
    return true;
  }

  function focusSectionItem(stageId, section, index) {
    if (!section?.items?.length) return false;
    const normalizedIndex = ((index % section.items.length) + section.items.length) % section.items.length;
    const item = section.items[normalizedIndex];
    sectionCursorByStage.set(stageId, section.id);
    itemCursorBySection.set(itemCursorKey(stageId, section.id), normalizedIndex);
    markActiveSection(section);
    item.focus({ preventScroll: true });
    return true;
  }

  function scrollModulePane(direction) {
    const active = document.activeElement;
    const focusedPane = active instanceof Element ? active.closest("[data-stage-pane]") : null;
    const pane = focusedPane || document.querySelector('[data-stage-pane="list"]') || document.querySelector('[data-stage-pane="detail"]');
    if (!pane) return false;
    const maxScroll = Math.max(0, pane.scrollHeight - pane.clientHeight);
    if (maxScroll <= 1) return false;
    const step = Math.max(72, Math.round(pane.clientHeight * 0.18));
    pane.scrollBy({
      top: direction * step,
      left: 0,
      behavior: global.matchMedia?.("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth"
    });
    return true;
  }

  function moveSection(direction) {
    const stageId = activeStageId();
    const sections = discoverStageSections();
    if (!sections.length) return false;
    const currentIndex = currentSectionIndex(stageId, sections);
    const targetIndex = currentIndex < 0
      ? (direction < 0 ? sections.length - 1 : 0)
      : (currentIndex + direction + sections.length) % sections.length;
    const target = sections[targetIndex];
    const focused = focusSectionItem(stageId, target, preferredItemIndex(stageId, target));
    if (focused) scrollSectionIntoView(target, targetIndex, sections.length);
    return focused;
  }

  function moveItem(direction) {
    const stageId = activeStageId();
    const sections = discoverStageSections();
    if (!sections.length) return false;
    let sectionIndex = currentSectionIndex(stageId, sections);
    if (sectionIndex < 0) sectionIndex = 0;
    const section = sections[sectionIndex];
    const currentItemIndex = preferredItemIndex(stageId, section);
    const targetIndex = section.items.length > 1
      ? (currentItemIndex + direction + section.items.length) % section.items.length
      : currentItemIndex;
    const focused = focusSectionItem(stageId, section, targetIndex);
    if (!focused) return false;
    if (section.behavior === "selection") section.items[targetIndex].click();
    return true;
  }

  function currentStageItem() {
    const stageId = activeStageId();
    const sections = discoverStageSections();
    if (!sections.length) return null;
    const sectionIndex = currentSectionIndex(stageId, sections);
    if (sectionIndex < 0) return null;
    const section = sections[sectionIndex];
    const index = preferredItemIndex(stageId, section);
    return { stageId, section, item: section.items[index], index };
  }

  function activateSpace() {
    if (activeStageId() === "modules") return toggleSelectedModule();
    const current = currentStageItem();
    if (!current) return false;
    const { section, item } = current;
    const isBinary = item.matches("input[type='checkbox'], [role='switch']") || section.behavior === "toggle";
    if (!isBinary || item.disabled) return false;
    item.click();
    return true;
  }

  function activateEnter() {
    if (activeStageId() === "modules") return false;
    const current = currentStageItem();
    if (!current) return false;
    const { item } = current;
    if (item.matches("input[type='checkbox'], [role='switch']") || item.disabled) return false;
    item.click();
    return true;
  }

  function clearNumericBuffer() {
    numericBuffer = "";
    if (numericTimer) clearTimeout(numericTimer);
    numericTimer = null;
  }

  function resolveNumericBuffer() {
    if (!numericBuffer) return false;
    const value = Number.parseInt(numericBuffer, 10);
    clearNumericBuffer();
    return Number.isFinite(value) && openModuleNumber(value);
  }

  function scheduleNumericResolution() {
    if (numericTimer) clearTimeout(numericTimer);
    numericTimer = setTimeout(resolveNumericBuffer, MULTI_DIGIT_GAP_MS);
  }

  function appendBufferedDigit(digit, waitForControlRelease) {
    numericBuffer += digit;
    if (!waitForControlRelease) scheduleNumericResolution();
  }

  document.addEventListener("keydown", (event) => {
    if (event.defaultPrevented || event.metaKey || event.altKey) return;

    if (event.key === "Escape") {
      if (closeModuleDetail()) event.preventDefault();
      clearNumericBuffer();
      return;
    }

    if (event.key === "Control") {
      controlChordUsed = false;
      return;
    }
    if (event.ctrlKey) controlChordUsed = true;

    if (isTextEntryTarget(event.target)) return;

    if (event.ctrlKey && (event.key === "ArrowLeft" || event.key === "ArrowRight")) {
      clearNumericBuffer();
      event.preventDefault();
      changeStage(event.key === "ArrowRight" ? 1 : -1);
      return;
    }

    if (/^\d$/.test(event.key) && event.ctrlKey) {
      event.preventDefault();
      appendBufferedDigit(event.key, true);
      return;
    }

    const stageId = activeStageId();

    if (stageId === "modules" && !event.ctrlKey && (event.key === "ArrowLeft" || event.key === "ArrowRight")) {
      clearNumericBuffer();
      event.preventDefault();
      openAdjacentModule(event.key === "ArrowRight" ? 1 : -1);
      return;
    }

    if (stageId === "modules" && !event.ctrlKey && (event.key === "ArrowUp" || event.key === "ArrowDown")) {
      clearNumericBuffer();
      event.preventDefault();
      scrollModulePane(event.key === "ArrowDown" ? 1 : -1);
      return;
    }

    if (stageId !== "modules" && !event.ctrlKey && (event.key === "ArrowUp" || event.key === "ArrowDown")) {
      clearNumericBuffer();
      event.preventDefault();
      moveSection(event.key === "ArrowDown" ? 1 : -1);
      return;
    }

    if (stageId !== "modules" && !event.ctrlKey && (event.key === "ArrowLeft" || event.key === "ArrowRight")) {
      clearNumericBuffer();
      event.preventDefault();
      moveItem(event.key === "ArrowRight" ? 1 : -1);
      return;
    }

    if ((event.key === " " || event.code === "Space") && !event.ctrlKey) {
      if (!event.repeat) activateSpace();
      event.preventDefault();
      clearNumericBuffer();
      return;
    }

    if (event.key === "Enter" && !event.ctrlKey && stageId !== "modules") {
      if (activateEnter()) event.preventDefault();
      clearNumericBuffer();
      return;
    }

    if (/^\d$/.test(event.key) && !event.ctrlKey) {
      if (Date.now() < multiDigitArmedUntil) {
        event.preventDefault();
        appendBufferedDigit(event.key, false);
        return;
      }
      if (stageId === "modules") {
        event.preventDefault();
        openModuleNumber(Number.parseInt(event.key, 10));
      }
    }
  }, true);

  document.addEventListener("keyup", (event) => {
    if (event.key !== "Control") return;
    if (isTextEntryTarget(event.target)) {
      controlChordUsed = false;
      multiDigitArmedUntil = 0;
      return;
    }
    if (numericBuffer) {
      resolveNumericBuffer();
      controlChordUsed = false;
      multiDigitArmedUntil = 0;
      return;
    }
    multiDigitArmedUntil = controlChordUsed ? 0 : Date.now() + MULTI_DIGIT_ARM_MS;
    controlChordUsed = false;
  }, true);

  global.CASA_KEYBOARD_SHORTCUTS = Object.freeze({
    activeStageId,
    discoverStageSections,
    moveSection,
    moveItem,
    activateSpace,
    activateEnter,
    openAdjacentModule,
    scrollModulePane,
    openModuleNumber,
    toggleSelectedModule,
    closeModuleDetail,
    changeStage,
    clearNumericBuffer,
    setFlow,
    navigationInvariantErrors,
    resetStageNavigation,
    activateSection,
    scrollContainerFor,
    scrollSectionIntoView
  });
})(typeof window === "undefined" ? globalThis : window);
