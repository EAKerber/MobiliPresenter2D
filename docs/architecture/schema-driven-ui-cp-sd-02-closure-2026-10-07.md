# CP-SD-02 — schema-driven buyer renderer closure — 2026-10-07

Status: **COMPLETE / PASS**.

Final functional checkpoint:
- CP-SD-02A2h1 / PR #130 functional head `306de22e89e9c12fa56b80bd618e2be48f412ee9`;
- all eight repository workflows PASS;
- Netlify deploy preview #130 PASS.

## What CP-SD-02 now proves

The buyer semantic hierarchy has one execution authority: normalized flow.

### Stage navigation

Normalized enabled stages own:
- existence;
- order;
- full labels;
- navigation step ids.

Static stage buttons no longer exist.

### Generic non-Modules core stage identity

Finishes, Services and Summary:
- select their stable visual root through the existing renderer registry keyed by semantic `stage.kind`;
- mount hierarchy using the actual normalized `stage.id`;
- no longer depend on historical ids in group-grid markup or dispatcher branches.

A valid fixture renamed those ids to:
- `finishes-layout`;
- `services-layout`;
- `review-layout`;

while preserving kinds. Navigation, stable visual roots, groups, sections and Summary semantics remained correct.

### Group and section ownership

Normalized flow owns group/section:
- existence;
- ids;
- labels where semantically applicable;
- order;
- behavior;
- component binding;
- item membership.

Finishes group shells, Fronts, Handles, Stone Packages, Stone Skirting, Lighting, Additional Services and the Summary semantic section are materialized through neutral renderer slots rather than pre-authored semantic shells.

Missing/incompatible bindings remain fail-closed.

### Services item membership/order

The generic Services checklist consumes the exact normalized section `itemIds`.

Catalog data supplies product copy/metadata only and no longer decides renderer membership/order.

## Deliberate residuals — not CP-SD-02 failures

### Modules companion topology -> CP-SD-03

Modules still has:
- `stageViews.modules` in presentation policy;
- specialized list/detail pane projection;
- Modules-specific presentation-stage identity.

This is responsive/view topology, explicitly owned by CP-SD-03.

### Compact navigation abbreviations -> CP-SD-03 / presentation copy

`Acab.` and `Serv.` are deliberate narrow-container copy and are test-pinned.

They do not choose stage semantics. No schema field was invented merely to move these strings.

### PiP, persistent dock and scroll ownership -> CP-SD-03

Frozen presentation policy already names these capabilities; execution/geometry remains the next track.

### Module-card/password interactions -> CP-SD-04

Interaction affordance work remains separate from hierarchy ownership.

### Pricing typing -> CP-SD-05

Amount/rate typing and basis remain pricing-contract work.

### Scene/service and material-group special cases

Lighting/tempered-glass scene branches and product material-group ids are domain adapters, not renderer hierarchy fallbacks.

### Production v3 consistency/publication

Authenticated housekeeping and eventual v3 -> consolidated v5 publication remain separate publication boundaries. CP-SD-02 made no production configuration write.

## Gate conclusion

PASS.

The renderer no longer needs another hierarchy-generalization pass before responsive presentation work.

Next:
- **CP-SD-03A0 — responsive presentation discovery**.
