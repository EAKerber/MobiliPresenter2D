# CP-SD-04A1 — module card affordance execution — 2026-10-07

Status: **COMPLETE / PASS**.

Parent:
- CP-SD-04A0 interaction affordance discovery — COMPLETE / PASS.

Discovery result:
- `docs/architecture/schema-driven-ui-cp-sd-04a0-interaction-affordance-discovery-result-2026-10-07.md`.

## Goal

Make the module card body inspect/open detail while keeping the checkbox as the only inclusion toggle target, with clear native pointer/keyboard semantics and no nested interactive controls.

## Allowed implementation

- keep `article.module-card` non-interactive;
- reduce `.module-card__toggle` to the checkbox hit area;
- move number/title/dimensions into one sibling inspection button;
- keep `data-select-entity` on the inspection button;
- replace the visually heavy “Ver” treatment with a subtle non-semantic visual affordance inside the inspection button;
- preserve existing inclusion/inspection state owners and delegated events;
- preserve blocked-checkbox behavior while keeping inspection enabled.

## Required behavior

- checkbox hit area -> inclusion only;
- inspection body -> detail only;
- disabled checkbox -> inspection still works;
- Tab order -> checkbox then inspection button, matching the existing two-control model;
- native Enter/Space on inspect button -> detail;
- existing custom module shortcuts remain unchanged;
- detail close restores focus to the inspect button;
- compact replace / stacked panes / PiP paths unchanged.

## Non-goals

Do not:
- turn the whole article into a button;
- introduce nested interactive controls;
- change module inclusion semantics;
- change detail content;
- change schema;
- write production configuration.

## Gates

- source DOM-shape assertion;
- pointer proof separating checkbox/body effects;
- disabled-checkbox inspection proof;
- Tab/Enter/Space semantics;
- focus-return proof;
- existing Keyboard browser regression;
- compact/stacked Flow layout regression;
- all repository workflows + Netlify preview green.


## Implementation result

Module-card interaction now projects the existing two semantic actions without overlap:

- `article.module-card` remains non-interactive;
- `.module-card__toggle` owns only the checkbox hit area;
- number/title/dimensions moved into sibling `button.module-card__inspect[data-select-entity]`;
- the separate visible “Ver” button treatment is retired in favor of a subtle non-semantic chevron;
- existing delegated inclusion and inspection event owners are unchanged;
- `data-select-entity`, `detailOrigin`, close-return, compact replace and profile transitions remain authoritative;
- blocked inclusion attenuates only the checkbox hit area; inspection remains available;
- runtime cache advances v35 -> v36.

## Gate-driven test corrections

Two Flow-browser failures were fixture issues rather than product regressions:

1. a manually disabled checkbox was expected to remain disabled after opening detail, but the card rerender correctly reconstructed state from the real model; the fixture now proves the checkbox is disabled **before** inspection and that the independent inspection button still opens detail;
2. the larger inspection-body button caused native `focus()` to auto-scroll the list pane before the historical stacked->compact round-trip snapshot; the transition fixture now focuses with `preventScroll: true` so it measures only the profile-transition scroll contract.

No runtime compensation was added for either test issue.

Final functional head `746e36d1eeb54a78849a3672d9bda22ea0506178` passed all eight repository workflows plus Netlify deploy preview #143.

## Next

Admin password reveal execution:
- `docs/backlog/schema-driven-ui-cp-sd-04a2-admin-password-reveal-execution-2026-10-07.md`.
