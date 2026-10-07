# CP-SD-02A2h0 — stage navigation / core-dispatch residual discovery — 2026-10-07

Status: **COMPLETE / PASS**.

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


## Discovery result — PASS

Baseline:
- `main = 27bdc6b3926d34ac56f7283682ca64838c3fceac`;
- CP-SD-02A2g1 merged;
- no runtime or production write in A2h0.

### Residual classification

| Residual | Classification | Decision |
| --- | --- | --- |
| navigation `data-compact-label` map | responsive presentation copy | keep for now; exact `Acab.` / `Serv.` values are test-pinned; revisit with CP-SD-03 or an explicit presentation-copy contract |
| `stagePanels` kind -> DOM root map | renderer registry / visual adapter | keep; it maps normalized stage kind to a stable visual root but does not own order, availability or hierarchy |
| literal `mountStageGroups("finishes" ...)` | duplicate semantic stage-id authority | remove in A2h1 |
| literal `mountStageGroups("services" ...)` | duplicate semantic stage-id authority | remove in A2h1 |
| literal `mountStageGroups("summary" ...)` | duplicate semantic stage-id authority | remove in A2h1 |
| static `data-flow-group-grid="finishes/services/summary"` | duplicate semantic stage-id authority at renderer binding | neutralize/claim from actual normalized stage id in A2h1 |
| `moduleViewLayout(... "modules")`, Modules pane identity | presentation topology adapter | defer to CP-SD-03; the current presentation policy is itself keyed by `stageViews.modules` |
| `currentStep = "modules"` / module selection jump | coupled to the same Modules presentation identity | defer with Modules stage identity/topology to CP-SD-03 rather than partially generalizing it here |
| scene branches for Lighting / tempered glass | domain/scene adapter | outside CP-SD-02 |
| material group ids | domain/material adapter | outside CP-SD-02 |

### Why the generic dispatcher is a real authority leak

Current configuration validation and normalization distinguish:
- `stage.id`: document identity;
- `stage.kind`: semantic stage type.

For non-custom stages:
- duplicate **kinds** are rejected;
- ids only need to be unique/valid;
- legacy hierarchy lookup already tries `hierarchyDefaults.stages[stage.id] || hierarchyDefaults.stages[kind]`.

Therefore a valid Finishes, Services or Summary stage can retain its semantic kind while using a different id.

The buyer already supports this distinction in:
- `stagePanelFor(stage)`, which resolves core visual roots by `stage.kind`;
- `syncStep()`, which hides/shows core panels by active kind;
- navigation, which uses normalized `stage.id` for the step identity and normalized label/order for copy/order.

The remaining incompatibility is the group mount binding:
- `applyBuyerFlowLayout()` requests historical ids directly;
- `mountStageGroups(stageId, root)` searches a group grid with exactly that id;
- static markup pre-authors the same historical id in `data-flow-group-grid`.

That is the last non-Modules stage-level hierarchy identity duplicated in renderer code/markup.

### Modules boundary

Do not use A2h1 to partially generalize Modules.

Reasons:
- `ConfiguratorPresentation2D 1.1` currently keys the companion policy at `stageViews.modules`;
- `moduleViewLayout()` still embodies the accepted list/detail projection;
- CP-SD-03 explicitly owns master/detail companion projection, PiP and responsive shell behavior.

A later CP-SD-03 slice can decide whether Modules stage identity remains a reserved presentation-stage id or whether policy references move to kind/id-neutral binding.

### A2h1 proof strategy

Use a browser fixture with valid non-Modules core stage ids changed while preserving kinds:
- e.g. `finishes-layout` / kind `finishes`;
- `services-layout` / kind `services`;
- `review-layout` / kind `summary`;
- leave Modules id unchanged because its presentation policy is intentionally deferred.

Expected:
- normalized flow preserves the renamed ids and original kinds;
- navigation uses renamed ids;
- stable visual roots remain `#finishesStagePanel`, `#servicesPanel`, `#summaryPanel`;
- each neutral group grid is claimed with the actual normalized stage id;
- group/section/component bindings materialize normally;
- Summary remains mandatory/enabled by kind;
- no flow-layout/keyboard/page errors;
- current default ids remain visually and behaviorally unchanged.

## CP-SD-02 stop condition

After A2h1 passes:
- stage navigation source/order/labels are normalized-flow-owned;
- generic non-Modules core stages mount by normalized stage identity + kind registry rather than historical ids;
- group/section/item membership for Finishes/Services/Summary is normalized-flow-owned;
- missing/incompatible bindings fail closed;
- remaining Modules view topology/id coupling is explicitly presentation-policy work in CP-SD-03;
- remaining compact labels are responsive copy, not semantic hierarchy;
- remaining Lighting/material/pricing special cases are domain concerns in their own tracks.

At that point CP-SD-02 can be declared complete without generalizing product/domain adapters.
