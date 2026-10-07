# CP-SD-02A2b — Additional Services section shell from normalized flow — 2026-10-07

Status: **IN PROGRESS**.

Parent:
- `docs/backlog/schema-driven-ui-cp-sd-02a2a-services-group-shell-2026-10-07.md`

Purpose:
- remove the static semantic shell for the single `additional-services` section;
- prove one section shell can be materialized from normalized section data while reusing its existing content renderer.

This checkpoint is intentionally limited to one section.

## Scope

Allowed changes:
- replace the static `additional-services` section wrapper with a neutral renderer slot containing the existing `#servicesChecklist` host;
- let `mountStageGroups()` materialize a section shell when a normalized section has no bound DOM section and exactly one compatible neutral slot exists;
- runtime-generated shell owns:
  - section id;
  - section label/heading;
  - keyboard behavior;
  - executable component binding;
  - generated/debug marker;
- keep `renderServices()` and its existing service-card content generation unchanged in this slice.

Out of scope:
- Lighting shell/control;
- changing service membership logic from stage-wide to exact section ownership;
- Acabamentos sections/groups;
- Summary;
- Modules companion;
- PiP/dock/pricing;
- production configuration.

## Neutral slot contract

Static HTML may retain a visual/content slot, but it must not name the semantic section:

```html
<div
  id="servicesChecklist"
  class="services-checklist"
  data-flow-section-slot
  data-flow-section-class="config-section service-section"
  data-render-component="toggle-list">
</div>
```

The slot is a renderer binding surface, not semantic ownership.

A normalized section may claim the slot only when:
- no existing semantic section element is bound;
- component matches exactly;
- the match is unambiguous.

Ambiguous or missing slots remain fail-closed renderer errors.

## Invariants

1. static HTML no longer contains `data-keyboard-section="additional-services"`;
2. static HTML no longer contains the “Serviços adicionais” heading copy;
3. runtime creates exactly one semantic `additional-services` shell from normalized data;
4. runtime heading comes from normalized section label;
5. generated shell component/behavior match normalized flow;
6. existing service cards remain unchanged;
7. if the normalized section is absent, the neutral slot is not visible as semantic UI;
8. Lighting remains unchanged;
9. no production write.

## Gate

- source test proves static semantic section/heading is gone;
- Flow layout browser proves generated section identity/label/component/behavior;
- Keyboard browser keeps additional-services navigation and ownership green;
- Services layout geometry unchanged across side-rail/stacked/compact;
- App build purity;
- Current variant fidelity;
- Current asset gates;
- Mobile;
- Stone;
- Summary/Pricing;
- Netlify preview.

Definition of done:
- `additional-services` exists in buyer DOM only because normalized flow materialized it.


## Mini-checkpoint A2b.1 — negative absence proof — PASS

Code head tested: `5cd392f1d24d4cbc013d11f9841706825881cb89`.

Purpose:
- prove the requested fail-closed rule directly: if normalized data does not contain `additional-services`, buyer UI must not invent it.

The first negative run exposed a real reconciliation residue:
- bootstrap default data created the generated section shell;
- the later fetched configuration correctly removed the section from normalized flow;
- the generated DOM shell was only hidden, not removed.

Correction kept intentionally narrow:
- generated section shells omitted by the new normalized flow are removed;
- their neutral renderer slot is returned to the grid and kept hidden for future reuse;
- static legacy section shells retain the prior hide-only behavior;
- failed browser assertions now terminate the harness immediately instead of leaving Chromium alive until workflow timeout.

Focused proof:
- `Flow layout browser` run `37561244998` — **PASS**;
- omitted normalized section creates zero `[data-keyboard-section="additional-services"]` nodes;
- `#servicesChecklist` remains hidden while unclaimed;
- renderer invariant errors remain empty;
- negative fixture has no browser console/page errors.

Runtime cache revision after the reconciliation fix: `runtime-v18`.

Next mini-checkpoint: **A2b.2 — regression-only gate pass.** No new functionality should be added there.
