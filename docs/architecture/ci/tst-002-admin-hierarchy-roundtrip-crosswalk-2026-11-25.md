# TST-002 crosswalk slice — Admin hierarchy split/merge round-trip — 2026-11-25

## Scope and evidence limits

This slice closes one specific gap in the hierarchy contract: the native V5 Admin browser fixture now exercises section-to-group split and group merge through the Admin controls, saves each resulting structure, reloads the Admin, and compares the hierarchy and item ownership. It complements the existing hierarchy-editor unit and legacy hierarchy browser tests; it does not complete TST-002.

Readback base: Product `development` at `34614093a08513a2ed3211f6bf9316eb7af30309`.

PR #447 exact head `97909a8bd8e628c8700d953ed2dd390f0d3ba6c4` was integrated by squash at `0ae7312a2a0aba5404c852e0ccce973e7e8bb5f1`. The Admin hierarchy browser run [45653257500](https://github.com/EAKerber/MobiliPresenter2D/actions/runs/45653257500) and advisory impact-plan run [45653257664](https://github.com/EAKerber/MobiliPresenter2D/actions/runs/45653257664) both completed successfully on the exact PR head. `development` readback matched the squash SHA.

The browser fixture substitutes an in-memory V5 configuration endpoint and an Admin Identity stub. It verifies browser interaction, V5 normalization/save, and reload against that fixture. It does not contact Netlify, production storage, live Identity, or the deployed Admin.

Evidence: E1/local means the exact changed browser fixture and hierarchy-editor unit fixture passed on the candidate worktree; syntax and `git diff --check` passed. E2/hosted means the named Actions runs passed on the exact PR head and the squash SHA was read back on `development`. Owner is UNKNOWN where no formal code-owner or contract-owner mapping is recorded.

## Source and trigger pins

| Role | Path | Revision / blob |
|---|---|---|
| Browser contract fixture | `tests/admin-v5-save-browser.cjs` | Blob `d432c285f1d01d01367858c9f9198a0f184d48e7` at PR head |
| Admin structural controls | `app/admin/admin.js` | `34614093a08513a2ed3211f6bf9316eb7af30309` |
| Pure hierarchy operations | `app/core/hierarchy-editor.js` | `34614093a08513a2ed3211f6bf9316eb7af30309` |
| V5 normal save/readback | `app/core/administration-v5.js` | `34614093a08513a2ed3211f6bf9316eb7af30309` |
| Workflow | `.github/workflows/admin-hierarchy-browser.yml` | `34614093a08513a2ed3211f6bf9316eb7af30309` |

The workflow directly runs `tests/admin-v5-save-browser.cjs`. Its `pull_request` and `push` path filters include that fixture, the hierarchy editor, V5 administration, configuration endpoint, and the workflow itself. The test-only change therefore reaches the existing Admin hierarchy gate without adding another workflow.

## Assertion crosswalk

| Assertion ID | Source assertion group | Contract | Risk | Consumer | State | Fixture / environment | Evidence | Trigger | Negative assertion | Owner |
|---|---|---|---|---|---|---|---|---|---|---|
| HIER-SPLIT-01 | Admin section action creates a peer group | Split moves the selected section without changing its section identity or item ownership | Admin rendering and pure editor result diverge | Admin hierarchy editor | V5 draft with `handles` section | Playwright Chromium; in-memory V5 fixture | E2/hosted; run 45653257500 on PR #447 exact head | Admin hierarchy browser workflow | Peer group is present; the prior group remains; the split section contains only the original section ID | UNKNOWN |
| HIER-SAVE-01 | Save after split | Normal V5 save preserves the new group and its exact item ownership | Save projects or flattens the hierarchy into legacy V3 | `administrationV5` Admin Save path and `/api/configuration` fixture | Existing valid V5 source | Browser fixture validates/normalizes V5 and increments revision | E2/hosted; run 45653257500 on PR #447 exact head | Same | Saved V5 has `handles-all` only under the split section; schema remains V5 | UNKNOWN |
| HIER-READBACK-01 | Reload after split | Admin initialization reads the persisted split structure | UI confirms draft locally but loses it after reload | Admin initialization from GET `/api/configuration` | Saved V5 split | Reloaded browser page with in-memory fixture state | E2/hosted; run 45653257500 on PR #447 exact head | Same | Exact group order is visible after reload | UNKNOWN |
| HIER-MERGE-01 | Admin group action merges into previous group | Merge removes the selected peer group and appends its section to the adjacent group | Merge UI chooses wrong target or loses section identity | Admin hierarchy editor | Split hierarchy with adjacent groups | Playwright Chromium; in-memory V5 fixture | E2/hosted; run 45653257500 on PR #447 exact head | Same | Merged group is absent and the previous group contains sections in the asserted order | UNKNOWN |
| HIER-SAVE-02 | Save after merge | Normal V5 save preserves the merged hierarchy and item ownership | Merge is visible in memory but is not persisted as V5 | V5 Admin Save path and endpoint fixture | Existing valid V5 source after split save | Same | E2/hosted; run 45653257500 on PR #447 exact head | Same | Saved schema stays V5; `handles-all` remains in `handles` and no duplicate ownership is introduced | UNKNOWN |
| HIER-READBACK-02 | Reload after merge | Admin reads back the exact merged result | A successful message masks divergent stored state | Admin initialization and readback | Saved V5 merged structure | Reloaded browser page with in-memory fixture state | E2/hosted; run 45653257500 on PR #447 exact head | Same | Exact group and section order is visible after reload | UNKNOWN |
| HIER-SAVE-NEG-01 | Existing conflict and tampered-readback cases | Structural edits cannot report success on stale revision or mismatched readback | Concurrent or malformed save is shown as published | V5 Admin Save path | Conflict, then altered readback | Same test's existing failure modes | E2/hosted; run 45653257500 on PR #447 exact head | Same | Conflict requires reload; altered readback is not marked success | UNKNOWN |

## Reachability and remaining work

- The local browser fixture and the exact PR-head hosted Admin hierarchy workflow passed with the split, save, reload, merge, save, and reload assertions.
- The existing gate owns execution on matching test/runtime paths; no workflow was added and no existing gate was removed.
- The fixture demonstrates application behavior against an in-memory endpoint. It does not prove live authorization, Netlify Blob persistence, Production, or user-operated Admin behavior.
- This slice covers one representative section-to-group split and adjacent-group merge round-trip. It does not enumerate every hierarchy operation, every boundary condition, or every supported storage/environment state.
- TST-002 remains open for the rest of its assertion inventory and reachability review.
- No runtime source, Viewer behavior, mask content, or mask consumer is changed by this slice.
