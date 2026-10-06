# CP-SD-01C2 — authored material semantics — 2026-10-06

Status: **NEXT / immediate implementation slice**.

Parent:
- `docs/backlog/schema-driven-ui-cp-sd-01c-contract-plan-2026-10-06.md`

Baseline:
- CP-SD-01C1 merged via PR #106 at `4e657f2e3a1761e93dd3195743109b5d08db0907`.
- no production configuration write is authorized by this checkpoint.

## Problem

The administration model currently requires every material to persist a hex color. During default construction, stone entries with intentionally absent source color are assigned a swatch/display fallback and that fallback becomes indistinguishable from authored color data.

Example:

```text
catalog stone-existing
  color = null
  swatchColor = #b7b0a7

current default administration
  material.color = #b7b0a7
```

That violates the schema/UI authority goal: a display fallback must not silently become authored domain data.

## Contract decision

For the current administration material record:

```text
color: "#rrggbb" | null
```

Rules:

- the `color` field must exist;
- a valid six-digit hex string means an authored tint/base color;
- explicit `null` means “no authored tint/color”;
- field absence is invalid;
- `kind: "color"` still requires an actual hex color;
- `kind: "texture"` may use either a hex color or `null`;
- null does not imply a texture must exist: an existing/base material may intentionally provide neither authored tint nor replacement texture;
- display-only swatches/fallback colors may be derived from catalog/rendering context but must never be written back into `material.color`.

No inheritance system is introduced.

## Legacy/current compatibility

This checkpoint does **not** rewrite already-authored current v3 values.

- if an input v3 material contains a hex color, normalization preserves that exact color;
- legacy migration keeps actual legacy colors;
- newly constructed defaults preserve source `null` instead of manufacturing a color from `swatchColor`;
- no automatic “cleanup” changes a persisted hex back to null.

That distinction avoids silently reinterpreting existing production content.

## Runtime/display boundary

Buyer runtime must preserve authored null while remaining visually safe.

For stone materials:

- `applyMaterialLibrary` sets catalog `color` from authored material color;
- UI-only `swatchColor` may fall back to the prior catalog swatch color when authored color is null;
- scene material descriptors already support `color: null` and no replacement texture;
- a null authored tint must not be replaced with an arbitrary runtime color.

For finish materials:

- current finish materials remain `kind: color` and therefore continue to require hex;
- existing masked-overlay rendering remains unchanged.

## Admin UX

The material editor must represent null explicitly instead of forcing a hidden color value.

Required behavior:

- texture materials expose a “Sem cor/tinta base” toggle;
- when enabled, `material.color = null` and the color input is disabled;
- disabling it restores a deterministic editor default **only as a new authored choice**; it does not happen automatically during load/normalization;
- solid-color materials cannot remain null: changing kind to `color` establishes a valid color if necessary;
- preview may use a neutral/display fallback without mutating the model;
- saving and reloading preserves explicit null.

Keep this minimal; no color inheritance or palette system.

## Implementation scope

Expected files:

- `app/core/configuration.js`
  - stop synthesizing stone authored color from swatch fallback;
  - validate field presence and `hex | null` rules;
  - preserve null through normalization/migrations.

- `app/admin/admin.js`
  - explicit null toggle;
  - safe color input/preview behavior.

- `app/app.js`
  - keep authored `color`;
  - derive stone `swatchColor` from previous catalog display metadata when authored color is null.

- focused unit/browser tests;
- current-state/backlog documentation.

## Required tests

Unit:

1. default `stone-existing` and `stone-light-sink` materials preserve `color: null`;
2. current default administration validates;
3. explicit null on a texture material survives normalization/round-trip;
4. missing `color` field fails validation;
5. invalid string fails validation;
6. `kind: color` + null fails validation;
7. an existing current v3 hex material remains unchanged;
8. catalog swatch fallback is not copied into authored material color.

Admin/browser:

9. null material renders without browser errors;
10. “Sem cor/tinta base” is reflected by the editor;
11. toggling null -> authored color -> null updates the model and save payload correctly;
12. current buyer visuals for existing published/default data remain unchanged;
13. Stone browser and current variant/asset gates remain green.

## Gate

PASS requires:

- app unit suite;
- Admin hierarchy browser;
- Stone browser;
- Flow layout browser;
- Keyboard browser;
- Mobile browser;
- Summary/Pricing browser;
- App build purity;
- Current asset gates;
- Current variant fidelity;
- Netlify deploy preview.

No production configuration write.

## Exit

After PASS, CP-SD-01C3 may freeze the consolidated unpublished `ConfiguratorAdministration2D 5.0` candidate using:

- semantic hierarchy;
- executable section presentation;
- companion/profile/shell policy;
- explicit material `hex | null` semantics.
