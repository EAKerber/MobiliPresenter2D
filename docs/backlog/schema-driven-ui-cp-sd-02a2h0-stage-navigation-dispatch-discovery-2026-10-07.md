# CP-SD-02A2h0 — stage navigation / core-dispatch residual discovery — 2026-10-07

Status: **READY / NEXT — discovery only**.

Parent:
- CP-SD-02A0 residual renderer inventory;
- CP-SD-02A1 stage navigation source cleanup;
- CP-SD-02A2a–g1 removes group/section/item membership duplication for Services, Acabamentos and Summary.

Goal:
- re-audit the remaining buyer stage-level hardcodes and separate harmless presentation copy from true semantic/topology authority before the final CP-SD-02 cleanup slices.

## Known residuals to inspect

### Navigation compact copy

`renderStageNavigation()` currently sets:

`data-compact-label`

through a stage-kind object literal for:
- modules;
- finishes;
- services;
- summary;
- custom.

The full label/order already come from normalized enabled stages.

Questions:
- is compact copy a product-authored presentation field that belongs in policy/data;
- or can the UI safely derive it generically from `stage.label` without losing accepted compact geometry/readability;
- do current tests actually require exact abbreviations `Acab.` / `Serv.`;
- should this wait for CP-SD-03 because compact copy is responsive presentation rather than semantic hierarchy.

Do not add a schema field just to relocate a hardcode unless a genuine authored-copy requirement is proven.

### Core stage panel registry

`stagePanels` still maps the four core kinds to known DOM roots.

Questions:
- is that map semantic stage authority, or a legitimate renderer registry mapping normalized stage kind -> stable visual root;
- can core roots be discovered through generic `data-stage-kind` / `data-stage-root` markup without changing stage topology;
- how custom-stage roots fit the same lookup;
- whether removing the map would materially advance the CP-SD-02 gate.

### Buyer flow dispatcher

`applyBuyerFlowLayout()` still explicitly invokes known renderer paths for:
- finishes;
- services;
- modules;
- summary;
- custom stages.

Questions:
- which calls are now equivalent generic `mountStageGroups()` paths and can be iterated from normalized stages;
- which calls remain legitimately specialized (especially Modules view projection, deferred to CP-SD-03);
- whether Summary/Finishes/Services can be dispatched generically while Modules stays an explicit presentation-policy adapter;
- whether a registry is smaller/safer than stage-id branches.

### Adjacent non-layout hardcodes

Reconfirm but do not mix into this discovery:
- scene availability branches for `tempered-glass` / `lighting-08`;
- material group ids in `applyMaterialLibrary()`;
- Modules companion topology;
- PiP / bottom dock.

These may remain separate capability/domain or CP-SD-03 work.

## Gate for A2h0

Produce:
- updated residual matrix against current main;
- classification of each residual as semantic authority / presentation adapter / domain adapter / deferred CP-SD-03;
- smallest final CP-SD-02 slice(s), if any;
- explicit stop condition for declaring CP-SD-02 complete.

No runtime change, no production write.
