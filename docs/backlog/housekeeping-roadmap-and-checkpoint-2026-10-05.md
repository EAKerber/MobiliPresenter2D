# Housekeeping roadmap, backlog and next checkpoint — 2026-10-05

Status: canonical continuation document for the near-official MobiliPresenter2D candidate.

## Checkpoint definition

A checkpoint should preferably be a self-contained delivery that is safe to merge into `main` after its gates pass.

If a change cannot yet be promoted safely — for example because it depends on an external authorization boundary, a product decision, or incomplete evidence — the checkpoint should instead leave a contextually stable development branch with:

- a narrow scope;
- explicit authority and assumptions;
- reproducible evidence;
- known blockers;
- a clear promotion/abandonment gate.

Do not use “checkpoint” to mean an arbitrary intermediate commit.

## Current stable authority

- Product authority: `main`.
- Repository housekeeping authority immediately before this documentation checkpoint: `42f55917961cc8957974bb50b589945b36f00055`.
- Documentation checkpoint PR #76 merged as `4284ad052c7d7fff108dc752ef0306edeb227ede`; later bookkeeping commits may advance `main` without changing product/runtime authority.
- Exact near-official product candidate proven by the full gate fan-out: `b969bb471831d405fd6e1c9c15bf761176885cdd`.
- PR #75 added only final bookkeeping/documentation and branch disposition after that candidate; it did not change runtime, schema, assets, CSS, pricing or UX.
- Branch inventory is intentionally narrow:
  - `main`;
  - `feat/exposed-sides-and-glass` / PR #34, deliberately preserved for a future product-value decision.
- All previous work/audit/research lineages have been reconciled and pruned after durable evidence was retained where useful.

The near-official candidate passed all current product gates:

- Current asset gates;
- Current variant fidelity;
- App build purity;
- Stone browser;
- Keyboard browser;
- Mobile browser / PiP;
- Summary / Pricing browser.

This means speculative housekeeping must not become a reason to delay real product use.

## What the completed housekeeping established

The current codebase has already removed or resolved the main accidental legacy found during the audit:

- PR #32 archived without merge.
- Legacy rodapé/skirting SVG painter removed; `plinthCanvas` is authoritative.
- `stone-skirting` canonicalized as a real catalog service.
- Empty/orphan assets and unreachable legacy glass artifacts removed.
- Runtime permanent contracts separated from migration compatibility logic.
- Shadowed duplicate runtime functions removed.
- Obsolete summary/pricing implementations removed.
- Unreachable DOM hooks, unreferenced pricing helpers and unreachable public CSS removed.
- Ordinary app build now starts from approved current assets; R0/R4/R5A behavior is explicit historical replay rather than current authority.
- Current CI no longer treats old exact historical hashes as moving-product truth.
- Static gates reject several classes of future dead code or duplicate ownership.
- Branch hygiene is evidence-based and exact-SHA fail-closed.
- Durable reconstruction conclusions were retained in ADRs instead of keeping obsolete research branches alive.

## Backlog

### P1 — published administration compatibility

This is the only remaining architecture cleanup that affects current production behavior, although the buyer runtime is already safe.

Production currently has:

- schema `ConfiguratorAdministration2D 3.0`;
- revision 3 in the last compatibility audit;
- `stone-all` assigned to `finishes`;
- `stone-skirting` selected in `initialState.services`;
- `stone-skirting` missing from every published stage.

The current buyer runtime repairs this contradiction in memory through `repairSkirtingStageContract()`.

Required cleanup:

1. authenticate through the real admin boundary;
2. read the current published record again;
3. abort if the observed revision/content no longer matches the migration assumptions;
4. persist a new revision that differs only by adding `stone-skirting` beside `stone-all`;
5. preserve every other administration choice byte-for-semantics;
6. read back the published record;
7. prove the compatibility repair becomes a no-op;
8. only then remove the compatibility shim in a dedicated repository PR.

Do **not** auto-add `handles-all`. Its absence can be intentional.

This work is blocked only by authenticated admin identity/session. Repository or deploy automation must not bypass that authorization boundary.

### P1 — deferred product decision: PR #34

Preserve `feat/exposed-sides-and-glass` until explicitly reviewed.

Reason:

- the concept became relatively complex;
- its general usability gain is uncertain;
- it should not be treated as housekeeping debt;
- do not merge or delete it as part of structural cleanup.

Possible future decisions are: promote a smaller subset, redesign the concept, or archive it after product review.

### P2 — schema/runtime generalizations

These are not current bugs. Do not generalize merely because a generic abstraction is imaginable.

Revisit only with evidence from a second furniture family or a concrete limitation:

- clarify `stageHas(stageId, itemId)` semantics, since it currently behaves more like “item is configured in any enabled stage”;
- generalize `materialGroups[].linkedItemIds` validation after a second linked-item relation exists;
- revisit the fixed `fronts-all` / `handles-all` / `stone-all` topology with a real alternate furniture topology;
- define a declarative catalog-service -> scene-entity -> stage-availability contract before adding more scene-bound services;
- move pricing scope/kind metadata out of product-specific ID checks only when repeated semantics justify it;
- centralize scene/UI z-index tokens only if future scenes exceed the current tested range.

### P2 — build/test naming and coverage

- Consider renaming `validate-r5a-pixelperfect.py` only after its still-useful current invariants have a clearer owner/name.
- Preserve all current coverage if renamed.
- Add an authenticated admin publication lifecycle browser/integration gate when a test admin identity/session becomes available.
- Broaden regression coverage incrementally from real regressions, not from speculative permutations.

### Ongoing operational housekeeping

- Keep transient housekeeping branches short-lived and prune them after merge.
- Keep historical replay explicit and separate from current product gates.
- Do not refresh historical baselines merely to make a later product byte-identical to an old checkpoint.
- Prefer one ownership/contract cleanup per PR.
- Require evidence before deleting assets, code paths or compatibility behavior.

## Plan by stages

### Stage 0 — establish a trustworthy near-official baseline — COMPLETE

Deliverables:

- current-product CI authority separated from historical replay;
- current build purity contract;
- full product gate fan-out;
- exact candidate commit recorded.

Exit condition: all seven current product gates green on the same candidate.

Result: PASS at `b969bb471831d405fd6e1c9c15bf761176885cdd`.

### Stage 1 — repository and legacy hygiene — COMPLETE

Deliverables:

- prune obsolete branches;
- retain only durable research conclusions;
- remove proven dead runtime/UI/CSS/assets;
- canonicalize obvious ownership scars such as `stone-skirting`;
- make branch deletion evidence-based and fail-closed.

Exit condition: no known P1 repository-only legacy remains.

Result: PASS. Repository now contains only `main` plus preserved PR #34.

### Stage 2 — map and freeze current contracts — COMPLETE

Deliverables:

- catalog -> static settings -> administration schema -> persistence -> runtime -> renderer/pricing -> test map;
- identify compatibility shims separately from permanent behavior;
- classify speculative generalizations as P2 rather than current defects.

Exit condition: every remaining compatibility path has an explicit retirement condition.

Result: PASS. `runtime-contracts.js` is now the last compatibility-only shim.

### Stage 3 — persist the published administration migration — NEXT EXTERNAL STEP

This step crosses the authenticated admin boundary and should not be simulated by repository automation.

Procedure:

1. GET/read the production administration while authenticated.
2. Verify schema, revision and stage assignment against the expected precondition.
3. Create the minimal next revision:
   - add exactly one `stone-skirting` assignment;
   - place it in the same enabled stage as `stone-all`;
   - change nothing else.
4. PUT using the normal revision/conflict contract.
5. GET/read back.
6. Verify:
   - revision incremented exactly as expected;
   - `stone-skirting` appears exactly once;
   - all unrelated fields are unchanged;
   - `repairSkirtingStageContract()` returns an equivalent record.
7. Run production Stone and Keyboard browser smokes immediately.

Stop/fail closed if any precondition, revision or unrelated field differs.

### Stage 4 — retire the compatibility shim — NEXT REPOSITORY CHECKPOINT

After Stage 3 succeeds:

1. branch directly from current `main`;
2. remove `app/core/runtime-contracts.js` if it has no remaining responsibility;
3. remove its script include/import and compatibility-only tests;
4. add/adjust a regression assertion proving the published/current contract no longer requires repair;
5. run:
   - unit/core tests;
   - App build purity;
   - Current asset gates;
   - Current variant fidelity;
   - Stone browser;
   - Keyboard browser;
   - Mobile/PiP browser;
   - Summary/Pricing browser;
6. inspect the PR diff path-by-path;
7. merge only the exact reviewed head SHA;
8. rerun production browser smokes;
9. prune the transient branch through normal branch hygiene.

This should be a small repository-only PR with no visual asset, geometry, pricing or product behavior change.

### Stage 5 — declare the official-use baseline

After the compatibility shim is retired, create a new explicitly named release/candidate record rather than rewriting historical R0/R4/R5A evidence.

Record:

- exact approved `main` commit;
- gate run IDs;
- production config revision;
- known deferred PR #34;
- known P2 generalization candidates.

This is the preferred point to call the current kitchen configurator an official-use baseline.

### Stage 6 — future furniture generalization

Only begin broad schema generalization when a second furniture family exposes concrete differences.

Use the current kitchen as one proven instance, not as an accidental universal schema.

For every proposed abstraction, ask:

1. what second real case needs it?
2. what duplicated or contradictory implementation does it replace?
3. can the old concrete contract remain simpler?
4. what migration/versioning cost does the abstraction introduce?
5. which browser/core gates prove equivalent behavior?

## Next checkpoint plan

### Checkpoint CP-HK-01 — persisted published contract + compatibility shim retirement

**Goal:** eliminate the final runtime migration shim without changing buyer-visible behavior.

**Preferred checkpoint form:** mergeable PR to `main`.

**External prerequisite:** authenticated production admin session capable of reading and publishing the configuration through the existing admin API/UI.

**Preconditions:**

- current production record is re-read immediately before mutation;
- schema is still `ConfiguratorAdministration2D 3.0`;
- `stone-all` is still in an enabled stage;
- `stone-skirting` is still selected but unassigned;
- no concurrent admin revision has invalidated the expected revision.

**Checkpoint deliverables:**

1. production configuration revision with only the missing stage assignment persisted;
2. readback evidence that the runtime repair is a no-op;
3. dedicated PR removing the compatibility shim;
4. all current product gates green;
5. production Stone + Keyboard smoke PASS after merge;
6. transient branch pruned;
7. updated official-candidate/release record.

**Acceptance criteria:**

- no in-memory mutation is needed to make the production configuration self-consistent;
- buyer behavior remains unchanged;
- no unrelated admin choice changes;
- `runtime-contracts.js` no longer exists or no longer contains compatibility logic;
- no asset, stone, glass, mask, pricing or geometry bytes change;
- current-product gates remain green;
- historical replay remains intact.

**Fail-closed rule:** if authenticated migration cannot be performed safely, do not remove the shim.

**Stable fallback checkpoint:** the current `main` remains a valid near-official stable point. Do not create speculative runtime changes merely to “make progress” while the authenticated migration is unavailable.

## Promotion discipline for future checkpoints

Before calling any future checkpoint ready for `main`:

- scope is explicit;
- diff is reviewed path-by-path;
- authority is clear;
- migrations are separated from permanent behavior;
- current product gates relevant to the changed domain are green;
- historical evidence is not rewritten to hide drift;
- product changes are not smuggled into housekeeping;
- transient branches have a terminal/prune plan;
- any blocker is written down instead of bypassed.

A contextually stable development checkpoint is acceptable only when promotion would violate one of these conditions.

## Resume point

If work resumes with no additional context:

1. read this document;
2. read `docs/architecture/official-candidate-gate-2026-10-05.md`;
3. read `docs/architecture/runtime-contract-map-2026-10-05.md`;
4. read `docs/architecture/published-config-compat-audit-2026-10-05.md`;
5. check whether production administration has been migrated since revision 3;
6. if not, Stage 3 is the next action;
7. if yes and the repair is already a no-op, start Stage 4 on a fresh branch from `main`.

Do not reopen already-completed legacy cleanup without new evidence.
