# Gate inventory and friction review — 2026-11-24

## Exact post-archive inventory readback

The seven consumed echo-only receipt workflows listed below were removed from `.github/workflows` by PR #389 and recorded with their original blob IDs and historic run links in [`retired-workflow-receipts-2026-11-24.md`](retired-workflow-receipts-2026-11-24.md). The separate write-capable `development-pr-archive.yml` was left untouched.

The resulting exact development push [#45380581114](https://github.com/EAKerber/MobiliPresenter2D/actions/runs/45380581114) succeeded at `development@f2f706539da72696885ff16814a01cc31d0f6d90` (tree `4d1eae7c37b53e860b7e317de098a8a40d3f4ef2`). Inventory artifact ID `14912828734`, digest `sha256:2f5714ccc84cd2424327cd9156cd19c5dee1f2c32ab33d27cab1ac4ff762ded0`.

- `main`: 27 workflow files; `development`: 68; 25 shared, 2 main-only, and 43 development-only.
- Development event counts: 27 `pull_request`, 62 `push`, 55 `workflow_dispatch`, and 1 `schedule` (overlapping trigger counts). Four workflows are dispatch-only.
- The union contains 70 branch-version definitions. Eight workflow paths retain conservative mutation/operation signals; they remain review signals, not proof of mutation. YAML-subset parse warnings: 0. Open PR readback: 0.
- TST-001 remains incomplete: command text and hashes do not prove a command reaches an assertion under the workflow's trigger, job condition, and step condition. Continue with the focused false-positive fixtures and command-to-assertion reachability crosswalk below.


## Historical dispatch and mutation-signal review — exact workflow inventory pin `650eee3b5ffa7c564611136a72d097d6777ad221`

This slice distinguishes runnable manual gates, consumed receipt files, and conservative mutation signals. It does not change workflow behavior.

### Dispatch-only definitions

At the exact inventory pin, 11 development workflow definitions declared only `workflow_dispatch`. Three are also present on `main` and therefore have a viable default-branch manual entry: `arc03c-static-page-build-gate.yml`, `module02-fidelity.yml`, and `r0-contract.yml`.

Eight definitions exist only on `development`, so their manual-dispatch event is not a dependable entry point while the files remain absent from the default branch:

| Workflow | Current source behavior | Disposition |
|---|---|---|
| `development-access-dto-aux-retire.yml` | Echoes a completed historical outcome; read-only permission. | Consumed receipt; no active check. |
| `development-aux-retirement.yml` | Echoes that A1/A2 manifests were consumed and that the workflow cannot delete refs; read-only permission. | Consumed placeholder; no active check. |
| `development-nav-aux-retire.yml` | Echoes that NAV-05 auxiliary cleanup already completed; read-only permission. | Consumed receipt; no active check. |
| `development-public-dto-aux-retire.yml` | Echoes a completed CP-PUBLIC-03 outcome; read-only permission. | Consumed receipt; no active check. |
| `development-scene-asset-aux-retire.yml` | Echoes a completed asset-provenance cleanup; read-only permission. | Consumed receipt; no active check. |
| `development-viewer_price_aux-retire.yml` | Echoes a completed Viewer-price cleanup; read-only permission. | Consumed receipt; no active check. |
| `development-vis002-aux-retire.yml` | Echoes a completed VIS002 outcome; read-only permission. | Consumed receipt; no active check. |
| `development-pr-archive.yml` | Manual audit job plus a write-capable tag-apply job whose condition requires `github.event_name == 'push'`; no push trigger is declared. | Apply is unreachable under the declared events. Keep inert; do not add a trigger until its manifest and replacement path are re-audited. |

The seven echo-only definitions inflate the active-workflow inventory and advertise controls that cannot perform their namesake operation. Their historical run IDs remain in Actions and their source remains in Git history. A follow-up may move them to an archival docs directory after confirming no non-workflow automation depends on their paths; do not convert them to automatic gates. The PR-archive flow is a separate hold because it has a write-capable job.

### Mutation-signal precision

The inventory reports nine workflow paths with write or operational signals. This is a conservative review queue, not a count of workflows that mutate repository state. Source inspection confirmed several non-write cases:

- `development-aux-retirement.yml` only echoes that it cannot delete refs.
- `development-branch-reconciliation.yml` fetches refs and runs a read-only scanner; it has `contents: read` and explicitly rejects non-fast-forward drift.
- `branch-hygiene.yml` observes refs and prints delete candidates; it has no write permission or apply step.
- `public-routing-before-clerk.yml` sends a negative HTTP `PUT` probe whose assertion expects 405; the scanner treats the method token as an operational signal, not as evidence that the endpoint changed state.

The write-capable workflows still require permission/job-condition review. The inventory’s current heuristic mixes text signals, permission presence, and effects; TST-001 remains open until the crosswalk separates those categories and ties each command to its reachable assertion.

### Actions identified at the historical pin

1. Archive the seven consumed echo-only workflow definitions outside `.github/workflows`, preserving their source and run links.
2. Keep `development-pr-archive.yml` inert while its dispatch/apply event contract and exact archive manifest are reviewed.
3. Add focused inventory cases for read-only output, comments/identifiers, and expected negative HTTP-method probes before changing the signal classifier.
4. Re-run inventory on the resulting exact development push, then refresh the checked-in snapshot from that artifact.



## Exact readback at PR base

- Product `main`: `01ded2c100fbfd8b16897e26113dc5068a83e429` (tree `d1588ab2a71c5de7e8b7cfaa907d5e5637fa7178`).
- Product `development`: `c6362970f0cd29a99c5d1122d08e85d8b88601c5` (base of PR #363). The pre-PR readback showed no open PRs; the artifact’s internal PR list was not inspected.
- Inventory run [45331965279](https://github.com/EAKerber/MobiliPresenter2D/actions/runs/45331965279) succeeded. Artifact ID `14891304182`, name `tst-001-workflow-inventory-c6362970f0cd29a99c5d1122d08e85d8b88601c5`, digest `sha256:29ae6ace8e25ecf266af344e2f08139a3f80f7b868e2c4b5940d9b4d35e0b964`, created `2026-11-24T05:15:14Z`.
- The checked-in JSON remains an earlier snapshot pinned to `development@e05b37a7cef712f5eb9bb1a0df5bd5937afd203e`; its counts are historical and are not counts for `c6362970`. The exact-head artifact is present, but this update records only its metadata; its internal rows have not been reconciled into the checked-in JSON.
- Before this work, Product had 20 branches and no open PRs. The temporary ref for PR #363 raises the count to 21, with one PR open; this is an explicit temporary soft-cap overage. Once integrated, the ref is eligible for retirement if its tree matches integration and no open PR depends on it.
## Inventory results — historical snapshot at `e05b37a7`

- `main`: 27 workflow files; `development`: 75; 25 are shared, 2 exist only on `main`, and 50 only on `development`.
- The development workflows declare 25 `pull_request`, 61 `push`, 63 `workflow_dispatch`, and 1 `schedule` trigger. Trigger counts overlap; they are not unique-workflow counts. Twelve workflows are dispatch-only.
- The union has 77 workflow paths and 96 branch-version definitions. All 96 parsed with zero warnings; they declare 372 run commands. The reader is a YAML-aware subset parser for the syntax used in this repository, not a general YAML validator.
- Nine workflow paths now expose write-capable or branch-operation signals: `branch-hygiene-bounded.yml`, `branch-hygiene-development-retirement.yml` (main only), `branch-hygiene.yml`, `development-aux-retirement.yml`, `development-aux-terminal.yml`, `development-branch-reconciliation.yml`, `development-pr-archive.yml`, `development-retirement-batch.yml`, and `public-routing-before-clerk.yml`. The count increased after command bodies were preserved in the inventory; this is newly visible evidence, not a newly introduced permission. Classify these as operational for review, not as ordinary product-validation gates.
- Command text and SHA-256 digests are now present. They identify declared run-step source; they do not prove that every assertion is reachable.

## Friction reviewed and disposition

1. **Candidate-assets false fan-out — fixed in #344.** The broad `tools/**` trigger was replaced with the 15 consumed helpers. `app/**` remains because that gate runs app tests and checks runtime asset consumers.
2. **Duplicate 124-scenario browser suite — reduced in #343 and #346.** The same suite no longer runs through both the generic development semantic gate and the production-bound NAV gate on development PRs. The Viewer workflow retains its 20 exclusive geometry/theme/keyboard cases.
3. **Two historical NAV workflows — narrowed in #351.** Their duplicate shared-browser invocation was removed from routine workflow fan-out while their source/provenance audits and unique ARC03 fixture coverage remain. The defect discovered in the isolated ARC03 fixture was repaired and the scoped gates passed.
4. **Inventory analysis undercounted operational signals — fixed in #352.** Command bodies had been dropped before signal analysis, and the dispatch-only count read a missing property. The focused inventory and selector checks passed.
5. **Manual inventory dispatch was unavailable — fixed in #355.** The workflow exists only on `development`, while `main` is the default branch and does not contain it. A push on `development` now generates an exact-SHA inventory artifact when workflow definitions or the inventory generator change. PR validation remains advisory and does not skip existing gates.
6. **The 988-candidate report is not 988 separate suites.** The impact selector now maps four contract families; unknown paths still select all four as an advisory fallback. It remains advisory and does not suppress, cancel, or replace workflows.
7. **Authenticated `/config/` browser checks remain a fixture blocker.** Keep the fail-closed `BLOCKED_AUTH_FIXTURE` behavior; do not expose the route or loosen assertions to make CI green.
8. **Mask gate behavior remains a separate concern.** Earlier TST-004 work added reachability for mask alpha semantics and exposed-side pixel bounds. The recent inventory, trigger, and historical NAV changes affect workflow bookkeeping only; they do not change Viewer runtime, mask data/assets, or consumers.

9. **V5 normal-save test fan-out — fixed in #358.** On #357, changing only `app/tools/test-v5-normal-save.js` triggered nine workflows. The impact selector marked it unclassified and recommended every existing bundle. The buyer-configuration boundary and advisory selector were relevant; seven broad app/build, visual, browser, and ARC-13 workflows did not need to run for that helper-only change. #358 added a dedicated concurrency bundle and exact negative path filters to those seven gates. The test remains directly covered by the buyer-configuration boundary; the advisory selector now recommends only that contract.
10. **Browser dependency setup remains a cost to track.** Browser workflows install Playwright and Chromium/WebKit on each hosted run. In the test-only batch, the mobile and summary-pricing browser jobs spent about six minutes before finishing; the stone browser job took about 6m28 on the workflow-filter PR. Keep these gates for relevant product changes. Consider dependency caching as a separate measured improvement; do not remove their unique browser assertions to avoid setup time.

## Re-read of gate friction — PRs #360–#362

1. **Browser setup time was measurable friction.** PR #360 pinned the Playwright browser image and removed per-run browser installation. Samples were 696 s before, 67 s on the PR, and 51 s after integration. These are individual observations, not a median or controlled benchmark. Browser assertions remain enabled.
2. **About skip-link false fan-out was narrowed in #361.** The dedicated About gate no longer runs for changes limited to other pages’ generated manifest; About source and build inputs remain watched. The shared navigation gate still owns manifest-wide semantics.
3. **Price gate duplicate work was narrowed in #362.** The development-only workflow now runs only the unique wire-adapter test on its exact source paths. The primary gate retains publication, V5 save, endpoint, syntax, build, and browser checks.
4. These changes update workflow scheduling and invocation only. They do not change Viewer runtime, mask data/assets, or mask consumers.

## TST-002 crosswalk slice — Viewer base-price publication

The IDs below are persisted crosswalk identifiers for this slice, mapped to named test cases and source blobs observed at PR base `development@c6362970`. They are review-level IDs and do not exist as annotations inside test code. This is partial TST-002 work, not a full workflow/assertion crosswalk.

Trigger key: **P** = `.github/workflows/viewer-base-price-contract-gate.yml` (PR to main/development or push on integration/development/main, matching its path filters, or manual dispatch); **D** = `.github/workflows/development-viewer-price-gate.yml` (PR to development, push to development, matching its source/test/workflow paths, or manual dispatch). P runs publication/save tests, related V5/endpoint/syntax/build steps and the browser gate. D runs only `tests/ci/viewer-price-wire-contract.test.cjs`.

Evidence key: publication test blob `72359965`; V5 save test blob `e9ad71cb`; wire test blob `c2bc020a`; browser gate blob `77018091`; P workflow blob `d3512367`; D workflow blob `83425307`. P/E1–E3 passed in run [45329753083](https://github.com/EAKerber/MobiliPresenter2D/actions/runs/45329753083) on an earlier SHA; the corresponding test blobs are unchanged at c636, so this is not exact-head execution evidence. D wire test passed at exact c636 in run [45331965595](https://github.com/EAKerber/MobiliPresenter2D/actions/runs/45331965595). No E5 protected/authenticated-flow evidence is established.

| Assertion ID | Source/test case | Contract and risk | Consumer | State | Fixture | Evidence | Trigger | Negative assertion | Owner |
|---|---|---|---|---|---|---|---|---|---|
| VP-PUB-01 | publication test: legacy absence/OFF | 0.1 excludes price/private fields; prevents data leak. | `project()` public DTO. | E0 current; earlier run. | `fixture()`; permission absent/OFF; private marker. | publication blob; P run above. | P | Forbidden price/private keys absent. | UNKNOWN |
| VP-PUB-02 | publication test: ON eligible prices | Only positive amount cents on visible eligible modules; prevents invalid/hidden price exposure. | `project()`. | E0 current; earlier run. | ON with valid, zero, percent, hidden, over-limit, absent, valid module cases. | publication blob; P run above. | Ineligible modules omit price; private marker absent. | P | UNKNOWN |
| VP-PUB-03 | publication test: revocation | OFF removes all prices and returns 0.1; prevents stale publication. | `project()`/serialization. | E0 current; earlier run. | Same fixture ON then OFF. | publication blob; P run above. | No `basePriceCents` after OFF. | P | UNKNOWN |
| VP-PUB-04 | publication test: invalid authorization shapes | Reject malformed permission; prevents permissive authorization. | `project()`. | E0 current; earlier run. | true, null, non-boolean enabled, extra key, array. | publication blob; P run above. | Every invalid shape throws. | P | UNKNOWN |
| VP-PUB-05 | publication test: unknown membership | Unknown module blocks priced projection; prevents publishing unregistered module. | `project()` membership validation. | E0 current; earlier run. | ON and unknown module ID in stage membership. | publication blob; P run above. | Projection throws. | P | UNKNOWN |
| VP-PUB-06 | publication test: disabled module stage | Disabled stage blocks priced projection; prevents publication from unavailable stage. | `project()` stage validation. | E0 current; earlier run. | ON and modules stage disabled. | publication blob; P run above. | Projection throws. | P | UNKNOWN |
| VP-PUB-07 | publication test: old 0.1 projection | Legacy adapter strips prices from 0.2; prevents schema leakage to old clients. | `forLegacyViewer()`. | E0 current; earlier run. | Priced 0.2 result converted to 0.1. | publication blob; P run above. | Legacy DTO has no price; new DTO retains it. | P | UNKNOWN |
| VP-V5-01 | V5 save test: absent/OFF/ON normalization | Default and explicit states survive normalization; prevents migration/state loss. | `validate()`, `normalize()`, signature. | E0 current; earlier run. | Default document plus ON and OFF copies. | V5 blob; P run above. | OFF keeps legacy signature; ON changes it. | P | UNKNOWN |
| VP-V5-02 | V5 save test: invalid flags | Malformed permission fails validation; prevents invalid authorization being saved. | `validate()`. | E0 current; earlier run. | null, numeric enabled, extra key, string, array. | V5 blob; P run above. | Permission error returned. | P | UNKNOWN |
| VP-V5-03 | V5 save test: conditional write/readback | Save uses matching ETag and verifies persisted state; prevents lost update/false success. | `savePublishedV5()` and fake store. | E0 current; earlier run. | In-memory ETag store; ON then OFF. | V5 blob; P run above. | Requires `onlyIfMatch`; checks write count and readback. | P | UNKNOWN |
| VP-V5-04 | V5 save test: public ON response | ON response exposes authorized price and omits internal choice-total. | `publicProjection.project()` after save. | E0 current; earlier run. | Saved ON state and module pricebook value. | V5 blob; P run above. | Expected schema/cents present; private field absent. | P | UNKNOWN |
| VP-V5-05 | V5 save test: public OFF response | OFF response has no base price; prevents price surviving revocation. | Public projection after save. | E0 current; earlier run. | Saved OFF state after ON. | V5 blob; P run above. | Schema 0.1; no price. | P | UNKNOWN |
| VP-V5-06 | V5 save test: invalid flag cannot save | Invalid payload performs zero writes; prevents invalid permission persistence. | `savePublishedV5()`. | E0 current; earlier run. | Valid document except string enabled flag; fake store. | V5 blob; P run above. | Error result and writes=0. | P | UNKNOWN |
| VP-WIRE-01 | wire test: 0.1 response | Accept legacy response without price and preserve dimensions. | `window.CASA_PUBLIC_VIEWER_DATA.load()`. | E0+E1/E2 exact c636. | VM loads production `public-data.js`; fake fetch returns 0.1. | wire blob; D run above. | No price key; dimension label preserved. | D | UNKNOWN |
| VP-WIRE-02 | wire test: valid 0.2 scalar | Preserve authorized cents without local pricebook fallback. | `load()` normalized modules. | E0+E1/E2 exact c636. | Fake 0.2 response, 45200 cents. | wire blob; D run above. | Price and visibility preserved. | D | UNKNOWN |
| VP-WIRE-03 | wire test: stale 0.1 with price | Reject price smuggled into legacy schema. | `load()` schema validation. | E0+E1/E2 exact c636. | 0.1 fixture mutated with price. | wire blob; D run above. | `invalid_public_base_price`. | D | UNKNOWN |
| VP-WIRE-04 | wire test: malformed price loop | Reject zero, negative, over-limit, fractional, string, null, NaN and infinity. | `load()` scalar validator. | E0+E1/E2 exact c636. | Eight malformed cents values. | wire blob; D run above. | Each value rejected. | D | UNKNOWN |
| VP-WIRE-05 | wire test: duplicate module | Reject duplicate module IDs. | `load()` membership validator. | E0+E1/E2 exact c636. | Duplicate module mutation. | wire blob; D run above. | `invalid_public_*`. | D | UNKNOWN |
| VP-WIRE-06 | wire test: visibility map missing | Require authoritative viewer visibility state. | `load()` state validation. | E0+E1/E2 exact c636. | Remove `publicState.viewerEntities`. | wire blob; D run above. | `invalid_public_*`. | D | UNKNOWN |
| VP-WIRE-07 | wire test: unknown finish | Reject unknown finish identity. | `load()` finish validation. | E0+E1/E2 exact c636. | Nonexistent finish ID. | wire blob; D run above. | `invalid_public_*`. | D | UNKNOWN |
| VP-WIRE-08 | wire test: invalid dimensions | Reject invalid module geometry. | `load()` dimensions validation. | E0+E1/E2 exact c636. | Set nominal width to zero. | wire blob; D run above. | `invalid_public_*`. | D | UNKNOWN |
| VP-WIRE-09 | wire test: HTTP failure | Fail closed on HTTP 503. | `load()`. | E0+E1/E2 exact c636. | Fake fetch returns 503. | wire blob; D run above. | No result; error returned. | D | UNKNOWN |
| VP-WIRE-10 | wire test: network rejection | Fail closed on network failure; prevent local fallback. | `load()`. | E0+E1/E2 exact c636. | Fake fetch rejects offline. | wire blob; D run above. | No result; error returned. | D | UNKNOWN |
| VP-WIRE-11 | wire test: unknown schema | Reject schema 0.3. | `load()` schema switch. | E0+E1/E2 exact c636. | 0.3 fixture with price. | wire blob; D run above. | `invalid_public_module_projection`. | D | UNKNOWN |
| VP-BR-01 | browser gate: matrix and count | Execute Chromium/WebKit × 390/1366 × light/dark × ON/OFF = 16 scenarios. | Local `/viewer/?module=module-01`. | E0+E3 earlier SHA; not rerun at c636. | Projected data; fake API route; pt-BR; reduced motion. | browser blob; P run above. | Final count=16; HTTP 200/title visible. | P | UNKNOWN |
| VP-BR-02 | browser gate: ON presentation | Show localized price and keep dimension/price inside footer. | `.overview-base-price`, `.dimension-pill`, `.overview-footer`. | E0+E3 earlier SHA; not rerun at c636. | Eight ON combinations across browser/viewport/theme. | browser blob; P run above. | Expected label/currency and bounding boxes. | P | UNKNOWN |
| VP-BR-03 | browser gate: OFF/layout/runtime | Hide price; keep dimensions; no overflow or JS errors. | Viewer DOM and page-error channel. | E0+E3 earlier SHA; not rerun at c636. | Eight OFF combinations. | browser blob; P run above. | No price, one dimension, no horizontal overflow/errors. | P | UNKNOWN |

**Limits:** the 27 IDs above cover this bounded family only. This readback is at the PR base, not the post-merge development SHA. Owner assignment is unverified; trigger details are summarized by P/D and the workflow blobs above. The wire job passed at the exact current SHA. Publication/save and browser tests passed on earlier heads with unchanged test blobs, but their execution is not exact-head evidence. The whole 74-workflow crosswalk, complete event/condition review, command-to-assertion reachability and representative end-to-end cost analysis remain open.

## Remaining TST-001 work

Do not retire additional workflows based on filename or command overlap alone. Complete the contract/path/command-to-assertion crosswalk, review event and conditional execution paths, and measure end-to-end run cost on representative PRs. The current inventory is a verified source map, not proof of full assertion reachability or a cost reduction.

The NAV overlap fixes, earlier asset-trigger correction, and the scoped V5 normal-save trigger correction are integrated in `development`. PRs #360–#362 reduce measured setup time and false fan-out while preserving unique assertions. The Viewer price slice above is mapped; the full 74-workflow crosswalk, event/condition review, command-to-assertion reachability and representative run-cost analysis remain open.


## Exact TST-001 snapshot after PR #379

This section supplements the historical PR-base snapshot above; it does not rewrite that earlier evidence.

- Product `main`: `01ded2c100fbfd8b16897e26113dc5068a83e429`, tree `d1588ab2a71c5de7e8b7cfaa907d5e5637fa7178`.
- Product `development`: `c2abdf7e9024e783dd36fdbd91c4acc76dd8c136`, tree `9e98257547958e8caa504c8eada9893539ded443`; the inventory confirms the worktree head and tree against this pin. No open PRs were listed in the live readback at generation time.
- Exact push workflow run [45366885475](https://github.com/EAKerber/MobiliPresenter2D/actions/runs/45366885475) passed. Artifact [14907610868](https://github.com/EAKerber/MobiliPresenter2D/actions/runs/45366885475) is `tst-001-workflow-inventory-c2abdf7e9024e783dd36fdbd91c4acc76dd8c136`, 49,837 bytes, digest `sha256:5c1b541b9204216d12e6ffc01efbbf2974e3c352b2491458e56732f2641aeaa5`. The exact JSON was read back from the successful job log and refreshed in the checked-in inventory file by this PR.
- The snapshot has 27 workflow files on `main`, 75 on `development`, 25 shared paths, 2 main-only and 50 development-only. Across those paths it contains 96 branch-version definitions and 373 declared run commands, with zero parser warnings. These are workflow/command counts, not test-case counts.
- Development trigger declarations: 26 `pull_request`, 61 `push`, 63 `workflow_dispatch`, and 1 `schedule`; event counts overlap. Twelve workflows are dispatch-only. The inventory identifies 12 branch-version definitions with write-capable signals across 9 workflow paths; this flags operational review, not a permission/security conclusion.
- The historical “988 candidates” figure must not be read as 988 independent test suites. This inventory does not define that figure as test count. The selector remains advisory and is not a replacement for the workflow gates.

## Gate friction reviewed after the exact snapshot

1. PR #379 initially failed because its new regex assertion counted zero YAML command strings; 16 of 17 selector/inventory tests passed. Replacing the escaped-path regex with literal occurrence counting fixed the assertion. The corrected head passed the advisory workflow (run [45366677060](https://github.com/EAKerber/MobiliPresenter2D/actions/runs/45366677060)), and the post-merge push inventory run passed at the exact development SHA above.
2. PR #377's browser image setup change did not demonstrate a reliable time reduction in the available non-controlled samples, so it remains excluded. Browser assertions stay in place.
3. `tests/public-pages-smoke.cjs` is executed in browser only on non-draft PRs to `main`; PRs to `development` only check its syntax, and neither push path executes it. This is a deliberate preview-availability boundary in the current workflow, not proof that browser behavior was validated on development. Keep this distinction explicit until a reliable development Deploy Preview fixture is verified.
4. The remaining TST-001 work is still material: map command bodies to reachable assertions, review event/conditional reachability across the exact definitions, and measure representative end-to-end cost. The inventory is now current and readable, but those reviews are not complete.


## Exact TST-001 snapshot after PR #382

This snapshot supersedes the c2abdf7 inventory values above for current-state counts while preserving the earlier source pins and review history.

- Product `main`: `01ded2c100fbfd8b16897e26113dc5068a83e429`, tree `d1588ab2a71c5de7e8b7cfaa907d5e5637fa7178`.
- Product `development`: `d7f1b03d8ae3a6a733bb11e56688d78d9bd1a4c6`, tree `f4bee9b613e3f19f657156dbc0827733372e9c21`; the generated inventory verified the worktree head/tree against this pin. The live PR list was empty at generation time.
- Exact push run [45369586472](https://github.com/EAKerber/MobiliPresenter2D/actions/runs/45369586472) passed. Artifact [14907483664](https://github.com/EAKerber/MobiliPresenter2D/actions/runs/45369586472) is `tst-001-workflow-inventory-d7f1b03d8ae3a6a733bb11e56688d78d9bd1a4c6`, 49,841 bytes, digest `sha256:c18a69a43235886262943d529d16e2f0b124a68fbc82b60a3473681b5c7c2f26`. Its exact JSON was read from the successful run log and refreshed into the checked-in snapshot by this PR.
- Counts remain 27 workflows on `main`, 75 on `development`, 25 shared paths, 2 main-only, and 50 development-only. The inventory has 77 workflow paths, 96 branch-version definitions, 374 declared run commands, and zero parse warnings. Event declarations remain 26 `pull_request`, 61 `push`, 63 `workflow_dispatch`, and 1 `schedule`; those event counts overlap. Twelve workflows are dispatch-only. These are not test-case counts.

## Gate friction and reachability — PRs #381–#382

1. PR #381 changed the shared local buyer fixture, so five browser workflows ran alongside the advisory selector: Mobile, Keyboard, Stone, Summary Pricing and Flow Layout. All six jobs passed. The five browser workflows each consume the shared fixture but execute distinct suite contracts. Observed single-run durations were 68 s, 48 s, 55 s, 34 s and 147 s respectively; the advisory run took 13 s. The 147 s Flow Layout job was still testing its existing responsive navigation matrix, not waiting for the new glass replay. These are single observations, not a controlled benchmark.
2. The new mobile glass replay passed 256 model combinations and four browser captures through the real Configurator controls. It confirmed that the `module-02` + `module-05` capture now matches the selected/rendered state.
3. Post-merge path review found the replay file was missing from the mobile workflow's `pull_request` filter. PR #381 ran it because the workflow itself also changed, so its green run alone did not prove future test-only changes would trigger it. PR #382 added the path to both `push` and `pull_request` and a focused contract assertion; all 18 selector/inventory tests and the mobile browser job passed on the exact PR head. This is a gate-reachability fix, not product runtime work.
4. The hosted `tests/public-pages-smoke.cjs` still runs in browser only on non-draft PRs to `main`; a PR to `development` gets syntax validation, not hosted behavior. Keep this as a distinct preview-fixture limitation until a reliable development Deploy Preview is verified.
5. TST-001 remains incomplete: command-to-reachable-assertion mapping, full event/conditional reachability, and representative end-to-end cost analysis remain open. The current inventory is a verified source map, not proof that each assertion is reachable.


## Gate reachability review — archived asset provenance

The archived asset-provenance workflow was dispatch-only, so edits to its source images did not automatically run the existing exact-tag and blob-identity checks. The focused candidate adds pull-request and push triggers on `development` for the 40 exact paths declared by the pinned archive manifest plus the test, audit tool and workflow itself. The existing manual trigger, assertions, two pinned tag checks and artifact publication remain. The trigger-scope crosswalk is in `tst-002-asset-provenance-crosswalk-2026-11-24.md`.

Friction classification: missing automatic reachability, not redundant assertions. This change schedules one existing provenance gate for matching changes and avoids unrelated path fan-out. Duration impact is unknown until an exact-head run is recorded; no time-saving claim is made. No runtime or asset content is changed.


## TST-001 signal precision readback

The inventory builder and focused fixtures were integrated by PR #391. The new exact development push [#45382930493](https://github.com/EAKerber/MobiliPresenter2D/actions/runs/45382930493) succeeded at \`development@c055a7ed25976337748de2c924ea2279cab7efa3\` (tree \`8b4d1bd8b18dd5deac4c6f8529a1e75d14b5734f\`). Artifact ID \`14915131539\`, digest \`sha256:90162d99db29f5e89e445082d03f6fd1d98821d5b799599dc3cf7aa4becdedb1\`.

The refreshed inventory still records 27 \`pull_request\`, 62 \`push\`, 55 \`workflow_dispatch\`, and 1 \`schedule\` events across 68 development workflow files; 4 definitions are dispatch-only. The union has 70 branch-version definitions, 7 paths with conservative mutation/operation signals, zero YAML-subset parse warnings, and an empty open-PR readback.

The public-routing workflow's expected \`PUT\` probe is now represented separately with its \`405\` assertion, job ID, and exact job condition. In the development definition the browser job is limited to non-draft PRs targeting \`main\`; the inventory no longer counts that rejected probe as a write signal. This fixes one known false positive while keeping write-command and permission signals visible.

TST-001 remains open: command-to-assertion reachability and exact execution outcomes have not been mapped across all critical contract families. The updated inventory adds job IDs and job conditions to command rows; it does not claim that command capture alone proves assertion coverage.


## TST-001 command reachability readback

PR #393 integrated the first executable command-route validation slice. On that PR head, the development test-impact gate passed at run #45384699031. The subsequent exact development push [#45384782187](https://github.com/EAKerber/MobiliPresenter2D/actions/runs/45384782187) succeeded at \`development@29cd75c6535a81e47b9801eb58fb4394ec411937\` (tree \`63e6c093171e502d74642c5de9f8633e09d1d0d4\`). Inventory artifact ID \`14915292924\`, digest \`sha256:f20f0f7fca387b59d3b770e7d66bdf4caa1dc865c7ac3e40f5914385ce931acc\`.

The inventory remains at 27 \`main\` workflow files and 68 \`development\` files (25 shared; 2 main-only; 43 development-only). It records 27 \`pull_request\`, 62 \`push\`, 55 \`workflow_dispatch\`, and 1 \`schedule\` event across development definitions; 4 definitions are dispatch-only. The union has 70 branch-version definitions, 7 conservative mutation/operation-signal paths, zero parser warnings, and no open PRs at the inventory readback.

The selector crosswalk test now resolves every declared command in all five impact bundles to an actual parsed workflow \`run\` step, checks each entry names an event the workflow declares, and confirms the route retains job ID, job/step conditions, and command digest. This caught and corrected a stale candidate-assets command: the workflow runs the \`tests/*.py\` files directly, not dotted unittest module names. The inventory parser now folds YAML \`>-\` run blocks into their shell command form.

This is a verified reachability slice for the current impact map. The assertion description still sits at the execution-entry level rather than attaching an independently named assertion and observed result to every command. Do not mark the full workflow → trigger → job → command → assertion → result crosswalk complete on this evidence alone.


## TST-001 operational workflow execution readback — 2026-11-24

This readback covers the seven workflow paths currently flagged for write/operation review. Product `main` is pinned to `01ded2c100fbfd8b16897e26113dc5068a83e429`. The checked-in inventory measures the exact `development@81207f32d0bd2100421172fb7b6585099c3fa78a` tree; PR #404 then changed only that JSON and integrated at `development@0af0bb0bbe162be98fd8ce1c6c8347ae25106f13`. The workflow blobs listed below are unchanged between the measured tree and current `development`.

Each workflow-blob pin resolves to the declared shell bodies and SHA-256 command identities in the [`TST-001 workflow inventory`](tst-001-workflow-inventory-2026-11-24.json); this table adds the event/job execution readback without copying those commands.

| Workflow definition | Trigger and route | Job and declared command steps | Observed run/result | Effect disposition |
|---|---|---|---|---|
| `branch-hygiene-bounded.yml` — `main` blob `66b078f0`; `development` blob `61d2969a` | `pull_request` path-filtered audit; `push` to `main` for `ops/branch-hygiene-batch.json`. The `apply` job requires a push to `main`. | `apply`: regression tests; build exact plan; apply exact SHA-pinned refs and read back after each deletion. Step command hashes are in the inventory. | [Run #45204970880](https://github.com/EAKerber/MobiliPresenter2D/actions/runs/45204970880), exact `main` SHA: apply job and apply step succeeded; audit and merged-PR cleanup were skipped. | Receipt artifact `14834495023` exists, but its contents were not read here. The set of refs affected is **UNKNOWN**; a green apply step alone is not the deletion receipt. No `development`-branch push route exists in either definition. |
| `branch-hygiene-development-retirement.yml` — `main` blob `5ec0f02f` | `pull_request` audit and `push` to `main` when the exact retirement manifest changes. The `apply` job requires a push to `main`. | `apply`: regression safety tests; apply SHA-pinned waves with full validation/readback. | [Run #45204232284](https://github.com/EAKerber/MobiliPresenter2D/actions/runs/45204232284), run SHA `e994172f`; its workflow blob matches current `main`. Apply job and step succeeded; audit skipped. | Receipt artifact `14833385266` exists, but the exact affected refs are **UNKNOWN** until its payload is read. |
| `branch-hygiene.yml` — `main` blob `cf082d2f`; `development` blob `7e04fcae` | `pull_request`, `push` to `main`, schedule, or manual dispatch. The push route is not a push to `development`. | `plan`: unit tests; compile tools; materialize a fresh observation; build an exact plan. It has read-only permissions. | [Run #45238171111](https://github.com/EAKerber/MobiliPresenter2D/actions/runs/45238171111), exact `main` SHA: plan job succeeded, including tests and observation. | Read-only plan and observation; no ref mutation. No exact `development` execution was observed. |
| `development-aux-terminal.yml` — `development` blob `ebdb7cc7` | Push to `development` when one of four manifest/tool/test/workflow paths changes. | `audit`: negative tests and exact-ref audit. `apply`: same negative tests, then one-shot SHA-pinned retirement; `apply` needs successful `audit` and has write permission. | [Run #40547046013](https://github.com/EAKerber/MobiliPresenter2D/actions/runs/40547046013), run SHA `a5fbf390`; the workflow blob matches the current definition. Both jobs and their operation steps succeeded. | Audit and apply receipt artifacts `12753770567` and `12752569786` exist; their payloads were not read here. The actual affected ref set remains **UNKNOWN**. |
| `development-branch-reconciliation.yml` — `development` blob `718bd85d` | Push to `development` for scanner/ledger/workflow changes, or manual dispatch. | `read-only-audit`: scan the pinned historical inventory minus ledger-backed retirements. | [Run #40809863957](https://github.com/EAKerber/MobiliPresenter2D/actions/runs/40809863957), run SHA `547f9b7a`; the workflow blob matches the current definition. The read-only job and scan step succeeded. | No mutation route: the workflow grants `contents: read`. |
| `development-pr-archive.yml` — current `development` blob `b7289745` | Manual dispatch only. | `audit`: verify the pinned source and tag roster. `apply` requires `push` to `development`, an event the workflow does not declare, so this route is unreachable. | Latest available [run #41330909820](https://github.com/EAKerber/MobiliPresenter2D/actions/runs/41330909820) used a different workflow blob (`feb2f9e5`), failed the audit and skipped apply. It is historical evidence, not a result for the current definition. | Current-definition execution result is **UNKNOWN**. The apply job has no reachable declared event route. |
| `development-retirement-batch.yml` — `development` blob `3c4236fc` | Push to `development` when `ops/development-retirement-batch.json` changes. The apply job also requires successful audit and the `[M2D-RETIRE-APPLY]` commit marker. | `audit`: negative-selection tests and exact-ref/PR/ruleset audit. `apply`: repeat negative tests; create archive tag and delete only the explicit batch with SHA leases/readback. | [Run #41359334010](https://github.com/EAKerber/MobiliPresenter2D/actions/runs/41359334010), run SHA `46837de7`; workflow blob matches the current definition. Audit and apply jobs/steps succeeded. | Receipt artifacts `13104687260` and `13104826529` exist, but their payloads were not read here. The actual affected ref set is **UNKNOWN**. |

**Readback limit:** run-level and job/step conclusions are verified from GitHub Actions. Where a run SHA differs from the current source pin, matching workflow-blob identity proves only that the workflow definition is unchanged; it does not prove every script, manifest, or test input is identical. Artifact IDs are recorded so the operation receipts can be read before claiming which refs changed. This is a result matrix for the seven operational paths, not completion of TST-001: the other validation workflows, candidate/historical workflow classification, uninvoked test files, assertion links, and representative run-cost analysis remain open.
