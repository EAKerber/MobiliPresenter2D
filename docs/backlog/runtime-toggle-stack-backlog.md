# Housekeeping backlog — runtime, assets and repository hygiene

Items intentionally deferred from feature work. Completed cleanup is recorded only where it affects the remaining plan.

## P0 — CI maintenance

- **Rebaseline historical asset/fidelity gates**
  - `Candidate asset gates`, `Variant fidelity` and parts of `Module 02 fidelity` still contain source hashes/checkpoints from an older R0/R5/R6 lineage.
  - Current known failures include `source hash drift`, `canonical source drift` and `source components drift` for stone authoring inputs.
  - Rebaseline in a dedicated maintenance change after establishing which historical fixtures should remain replayable versus archival.
  - Do not refresh a baseline merely to make a red check green; preserve old evidence and make the authority transition explicit.

## P1 — asset / mask cleanup

- **Finish current reachability audit**
  - No visible stone/glass artifact currently requires another repair pass.
  - Inventory current `app/assets/kitchen/**` reachability, alpha occupancy and duplicate blobs.
  - Treat `technical-data.json`, generated inline mirrors and review docs as evidence, not automatic runtime reachability.
  - Remove only files proven unreachable/redundant and run browser composition gates afterwards.

- **Reconcile `audit/boundary-forensics`**
  - The branch still contains historical boundary/legacy diagnostic scripts.
  - Promote only a diagnostic that remains generally useful after the current reachability review; otherwise record the conclusion and prune the branch.

## P1 — repository / research hygiene

- **PR #34 deferred for product review**
  - Keep `feat/exposed-sides-and-glass` available.
  - The concept proved complex relative to general usability gain; do not promote it until product value is reconsidered.

- **Dispose remaining BMC04 research lineage**
  - Durable architecture knowledge has already been harvested to ADRs 0005–0008 on `main`.
  - Inspect the remaining branch for genuinely reusable generic tooling/evidence.
  - If no reusable implementation remains, prune/archive the branch rather than carrying a parallel experimental product tree.

- **Delete transient housekeeping/audit branches after readback**
  - Keep branch hygiene exact-SHA/fail-closed.
  - The earlier broad stale-branch backlog is mostly complete; only active/deferred/evidence-bearing branches should remain.

## P1 — published administration compatibility

- **Persist normalized legacy administration**
  - `runtime-contracts.js` now serves only as a compatibility/migration shim for old stage/default records.
  - Perform a one-time server-side normalization with readback once the currently published records and migration behavior are fully verified.
  - Remove the shim only after supported storage no longer depends on either repair path.

## P2 — schema / runtime generalization candidates

These are not current product bugs. Prefer evidence from a second furniture family before widening the schema.

- **Clarify stage availability semantics**
  - `stageHas(stageId,itemId)` currently ignores `stageId` and answers whether the item exists in any enabled stage.
  - Decide whether this should be explicitly named `itemIsConfigured`, with a separate stage-scoped predicate where placement matters.
  - Do not make it stage-scoped in place: services can intentionally live outside the Services stage.

- **Generalize linked-item validation only if reused**
  - `materialGroups[].linkedItemIds` is generic data, but the current validation rule is still specifically `stone-skirting` requires `stone-all`.
  - If another linked item appears, derive validation from the group relation rather than adding another ID exception.

- **Review fixed three-group material schema before the second furniture family**
  - Current admin intentionally requires `fronts-all`, `handles-all` and `stone-all`.
  - This is a valid kitchen invariant, not automatically a defect.
  - Generalize only when another furniture family needs a different topology.

- **Define declarative scene-bound service ownership**
  - Runtime has product-specific handling for scene-affecting options such as `tempered-glass` and `lighting-08`.
  - Before introducing more scene-bound services, define one catalog/service -> scene entity -> stage availability contract.

- **Move pricing scope metadata out of ID checks if a second case appears**
  - `stone-skirting` and lighting currently have product-specific global pricing semantics.
  - Prefer catalog/price-book metadata when multiple services share the pattern; do not refactor solely to remove a string comparison.

## P2 — UI/runtime infrastructure

- **Centralize scene z-index contract if scene range grows**
  - Scene entities use `scene-data.js`; UI overlays use CSS values (`grid=840`, `hotspots=860`, `selection=900`).
  - Browser tests protect the current ordering.
  - Introduce shared tokens/derived values before adding scene entities that can exceed the current `z=800` ceiling.

- **Broaden browser regression coverage**
  - Current gates cover stone/skirting/visibility/stacking and keyboard navigation.
  - Incrementally recover responsive/mobile, stage navigation, admin-published configuration and summary/pricing flows in dedicated tests rather than coupling all behavior to the stone gate.

## Completed / no longer backlog

- PR #32 was archived/closed without merge.
- Large stale branch families were pruned using exact-SHA dispositions.
- Legacy `#skirtingOverlay02/#skirtingOverlay03` painter and its SVG masks were removed after proving `plinthCanvas` ownership.
- `stone-skirting` was canonicalized as a real catalog service with default/stage metadata.
- Permanent stack CSS and keyboard loading were moved out of `runtime-contracts.js`.
- Reconstruction architecture ADRs 0005–0008 were preserved on `main` before research pruning.
