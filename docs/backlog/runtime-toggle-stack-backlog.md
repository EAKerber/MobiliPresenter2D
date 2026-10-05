# Housekeeping backlog — near-official candidate

Remaining work after the 2026-10-05 cleanup. The repository is now intentionally narrow: `main` is product authority, PR #34 remains deferred for product review, and transient housekeeping branches should be deleted after merge.

## P1 — published administration compatibility

- **Persist normalized `stone-skirting` stage assignment**
  - Production is `ConfiguratorAdministration2D 3.0`, revision 3.
  - `stone-all` is assigned to `finishes` and `stone-skirting` is selected by default, but the published stage list still omits `stone-skirting`.
  - Current runtime repair therefore still mutates the published record in memory.
  - Perform one authenticated admin PUT that adds only `stone-skirting` beside `stone-all`, preserving every other administration choice and respecting revision conflict protection.
  - Read back production and prove `repairSkirtingStageContract()` becomes a no-op before removing `runtime-contracts.js`.
  - Do **not** auto-add `handles-all`; its absence may be intentional.
  - This is the only remaining P1 architecture cleanup and is blocked only by authenticated admin identity, not by repository work.
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
  - Rename/split only when a second use case requires the distinction.

- **Generalize linked-item validation only if reused**
  - `materialGroups[].linkedItemIds` is generic data, but current behavior is proven mainly by `stone-all -> stone-skirting`.
  - Derive generic validation from the relation when another linked item appears instead of adding another ID exception.

- **Review fixed material-group topology before a second furniture family**
  - `fronts-all`, `handles-all` and `stone-all` are valid kitchen invariants today.
  - Generalize only when another furniture family demonstrates a different topology.

- **Define declarative scene-bound service ownership**
  - Scene-affecting options such as tempered glass and lighting still have product-specific ownership semantics.
  - Before adding more such services, define a catalog/service -> scene entity -> stage availability contract.

- **Move pricing scope metadata out of ID checks when a second case appears**
  - Current product-specific global pricing works and is browser-tested.
  - Promote it to catalog/price-book metadata only after repeated cases justify the abstraction.

## P2 — build / replay naming cleanup

- **Rename/generalize the R5A-named live validator only if ownership becomes confusing**
  - `validate-r5a-pixelperfect.py` still checks useful current invariants.
  - Historical R5A materialization is explicit replay and no longer participates in the ordinary build.
  - Preserve coverage if renamed.

## P2 — UI/runtime infrastructure

- **Centralize scene z-index contract if the scene range grows**
  - Browser tests protect `scene < grid < hotspots < selection`.
  - Introduce shared tokens only before adding scene entities above the current ceiling.

- **Broaden browser regression coverage incrementally**
  - Current gates cover assets/variants/build purity, stone/skirting/visibility/stacking, keyboard, mobile/PiP and summary/pricing.
  - Add the authenticated admin publication lifecycle as an independent gate only when a test identity/session exists.

## Completed / no longer backlog

- PR #32 archived/closed without merge.
- Historical audit/research/work branches were reconciled and pruned using exact-SHA fail-closed branch hygiene; ADRs 0005–0008 preserve the durable reconstruction research.
- Legacy skirting painter/SVGs, empty/orphan assets and unreachable legacy glass artifacts removed.
- `stone-skirting` canonicalized as a real catalog service.
- Current CI authority separated from R0/R4/R5A historical replay; current asset and variant gates are green.
- Current app build made authoritative and guarded by build-purity checks.
- Mobile/PiP, stone, keyboard and summary/pricing browser gates are active.
- Shadowed duplicate runtime functions, obsolete summary/pricing implementations, unreachable DOM hooks, unreferenced pricing helpers and unreachable public CSS removed.
- Static gates now reject duplicate/unreferenced named runtime functions, literal `getElementById` references without matching markup, and unreachable public CSS selectors.
- Branch inventory is reduced to product authority, the intentionally preserved PR #34 and transient housekeeping branches.
