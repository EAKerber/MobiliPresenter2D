# CP-SD-03A0 — responsive presentation discovery — 2026-10-07

Status: **READY / NEXT — discovery only**.

Parent:
- CP-SD-01C frozen view/profile/shell presentation contract;
- CP-SD-02 renderer hierarchy closure — PASS.

Goal:
- compare the frozen presentation policy with the current buyer implementation and split CP-SD-03 into the smallest safe execution slices before changing responsive topology.

No runtime change in A0.

## Audit surfaces

### Modules companion

Inspect:
- `presentationPolicy.stageViews.modules`;
- `flowLayout.moduleViewLayout()`;
- static `data-stage-view-layout="modules"` panes;
- selection/detail state;
- independent pane scroll behavior.

Determine exactly which topology decisions still live in hardcoded JS/DOM instead of the frozen view relation + per-profile projection.

Do not change module-card interaction policy; that belongs to CP-SD-04.

### Layout profiles

Inspect the executable relationship between:
- `side-rail`;
- `stacked`;
- `compact`;
- `layout-profiles.js`;
- CSS/media/container rules;
- runtime profile markers.

Separate application topology from legitimate local component breakpoints.

### PiP

Compare current mobile/stacked scene behavior with:
- policy `scene.pip.availableProfiles`;
- `activationByProfile`;
- existing pin/mini/transparency/resize state.

Identify the smallest policy-execution gap. Preserve transient position/size/transparency outside published schema.

### Persistent bottom dock

Compare current `.flow-actions` behavior with:
- policy `shell.bottomDock.enabled`;
- slots `estimate` and `primary-action`;
- actual configurator scroll ownership and bottom clearance.

Do not implement geometry in discovery.

### Scroll ownership / window leakage

Audit:
- Modules list/detail independent scrollers;
- keyboard section scrolling;
- window-scroll fallback;
- panel/drawer behavior around profile transitions;
- last-content clearance relative to future persistent dock.

## Outputs

Produce:
- current-policy-to-runtime matrix;
- classification of each gap as topology / shell / transient state / local CSS / interaction;
- smallest recommended first implementation slice;
- stop/split gates for later PiP and dock work.

Likely candidates may be:
1. Modules companion projection from presentation policy;
2. profile-driven PiP availability/activation;
3. bottom dock + explicit scroll clearance.

Do not freeze this ordering until the discovery evidence supports it.

## Guardrails

- no semantic hierarchy ownership change;
- no production configuration write;
- no pricing/state/domain migration;
- no CP-SD-04 interaction changes;
- no new presentation schema field unless the frozen contract is demonstrably insufficient.

## Gate

A0 passes when:
- no critical responsive unknown remains;
- policy-vs-runtime gaps are mapped to exact code/DOM/CSS surfaces;
- the first implementation checkpoint is narrow enough to review and browser-test independently.
