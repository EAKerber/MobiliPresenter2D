# CP-SD-06A2A1b — published v5 buyer runtime integration — 2026-10-07

Status: COMPLETE / PASS in PR #157. Functional head `973ac0643f8e8cd202fb80631a4a3cafc3d18398` passed 8/8 workflows including v3/v5 injected Playwright and Netlify deploy preview. No production configuration accessed; migration flag remains OFF.

Parent: A2A1a pure projection contract COMPLETE/PASS in PR #156.

## Scope

- app/index.html loads v4 compatibility validation, v5 administration core and the pure v3/v5 published-buyer adapter before app.js.
- app/app.js dispatches incoming published v3 or v5 by validated schema, without passing v5 to the v3 normalizer.
- Validated v5 hierarchy remains the exact input to flowCore.normalizeFlow; display-only flat stage lists derive from normalized flow, not independently from hard-coded item names.
- v5 typed pricing and authored presentation policy are runtime authorities; the legacy v3 path continues to use its existing normalization, pricing upgrade and default policy.
- A schema-invalid v5 read produces an accessible alert and disables/hides workspace rather than keeping plausible buyer defaults.
- tests/buyer-v5-browser.cjs injects local canonical v3/v5 fixtures into preview HTTP responses and verifies flow/navigation/estimate parity, authored v5 policy, absent layout errors and invalid-v5 fail-closed.
- The flow-layout workflow runs this new fixture in addition to the pre-existing browser assertions. It never reads the production configuration.

## Gate

- Path-triggered GitHub CI including current app build purity and Playwright flow-layout workflow.
- Netlify PR preview succeeds; accepted PR #97 v3 visible geometry and interactions remain unchanged.
- Injected valid v5 fixture drives actual browser; invalid v5 fixture cannot render normal buyer controls.
- No production read/write; A2 activation remains OFF; normal admin v5 Save/server PUT still explicitly blocked.
- Update roadmap, current-state and handoff on closure.

## Next

CP-SD-06A2A2 must implement authenticated normal v5 admin Save/server persistence, with revision and ETag CAS plus readback, before any actual v5 migration.
