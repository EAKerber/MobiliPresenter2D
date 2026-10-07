(function registerPricingContract(global) {
  "use strict";

  const SCHEMA = "CommercialPricingRules 1.0";
  const AMOUNT_MAX_CENTS = 100000000;
  const PERCENTAGE_MAX_BPS = 10000;
  const PERCENTAGE_BASES = Object.freeze(["eligible-module-base"]);
  const ROLE_NAMES = Object.freeze([
    "itemBase",
    "handleChoiceTotal",
    "frontFinishAdjustment",
    "localAdjustment",
    "globalAdjustment"
  ]);
  const ROLE_CAPABILITIES = Object.freeze({
    itemBase: Object.freeze({ types: Object.freeze(["amount"]) }),
    handleChoiceTotal: Object.freeze({ types: Object.freeze(["amount"]) }),
    frontFinishAdjustment: Object.freeze({
      types: Object.freeze(["amount", "percentage"]),
      percentageBases: PERCENTAGE_BASES
    }),
    localAdjustment: Object.freeze({ types: Object.freeze(["amount"]) }),
    globalAdjustment: Object.freeze({ types: Object.freeze(["amount"]) })
  });

  const LEGACY_ROLE_MAP = Object.freeze({
    entries: "itemBase",
    handleEntries: "handleChoiceTotal",
    frontFinishRatesBps: "frontFinishAdjustment",
    localEntries: "localAdjustment",
    globalEntries: "globalAdjustment"
  });
  const LEGACY_KEYS = Object.freeze([...Object.keys(LEGACY_ROLE_MAP), "handleFrontTotal"]);

  function isRecord(value) {
    return Boolean(value && typeof value === "object" && !Array.isArray(value));
  }

  function unexpectedKeys(value, allowed) {
    if (!isRecord(value)) return [];
    const allowedSet = new Set(allowed);
    return Object.keys(value).filter((key) => !allowedSet.has(key));
  }

  function validAmount(value) {
    return Number.isSafeInteger(value) && value >= 0 && value <= AMOUNT_MAX_CENTS;
  }

  function validBps(value) {
    return Number.isSafeInteger(value) && value >= 0 && value <= PERCENTAGE_MAX_BPS;
  }

  function validateRule(role, id, rule, errors) {
    const path = `roles.${role}.${id}`;
    if (!isRecord(rule)) {
      errors.push(`invalid pricing rule: ${path}`);
      return;
    }

    const capabilities = ROLE_CAPABILITIES[role];
    if (!capabilities?.types.includes(rule.type)) {
      errors.push(`unsupported pricing rule type: ${path}`);
      return;
    }

    if (rule.type === "amount") {
      if (unexpectedKeys(rule, ["type", "cents"]).length) errors.push(`unexpected amount fields: ${path}`);
      if (!validAmount(rule.cents)) errors.push(`invalid amount cents: ${path}`);
      return;
    }

    if (unexpectedKeys(rule, ["type", "bps", "basis"]).length) errors.push(`unexpected percentage fields: ${path}`);
    if (!validBps(rule.bps)) errors.push(`invalid percentage bps: ${path}`);
    if (!capabilities.percentageBases?.includes(rule.basis)) errors.push(`unsupported percentage basis: ${path}`);
  }

  function validate(value) {
    const errors = [];
    if (!isRecord(value)) return ["pricing contract is required"];
    if (value.schemaVersion !== SCHEMA) errors.push("unsupported pricing schema");
    unexpectedKeys(value, ["schemaVersion", "roles", "allocation"])
      .forEach((key) => errors.push(`unknown pricing field: ${key}`));

    if (!isRecord(value.roles)) {
      errors.push("pricing roles are required");
    } else {
      unexpectedKeys(value.roles, ROLE_NAMES)
        .forEach((role) => errors.push(`unknown pricing role: ${role}`));
      ROLE_NAMES.forEach((role) => {
        const entries = value.roles[role];
        if (!isRecord(entries)) {
          errors.push(`pricing role is required: ${role}`);
          return;
        }
        Object.entries(entries).forEach(([id, rule]) => {
          if (!id.trim()) {
            errors.push(`invalid pricing id: ${role}`);
            return;
          }
          validateRule(role, id, rule, errors);
        });
      });
    }

    if (!isRecord(value.allocation)) {
      errors.push("pricing allocation is required");
    } else {
      unexpectedKeys(value.allocation, ["handleFrontTotal"])
        .forEach((key) => errors.push(`unknown pricing allocation: ${key}`));
      if (!Number.isSafeInteger(value.allocation.handleFrontTotal) || value.allocation.handleFrontTotal < 1) {
        errors.push("invalid handle front total");
      }
    }

    return [...new Set(errors)];
  }

  function cloneRule(rule) {
    return rule.type === "amount"
      ? { type: "amount", cents: rule.cents }
      : { type: "percentage", bps: rule.bps, basis: rule.basis };
  }

  function normalize(value) {
    const errors = validate(value);
    if (errors.length) throw new TypeError(errors.join("; "));
    return {
      schemaVersion: SCHEMA,
      roles: Object.fromEntries(ROLE_NAMES.map((role) => [
        role,
        Object.fromEntries(Object.entries(value.roles[role]).map(([id, rule]) => [id, cloneRule(rule)]))
      ])),
      allocation: { handleFrontTotal: value.allocation.handleFrontTotal }
    };
  }

  function legacyErrors(value) {
    const errors = [];
    if (!isRecord(value)) return ["legacy pricing is required"];
    unexpectedKeys(value, LEGACY_KEYS)
      .forEach((key) => errors.push(`unknown legacy pricing field: ${key}`));

    Object.keys(LEGACY_ROLE_MAP).forEach((section) => {
      if (!isRecord(value[section])) {
        errors.push(`legacy pricing section is required: ${section}`);
        return;
      }
      Object.entries(value[section]).forEach(([id, amount]) => {
        if (!id.trim()) {
          errors.push(`invalid legacy pricing id: ${section}`);
          return;
        }
        if (section === "frontFinishRatesBps") {
          if (!validBps(amount)) errors.push(`invalid legacy percentage: ${section}.${id}`);
        } else if (!validAmount(amount)) {
          errors.push(`invalid legacy amount: ${section}.${id}`);
        }
      });
    });

    if (!Number.isSafeInteger(value.handleFrontTotal) || value.handleFrontTotal < 1) {
      errors.push("invalid legacy handle front total");
    }
    return [...new Set(errors)];
  }

  function upgradeLegacy(value) {
    const errors = legacyErrors(value);
    if (errors.length) throw new TypeError(errors.join("; "));

    const roles = Object.fromEntries(ROLE_NAMES.map((role) => [role, {}]));
    Object.entries(LEGACY_ROLE_MAP).forEach(([section, role]) => {
      Object.entries(value[section]).forEach(([id, amount]) => {
        roles[role][id] = section === "frontFinishRatesBps"
          ? { type: "percentage", bps: amount, basis: "eligible-module-base" }
          : { type: "amount", cents: amount };
      });
    });

    return normalize({
      schemaVersion: SCHEMA,
      roles,
      allocation: { handleFrontTotal: value.handleFrontTotal }
    });
  }

  function projectToLegacy(value) {
    const errors = validate(value);
    if (errors.length) return { ok: false, code: "invalid_pricing", errors };

    const normalized = normalize(value);
    const nonRepresentable = Object.entries(normalized.roles.frontFinishAdjustment)
      .filter(([, rule]) => rule.type !== "percentage" || rule.basis !== "eligible-module-base")
      .map(([id]) => id);
    if (nonRepresentable.length) {
      return {
        ok: false,
        code: "pricing_requires_publication",
        errors: [`legacy pricing cannot represent front finish amount rules: ${nonRepresentable.join(", ")}`]
      };
    }

    const legacy = {
      entries: {},
      handleEntries: {},
      frontFinishRatesBps: {},
      localEntries: {},
      globalEntries: {},
      handleFrontTotal: normalized.allocation.handleFrontTotal
    };

    Object.entries(normalized.roles.itemBase).forEach(([id, rule]) => { legacy.entries[id] = rule.cents; });
    Object.entries(normalized.roles.handleChoiceTotal).forEach(([id, rule]) => { legacy.handleEntries[id] = rule.cents; });
    Object.entries(normalized.roles.frontFinishAdjustment).forEach(([id, rule]) => { legacy.frontFinishRatesBps[id] = rule.bps; });
    Object.entries(normalized.roles.localAdjustment).forEach(([id, rule]) => { legacy.localEntries[id] = rule.cents; });
    Object.entries(normalized.roles.globalAdjustment).forEach(([id, rule]) => { legacy.globalEntries[id] = rule.cents; });

    return { ok: true, value: legacy };
  }

  const api = Object.freeze({
    SCHEMA,
    AMOUNT_MAX_CENTS,
    PERCENTAGE_MAX_BPS,
    PERCENTAGE_BASES,
    ROLE_NAMES,
    ROLE_CAPABILITIES,
    validate,
    normalize,
    upgradeLegacy,
    projectToLegacy
  });

  if (typeof module !== "undefined" && module.exports) module.exports = api;
  if (global && typeof global === "object") global.CasaModulesPricingContract = api;
})(typeof globalThis === "undefined" ? this : globalThis);
