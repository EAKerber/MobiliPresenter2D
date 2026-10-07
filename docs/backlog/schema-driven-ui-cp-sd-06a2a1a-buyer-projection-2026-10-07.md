# CP-SD-06A2A1a — v5 buyer input projection contract — 2026-10-07

Status: COMPLETE / PASS in PR #156; pure contract only, not yet wired into buyer runtime.

Parent: CP-SD-06A2A0 critical buyer/admin readiness audit (PR #155).

## Scope

- Introduces a pure browser/Node-compatible published-buyer projection boundary for validated v3 or validated v5 inputs.
- For v3, preserves the existing v3 normalizer, flow construction, legacy-to-typed pricing conversion, and default presentation policy.
- For v5, uses the v5 validator and normalizer, passes the intact hierarchical source to flowCore.normalizeFlow, consumes authored typed pricing and presentation policy.
- A flat list of stage items is derived from the validated flow solely for historical buyer visual adapters; no second semantic owner is introduced.
- Unknown schema, invalid current component, malformed policy and invalid current hierarchy fail closed.
- Adds contract tests to app npm test, including a valid finish amount rule that cannot be projected losslessly to v3.

## Outside this checkpoint

- Do not yet connect the adapter to app/app.js or load its scripts in app/index.html. That follows in CP-SD-06A2A1b with browser fixtures, invalid-v5 UI treatment and v3/v5 visual parity.
- No API, Netlify migration flag, normal v5 PUT or admin Save changes.
- No live production reads or writes.

## Gate

Gate evidence: functional PR #156 head 663261d3816fa9c99617f5560436d45ec419cb03 passed 6/6 path-triggered workflows including App build purity and the new projection tests; Netlify preview #156 passed. A canonical v3 and deterministic v5 share flow items; typed amounts remain typed; invalid v5 fails closed. All later modifications were documentation-only.

## Next

CP-SD-06A2A1b: public wiring + browser tests; A2A2 admin/server v5 edits still blocked; live A2 publication still prohibited.
