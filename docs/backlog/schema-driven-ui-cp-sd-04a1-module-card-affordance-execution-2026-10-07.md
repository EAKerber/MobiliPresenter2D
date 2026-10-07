# CP-SD-04A1 — module card affordance execution — 2026-10-07

Status: **READY / NEXT**.

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
