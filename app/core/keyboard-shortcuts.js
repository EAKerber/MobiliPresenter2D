(function registerKeyboardShortcuts(global) {
  "use strict";

  const MULTI_DIGIT_ARM_MS = 900;
  const MULTI_DIGIT_GAP_MS = 500;
  let numericBuffer = "";
  let numericTimer = null;
  let multiDigitArmedUntil = 0;

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
    const close = document.querySelector("#moduleDetail [data-close-module-detail]");
    if (!close) return false;
    close.click();
    return true;
  }

  function changeStage(direction) {
    const steps = Array.from(document.querySelectorAll(".flow-nav [data-step]"))
      .filter((button) => !button.hidden && !button.disabled);
    if (!steps.length) return false;
    const currentIndex = steps.findIndex((button) => button.getAttribute("aria-current") === "step" || button.classList.contains("is-active"));
    const baseIndex = currentIndex >= 0 ? currentIndex : 0;
    const targetIndex = Math.min(steps.length - 1, Math.max(0, baseIndex + direction));
    if (targetIndex === baseIndex) return false;
    steps[targetIndex].click();
    return true;
  }

  function isTextEntryTarget(target) {
    if (!(target instanceof Element)) return false;
    if (target.closest("[contenteditable='true']")) return true;
    return Boolean(target.closest("input, textarea, select"));
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

    if (isTextEntryTarget(event.target)) return;

    if (event.ctrlKey && (event.key === "ArrowLeft" || event.key === "ArrowRight")) {
      clearNumericBuffer();
      event.preventDefault();
      changeStage(event.key === "ArrowRight" ? 1 : -1);
      return;
    }

    if (!event.ctrlKey && (event.key === "ArrowLeft" || event.key === "ArrowRight")) {
      clearNumericBuffer();
      event.preventDefault();
      openAdjacentModule(event.key === "ArrowRight" ? 1 : -1);
      return;
    }

    if (event.key === " " || event.code === "Space") {
      if (toggleSelectedModule()) event.preventDefault();
      clearNumericBuffer();
      return;
    }

    if (/^\d$/.test(event.key)) {
      const bufferedMode = event.ctrlKey || Date.now() < multiDigitArmedUntil;
      event.preventDefault();
      if (bufferedMode) appendBufferedDigit(event.key, event.ctrlKey);
      else openModuleNumber(Number.parseInt(event.key, 10));
    }
  }, true);

  document.addEventListener("keyup", (event) => {
    if (event.key !== "Control") return;
    if (numericBuffer) {
      resolveNumericBuffer();
      multiDigitArmedUntil = 0;
      return;
    }
    multiDigitArmedUntil = Date.now() + MULTI_DIGIT_ARM_MS;
  }, true);

  global.CASA_KEYBOARD_SHORTCUTS = Object.freeze({
    openAdjacentModule,
    openModuleNumber,
    toggleSelectedModule,
    closeModuleDetail,
    changeStage,
    clearNumericBuffer
  });
})(typeof window === "undefined" ? globalThis : window);
