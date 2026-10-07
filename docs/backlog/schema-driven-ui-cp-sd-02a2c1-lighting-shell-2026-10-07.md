# CP-SD-02A2c1 — generated Lighting section shell — 2026-10-07

Status: **IN PROGRESS**.

Parent discovery:
- `docs/architecture/schema-driven-ui-cp-sd-02a2c0-lighting-discovery-result-2026-10-07.md`

Goal:
- remove Lighting's static semantic section shell while preserving its specialized item adapter unchanged.

## Mini-checkpoints

### A2c1.1 — shell generation + item-affinity slot — PASS

Only:
- replace the static Lighting section wrapper/heading with a hidden neutral slot;
- keep `#lightingToggle` and its current service-card content;
- move `data-flow-item-id="lighting-08"` to the specialized item control wrapper;
- add optional `data-flow-slot-item="lighting-08"` affinity to the neutral slot;
- extend generated-section slot matching:
  - prefer one compatible unclaimed affinity slot whose item belongs to the normalized section;
  - otherwise use one compatible unclaimed generic slot;
  - ambiguous/missing remains fail-closed;
- prove default Lighting section is generated with normalized id/label/behavior/component and current keyboard/card behavior remains intact.

No absence fixture yet.

#### A2c1.1 result

PASS on code head `8ddb538d34b75aa5b634a400f15412dc40001994`.

Focused gate:
- Flow layout browser run `37562199112` — PASS.

Proven:
- static HTML no longer owns Lighting section id/heading/behavior/component;
- normalized flow creates the Lighting section shell and heading;
- item-affinity slot matching selects the specialized `lighting-08` host without confusing it with the generic Additional Services toggle-list slot;
- `#lightingToggle` remains inside the generated section under explicit `data-flow-item-id="lighting-08"`;
- existing specialized Lighting state/dependency adapter was not changed.



### A2c1.2 — negative Lighting absence proof — PASS

Configuration keeps Services but omits `lighting-08`.

Prove:
- normalized flow has no `lighting` section;
- no semantic Lighting shell exists;
- neutral Lighting slot stays hidden;
- Lighting scene layer is not configurable/visible;
- Additional Services remains present;
- no renderer fallback/invariant error.

No new feature implementation beyond a correction directly exposed by this proof.

#### A2c1.2 result

PASS on code head `0891e00ca2a11be79c607e4ee47923c656441782`.

Focused gate:
- Flow layout browser run `37562335555` — PASS.

Proven with Services still present but `lighting-08` omitted:
- normalized flow contains no `lighting` section;
- zero semantic Lighting section shells exist;
- the specialized item-affinity slot remains hidden/unclaimed;
- Additional Services remains generated and visible;
- the `lighting-08` scene layer is not configurable/visible;
- renderer invariant errors remain empty;
- no page/console errors.



### A2c1.3 — regression only

Run current repository gates. No new functionality.

### A2c1.4 — closure only

Docs + merge. No new functionality.

## Invariants

- dependency data and `updateAccessoryControls()` remain unchanged;
- `lightingToggle` change action remains unchanged;
- scene/state/pricing/summary semantics remain unchanged;
- the static HTML no longer owns Lighting section id, label, keyboard behavior or component;
- the item adapter may still explicitly own `lighting-08`;
- no production write.
