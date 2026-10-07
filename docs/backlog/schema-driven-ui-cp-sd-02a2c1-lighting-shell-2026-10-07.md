# CP-SD-02A2c1 — generated Lighting section shell — 2026-10-07

Status: **IN PROGRESS**.

Parent discovery:
- `docs/architecture/schema-driven-ui-cp-sd-02a2c0-lighting-discovery-result-2026-10-07.md`

Goal:
- remove Lighting's static semantic section shell while preserving its specialized item adapter unchanged.

## Mini-checkpoints

### A2c1.1 — shell generation + item-affinity slot — ACTIVE

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

### A2c1.2 — negative Lighting absence proof

Configuration keeps Services but omits `lighting-08`.

Prove:
- normalized flow has no `lighting` section;
- no semantic Lighting shell exists;
- neutral Lighting slot stays hidden;
- Lighting scene layer is not configurable/visible;
- Additional Services remains present;
- no renderer fallback/invariant error.

No new feature implementation beyond a correction directly exposed by this proof.

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
