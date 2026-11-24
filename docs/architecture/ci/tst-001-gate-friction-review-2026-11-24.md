# Gate inventory and friction review — 2026-11-24

## Pinned state

- Product `main`: `01ded2c100fbfd8b16897e26113dc5068a83e429` (tree `d1588ab2a71c5de7e8b7cfaa907d5e5637fa7178`).
- Product `development`: `48851b786af12cbba4741af774b6ace801c30878` (tree `01b715018bc4f8d9a09c2009fefaa3173282781e`).
- The GitHub compare readback confirmed both refs still point to those exact commits; the open-PR readback was empty.
- The full workflow snapshot is [tst-001-workflow-inventory-2026-11-24.json](tst-001-workflow-inventory-2026-11-24.json). It contains source blob pins, trigger filters, jobs, action identifiers, command digests, operational signals, and parse warnings. It is an inventory; it does not claim to prove that every command reaches every assertion.

## Inventory results

- `main`: 27 workflow files; `development`: 75; 25 are shared, 2 exist only on `main`, and 50 only on `development`.
- The 75 development workflows declare 60 `push`, 23 `pull_request`, 62 `workflow_dispatch`, and 1 `schedule` trigger. These overlap; they are not counts of unique workflows. Twelve workflows are dispatch-only.
- The reader parsed all 93 unique workflow-file versions with zero warnings. This is a YAML-aware subset parser for the syntax used in this repository, not a general YAML validator.
- Five workflow paths expose write-capable or branch-operations jobs: `branch-hygiene-bounded.yml`, `branch-hygiene-development-retirement.yml` (main only), `development-aux-terminal.yml`, `development-pr-archive.yml`, and `development-retirement-batch.yml`. Their audit/apply separation means they should be classified as operational workflows, not ordinary product validation checks.

## Friction confirmed

1. **Candidate-assets false fan-out — fixed in #344.** `tools/**` caused the full image/mask suite to run for unrelated CI helper edits. It now watches the exact 15 consumed helpers. `app/**` remains because the gate runs `app` tests and checks runtime asset consumers. The selector test covers this trigger contract.
2. **One development NAV duplicate — fixed in #343.** The same 124-case Chromium/WebKit browser suite no longer runs through both the generic development semantic gate and the production-bound NAV gate on development PRs. The dedicated workflow remains for `main` PRs; the development gate now watches its workflow definition so changes to the dedicated gate remain visible.
3. **Viewer NAV duplicate — fixed in #346.** At the pinned inventory state, `development-viewer-nav005-semantic.yml` invoked the shared 124-scenario browser script as well as its own 20-case depth-2 geometry/theme/keyboard gate. PR #346 removed only the shared-suite invocation and its obsolete trigger/check reference. The historical audit and all 20 exclusive cases passed in run [45311264303](https://github.com/EAKerber/MobiliPresenter2D/actions/runs/45311264303); integration into development is `e143cc078d943f2ac0938a1aeb27e84f2c429438`.
4. **Two narrow historical workflows still invoke the shared NAV script.** `development-public-menu-legacy-semantic.yml` and `development-arc03-prototype-semantic.yml` run it only when their historical audit inputs or workflow definitions change, and both produce separate source/provenance evidence. They do not trigger on routine public-page source changes. Keep these scoped audit workflows unless future changes show that their provenance evidence is redundant.
5. **Protected Configurator browser checks remain a known setup blocker.** Existing evidence shows anonymous `/config/` requests redirect to `/access/`; browser jobs that expect the authenticated bootstrap therefore fail before exercising their intended contracts. Keep this as `BLOCKED_AUTH_FIXTURE`; do not expose the route or loosen the assertions to make CI green.
6. **The 988-candidate impact report was not 988 independent test suites.** The current impact selector is advisory, maps three high-impact families, and never skips existing workflows. It improves traceability but does not yet reduce run count or establish a complete assertion map.

## Decision and next slice

Do not retire workflows solely because their filenames or browser commands overlap. The common Viewer-change PR no longer runs the 124-case suite twice; the dedicated 20-case Viewer gate remains. Next, complete the command-to-assertion map and measure end-to-end run cost across representative PRs. Keep the two narrow historical audits unless that evidence shows a real recurring cost or equivalent provenance coverage elsewhere.

This inventory closes the first reproducible TST-001 inventory snapshot. TST-001 still needs a full contract/path/command-to-assertion crosswalk, event-condition review, and run-cost measurement before any broader gate removal. Existing gates remain authoritative in the meantime.

