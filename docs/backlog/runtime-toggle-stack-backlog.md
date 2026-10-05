# Housekeeping backlog — near-official candidate

Remaining work after the 2026-10-05 cleanup. Completed historical cleanup is summarized at the end so active backlog stays small.

## P1 — published administration compatibility

- **Persist normalized `stone-skirting` stage assignment**
  - Production is `ConfiguratorAdministration2D 3.0`, revision 3.
  - `stone-all` is assigned to `finishes` and `stone-skirting` is selected by default, but the published stage list still omits `stone-skirting`.
  - Current runtime repair therefore still mutates the published record in memory.
  - Perform one authenticated admin PUT that adds only `stone-skirting` beside `stone-all`, preserving all other administration choices and respecting revision conflict protection.
  - Read back production and prove the repair becomes a no-op before removing the compatibility shim.
  - Do **not** auto-add `handles-all`; its absence may be an intentional administration choice.
  - Evidence: `docs/architecture/published-config-compat-audit-2026-10-05.md`.

## P1 — deferred product branch

- **PR #34 product review**
  - Keep `feat/exposed-sides-and-glass` available.
  - The exposed-side/glass concept proved complex relative to its general usability gain.
  - Do not promote or delete it until product value is reconsidered.

## P2 — schema / runtime generalization candidates

These are not current product bugs. Prefer evidence from a second furniture family before widening the schema.

- **Clarify stage availability semantics**
  - `stageHas(stageId,itemId)` currently behaves as an item-configured predicate rather than a truly stage-scoped predicate.
  - Rename/split only when a second use case requires the distinction; do not silently change current semantics.

- **Generalize linked-item validation only if reused**
  - `materialGroups[].linkedItemIds` is generic data, but current behavior is proven mainly by `stone-all -> stone-skirting`.
  - Derive generic validation from the relation when another linked item appears instead of adding another ID exception.

- **Review fixed material-group topology before a second furniture family**
  - `fronts-all`, `handles-all` and `stone-all` are valid kitchen invariants today.
  - Generalize when another furniture family demonstrates a different topology.

- **Define declarative scene-bound service ownership**
  - Scene-affecting options such as tempered glass and lighting still have product-specific ownership semantics.
  - Before adding more such services, define a catalog/service -> scene entity -> stage availability contract.

- **Move pricing scope metadata out of ID checks when a second case appears**
  - Current product-specific global pricing works and is tested.
  - Promote it to catalog/price-book metadata only after repeated cases justify the abstraction.

## P2 — UI/runtime infrastructure

- **Centralize scene z-index contract if the scene range grows**
  - Scene entities and UI overlays currently have separate authorities; browser tests protect `scene < grid < hotspots < selection`.
  - Introduce shared/derived tokens before adding scene entities above the current ceiling.

- **Broaden browser regression coverage incrementally**
  - Current gates cover stone/skirting/visibility/stacking and keyboard navigation.
  - Add responsive/mobile, admin-published configuration and summary/pricing flows as independent tests rather than coupling them to stone gates.

## Completed / no longer backlog

- PR #32 archived/closed without merge.
- Large stale branch families and research/audit branches pruned using exact-SHA fail-closed dispositions; only `main`, PR #34 and the currently consumed config audit remain before its final prune.
- Legacy skirting painter/SVGs and unreachable/empty asset artifacts removed after reachability proof.
- `stone-skirting` canonicalized as a real catalog service.
- Runtime migration shim separated from permanent presentation contracts.
- Reconstruction research architecture harvested into ADRs 0005–0008 before branch pruning.
- Historical R0/R4/R5A replay authority separated from current automatic CI; current variant and asset gates pass without rewriting historical manifests. See `docs/architecture/ci-authority-contract-2026-10-05.md`.
