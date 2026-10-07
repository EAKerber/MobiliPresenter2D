# CP-SD-02A1 — stage navigation authority — 2026-10-07

Status: **IN PROGRESS**.

Parent:
- `docs/architecture/schema-driven-ui-cp-sd-02a0-renderer-inventory-2026-10-07.md`

Purpose:
- remove the duplicate static buyer stage list from `app/index.html`;
- make normalized enabled stages the only semantic source for buyer stage navigation.

## Scope

Only stage navigation.

Changes allowed:
- remove the four pre-authored `.flow-step` buttons from HTML;
- keep the scene re-pin control;
- ensure startup renders navigation from the current normalized flow/configuration before user interaction;
- keep existing stage order, labels, compact labels, keyboard traversal and `aria-controls`;
- add a focused negative fixture proving an omitted/disabled stage has no navigation item.

Explicitly out of scope:
- group/section shell generation;
- Modules companion;
- PiP;
- bottom dock;
- pricing;
- component renderers;
- production configuration.

## Invariants

1. no buyer stage button exists solely because it is present in static HTML;
2. every visible stage button corresponds to one enabled normalized stage;
3. stage order follows normalized stage order;
4. current production/default data renders the same four buyer stages in the same order;
5. if a stage is omitted/disabled in test data, its nav item is absent;
6. the scene pin control remains intact;
7. no production write.

## Gate

- focused unit/browser assertion for data-driven stage navigation;
- Keyboard browser;
- Flow layout browser;
- Mobile browser;
- App build purity;
- Current variant fidelity;
- Current asset gates;
- Stone browser;
- Summary/Pricing browser;
- Netlify preview.

Definition of done:
- no static `data-step="modules|finishes|services|summary"` buttons remain in `index.html`;
- runtime is the only creator of buyer stage buttons;
- all current gates pass unchanged.
