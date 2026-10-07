# CP-SD-05A3a — v5 typed pricing ownership execution — 2026-10-07

Status: **COMPLETE / PASS**.

Parent:
- CP-SD-05A0 typed pricing discovery — COMPLETE / PASS.
- CP-SD-05A1 typed pricing contract — COMPLETE / PASS.
- CP-SD-05A2 typed buyer runtime — COMPLETE / PASS.

## Goal

Make unpublished `ConfiguratorAdministration2D 5.0` own `CommercialPricingRules 1.0` as its canonical pricing field, while preserving the current admin pricing UI behavior and exact v3 projection for representable states.

This slice changes administration ownership, **not** the user-facing ability to switch a finish between amount and percentage. That selector is deferred to CP-SD-05A3b.

## Why split A3

Changing the v5 persistence model and adding a new authoring interaction at the same time would make a failure ambiguous.

A3a therefore proves:

1. v3/v4 pricing migrates into typed v5 exactly;
2. current admin rows can read/edit the typed rules with the same visible units they have today;
3. unchanged/representable typed v5 still projects exactly to v3;
4. non-representable typed pricing fails closed;
5. no production v5 publication occurs.

Only after that gate passes should A3b expose the type selector.

## Canonical v5 field

The existing top-level `pricing` field remains the administration pricing slot, but its v5 value becomes the typed contract itself:

```js
{
  schemaVersion: "ConfiguratorAdministration2D 5.0",
  // ...
  pricing: {
    schemaVersion: "CommercialPricingRules 1.0",
    roles: { ... },
    allocation: { handleFrontTotal: 14 }
  }
}
```

v5 must not retain parallel legacy bucket fields as a second pricing authority.

## v3/v4 -> v5 migration

When upgrading a v3/v4 source:

- read its legacy `pricing` buckets;
- call `pricingContract.upgradeLegacy()`;
- store only the normalized typed result in v5 `pricing`.

Current cents, BPS, IDs, zero values and handle allocation must remain exact.

## v5 normalization / validation

v5 normalization must call `pricingContract.normalize(value.pricing)`.

v5 validation must:

- include all `pricingContract.validate()` errors;
- preserve current catalog/material/finish pricing-identifier validation;
- permit a valid typed front-finish amount rule even though v3 cannot represent it;
- never reinterpret an amount as BPS or vice versa.

If a legacy-shaped surrogate is needed solely to reuse v3/v4 **identifier** validation, it must be explicitly local to validation and must never become calculator, authoring or publication authority.

## v5 -> v4/v3 projection

Publication projection must call `pricingContract.projectToLegacy(value.pricing)`.

If pricing projection returns:

- `ok: true`: inject those exact legacy buckets into the v4/v3 candidate and continue the existing hierarchy/presentation losslessness proof;
- `pricing_requires_publication`: return that structured code unchanged;
- `invalid_pricing`: fail closed as invalid current administration.

A front-finish amount rule is the required non-representable proof.

## Publication signature

The v5 publication signature must include normalized typed pricing in addition to hierarchy/presentation. A representable pricing edit must round-trip exactly; an unrepresentable edit must be blocked before legacy publication.

## Admin compatibility in A3a

The admin already edits a v5 model. A3a must adapt it to typed pricing without adding a new type selector yet.

Required behavior:

- pricing sections are keyed by typed role, not legacy bucket name;
- each row reads its unit/value from the rule itself;
- amount rows edit `cents`;
- percentage rows edit `bps`;
- current front finishes remain percentage rows after migration;
- current amount-only roles remain currency rows;
- material add/remove reconciliation updates typed role maps;
- current labels and commercial values remain unchanged.

This removes bucket-name type authority from the live admin model while preserving the accepted UI.

## Script / dependency boundary

Admin must explicitly load `core/pricing-contract.js` before `core/administration-v5.js` and before the admin module.

Node v5 tests must require the same core directly.

## Required gates

### Core

- v3 -> v5 pricing equals `pricingContract.upgradeLegacy(v3.pricing)`;
- v4 -> v5 converges to the same typed pricing;
- v5 normalization is idempotent including pricing;
- current v5 -> v3 projection is exact;
- representable item/base/global/local/percentage edits project exactly;
- valid front-finish amount validates as v5 but returns `pricing_requires_publication` on legacy projection;
- invalid typed rules fail v5 validation;
- bogus pricing identifiers still fail structural/catalog validation;
- v5 publication signature changes when typed pricing changes.

### Admin

- existing pricing rows render from typed roles;
- current percentage rows display percent and amount rows display BRL;
- editing current rows mutates the corresponding typed field;
- no legacy `priceSections` bucket/type convention remains;
- no amount/percentage selector exists yet;
- existing hierarchy and Puxadores persistence browser gates stay green.

## Preserve

Do not change:

- buyer typed calculation behavior established in A2;
- commercial values;
- rounding;
- handle allocation;
- current visible pricing labels;
- production endpoint acceptance;
- v3 isolated Puxadores repair;
- hierarchy/presentation semantics.

## Production boundary

No v5 PUT and no production configuration write.

Current save behavior may continue to publish only when the complete v5 model is losslessly projectable to current v3. A typed front-finish amount rule must block that projection.

## Next slice

**CP-SD-05A3b** — expose the amount/percentage selector only for `frontFinishAdjustment`, derive allowed choices from `ROLE_CAPABILITIES`, show the explicit basis for percentage, and switch type without implicit numeric-unit conversion.


## Result

Implemented on PR #148:

- unpublished `ConfiguratorAdministration2D 5.0` now owns `CommercialPricingRules 1.0` in its canonical `pricing` field;
- v3/v4 imports migrate legacy buckets exactly through `pricingContract.upgradeLegacy()`;
- v5 normalization validates/normalizes typed pricing;
- v5 structural/catalog validation keeps existing identifier gates through a validation-only legacy-shaped surrogate, never used for calculation or publication;
- v5 publication projects pricing through `pricingContract.projectToLegacy()` before the existing hierarchy/presentation losslessness proof;
- valid front-finish amount rules are accepted by v5 but return `pricing_requires_publication` instead of being coerced to BPS;
- typed pricing participates in the v5 publication signature;
- admin pricing rows now render/edit typed role maps and derive BRL/% from each rule's own `type`;
- material add/remove reconciliation writes typed rules;
- no legacy bucket-name/type convention remains in the live admin model;
- current admin UI intentionally has no type selector yet.

The production build still generates `admin/admin.bundle.js` from `admin/admin.js` through the root esbuild command; no generated bundle is committed.

Functional head `a39e416dfcdbe6ac0f137a92fad8aca562333d42` passed all seven path-triggered repository workflows plus Netlify deploy preview #148. Admin hierarchy browser also proved exact current typed amount/percentage edits project to v3 and the isolated Puxadores persistence path remains green.

No v5 production publication or production configuration write was added.

Next: `docs/backlog/schema-driven-ui-cp-sd-05a3b-admin-pricing-type-authoring-execution-2026-10-07.md`.
