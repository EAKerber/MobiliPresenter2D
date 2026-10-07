# CURRENT_STATE — MobiliPresenter2D

Updated: 2026-10-06
Authority: live `main` plus the canonical roadmaps linked below.

## Purpose

This is the first resume point for future work. Read this file before reconstructing state from chat history.

Do not treat an embedded commit SHA as the permanent current `main` head. Query `main` live. The last fully proven near-official product candidate is:

- `b969bb471831d405fd6e1c9c15bf761176885cdd`

Later housekeeping/documentation commits may advance `main` without changing buyer-visible product behavior.

## Current status

Housekeeping of repository/runtime legacy is substantially complete.

Completed and merged:
- legacy skirting SVG painter removed; `plinthCanvas` is authoritative;
- permanent runtime presentation contracts separated from compatibility migration logic;
- `stone-skirting` canonicalized as a real catalog service;
- proven empty orphan assets removed;
- old work/audit/research branches reconciled and pruned;
- current product gates separated from historical replay;
- near-official candidate fan-out passed all current product gates.

Deferred intentionally:
- PR #34 / `feat/exposed-sides-and-glass`: product-value decision, not housekeeping debt.

## Current planning gate — schema-driven UI consolidation

The accepted PR #97 buyer/runtime behavior is the visual/interaction baseline while the next schema boundary is consolidated.

New product requirements discovered during guided review must be designed before the broader v3 -> v4 production publication:

- normalized data/schema must be the authority for whether semantic UI exists; missing semantic data must not be recreated by hard-coded renderer fallback;
- Modules needs an explicit single-owner list/detail presentation relation that can project to an expandable lateral companion instead of forcing two cramped permanent columns;
- scene/PiP availability must consume the same named responsive layout authority used by the stacked-workspace transition;
- estimate + primary CTA should become a persistent shell/dock region rather than merely the end of the scroll flow;
- price authoring must distinguish absolute amount from percentage with an explicit calculation basis;
- module-card inspect vs selection-toggle behavior and password reveal are component/interaction concerns unless the audit proves otherwise;
- all current semantic redundancies, fallbacks and couplings must be inventoried before implementation.

Canonical plan:
- `docs/backlog/schema-driven-ui-consolidation-roadmap-2026-10-06.md`
- completed audit: `docs/architecture/schema-ui-authority-audit-2026-10-06.md`
- completed contract checkpoint: `docs/backlog/schema-driven-ui-cp-sd-01-contract-plan-2026-10-06.md`
- next track: CP-SD-02, to be executed as smaller slices beginning with a focused semantic-renderer inventory/removal checkpoint

**CP-SD-00 — COMPLETE / PASS.** The audit found no critical unknowns. The main publication blocker is now explicit: v4 persists section presentation metadata, but that metadata is not yet the executable buyer-renderer authority.

**CP-SD-02A0 — COMPLETE / PASS.** Residual buyer semantic-renderer authority is inventoried in `docs/architecture/schema-driven-ui-cp-sd-02a0-renderer-inventory-2026-10-07.md`. **CP-SD-02A1 — COMPLETE / PASS** in PR #110: normalized enabled stages are the sole buyer navigation source. **CP-SD-02A2a — COMPLETE / PASS** in PR #111: the Services group shell is now created from normalized flow using only a generic visual class hook; all current gates and deploy preview passed. **CP-SD-02A2b is IN PROGRESS.** Mini-checkpoint **A2b.1 PASS** proved that omitting `additional-services` from normalized flow creates no semantic section shell, leaves the neutral slot hidden and emits no fallback/invariant error; it also fixed stale generated-shell reconciliation after async configuration load. Mini-checkpoint **A2b.2 PASS**: all eight repository workflows are green on the current PR #112 head, with no additional implementation changes. **A2b.3 is NEXT and closure-only**: final documentation check and merge PR #112; no new functionality.

**CP-SD-01 — COMPLETE / PASS.** CP-SD-01A established one item capability authority; CP-SD-01B established closed executable presentation bindings; CP-SD-01C froze ownership/availability semantics, named layout profiles, companion/PiP/bottom-dock policy, authored material `hex | null` semantics and the unpublished `ConfiguratorAdministration2D 5.0` candidate. PR #108 passed all current app/browser/asset/variant gates and Netlify preview; direct v4/v5 publication remains server-blocked and production was not written. **CP-SD-02 is NEXT**, but will be split into smaller reviewable checkpoints rather than one broad renderer rewrite.

The isolated authenticated CP-UX-05A0 v3 Puxadores repair remains valid and independent. The schema/presentation contract is now frozen; any later authenticated hierarchy publication should target the consolidated v5 candidate directly rather than publishing the historical v4 intermediate first.

## Current P1 — published administration compatibility

The remaining architecture cleanup that affects current production configuration is the published-administration consistency + hierarchy migration boundary.

Last audited production v3 state (2026-10-05) contained:

- `ConfiguratorAdministration2D 3.0`;
- `stone-all` assigned to an enabled stage;
- `stone-skirting` selected in `initialState.services`;
- `stone-skirting` missing from published stage assignment;
- `handles-all` missing from published stage assignment.

The two omissions no longer have the same status:

- `stone-skirting` is a housekeeping consistency defect because the service is selected but unreachable; the runtime currently repairs it in memory through `repairSkirtingStageContract()`;
- `handles-all` was historically treated as an intentional optional omission, but buyer/admin review on 2026-10-06 established a new product requirement: **Puxadores must be a first-class section under Acabamentos and must be visible/configurable in the admin hierarchy**.

Do not solve the Puxadores requirement with another runtime/DOM compatibility hardcode. The published configuration must explicitly own it.

Next safe authenticated sequence:

1. authenticate through the real admin boundary and freshly re-read production;
2. if the audited `stone-skirting` contradiction still exists, execute CP-HK-01A as a separate minimal v3 consistency write;
3. read back, prove unrelated fields unchanged and prove `repairSkirtingStageContract()` becomes a no-op;
4. remove/isolate that obsolete runtime repair in CP-HK-01B and rerun production Stone + Keyboard smoke;
5. freshly re-read production again;
6. if `handles-all` is still absent, execute a **separate explicit product-configuration write** assigning it to Acabamentos/finishes; this is not housekeeping and must not be inferred automatically;
7. read back and prove the only intended semantic difference is the `handles-all` stage assignment, then smoke both buyer Puxadores navigation and the admin hierarchy;
8. freshly re-read production again;
9. only then execute the v3 -> v4 hierarchy publication from that self-consistent source;
10. after v4 readback/equivalence proof, retire v3 as a normal production authority in a separate cleanup checkpoint.

If the live record differs from the last audit, stop and replan from the observed state rather than replaying these writes mechanically.

## New product UX track — navigation, sections and hierarchy

New buyer-visible review produced concrete evidence that was not captured in the previous housekeeping backlog.

Observed issues include:
- stage changes do not always establish a clear top-of-stage visual context;
- section navigation is inferred from DOM shape;
- Services currently creates accidental/unclear section ownership and can treat its programmatic-focus heading as a keyboard item;
- lighting and other service toggles use inconsistent card structures;
- Puxadores is not explicitly covered as a horizontally navigable selection section;
- active-section visual state is unclear;
- `scrollIntoView({block:"nearest"})` does not create an intentional focal position for the last section;
- the admin configuration is effectively `stage -> items[]` and cannot express groups, sections or their order/layout.

Target hierarchy:

```text
Stage -> Group -> Section -> Item -> Option(s)
```

The architecture must keep catalog/data, scene, administration/flow configuration, buyer state and UI rendering as separate authorities.

The canonical plan is:
- `docs/backlog/ux-navigation-hierarchy-roadmap-2026-10-05.md`.

Current UX checkpoint:
- **CP-UX-00 — COMPLETE** — documentation plan merged via PR #79 at `7e728d0f15e445fbb8a1625e2757ad40495fc97d`.
- **CP-UX-01 — COMPLETE** — PR #81 merged to `main` at `91973ebc056be58b62440ed48ad6f473bb9f26b9`. Final reviewed head `ede50780b3f48ea62fd078a34a9610018ccc24b1` passed App build purity, Current variant fidelity, Summary/Pricing browser, Stone browser, Mobile browser, Keyboard browser, Current asset gates and Netlify deploy preview.
- **CP-UX-02 — COMPLETE** — PR #83 merged to `main` at `f6ffa6bcfb06b12a76170933cb952bce869fd28b`. Final reviewed head `bcf99e66e66d9394047873a8b68766cb191b3c99` passed the flow-model unit suite, App build purity, Current variant fidelity, Keyboard browser, Stone browser, Summary/Pricing browser, Mobile browser, Current asset gates and Netlify deploy preview.
- **CP-UX-03 — COMPLETE** — PR #85 merged to `main` at `d02867fa4db940f40e208183e756a146ef5f73b3`. Final reviewed head `54736248ce9b16422026addcdcd89aface2ba6ec` passed hierarchy migration/projection tests, hierarchy editor tests, App build purity, Current variant fidelity, Current asset gates, Keyboard, Mobile, Stone, Summary/Pricing, Admin hierarchy browser and Netlify deploy preview.
- **CP-UX-04 — COMPLETE** — PR #87 merged to `main` at `e11a5c7c377246f1343b79ff04c1f94b587e1c7f`. Final reviewed head `b9f9565360f91cbd228481f4bdc150382d8c4d9d` passed Flow layout browser/screenshots, Keyboard, Mobile, Stone, Summary/Pricing, Admin hierarchy, App build purity, Current asset gates, Current variant fidelity and Netlify deploy preview.
- **CP-UX-04.1 — COMPLETE** — PR #90 merged to `main` at `a7294f8dd4f8209de1e39ccdcdc0902cb84beab0`. Final reviewed head `490ebda8ab56fa7c31411f1b5a6761a114d37cce` kept Puxadores active after handle redraw, lowered the finish two-column container threshold from 520 px to 300 px while preserving a one-column mobile override, and passed Keyboard, Flow layout, Mobile, Stone, Summary/Pricing, App build purity, Current asset gates, Current variant fidelity and Netlify deploy preview.
- **CP-UX-04.2 — COMPLETE** — PR #92 merged to `main` at `006128343e09388676640d0ac33970ae928c6e8d`. Final reviewed head `6c4b9e4308315a7039846306f4ebd0f863f60dd3` centralized the legacy v3 hierarchy template in `app/data/hierarchy-defaults.js`, removed duplicate group/section maps from `flow-model.js` and `hierarchy-administration.js`, moved admin stage/item policies to the same configuration authority, and passed App build purity, Current variant fidelity, Current asset gates, Keyboard, Flow layout, Mobile, Stone, Summary/Pricing, Admin hierarchy and Netlify deploy preview.
- **CP-UX-04.3 — COMPLETE** — PR #95 merged to `main` at `cbf41d29e636fa1a80bc13c1d457837cb737c57b`. It aligned Acabamentos two-column layout with the workspace breakpoint, proved direct Frentes -> Puxadores traversal and advanced hierarchy/keyboard cache revisions; deploy preview #95 was manually accepted.
- **CP-UX-04.4 — COMPLETE** — PR #97 merged to `main` at `6985100edc0012b87f9a01a627a415b39454a699`. Final reviewed head `97e7f6b4f035df44953c1a91a37a933b65afff79` was manually accepted in deploy preview #97 and passed App build purity, Current variant fidelity, Current asset gates, Keyboard, Flow layout, Mobile, Stone, Summary/Pricing and Netlify deploy preview. No production configuration write.
- **CP-UX-05A0 — CODE COMPLETE / AUTHENTICATED EXECUTION PENDING** — PR #99 introduced the dedicated v3-only **Persistir Puxadores no v3** operation and PR #101 hotfixed its local-draft deadlock, merged to `main` at `0ac66c2111d52800f8f9aa9228629433ced81add`. The action re-reads the live record and publishes only the canonical `handles-all` insertion in Acabamentos through the guarded `persist-handles-all` operation. If the admin has local draft edits, it now requires explicit confirmation that those edits will not be published and the panel will be reloaded from the published state; cancel performs zero PUTs. The server independently verifies the candidate is a handles-only v3 delta and direct v4 publication remains blocked. Production is unchanged until an authenticated admin executes the action and exact readback succeeds.
- **CP-UX-05 — NEXT / AUTHENTICATED BOUNDARY** — after CP-UX-05A0 is executed and verified against production (and independent housekeeping preconditions are resolved separately), prepare server-safe v4 publication support, migrate from a freshly re-read authenticated v3 source, then retire v3 as a normal production authority in a separate cleanup checkpoint.

This track is independent from the authenticated `stone-skirting` migration and must not be mixed into it by default.

CP-UX-01 changed no catalog, pricing, scene, asset, buyer-state or published-administration semantics. It made current navigation ownership explicit in the rendered contract, repaired Services/Puxadores friction, separated section-active styling from item focus and replaced `block: nearest` with deterministic stage/section positioning.

CP-UX-02 now provides one immutable normalized flow model and makes keyboard section order/behavior/membership consume that model rather than arbitrary DOM structure. It does not change the published v3 administration schema.

CP-UX-03 is durably closed on `main`. It provides a hierarchy-capable v4 editor while keeping the current production record on v3. Hierarchy-changing drafts are blocked before a production PUT; legacy-equivalent edits may down-project safely to v3; the server independently rejects direct v4 publication.

CP-UX-04 now makes buyer composition consume normalized flow layout for Acabamentos and Serviços and gives Modules two renderer views over one semantic owner. The final functional head also fixes the real desktop controls scroller, synchronizes active Puxadores state on pointer/focus interaction, unifies finish/service section shells, keeps narrow handle cards readable and exposes concrete option inventories in the admin without promoting those options into hierarchy owners.

CP-UX-04.1 closes the post-merge buyer review: handle redraws explicitly restore the `handles` section cursor/active state without forcing focus, and Acabamentos keeps two columns at substantially narrower desktop widths while mobile remains single-column.

CP-UX-04.2 closes the hierarchy-authority defect exposed by admin review: legacy v3 Stage -> Group -> Section semantics now live once in `app/data/hierarchy-defaults.js`. Buyer flow normalization and v3 -> v4 admin migration consume that same configuration. HTML still contains explicit renderer hooks and `flow-layout` keeps the intentionally view-specific Modules two-pane projection, but neither is allowed to become a second semantic hierarchy authority. Domain validation IDs in `configuration.js` remain domain rules rather than layout ownership.

CP-UX-04.3 aligned Acabamentos with the scene/control workspace breakpoint and hardened direct section traversal/cache delivery. CP-UX-04.4 is now durably closed on `main`: side-rail Modules/Services use one internal column, stacked Modules uses two independently scrollable panes, and unmodified module ArrowUp/ArrowDown stays inside the pane contract rather than scrolling the window. The manually accepted preview #97 is the current product/UI baseline.

The Puxadores production discrepancy is now explicitly understood: repository hierarchy defaults already model `handles-all` as the `handles` section, but the last audited published v3 record omitted `handles-all` from every stage. The renderer must not be the long-term semantic substitute for that missing production assignment.

The detailed CP-UX-05 plan is persisted in the canonical UX roadmap and may begin from live `main` for repository preparation. The actual production v3 -> v4 publication remains blocked until an authenticated admin session can re-read and verify the live source. CP-UX-05 is split into publication and legacy-boundary cleanup, and must not be combined with the independent `stone-skirting` housekeeping migration by default.

## Active authorization boundary

The public Netlify site is not protected by site-level password or SSO. The admin boundary is application-level Netlify Identity:
- `admin.html` logs in with `@netlify/identity`;
- the account must include role `admin`;
- `PUT /api/configuration` independently re-checks the authenticated user and admin role server-side before writing the strong-consistency Blobs store;
- the write is revision-guarded and returns 409 on concurrent change.

Current chat sessions can inspect repository/Netlify project state but do not provide an interactive authenticated browser session. To cross this boundary safely, use ChatGPT Work / Cloud Browser for this project, open the production admin page, and enter the admin credentials yourself in the browser session when prompted. Do not paste the password into chat.

For CP-UX-05, authentication is required only when the hierarchy migration is actually executed: re-read the live published administration, verify schema/revision/content digest, derive the v4 candidate from that exact source, prove all non-hierarchy semantics unchanged, publish with revision/content guards, read back and run production smokes. The independent `stone-skirting` housekeeping migration remains a separate transaction unless a later explicit plan proves combining them is safer.

## If authenticated admin access is unavailable

The current stable product remains a valid fallback.

Do not invent repository-side progress that bypasses the authorization boundary.

The new CP-UX track may proceed independently because it is supported by concrete buyer-visible evidence and CP-UX-01 explicitly avoids production configuration/schema mutation.

## Canonical detail

Read, in order:
1. `docs/backlog/schema-driven-ui-consolidation-roadmap-2026-10-06.md`
2. `docs/architecture/schema-ui-authority-audit-2026-10-06.md`
3. `docs/backlog/schema-driven-ui-cp-sd-01-contract-plan-2026-10-06.md`
4. `docs/backlog/schema-driven-ui-cp-sd-01c-contract-plan-2026-10-06.md`
5. `docs/backlog/schema-driven-ui-cp-sd-01c3-v5-candidate-plan-2026-10-06.md`
6. `docs/backlog/schema-driven-ui-cp-sd-00-audit-plan-2026-10-06.md`
7. `docs/backlog/ux-navigation-hierarchy-roadmap-2026-10-05.md`
8. `docs/backlog/housekeeping-roadmap-and-checkpoint-2026-10-05.md`
9. `docs/architecture/official-candidate-gate-2026-10-05.md`
10. `docs/architecture/runtime-contract-map-2026-10-05.md`
11. `docs/architecture/published-config-compat-audit-2026-10-05.md`

The schema-driven UI roadmap is the immediate sequencing authority before broader v4 publication. The UX roadmap remains authority for the completed navigation/hierarchy history and authenticated CP-UX-05 safety boundary. The housekeeping roadmap remains authority for the independent published-configuration compatibility cleanup.

## Persistence rule

Update this file whenever a meaningful checkpoint changes:
- current phase;
- active blocker;
- next action;
- official candidate/release authority;
- intentionally preserved branches/PRs;
- UX checkpoint state.

Do not create a new rotating status file for each chat. Keep this path stable.

For historical evidence, use normal docs/ADRs/PRs; for the current continuation state, update this file.
