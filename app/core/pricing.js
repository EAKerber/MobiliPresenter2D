(function registerPricingCore(global) {
  "use strict";

  function amountRule(rules, role, id) {
    const rule = rules?.roles?.[role]?.[id];
    return rule?.type === "amount" && Number.isSafeInteger(rule.cents) ? rule : null;
  }

  function amountCents(rules, role, id) {
    return amountRule(rules, role, id)?.cents || 0;
  }

  function finishAdjustment(rule, baseCents) {
    if (!rule) return Object.freeze({ type: null, cents: 0, bps: 0, basis: null, amountCents: 0 });
    if (rule.type === "amount" && Number.isSafeInteger(rule.cents)) {
      return Object.freeze({ type: "amount", cents: rule.cents, bps: 0, basis: null, amountCents: rule.cents });
    }
    if (rule.type === "percentage"
      && rule.basis === "eligible-module-base"
      && Number.isSafeInteger(rule.bps)) {
      return Object.freeze({
        type: "percentage",
        cents: Math.round((baseCents * rule.bps) / 10000),
        bps: rule.bps,
        basis: rule.basis,
        amountCents: 0
      });
    }
    return Object.freeze({ type: null, cents: 0, bps: 0, basis: null, amountCents: 0 });
  }

  function distributeCents(totalCents, count) {
    if (!Number.isSafeInteger(totalCents) || !Number.isInteger(count) || count < 1) return Object.freeze([]);
    const base = Math.trunc(totalCents / count);
    const remainder = totalCents - base * count;
    return Object.freeze(Array.from({ length: count }, (_, index) => base + (index < remainder ? 1 : 0)));
  }

  function globalFinishId(state) {
    return state.globalSelections?.finishId || "base-light";
  }

  function globalHandleId(state) {
    return state.globalSelections?.handleId || "none";
  }

  function itemEstimate(item, catalog, state, pricingRules) {
    const baseRule = amountRule(pricingRules, "itemBase", item.entityId);
    if (!baseRule) {
      return Object.freeze({ status: "unavailable", totalCents: null, baseCents: null, handleCents: 0, finishCents: 0, localCents: 0 });
    }

    const baseCents = baseRule.cents;
    const finishId = state.localSelections?.finishByEntityId?.[item.entityId] || globalFinishId(state);
    const finishRule = item.commercial?.finishEligible
      ? pricingRules?.roles?.frontFinishAdjustment?.[finishId]
      : null;
    const finish = finishAdjustment(finishRule, baseCents);
    const localIds = item.commercial?.mandatoryLocalChargeIds || [];
    const localCents = localIds.reduce(
      (total, id) => total + amountCents(pricingRules, "localAdjustment", item.entityId + ":" + id),
      0
    );

    return Object.freeze({
      status: "ready",
      baseCents,
      finishId,
      finishRuleType: finish.type,
      finishRateBps: finish.bps,
      finishBasis: finish.basis,
      finishAmountCents: finish.amountCents,
      finishCents: finish.cents,
      handleId: globalHandleId(state),
      handleCents: 0,
      handleFrontCount: Number.isInteger(item.commercial?.handleFrontCount) ? item.commercial.handleFrontCount : 0,
      localCents,
      localChargeIds: Object.freeze([...localIds]),
      totalCents: baseCents + finish.cents + localCents
    });
  }

  function globalAdjustments(state, pricingRules, lightingEnabled) {
    const selected = state.globalSelections || {};
    const items = [];
    const stoneId = selected.stonePackageId || "stone-existing";
    items.push({ id: stoneId, scope: "stone", cents: amountCents(pricingRules, "globalAdjustment", stoneId) });
    (selected.serviceIds || []).forEach((id) => items.push({
      id,
      scope: id === "stone-skirting" ? "stone" : "service",
      cents: amountCents(pricingRules, "globalAdjustment", id)
    }));
    if (lightingEnabled) {
      items.push({
        id: "lighting-08",
        scope: "service",
        cents: amountCents(pricingRules, "itemBase", "lighting-08")
      });
    }
    return Object.freeze({ items: Object.freeze(items), totalCents: items.reduce((total, item) => total + item.cents, 0) });
  }

  function handleAllocations(catalog, state, pricingRules) {
    const id = globalHandleId(state);
    const totalCents = amountCents(pricingRules, "handleChoiceTotal", id);
    const frontTotal = Number.isSafeInteger(pricingRules?.allocation?.handleFrontTotal)
      ? pricingRules.allocation.handleFrontTotal
      : 0;
    const perFront = distributeCents(totalCents, frontTotal);
    let cursor = 0;
    const result = new Map();
    catalog.modules.forEach((item) => {
      const count = item.commercial?.handleEligible ? Number(item.commercial?.handleFrontCount) || 0 : 0;
      result.set(item.entityId, perFront.slice(cursor, cursor + count).reduce((sum, cents) => sum + cents, 0));
      cursor += count;
    });
    return result;
  }

  function calculatePublicEstimate(scene, state, catalog, resolvedVisibility, pricingRules, metadata = {}) {
    const visibleIds = new Set(
      scene.entities
        .filter((entity) => resolvedVisibility?.[entity.id]?.visible)
        .map((entity) => entity.id)
    );
    const moduleEntries = catalog.modules
      .filter((item) => visibleIds.has(item.entityId))
      .map((item) => ({ item, estimate: itemEstimate(item, catalog, state, pricingRules) }));
    const missingPriceIds = moduleEntries
      .filter(({ estimate }) => estimate.status === "unavailable")
      .map(({ item }) => item.entityId);
    if (missingPriceIds.length) return Object.freeze({ status: "unavailable", totalCents: null, missingPriceIds });

    const global = globalAdjustments(
      state,
      pricingRules,
      Boolean(resolvedVisibility?.["lighting-08"]?.visible)
    );
    const handlesByItem = handleAllocations(catalog, state, pricingRules);
    const moduleEstimates = moduleEntries.map(({ item, estimate }) => {
      const handleCents = handlesByItem.get(item.entityId) || 0;
      return Object.freeze({
        item,
        estimate: Object.freeze({
          ...estimate,
          handleCents,
          // Global choices belong to the composition, never to a module.
          totalCents: estimate.baseCents + estimate.finishCents + estimate.localCents + handleCents
        })
      });
    });
    const modulesCents = moduleEstimates.reduce((total, entry) => total + entry.estimate.baseCents, 0);
    const finishesCents = moduleEstimates.reduce((total, entry) => total + entry.estimate.finishCents, 0);
    const handlesCents = moduleEstimates.reduce((total, entry) => total + entry.estimate.handleCents, 0);
    const localCents = moduleEstimates.reduce((total, entry) => total + entry.estimate.localCents, 0);
    const totalCents = modulesCents + finishesCents + handlesCents + localCents + global.totalCents;

    return Object.freeze({
      status: "estimate",
      totalCents,
      label: metadata.label || "Estimativa da composição",
      disclaimer: metadata.disclaimer || "",
      missingPriceIds: [],
      moduleEstimates: Object.freeze(moduleEstimates),
      global,
      breakdown: Object.freeze({
        modulesCents,
        finishesCents,
        handlesCents,
        localCents,
        globalCents: global.totalCents
      })
    });
  }

  global.CasaModulesPricing = Object.freeze({
    calculatePublicEstimate,
    distributeCents,
    globalAdjustments,
    itemEstimate
  });
})(window);
