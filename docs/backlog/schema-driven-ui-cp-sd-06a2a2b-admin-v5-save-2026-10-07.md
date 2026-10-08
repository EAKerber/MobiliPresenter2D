# CP-SD-06A2A2b — admin native v5 Save wiring — 2026-10-07

Status: COMPLETE / PASS in PR #159. Functional head `039fababae942de751e980a1498bbbb9f56afff0` passed 7/7 triggered GitHub workflows (including native-v5 admin Playwright and v3 regression) plus Netlify deploy preview #159. No production configuration read/write. Repository-only; production migration flag remains OFF.

## Acceptance

- When GET /api/configuration returns v3, the existing hierarchy editor continues to project to legacy v3, and only compatible changes publish.
- When GET returns an already-published native v5, Save validates current hierarchy/pricing and PUTs the native v5 candidate directly, without any downgrade or v3 projection.
- The client compares returned normalized v5 to the exact expected revision+1, then requires a fresh GET readback equal to the expected payload before announcing success. Server A2A2a additionally enforces admin authorization, revision, ETag conditional write and strong readback.
- On success, update publishedSource, local model and revision label to the confirmed v5. Hierarchy structural edits and typed finish amounts persist without v3 flattening.
- The special persist-handles-all action is v3-only and is hidden/rejected when the stored source is v5.
- A stale revision, denied request, mismatched response or readback must never show a success message. A failed save does not silently overwrite the user's local draft.
- Existing v3 admin hierarchy/browser repair and buyer visual/pricing gates remain green.

## Test files

- app/admin/admin.js: v3-vs-v5 Save branch, readback guard, v3-only handles repair.
- tests/admin-v5-save-browser.cjs: injected local HTTP fixture with native stored v5; verify percentage-to-amount finish rule, hierarchy group reorder, correct revision, saved payload and readback, stale conflict rejection, mismatched readback rejection, repair action hidden.
- .github/workflows/admin-hierarchy-browser.yml: runs the new test alongside previous v3 admin and handles persistence cases.

## Gates and boundaries

Run all path-triggered workflows and Netlify preview. Only after green gates mark COMPLETE/PASS. Do not read or change live Netlify Blob. V5_MIGRATION_ENABLED stays false. A2A3 offline integrated rehearsal and trusted raw snapshot planning are separate; the subsequent live A2 checkpoint requires explicit authorization.

## Next

CP-SD-06A2A3 integrated offline v3/v5 buyer/admin/price and provider-race rehearsal; plan authenticated raw evidence without exposing it on public GET. Keep post-migration legacy retirement separate.
