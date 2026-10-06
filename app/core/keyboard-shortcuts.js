(function registerKeyboardShortcuts(global) {
  "use strict";

  // CP-UX-01 explicit section navigation.

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
    return Array.from(document.querySelectorAll(".controls > .panel, .controls > section.panel"))
      .filter((panel) => isVisible(panel));
  }

  function sectionInteractiveItems(section) {
    return Array.from(section.querySelectorAll(INTERACTIVE_SELECTOR)).filter((item) => {
      if (!isUsable(item)) return false;
      return item.closest("[data-keyboard-section]") === section;
    });
  }

  function sectionKey(element) {
    return `section:${element.dataset.keyboardSection}`;
  }

  function documentOrder(left, right) {
    if (left.element === right.element) return 0;
    const position = left.element.compareDocumentPosition(right.element);
    if (position & Node.DOCUMENT_POSITION_FOLLOWING) return -1;
    if (position & Node.DOCUMENT_POSITION_PRECEDING) return 1;
    return 0;
  }

  function classifySection(items, element) {
    const explicit = element.dataset?.keyboardBehavior;
    if (["selection", "toggle", "action"].includes(explicit)) return explicit;
    if (items.length && items.every((item) => item.matches("input[type='checkbox'], [role='switch']"))) return "toggle";
    if (items.length && items.every((item) => item.matches("input[type='radio']"))) return "selection";
    if (items.length > 1 && items.every((item) => item.matches("button") && item.hasAttribute("aria-pressed"))) return "selection";
    return "action";
  }

  function discoverStageSections() {
    if (activeStageId() === "modules") return [];
    const roots = visibleStageRoots();
    const elements = roots.flatMap((root) => [
      ...(root.matches("[data-keyboard-section]") ? [root] : []),
      ...root.querySelectorAll("[data-keyboard-section]")
    ]).filter((element) => isVisible(element) && element.dataset.keyboardSection);

    return elements.map((element) => {
      const items = sectionInteractiveItems(element);
      return {
        id: sectionKey(element),
        element,
        items,
        behavior: classifySection(items, element)
      };
    }).filter((section) => section.items.length).sort(documentOrder);
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

  function focusSectionItem(stageId, section, index) {
    if (!section?.items?.length) return false;
    const normalizedIndex = ((index % section.items.length) + section.items.length) % section.items.length;
    const item = section.items[normalizedIndex];
    sectionCursorByStage.set(stageId, section.id);
    itemCursorBySection.set(itemCursorKey(stageId, section.id), normalizedIndex);
    markActiveSection(section);
    item.focus({ preventScroll: true });
    item.scrollIntoView?.({ block: "nearest", inline: "nearest" });
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
    return focusSectionItem(stageId, target, preferredItemIndex(stageId, target));
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
    openModuleNumber,
    toggleSelectedModule,
    closeModuleDetail,
    changeStage,
    clearNumericBuffer
  });
})(typeof window === "undefined" ? globalThis : window);
