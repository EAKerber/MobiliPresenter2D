# Housekeeping roadmap, backlog and next checkpoint — 2026-10-05

Status: canonical continuation document for the current MobiliPresenter2D baseline. Repository UX/hierarchy work is complete through CP-UX-04.4 / PR #97. Remaining production-state work is the authenticated published-v3 consistency boundary, an explicit Puxadores stage-assignment product write if still required, then schema-v4 publication and legacy retirement.

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
- Current `main` after the accepted preview #97: `6985100edc0012b87f9a01a627a415b39454a699`.
- CP-UX-04.2 centralized legacy-v3 Stage -> Group -> Section semantics in `app/data/hierarchy-defaults.js`; CP-UX-04.3 aligned finish breakpoints/direct Frentes -> Puxadores traversal; CP-UX-04.4 then aligned stage-internal columns with workspace mode, added independent stacked-Modules pane scrollers and contained module vertical arrows without changing schema or production administration.
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

### P1 — buyer UX navigation and flow hierarchy — COMPLETE THROUGH CP-UX-04.4

The repository-side UX/hierarchy track is no longer an open housekeeping blocker.

Completed work now includes:

- deterministic stage/section scrolling against the real controls scroller;
- explicit keyboard section ownership and direct Frentes -> Puxadores traversal;
- one normalized Stage -> Group -> Section -> Item flow model;
- hierarchy-capable admin editor;
- hierarchy-driven buyer layout;
- one shared legacy-v3 hierarchy authority in `app/data/hierarchy-defaults.js`;
- admin option inventory for aggregate items such as Puxadores without turning options into hierarchy owners;
- breakpoint behavior aligned with the actual workspace side-by-side/stacked transition;
- cache-revision hardening so stale hierarchy/keyboard assets do not masquerade as current behavior.

Canonical history and gate evidence remain in `docs/backlog/ux-navigation-hierarchy-roadmap-2026-10-05.md`.

**CP-UX-04.4 / PR #97 is complete and merged**: side-rail Modules/Services use one internal column, stacked Modules has independent pane scrollers, and module ArrowUp/ArrowDown is contained inside the pane instead of scrolling the page. Deploy preview #97 was manually accepted and promoted unchanged. The next checkpoint is **CP-UX-05**, which crosses the authenticated production schema boundary.

### P1 — published administration compatibility and schema migration

Two independent authenticated concerns remain and must be kept explicit.

**Last-known housekeeping audit, not a live production read:**

- production was `ConfiguratorAdministration2D 3.0`;
- `stone-all` was assigned to `finishes`;
- `stone-skirting` was selected in `initialState.services`;
- `stone-skirting` was missing from published stage assignment;
- buyer runtime repaired that contradiction in memory through `repairSkirtingStageContract()`.

**Repository state now:**

- v4 hierarchy support/editor already exists;
- legacy-v3 hierarchy semantics are centralized in `app/data/hierarchy-defaults.js`;
- `netlify/functions/configuration.mjs` still rejects direct `ConfiguratorAdministration2D 4.0` publication with `hierarchy_publication_required`;
- `app/core/runtime-contracts.js` still contains the temporary `stone-skirting` repair;
- PR #97 and the CP-UX-04 follow-ups changed none of those production boundaries.

**Preferred remaining order:**

1. **CP-HK-01A — fresh authenticated v3 consistency check/write.**
   - Re-read production immediately before mutation.
   - If and only if the live record is still v3 and still has the audited `stone-skirting` contradiction, add exactly that missing stage assignment.
   - Read back and prove all unrelated semantics unchanged and the repair becomes a no-op.
   - If the live record differs, abort the old plan and replan from observed state.
2. **CP-HK-01B — retire the temporary runtime repair.**
   - After CP-HK-01A readback proves no repair is needed, remove/isolate `runtime-contracts.js` compatibility logic in a narrow repository PR and rerun current product gates.
3. **CP-UX-05A0 — explicit Puxadores stage assignment, if still absent.**
   - Freshly re-read production after CP-HK-01B.
   - Buyer/admin review on 2026-10-06 established that `handles-all` is now a required first-class Acabamentos section.
   - If it is still unassigned, add exactly that stage assignment in a separate authenticated product-configuration write.
   - Read back and prove no unrelated semantic change; smoke buyer Puxadores navigation and the admin hierarchy.
   - Do not inject it through runtime compatibility code.
4. **CP-UX-05A — authenticated v3 -> v4 schema publication.**
   - Freshly re-read the now-self-consistent production record.
   - Enable server-side v4 validation/publication through an explicit migration action.
   - Prove non-hierarchy semantic identity before PUT and after readback.
5. **CP-UX-05B — retire v3 as a normal production authority.**
   - Only after production is durably v4.
   - Keep v3 solely as an explicit import/migration compatibility path where required.

Do not combine the `stone-skirting` repair, the explicit `handles-all` product assignment, and the v4 schema migration into one write merely to save transactions.

Do **not** auto-add `handles-all` implicitly. Its assignment is now an explicit product requirement, but it must cross the authenticated configuration boundary as its own reviewed semantic change.

All production mutations remain blocked on a real authenticated admin session. Repository/deploy automation must not bypass that boundary.

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

### Parallel product track — UX navigation/hierarchy

Checkpoint status:

1. **CP-UX-00 — COMPLETE** — plan persisted.
2. **CP-UX-01 — COMPLETE** — explicit section navigation and scroll/focus repair.
3. **CP-UX-02 — COMPLETE** — normalized internal flow model.
4. **CP-UX-03 — COMPLETE** — hierarchy-capable admin representation/editor with fail-closed publication.
5. **CP-UX-04 — COMPLETE** — hierarchy-driven buyer layout.
6. **CP-UX-04.1 — COMPLETE** — Puxadores active-state + earlier finish split.
7. **CP-UX-04.2 — COMPLETE** — one shared legacy-v3 hierarchy authority.
8. **CP-UX-04.3 — COMPLETE** — PR #95 breakpoint alignment, direct Frentes -> Puxadores gate and cache hardening.
9. **CP-UX-04.4 — COMPLETE** — PR #97 merged at `6985100edc0012b87f9a01a627a415b39454a699`; workspace-mode pane columns, independent stacked Modules scrollers and vertical-arrow containment were manually accepted in preview #97.
10. **CP-UX-05 — NEXT / AUTHENTICATED BOUNDARY** — authenticated v3 consistency/product assignment, production v4 publication and legacy retirement.

The UX track now depends on the same authenticated production boundary as housekeeping. Repository-only work should not invent another compatibility layer while that boundary is pending.

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

### Stage 3 — CP-HK-01A: persist published-v3 consistency — NEXT EXTERNAL STEP

This step crosses the authenticated admin boundary and must not be simulated by repository automation.

Procedure:

1. GET/read production administration while authenticated.
2. Record schema, revision and semantic digest before mutation.
3. If the source is no longer v3 or no longer matches the audited `stone-skirting` contradiction, stop and replan.
4. Otherwise create the minimal next v3 revision:
   - add exactly one `stone-skirting` stage assignment;
   - place it in the same enabled stage as `stone-all`;
   - change nothing else.
5. PUT using the normal revision/conflict contract.
6. GET/read back without cache.
7. Verify:
   - revision changed exactly as expected;
   - `stone-skirting` appears exactly once;
   - all unrelated fields are semantically identical;
   - `repairSkirtingStageContract()` is a no-op.
8. Run production Stone and Keyboard browser smokes immediately.
9. Persist before/after revision + digest evidence, excluding secrets.

Stop/fail closed if any precondition, revision or unrelated field differs.

### Stage 4 — CP-HK-01B: retire the compatibility shim — AFTER STAGE 3

After Stage 3 succeeds and readback proves the repair is unnecessary:

1. branch directly from current `main`;
2. remove `app/core/runtime-contracts.js` if it has no remaining responsibility, or isolate/remove only its compatibility behavior if another permanent contract is discovered;
3. remove its script include/import and compatibility-only tests;
4. add a regression assertion proving the published/current v3 contract no longer needs repair;
5. run:
   - unit/core tests;
   - App build purity;
   - Current asset gates;
   - Current variant fidelity;
   - Stone browser;
   - Keyboard browser;
   - Flow layout browser;
   - Admin hierarchy browser;
   - Mobile/PiP browser;
   - Summary/Pricing browser;
6. inspect the PR diff path-by-path;
7. merge only the exact reviewed head SHA;
8. rerun production browser smokes;
9. prune the transient branch through normal branch hygiene.

This remains a narrow repository-only cleanup and should preferably complete **before CP-UX-05A**, so the v4 migration starts from a self-consistent production source without a hidden runtime repair layer.

Do not remove the shim merely because v4 support exists in code. Removal requires the Stage 3 production proof.

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

### Checkpoint CP-HK-01 — two-phase published-contract cleanup

**Goal:** make the published v3 source internally consistent, then remove the temporary runtime repair without changing buyer-visible behavior.

**External prerequisite:** authenticated production admin session.

#### CP-HK-01A — authenticated production consistency write

Preconditions must be re-read live. The old revision-3 audit is evidence, not authorization to assume the current record is unchanged.

Deliverables:

1. fresh pre-write schema/revision/digest;
2. at most one intended semantic change: assign `stone-skirting` beside `stone-all` if the contradiction still exists;
3. conflict-guarded PUT;
4. immediate readback;
5. proof unrelated fields are unchanged;
6. proof `repairSkirtingStageContract()` becomes a no-op;
7. production Stone + Keyboard smoke PASS.

If the live state differs, CP-HK-01A becomes BLOCKED/PENDING REPLAN rather than guessing.

#### CP-HK-01B — repository shim retirement

Start only after CP-HK-01A PASS.

Deliverables:

1. remove/isolate the temporary runtime compatibility repair;
2. prove no current production load needs it;
3. all current product/layout/admin gates green;
4. production smoke PASS after merge;
5. branch hygiene complete.

#### Relationship to CP-UX-05

Preferred sequence:

```text
fresh production read
        |
        v
CP-HK-01A  v3 consistency write
        |
        v
CP-HK-01B  runtime shim retirement
        |
        v
fresh production read
        |
        v
CP-UX-05A  explicit v3 -> v4 publication
        |
        v
CP-UX-05B  retire v3 as normal authority
```

The hierarchy schema migration and the `stone-skirting` consistency repair remain separate authenticated transactions.

**Stable fallback checkpoint:** current `main` remains safe while authenticated work is unavailable. Do not create speculative compatibility code simply to manufacture repository progress.

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

1. read `CURRENT_STATE.md`;
2. read `docs/backlog/ux-navigation-hierarchy-roadmap-2026-10-05.md`;
3. read this document;
4. read `docs/architecture/official-candidate-gate-2026-10-05.md`;
5. read `docs/architecture/runtime-contract-map-2026-10-05.md`;
6. read `docs/architecture/published-config-compat-audit-2026-10-05.md`;
7. inspect live `main`;
8. confirm CP-UX-04.3 / PR #95 remains present on live `main`;
9. for authenticated work, re-read production rather than assuming the old revision-3 audit is still current;
10. if the v3 `stone-skirting` contradiction still exists, execute CP-HK-01A first;
11. after CP-HK-01A proves the repair is a no-op, execute CP-HK-01B;
12. then continue CP-UX-05A from a fresh authenticated production read;
13. start CP-UX-05B only after production v4 readback and smoke tests pass.

Do not reopen already-completed legacy cleanup without new evidence. The newly observed UX findings are such new evidence and are governed by the separate UX roadmap.
