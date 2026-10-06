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
- **CP-UX-04 — IMPLEMENTED / FINAL MERGE GATE** — functional head `2f7480ed045bb611170e50c264a09c14033ff94f` passed flow-layout unit/browser review, Keyboard, Mobile, Stone, Summary/Pricing, Admin hierarchy, App build purity, Current asset gates, Current variant fidelity and Netlify deploy preview. Buyer feedback on scroll targeting, Puxadores active-section state and Acabamentos section framing was incorporated before this closeout. Rerun required gates on the final documentation head before merging PR #87.
- **CP-UX-05 — NEXT AFTER CP-UX-04 MERGE / AUTHENTICATED BOUNDARY** — publish the explicit hierarchy only from a freshly re-read authenticated production v3 source, prove non-hierarchy semantic identity, then retire v3 as a normal production authority in a separate cleanup checkpoint.

This track is independent from the authenticated `stone-skirting` migration and must not be mixed into it by default.

CP-UX-01 changed no catalog, pricing, scene, asset, buyer-state or published-administration semantics. It made current navigation ownership explicit in the rendered contract, repaired Services/Puxadores friction, separated section-active styling from item focus and replaced `block: nearest` with deterministic stage/section positioning.

CP-UX-02 now provides one immutable normalized flow model and makes keyboard section order/behavior/membership consume that model rather than arbitrary DOM structure. It does not change the published v3 administration schema.

CP-UX-03 is durably closed on `main`. It provides a hierarchy-capable v4 editor while keeping the current production record on v3. Hierarchy-changing drafts are blocked before a production PUT; legacy-equivalent edits may down-project safely to v3; the server independently rejects direct v4 publication.

CP-UX-04 now makes buyer composition consume normalized flow layout for Acabamentos and Serviços and gives Modules two renderer views over one semantic owner. The final functional head also fixes the real desktop controls scroller, synchronizes active Puxadores state on pointer/focus interaction, unifies finish/service section shells, keeps narrow handle cards readable and exposes concrete option inventories in the admin without promoting those options into hierarchy owners.

The detailed CP-UX-05 plan is persisted in the canonical UX roadmap. CP-UX-05 crosses the authenticated production boundary and is split into an authenticated v3 -> v4 publication checkpoint followed by a separate legacy-boundary cleanup. It must not be combined with the independent `stone-skirting` housekeeping migration by default.

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
