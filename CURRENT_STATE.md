# CURRENT_STATE — MobiliPresenter2D

Updated: 2026-10-05
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

## Current P1 — published administration compatibility

The remaining architecture cleanup that affects current production configuration is the published-administration compatibility migration.

Production historically contained:
- `ConfiguratorAdministration2D 3.0`;
- `stone-all` assigned to an enabled stage;
- `stone-skirting` selected in `initialState.services`;
- `stone-skirting` missing from published stage assignment.

Buyer runtime is safe because `repairSkirtingStageContract()` repairs that contradiction in memory.

Next safe external checkpoint:
1. authenticate through the real admin boundary;
2. re-read the live published administration;
3. fail closed if revision/content no longer matches assumptions;
4. persist exactly one semantic change: assign `stone-skirting` beside `stone-all`;
5. read back and prove every unrelated field is unchanged;
6. prove the runtime repair becomes a no-op;
7. only then remove the compatibility shim in a dedicated repository PR;
8. rerun current product gates and production Stone + Keyboard smokes.

Do not auto-add `handles-all`.

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
- **CP-UX-05 — NEXT / AUTHENTICATED BOUNDARY** — prepare server-safe v4 publication support in-repository; execute the production migration only from a freshly re-read authenticated production v3 source, prove non-hierarchy semantic identity, then retire v3 as a normal production authority in a separate cleanup checkpoint.

This track is independent from the authenticated `stone-skirting` migration and must not be mixed into it by default.

CP-UX-01 changed no catalog, pricing, scene, asset, buyer-state or published-administration semantics. It made current navigation ownership explicit in the rendered contract, repaired Services/Puxadores friction, separated section-active styling from item focus and replaced `block: nearest` with deterministic stage/section positioning.

CP-UX-02 now provides one immutable normalized flow model and makes keyboard section order/behavior/membership consume that model rather than arbitrary DOM structure. It does not change the published v3 administration schema.

CP-UX-03 is durably closed on `main`. It provides a hierarchy-capable v4 editor while keeping the current production record on v3. Hierarchy-changing drafts are blocked before a production PUT; legacy-equivalent edits may down-project safely to v3; the server independently rejects direct v4 publication.

CP-UX-04 now makes buyer composition consume normalized flow layout for Acabamentos and Serviços and gives Modules two renderer views over one semantic owner. The final functional head also fixes the real desktop controls scroller, synchronizes active Puxadores state on pointer/focus interaction, unifies finish/service section shells, keeps narrow handle cards readable and exposes concrete option inventories in the admin without promoting those options into hierarchy owners.

CP-UX-04.1 closes the post-merge buyer review: handle redraws explicitly restore the `handles` section cursor/active state without forcing focus, and Acabamentos keeps two columns at substantially narrower desktop widths while mobile remains single-column.

CP-UX-04.2 closes the hierarchy-authority defect exposed by admin review: legacy v3 Stage -> Group -> Section semantics now live once in `app/data/hierarchy-defaults.js`. Buyer flow normalization and v3 -> v4 admin migration consume that same configuration. HTML still contains explicit renderer hooks and `flow-layout` keeps the intentionally view-specific Modules two-pane projection, but neither is allowed to become a second semantic hierarchy authority. Domain validation IDs in `configuration.js` remain domain rules rather than layout ownership.

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
1. `docs/backlog/ux-navigation-hierarchy-roadmap-2026-10-05.md`
2. `docs/backlog/housekeeping-roadmap-and-checkpoint-2026-10-05.md`
3. `docs/architecture/official-candidate-gate-2026-10-05.md`
4. `docs/architecture/runtime-contract-map-2026-10-05.md`
5. `docs/architecture/published-config-compat-audit-2026-10-05.md`

The UX roadmap is authority for the navigation/hierarchy track. The housekeeping roadmap remains authority for the independent published-configuration compatibility cleanup.

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
