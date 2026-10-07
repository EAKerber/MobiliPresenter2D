# CP-SD-02A1 — stage navigation authority — 2026-10-07

Status: **COMPLETE / PASS**.

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


## Completion record

Result: **PASS** on reviewed code head `c8861c57c34817f9a97879f0a51926b0e3593fea` in PR #110.

Implemented:
- removed the four static buyer `.flow-step` buttons from `index.html`;
- `flow-layout.stageNavigation(normalizedFlow)` is the buyer navigation projection;
- startup renders navigation before the first buyer sync, so default/offline behavior does not depend on static markup;
- runtime configuration reloads rebuild the same navigation from the updated normalized flow;
- a disabled normalized stage is absent from the navigation projection;
- static `data-step` markup is now test-forbidden;
- current compact labels, order, `aria-controls`, keyboard behavior and scene pin remain unchanged;
- shared runtime cache revision advanced to `runtime-v15`.

Gates:
- App build purity — PASS;
- Current variant fidelity — PASS;
- Current asset gates — PASS;
- Flow layout browser — PASS;
- Keyboard browser — PASS;
- Mobile browser — PASS;
- Stone browser — PASS;
- Summary/Pricing browser — PASS;
- Netlify deploy preview #110 — PASS.

No production configuration write.

Next small checkpoint: **CP-SD-02A2 — generic core stage/group/section shell host**, limited to shell creation/reconciliation. Component content renderers remain unchanged.
