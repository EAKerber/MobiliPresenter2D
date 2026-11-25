# TST-002 crosswalk slice — Admin hierarchy split/merge round-trip — 2026-11-25

## Scope and evidence limits

This slice covers representative Admin hierarchy moves and round-trips in the native V5 browser fixture: moving a section to another group, splitting a section into a peer group, merging that group back, saving each result, reloading the Admin, and comparing hierarchy order and exact item ownership. It complements the existing hierarchy-editor unit and legacy hierarchy browser tests; it does not complete TST-002.

Readback base for this continuation: Product `development` at `9fc5c70345edfa94c92c7093f0a4692e6c9f1841`.

PR #447 exact head `97909a8bd8e628c8700d953ed2dd390f0d3ba6c4` was integrated by squash at `0ae7312a2a0aba5404c852e0ccce973e7e8bb5f1`. The Admin hierarchy browser run [45653257500](https://github.com/EAKerber/MobiliPresenter2D/actions/runs/45653257500) and advisory impact-plan run [45653257664](https://github.com/EAKerber/MobiliPresenter2D/actions/runs/45653257664) both completed successfully on the exact PR head. `development` readback matched the squash SHA.

The browser fixture substitutes an in-memory V5 configuration endpoint and an Admin Identity stub. It verifies browser interaction, V5 normalization/save, and reload against that fixture. It does not contact Netlify, production storage, live Identity, or the deployed Admin.

PR #447's earlier split/merge assertions were integrated at `0ae7312a2a0aba5404c852e0ccce973e7e8bb5f1`; its exact-head Admin hierarchy browser run [45653257500](https://github.com/EAKerber/MobiliPresenter2D/actions/runs/45653257500) passed. This continuation adds a native V5 section-transfer save/reload case and an advisory selector route; local execution passed on the candidate worktree, while hosted evidence for this continuation remains pending. Owner is UNKNOWN where no formal code-owner/contract-owner mapping is recorded.

## Source and trigger pins

| Role | Path | Revision / blob |
|---|---|---|
| Browser contract fixture | `tests/admin-v5-save-browser.cjs` | Candidate blob `35b590781e8246ec3d55cf20ce13dc0e0ce12fea` |
| Admin structural controls | `app/admin/admin.js` | `9fc5c70345edfa94c92c7093f0a4692e6c9f1841` |
| Pure hierarchy operations | `app/core/hierarchy-editor.js` | `9fc5c70345edfa94c92c7093f0a4692e6c9f1841` |
| V5 normal save/readback | `app/core/administration-v5.js` | `9fc5c70345edfa94c92c7093f0a4692e6c9f1841` |
| Workflow | `.github/workflows/admin-hierarchy-browser.yml` | `9fc5c70345edfa94c92c7093f0a4692e6c9f1841` |
| Advisory impact map | `tools/ci/test-impact-bundles.json` | Candidate blob `a1265fbee7f24338c52c16404b147bd8b766aad4` |
| Selector regression | `tests/ci/test-impact-selector.test.mjs` | Candidate blob `72ab7918cd591d34fe43334e2e5d699610d05f62` |
| Advisory workflow | `.github/workflows/development-test-impact-plan.yml` | `9fc5c70345edfa94c92c7093f0a4692e6c9f1841` |

The workflow directly runs `tests/admin-v5-save-browser.cjs`. Its `pull_request` and `push` path filters include that fixture, the hierarchy editor, V5 administration, configuration endpoint, and the workflow itself. The candidate `admin-hierarchy-editing` advisory bundle resolves the hierarchy source and test paths to this existing gate without adding a workflow or skipping any gate.

The local candidate was validated with `node tests/admin-v5-save-browser.cjs`, `node --test tests/ci/test-impact-selector.test.mjs` (23/23), and `node --test tests/ci/workflow-inventory.test.mjs` (8/8). The map remains advisory and does not skip the Admin workflow.

## Assertion crosswalk

| Assertion ID | Source assertion group | Contract | Risk | Consumer | State | Fixture / environment | Evidence | Trigger | Negative assertion | Owner |
|---|---|---|---|---|---|---|---|---|---|---|
| HIER-MOVE-01 | Admin section destination selector | Moving a section changes its group while preserving section identity and item ownership | Admin rendering and pure editor result diverge or the item is duplicated/lost | Admin hierarchy editor | V5 draft; move `handles` from cabinet finishes to stone | Playwright Chromium; in-memory V5 fixture | E1/local; hosted evidence pending this continuation's exact PR head | Admin hierarchy browser workflow | Destination contains section once, source no longer contains it, and the exact item remains under the moved section | UNKNOWN |
| HIER-MOVE-SAVE-01 | Save after section transfer | Normal V5 save preserves destination, order, and exact item ownership | Save projects or flattens the moved hierarchy into legacy V3 | `administrationV5` Admin Save path and `/api/configuration` fixture | Existing valid V5 source | Browser fixture validates/normalizes V5 and increments revision | E1/local; hosted evidence pending this continuation's exact PR head | Same | Saved V5 retains the moved section and item only once under the destination group | UNKNOWN |
| HIER-MOVE-READBACK-01 | Reload after section transfer | Admin initialization reads the persisted move and its item ownership | Local draft appears correct but stored destination or items diverge after reload | Admin initialization from GET `/api/configuration` | Saved V5 transfer | Reloaded browser page with in-memory fixture state | E1/local; hosted evidence pending this continuation's exact PR head | Same | Exact destination order and item IDs are visible after reload | UNKNOWN |
| HIER-SPLIT-01 | Admin section action creates a peer group | Split moves the selected section without changing its section identity or item ownership | Admin rendering and pure editor result diverge | Admin hierarchy editor | V5 draft with `handles` section | Playwright Chromium; in-memory V5 fixture | E2/hosted; run 45653257500 on PR #447 exact head | Admin hierarchy browser workflow | Peer group is present; the prior group remains; the split section contains only the original section ID | UNKNOWN |
| HIER-SAVE-01 | Save after split | Normal V5 save preserves the new group and its exact item ownership | Save projects or flattens the hierarchy into legacy V3 | `administrationV5` Admin Save path and `/api/configuration` fixture | Existing valid V5 source | Browser fixture validates/normalizes V5 and increments revision | E2/hosted; run 45653257500 on PR #447 exact head | Same | Saved V5 has `handles-all` only under the split section; schema remains V5 | UNKNOWN |
| HIER-READBACK-01 | Reload after split | Admin initialization reads the persisted split structure | UI confirms draft locally but loses it after reload | Admin initialization from GET `/api/configuration` | Saved V5 split | Reloaded browser page with in-memory fixture state | E2/hosted; run 45653257500 on PR #447 exact head | Same | Exact group order is visible after reload | UNKNOWN |
| HIER-MERGE-01 | Admin group action merges into previous group | Merge removes the selected peer group and appends its section to the adjacent group | Merge UI chooses wrong target or loses section identity | Admin hierarchy editor | Split hierarchy with adjacent groups | Playwright Chromium; in-memory V5 fixture | E2/hosted; run 45653257500 on PR #447 exact head | Same | Merged group is absent and the previous group contains sections in the asserted order | UNKNOWN |
| HIER-SAVE-02 | Save after merge | Normal V5 save preserves the merged hierarchy and item ownership | Merge is visible in memory but is not persisted as V5 | V5 Admin Save path and endpoint fixture | Existing valid V5 source after split save | Same | E2/hosted; run 45653257500 on PR #447 exact head | Same | Saved schema stays V5; `handles-all` remains in `handles` and no duplicate ownership is introduced | UNKNOWN |
| HIER-READBACK-02 | Reload after merge | Admin reads back the exact merged result | A successful message masks divergent stored state | Admin initialization and readback | Saved V5 merged structure | Reloaded browser page with in-memory fixture state | E2/hosted; run 45653257500 on PR #447 exact head | Same | Exact group and section order is visible after reload | UNKNOWN |
| HIER-SAVE-NEG-01 | Existing conflict and tampered-readback cases | Structural edits cannot report success on stale revision or mismatched readback | Concurrent or malformed save is shown as published | V5 Admin Save path | Conflict, then altered readback | Same test's existing failure modes | E2/hosted; run 45653257500 on PR #447 exact head | Same | Conflict requires reload; altered readback is not marked success | UNKNOWN |

## Reachability and remaining work

- The earlier split/merge round-trip passed in the exact PR-head hosted Admin hierarchy workflow. The current local continuation additionally passes section transfer, split, merge, V5 save, and reload assertions.
- The advisory test-impact selector now has a candidate `admin-hierarchy-editing` bundle. It points to the existing Admin hierarchy workflow; no gate is skipped or removed.
- The existing gate owns execution on matching test/runtime paths; no workflow was added and no existing gate was removed.
- The fixture demonstrates application behavior against an in-memory endpoint. It does not prove live authorization, Netlify Blob persistence, Production, or user-operated Admin behavior.
- This slice covers one representative cross-group section move, section-to-group split, and adjacent-group merge round-trip. It does not enumerate every hierarchy operation, every boundary condition, or every supported storage/environment state.
- TST-002 remains open for the rest of its assertion inventory and reachability review.
- No runtime source, Viewer behavior, mask content, or mask consumer is changed by this slice.
