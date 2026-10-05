# Near-official candidate gate — 2026-10-05

Candidate product commit: `b969bb471831d405fd6e1c9c15bf761176885cdd`.

A temporary audit PR (#74) branched directly from this commit and added no runtime/product behavior. It used one inert app marker plus one test-only comment solely to fan out every current product gate. The audit PR was closed without merge after all gates completed successfully.

## Gate result

- Current asset gates — PASS — run `37387413443`
- Current variant fidelity — PASS — run `37387413328`
- App build purity — PASS — run `37387413524`
- Stone browser — PASS — run `37387413334`
- Keyboard browser — PASS — run `37387413530`
- Mobile browser / PiP — PASS — run `37387413487`
- Summary / Pricing browser — PASS — run `37387413833`

The marker/test-only audit commits were never merged, so the product authority remains the exact candidate commit above.

## Scope proved

The current automated contract covers:

- current runtime + asset invariants;
- variant composition from current Scene2D authority;
- approved stone, faucet and range integration;
- ordinary app build purity without historical R5A rematerialization;
- stone/skirting/visibility/stacking behavior;
- stage-driven keyboard navigation;
- principal mobile/PiP/touch behavior;
- summary/pricing ownership and charge synchronization.

## Known deferred items

These are not failures of the candidate gate:

1. Published administration still requires one authenticated admin migration to persist the legacy `stone-skirting` stage assignment. The buyer runtime repairs that old published record safely in memory. This compatibility shim must remain until an authenticated PUT/readback proves it unnecessary.
2. PR #34 (`feat/exposed-sides-and-glass`) remains deliberately deferred for product-value review and is not part of the candidate.
3. Schema generalizations in the housekeeping backlog remain evidence-driven P2 work for a future second furniture family, not current product defects.

## Decision

Repository housekeeping and current product gates provide a clean near-official baseline. Additional speculative cleanup should not delay product use. Future structural changes should start from this candidate and preserve the existing gates.
