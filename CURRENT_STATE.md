# CURRENT_STATE — MobiliPresenter2D

Updated: 2026-10-07
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
- completed track: CP-SD-05 typed pricing — COMPLETE / PASS
- active track: CP-SD-06 production v5 publication / legacy retirement
- completed checkpoint: CP-SD-06A0 repository/authentication preflight — COMPLETE / PASS
- active CP-SD-06A1 checkpoint: `docs/backlog/schema-driven-ui-cp-sd-06a1-server-v5-read-migration-support-2026-10-07.md`; split into A1a safe v5 read (COMPLETE / PASS in PR #153) and A1b guarded migration support (COMPLETE / PASS in PR #154; activation OFF); next CP-SD-06A2 authenticated production activation (not authorized)
- A1a checkpoint/gates: `docs/backlog/schema-driven-ui-cp-sd-06a1a-safe-v5-read-2026-10-07.md`
- A1b checkpoint/gates: `docs/backlog/schema-driven-ui-cp-sd-06a1b-guarded-migration-2026-10-07.md`
- next production gate: `docs/backlog/schema-driven-ui-cp-sd-06a2-authenticated-v5-publication-2026-10-07.md` (planning only; not authorized to execute)
- CP-SD-06A2A0 COMPLETE (consumer-readiness audit, PR #155): `docs/architecture/schema-driven-ui-cp-sd-06a2a0-consumer-readiness-audit-2026-10-07.md`.
- CP-SD-06A2A1a pure buyer v3/v5 projection contract COMPLETE / PASS in PR #156. A2A1b runtime wiring implemented in draft PR #157 (gates pending); A2A2 admin/server v5 and A2A3 rehearsal still block live activation: `docs/backlog/schema-driven-ui-cp-sd-06a2a1a-buyer-projection-2026-10-07.md`. A2A1b runtime wiring, A2A2 admin/server v5 edits and A2A3 integrated rehearsal remain required before live authorization.
- current handoff: `docs/handoffs/schema-driven-ui-current-handoff-2026-10-07.md`

**CP-SD-00 — COMPLETE / PASS.** The audit found no critical unknowns. The main publication blocker is now explicit: v4 persists section presentation metadata, but that metadata is not yet the executable buyer-renderer authority.

**CP-SD-02A0 — COMPLETE / PASS.** Residual buyer semantic-renderer authority is inventoried in `docs/architecture/schema-driven-ui-cp-sd-02a0-renderer-inventory-2026-10-07.md`. **CP-SD-02A1 — COMPLETE / PASS** in PR #110: normalized enabled stages are the sole buyer navigation source. **CP-SD-02A2a — COMPLETE / PASS** in PR #111: the Services group shell is now created from normalized flow using only a generic visual class hook; all current gates and deploy preview passed. **CP-SD-02A2b — COMPLETE / PASS** in PR #112: `additional-services` is now materialized from normalized flow into a generated section shell, absence produces no semantic UI/fallback, and stale generated shells are removed during configuration reconciliation. All eight repository workflows and Netlify preview #112 passed. **CP-SD-02A2c0 — COMPLETE / PASS.** Discovery confirmed the section shell can be separated from Lighting's already-concentrated specialized item adapter; no generic item-effects framework is needed first. Result: `docs/architecture/schema-driven-ui-cp-sd-02a2c0-lighting-discovery-result-2026-10-07.md`. **CP-SD-02A2c1 — COMPLETE / PASS** in PR #114, merged to `main` at `cb58d1306824e0c60e183e6a30dba57d440d3f5d`. Lighting section semantics come from normalized flow through an item-affinity neutral slot while the specialized `lighting-08` item adapter remains intact. Missing Lighting data yields no semantic Lighting UI, no configurable Lighting scene layer and no fallback; all eight repository workflows plus Netlify preview #114 passed. **CP-SD-02A2d0 — COMPLETE / PASS.** Acabamentos discovery confirms the remaining section shells can be migrated one component family at a time without a new generic renderer framework. `fronts` / `choice-swatches` is the smallest next slice; Puxadores, stone packages and stone skirting remain untouched. Result: `docs/architecture/schema-driven-ui-cp-sd-02a2d0-finishes-family-discovery-result-2026-10-07.md`. **CP-SD-02A2d1 — COMPLETE / PASS** in PR #116. Fronts section semantics now come from normalized flow through a neutral `choice-swatches` item-affinity slot; the swatch/material adapter remains intact. A2d1.2 proved that omitting `fronts-all` creates no Fronts semantic UI/fallback while Handles, stone packages and stone skirting remain present. The absence proof exposed and corrected one shell-only bug: presentation layout must live on the inner item adapter, not on the neutral slot that owns `hidden`. Final head `73494b9eb5fb58cd33f3c934c1ecec8f13ba499c` passed all eight repository workflows plus Netlify preview. **CP-SD-02A2d2 — COMPLETE / PASS** in PR #117. A2d2.0 confirmed the handle adapter is separable from static section semantics. A2d2.1 moved Handles id/label/behavior/component ownership to normalized flow through a neutral `choice-grid` item-affinity slot while preserving `#handleHelp`, `#handleOptions`, redraw reactivation, `handleId` state and pricing/rateio unchanged. A2d2.2 proved that omitting only `handles-all` produces no Handles semantic UI/fallback while Fronts, stone packages and stone skirting remain present. Final functional head `43a9c9fd7393d35866df2384d22a79caedd74601` passed all eight repository workflows plus Netlify preview #117. **CP-SD-02A2d3 — COMPLETE / PASS** in PR #119. A2d3.0 discovered and then falsified the unsupported “stone-skirting without stone-all” assumption; canonical validation requires `stone-all` whenever `stone-skirting` is assigned, so that temporary prerequisite was reverted before merge. A2d3.2 moved Stone Packages id/label/behavior/component ownership to normalized flow through a neutral `choice-cards` slot while preserving `#stonePanel[data-configurable-item="stone-all"]`, static `stone-skirting`, `renderStonePackages()`, state, pricing, materials/masks and compatibility repair. A2d3.3 proved schema-valid Stone absence by removing both Stone items plus the legacy active skirting service; no Stone group or Stone Packages shell was fabricated and Fronts/Handles remained visible. Final functional head `be7526d035d5ebceb64bfe1aadbc8cd8e678e8c4` passed all eight repository workflows plus Netlify preview #119. **CP-SD-02A2d4 — COMPLETE / PASS** in PR #121. A2d4.0 fixed the product/domain boundary: Stone Skirting is a separate UI/service-state control but not a separate material authority; `stone-all` remains the single `Pedra e rodapé` material group and independent Stone/Skirting material authoring is explicitly deferred. A2d4.1 moved Stone Skirting id/label/behavior/component ownership to normalized flow through a neutral `toggle-list` slot while preserving `#stoneSkirtingToggle`, `renderStonePackages()`, `setGlobalService()`, `linkedItemIds`, `stone-skirting requires stone-all` and the v3 repair unchanged. A2d4.2 proved intentional Stone Skirting absence by keeping `stone-all` while removing `stone-skirting` from both stage assignment and `initialState.services`; Stone Packages and the Stone group remained visible and no fallback/re-add occurred. Final head `5b669edf855886ce834acd65d465944b6f2ef32b` passed all eight repository workflows plus Netlify preview #121. **CP-SD-02A2e0 — COMPLETE / PASS.** Discovery confirmed Summary can reuse the existing generic `mountStageGroups()` seam without replacing `renderSummary()`: normalized flow already models `summary -> summary-main -> summary` as `action-list`; `#summaryPanel` can remain the stable stage/visual root and keep its visible “Sua composição” header; `#summaryContent` can remain the bounded domain-renderer host inside a neutral `action-list` slot. Summary is a mandatory, always-enabled core stage, so a valid “Summary absent” fixture does not exist; its negative gate must instead prove missing/incompatible renderer bindings fail closed through the existing flow-layout invariants. A2e0 also confirmed `validateSingleSectionStageBinding()` becomes obsolete once Summary uses the generic mount path. **CP-SD-02A2e1 — COMPLETE / PASS** in PR #123 head `23324b19018b6a680631c771bc59fd31c948aa05`. Summary now uses the generic `mountStageGroups()` path; `#summaryPanel` remains the stable stage/visual shell, the visible “Sua composição” header is preserved, and `#summaryContent` remains the sole domain-renderer host inside a neutral `action-list` slot. The normalized `Resumo` heading is generated accessibly as `sr-only` through a generic optional heading-class hook, and the obsolete `validateSingleSectionStageBinding()` special case is removed. Summary-specific unit tests prove complete binding plus missing group/section/component and component mismatch fail closed. All eight repository workflows plus Netlify preview #123 passed, including unchanged Summary/Pricing totals and rows. **CP-SD-02A2f0 — COMPLETE / PASS.** Discovery confirmed the remaining Acabamentos duplication is group-level renderer binding, not section/domain behavior. Both normalized groups are span-1 and their normalized labels exactly match the current visible headings. The safest seam is a generic neutral **group-slot** claimed in place by `mountStageGroups()`: normalized flow owns group existence/id/label/order/span, while the hidden static adapter retains only accepted visual copy/icon, stable DOM ids and section-slot hosts until claimed. A2f0 also found a latent focus issue: `focusCurrentStep()` selects the first `h2` even if its group adapter is hidden; the generic fix is to choose the first heading without a `[hidden]` ancestor. Migration is split deliberately: **CP-SD-02A2f1 — COMPLETE / PASS** in PR #125 head `0a26025476583e6898dbcf844022e73fd7b43502`. Cabinet Finishes is now a hidden neutral group-slot visual adapter claimed in place by normalized flow; group existence/id/label/order/span come from the normalized plan while `frontFinishPanel`, the icon/description and Fronts/Handles adapters stay visually/domain-stable. The gates exposed and corrected two generic gaps: `stageLayout()` now projects `group.label`, and claimed neutral group slots are fully unclaimed when remote reconciliation removes their group. Stage-entry focus now ignores hidden headings; the valid Cabinet-absent fixture proves no residual semantic group shell and focuses `stoneHeading`. Final head passed all eight repository workflows plus Netlify preview #125. **CP-SD-02A2f2 — COMPLETE / PASS** in PR #126 head `e1554589154a9ef66b61f9077359c3a0ce39aed1`. Stone now uses the proven neutral group-slot seam: normalized flow owns group existence/id/label/order/span while `stonePanel`, its visual copy and Stone Packages/Stone Skirting adapters remain stable. The redundant group-level `data-configurable-item="stone-all"` hook is removed; valid normalized Stone-group existence already implies `stone-all`, and the existing `stone-skirting requires stone-all` rule remains authoritative. The valid Stone-absence fixture proves no residual runtime Stone shell and preserves `frontFinishHeading` focus; intentional Skirting absence still keeps Stone Packages/group present. All eight workflows plus Netlify preview #126 passed, including unchanged Stone browser material/state/pricing behavior. **CP-SD-02A2g0 — COMPLETE / PASS.** Discovery confirmed the residual Services hardcode is narrower than expected: `stageItems()` has exactly one consumer, `renderServices()`. That renderer does not explicitly exclude Lighting; it iterates `catalog.services`, so `lighting-08` (registry kind `object`) is naturally outside the generic checklist while the dedicated Lighting adapter remains authoritative. The actual duplication is membership/order: the checklist filters by whole-stage membership and preserves catalog order instead of consuming the normalized section that claimed `#servicesChecklist`. The safe boundary is DOM-bound and generic: derive the owning stage/section from the generated section around `#servicesChecklist`, read that normalized section's `itemIds`, and render only matching `catalog.services` in exact section order. Browser hierarchy-v5 injection is not available through the current v3 administration normalizer, so arbitrary section redistribution remains a flow-model/unit concern; A2g1 can still prove authority in-browser with a valid v3 fixture that reverses `move-stone` / `tempered-glass` stage order and therefore normalized `additional-services.itemIds`. **CP-SD-02A2g1 — COMPLETE / PASS** in PR #128 head `cb7998e6014314bb64f94f527cadcb1d71e93641`. The generic Services checklist now derives membership and order from the normalized section that actually claimed `#servicesChecklist`; the obsolete whole-stage `stageItems()` helper is removed. `catalog.services` is metadata lookup only, while `section.itemIds` is the renderer authority. A valid reorder fixture proves `tempered-glass -> move-stone` renders in normalized order rather than catalog order, state toggles survive redraw, and Additional Services absence leaves no stale generic cards. Lighting remains entirely on its specialized object adapter/dependency/scene path. All eight workflows plus Netlify preview #128 passed, including Keyboard and Summary/Pricing. **CP-SD-02A2h0 — COMPLETE / PASS.** The residual stage-level audit separates three different concerns. Compact navigation abbreviations (`Acab.` / `Serv.`) are deliberate responsive presentation copy and are explicitly pinned by tests; no schema field should be invented merely to relocate them, so they move with CP-SD-03/presentation work. `stagePanels` is a legitimate renderer registry keyed by stage `kind` -> stable visual root; it does not decide semantic order, enabled state or contents and should remain. The real remaining CP-SD-02 authority leak is the generic core-stage mount path: `applyBuyerFlowLayout()` still calls historical stage ids (`finishes`, `services`, `summary`) and each static group grid also carries that historical id, even though the configuration/flow contracts distinguish `stage.id` from `stage.kind` and can derive legacy hierarchy by either id or kind. Modules is intentionally excluded from this cleanup because its presentation policy and companion view topology still identify `modules` and belong to CP-SD-03. **CP-SD-02A2h1 — COMPLETE / PASS** in PR #130 functional head `306de22e89e9c12fa56b80bd618e2be48f412ee9`. Finishes/Services/Summary group grids are neutral static hosts claimed at runtime by the actual normalized `stage.id`; `applyBuyerFlowLayout()` iterates normalized stages and uses the existing `stagePanels` kind registry rather than literal historical ids. The renamed-core-id fixture (`finishes-layout`, `services-layout`, `review-layout`) passed end-to-end with stable visual roots, normalized navigation, generated sections and mandatory Summary semantics intact. All eight workflows plus Netlify preview #130 passed. **CP-SD-02 — COMPLETE / PASS.** The renderer no longer duplicates semantic hierarchy authority for navigation, non-Modules core stage ids, groups, sections or generic Services membership/order; deliberate residuals are presentation topology/copy or domain adapters and are assigned to later tracks. Closure: `docs/architecture/schema-driven-ui-cp-sd-02-closure-2026-10-07.md`. **CP-SD-03A0 is NEXT**: discovery-only audit of the frozen responsive presentation policy against current Modules companion, layout-profile, PiP, dock and scroll implementations.

**CP-SD-01 — COMPLETE / PASS.** CP-SD-01A established one item capability authority; CP-SD-01B established closed executable presentation bindings; CP-SD-01C froze ownership/availability semantics, named layout profiles, companion/PiP/bottom-dock policy, authored material `hex | null` semantics and the unpublished `ConfiguratorAdministration2D 5.0` candidate. PR #108 passed all current app/browser/asset/variant gates and Netlify preview; direct v4/v5 publication remains server-blocked and production was not written. **CP-SD-02 is COMPLETE / PASS. CP-SD-03 is IN PROGRESS. CP-SD-03A0 — COMPLETE / PASS.** The responsive audit found the frozen profile/presentation contract is valid but only partly executable: layout-profile names/thresholds are centralized in JS while application topology is still duplicated in 1050/700 CSS media rules; Modules companion relation/projection is validated but `moduleViewLayout()` still hardcodes detail/list panes and ignores `projectionByProfile`; compact PiP correctly implements `auto-after-anchor`, but stacked PiP is absent despite policy `available + manual`; bottom-dock policy is declarative only and `.flow-actions` still scrolls with content; keyboard section scrolling has explicit side-rail/pane scrollers where available but otherwise falls back to window and has no bottom-dock clearance. Local component container queries remain legitimate CSS and should not be promoted. Result: `docs/architecture/schema-driven-ui-cp-sd-03a0-responsive-presentation-discovery-result-2026-10-07.md`. **CP-SD-03A1 — COMPLETE / PASS** in PR #132 functional head `3c5d63bd9f33178233b25ebed35ff6972037246d`. Modules view planning now consumes `presentationPolicy.stageViews.modules` plus the canonical layout profile; stable detail/list panes bind as `modules-detail` / `modules-list` while legacy pane hooks remain. Runtime markers expose primary/companion relation and profile projection (`side-panel` for side-rail/stacked, `replace` for compact) without hiding, moving, reordering or resizing panes. Selected module state survives profile-marker updates and the existing side-rail/stacked/compact geometry remains unchanged. The first Flow run exposed only a stale renderer-binding snapshot, updated to acknowledge the newly legitimate `detail-panel` binding; no runtime compensation was needed. All eight workflows plus Netlify preview #132 passed. **CP-SD-03A2 — COMPLETE / PASS** in PR #133 functional head `538860e1b0a3f6905c48ffbe950284746ff28c72`. Application workspace/stage/pane topology now consumes the canonical root `data-layout-profile` marker instead of duplicating 1050/700 breakpoint decisions in CSS. `layout-profiles.js` is loaded once before public CSS so the initial marker is available without copying numeric thresholds; side-rail/stacked/compact topology is selected through profile selectors, while local container-fit queries and compact PiP media behavior remain independently owned. Profile round trips preserve module selection and A1 projection markers. All eight repository workflows plus Netlify preview #133 passed. **CP-SD-03A3 — COMPLETE / PASS.** Companion projection discovery is closed; **CP-SD-03A4 — COMPLETE / PASS** executes compact `replace` on stable pane adapters; **CP-SD-03A5 — COMPLETE / PASS** specifies the stacked PiP seam; **CP-SD-03A6 — COMPLETE / PASS** executes the policy-owned stacked manual PiP. **CP-SD-03A7 is NEXT**: discovery-only persistent bottom dock + scroll-clearance specification.

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
- **CP-UX-05A0 — CODE COMPLETE / AUTHENTICATED EXECUTION PENDING** — PR #99 introduced the dedicated v3-only **Persistir Puxadores no v3** operation; PR #101 hotfixed its local-draft deadlock; PR #136 then forced clients onto that corrected logic by advancing the admin bundle cache revision to `admin-hierarchy-v7`, merged to `main` at `9acdf7e15ab1b6af941a839885ff5c1c39d345e8`. The action re-reads the live record and publishes only the canonical `handles-all` insertion in Acabamentos through the guarded `persist-handles-all` operation. If the admin has local draft edits, it requires explicit confirmation that those edits will not be published and the panel will be reloaded from the published state; cancel performs zero PUTs. The server independently verifies the candidate is a handles-only v3 delta and direct hierarchy publication remains blocked. Production is unchanged until an authenticated admin executes the action and exact readback succeeds.
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


**CP-SD-03A3 — COMPLETE / PASS.** Discovery found no reason to invent a new drawer/overlay for the current `side-panel` projections: side-rail already presents the detail/list in the widened controls rail and stacked already presents independent peer panes with preserved scroll ownership. The actual executable gap is compact `replace`: the policy marker says replace while both panes are still vertically visible. Existing state already separates inspection (`selectedEntityId`) from inclusion (`visibilityByEntity`), preserves a `detailOrigin`, focuses the close action on open, restores origin/fallback on close, and keeps compact PiP pinned when detail opens from the scene. The only additional transition hazard is resizing into compact while focus remains inside the primary list and detail is already open; A4 must move focus only when the newly hidden pane contains the active element. Result: `docs/architecture/schema-driven-ui-cp-sd-03a3-modules-companion-projection-discovery-result-2026-10-07.md`. **CP-SD-03A4 — COMPLETE / PASS**: compact `replace` is now executable on stable pane adapters without reparenting or changing selection semantics.


**CP-SD-03A4 — COMPLETE / PASS.** Compact `replace` now executes on the stable Modules view adapters without reparenting: the primary list is visible only when no detail is open, while the companion detail is visible when inspection is active; side-rail and stacked continue showing both panes. One `syncModuleViewVisibility()` helper owns the state machine, preserves stacked pane scroll positions across profile round trips, and moves focus only when a profile transition would hide the pane containing the active element. Existing open/close origin restoration, selection/inclusion semantics and PiP behavior remain unchanged. Functional head `43d6148514c6afaabe10dbd7033f7e81e5f564f9` passed all eight repository workflows plus Netlify preview #135. Shared runtime cache advances v32 -> v33.


A4 gate correction: the first Flow run falsified the assumption that stable pane DOM alone preserves `scrollTop` across stacked -> compact. Compact removes the fixed pane scroller, so the browser legitimately clamps the detail pane to 0. The candidate now snapshots pane scroll offsets only when leaving `stacked` and restores them when `stacked` returns; it does not force an artificial pane scroll position while compact is active. The failed run otherwise reached and passed the compact focus/visibility assertions before this scroll expectation. Mobile and Keyboard passed on the same first head.


**CP-SD-03A5 — COMPLETE / PASS.** Discovery proved the existing single viewer/PiP DOM and transient runtime state are sufficient. Result: `docs/architecture/schema-driven-ui-cp-sd-03a5-stacked-pip-discovery-result-2026-10-07.md`. **CP-SD-03A6 — COMPLETE / PASS.** Runtime now consumes the PiP policy by layout profile: stacked uses the existing manual launcher, compact keeps auto-after-anchor, side-rail remains unavailable, and supported-profile transitions preserve an already-open PiP. The same viewer/controls/transient state remain authoritative; fixed PiP presentation is profile-owned rather than <=700-owned. Functional head `b7162fc70bd8af557198ba2cec3194b0f27f5445` passed all eight repository workflows plus Netlify preview #139. Shared runtime cache advances v33 -> v34.


**CP-SD-03A7 — COMPLETE / PASS.** Discovery found the existing `.flow-actions` footer already contains the exact frozen `estimate` + `primary-action` adapters in policy order. Result: `docs/architecture/schema-driven-ui-cp-sd-03a7-bottom-dock-discovery-result-2026-10-07.md`. **CP-SD-03A8 — COMPLETE / PASS.** The same footer now executes the policy: sticky inside the side-rail controls scroller, fixed in stacked/compact document-scroll profiles, with live measured clearance consumed by keyboard navigation and PiP clamping. Functional head `7cc304b65b89a36197358a61c5fea3e8b926c87f` passed all eight workflows plus Netlify preview #141. Runtime cache advances v34 -> v35. **CP-SD-03 — COMPLETE / PASS. CP-SD-04A0 is NEXT**: discovery-only generic interaction affordance cleanup.


**CP-SD-04A0 — COMPLETE / PASS.** Discovery freezes the non-nested module-card pattern and inventories the two live admin password fields. Result: `docs/architecture/schema-driven-ui-cp-sd-04a0-interaction-affordance-discovery-result-2026-10-07.md`. **CP-SD-04A1 — COMPLETE / PASS.** Module cards now separate inclusion (checkbox-only 44px hit area) from inspection (sibling native body button), retire the visible “Ver” button treatment, preserve blocked-module inspection and existing detail/focus owners, and advance runtime cache v35 -> v36. Functional head `746e36d1eeb54a78849a3672d9bda22ea0506178` passed all eight workflows plus Netlify preview #143. **CP-SD-04A2 — COMPLETE / PASS.** The two live admin password fields now use adjacent accessible reveal controls backed by one admin-local helper; values, autocomplete/minlength, form submission and Netlify Identity/auth semantics are unchanged. Final functional head `77776f504147f0f9ed8718adbe3f41a5a77e61e9` passed all eight repository workflows plus Netlify preview #144. **CP-SD-04 — COMPLETE / PASS. CP-SD-05A0 is NEXT**: discovery-only typed pricing contract, migration boundary and supported percentage bases.


**CP-SD-05A0 — COMPLETE / PASS.** Pricing discovery freezes an independent `CommercialPricingRules 1.0` contract. Legacy bucket names become migration/projection compatibility only. The only initial percentage basis is `eligible-module-base`, preserving per-module rounding before summation. `frontFinishAdjustment` is the only dual-type role initially: fixed amount per finish-eligible module or percentage of that module's base. Item base, handle-choice total, local adjustment and global adjustment remain amount-only. `handleFrontTotal` remains allocation metadata. Legacy v3/v4 projection must fail closed for a non-representable typed rule instead of coercing it. Result: `docs/architecture/schema-driven-ui-cp-sd-05a0-typed-pricing-contract-discovery-result-2026-10-07.md`. **CP-SD-05A1 is NEXT**: pure typed pricing contract + exact legacy migration/projection gates; no buyer/admin/runtime behavior change and no production write.


**CP-SD-05A1 — COMPLETE / PASS.** A pure `CommercialPricingRules 1.0` core now owns typed role capabilities, strict validation, exact legacy bucket migration and fail-closed legacy projection. Front-finish amount is valid typed state but intentionally cannot project to v3/v4. Current buyer/admin/runtime behavior is untouched because the new core is not yet loaded by either surface. Functional head `1650debf4727acde900f72ac58ab0456fd36dfd3` passed all six path-triggered workflows plus Netlify preview #146. **CP-SD-05A2 is NEXT**: migrate buyer calculation authority to typed rules while retaining v3 buckets only as compatibility input.


**CP-SD-05A2 — COMPLETE / PASS.** Buyer numeric pricing authority now consumes `CommercialPricingRules 1.0`; legacy v3 buckets remain only the configuration compatibility input and estimate metadata carrier. The calculator no longer reads legacy bucket names, executes both finish amount and percentage rules, preserves per-module percentage rounding and exact handle allocation, and keeps summary/current value unchanged. Shared buyer runtime cache is `runtime-v37`. Final head `22516cd3f4d5e8e3ace93c08eede780598ad3a65` passed all eight workflows plus Netlify preview #147. **CP-SD-05A3a is NEXT**: move the live v5/admin model to typed pricing ownership while preserving the current admin UI behavior; the amount/percentage selector is split into A3b.


**CP-SD-05A3a — COMPLETE / PASS.** Unpublished v5 and the live admin model now own `CommercialPricingRules 1.0` directly. v3/v4 imports migrate exactly, representable typed edits project exactly, front-finish amount stays valid v5 state but fails legacy publication with `pricing_requires_publication`, and the admin derives BRL/% from each rule instead of bucket names. Material pricing reconciliation is typed; no type selector is exposed yet. Functional head `a39e416dfcdbe6ac0f137a92fad8aca562333d42` passed all seven path-triggered workflows plus Netlify preview #148, including Admin hierarchy and isolated Puxadores persistence. **CP-SD-05A3b is NEXT**: explicit amount/percentage selector only for front-finish adjustments, with zero-on-type-switch and visible percentage basis.


**CP-SD-05A3b — COMPLETE / PASS.** Admin pricing now exposes explicit amount/percentage type authoring only for `frontFinishAdjustment`, with options derived from `ROLE_CAPABILITIES`. Percentage shows the explicit `eligible-module-base` basis; switching type resets the numeric value to zero rather than reinterpreting units. Fixed front-finish amount remains valid local v5 state but Publish stops before any current-v3 PUT with a pricing-specific message. Fresh retry head `f4291c6fc063e27efc52c88463d849578e9ce9cf` passed all seven path-triggered workflows plus Netlify preview #149, including Admin hierarchy, isolated Puxadores and Summary/Pricing. **CP-SD-05A4 is NEXT**: make `CommercialEstimatePriceBook 2.0` typed by default and retire remaining buyer/admin legacy pricing bucket reads outside explicit v3 compatibility seams. The A4 audit also found a latent module-detail fallback still calling `pricing.itemEstimate(..., priceBook)`; A4 must pass `pricingRules` there.


**CP-SD-05A4 — COMPLETE / PASS. CP-SD-05 — COMPLETE / PASS.** The public commercial source is now `CommercialEstimatePriceBook 2.0` carrying `CommercialPricingRules 1.0` directly. Buyer and unpublished v5/admin consume typed pricing as their normal authority; legacy pricing buckets remain only inside named v3 compatibility/import/projection seams. PriceBook 2.0 projects exactly to the historical v3 commercial values, non-representable typed pricing fails closed, buyer option price copy is typed, and the latent module-detail fallback now passes `pricingRules` rather than the PriceBook envelope. Runtime cache is `runtime-v38`; v3 configuration cache is `admin-config-v8`; admin PriceBook/bundle caches are `admin-data-v4` / `admin-pricing-v3`. Functional retry head `104d3c6893223383602736ccf882cd0e09816fac` passed all nine repository workflows plus Netlify preview #150, including Admin hierarchy, isolated Puxadores and Summary/Pricing. Closure: `docs/architecture/schema-driven-ui-cp-sd-05-typed-pricing-closure-2026-10-07.md`. **CP-SD-06A0 — COMPLETE / PASS.** Repository-side v5 publication readiness is now frozen in `docs/architecture/schema-driven-ui-cp-sd-06a0-production-v5-preflight-result-2026-10-07.md`. The offline preflight requires canonical v3 input, blocks contradictory skirting and unresolved Puxadores ownership, derives/validates v5 deterministically, proves exact v3 equivalence, records canonical SHA-256 digests, and verifies expected readback at revision + 1. The server migration contract now requires a raw strong read with ETag and conditional `onlyIfMatch`; normal GET fallback is not accepted as migration evidence. No endpoint behavior or production data changed. Gate evidence is complete across runtime-identical heads: functional head `d59afbccf53566d895478c2f97cbb1184f72e5b4` passed Mobile/Summary/App/Assets/Variant/Netlify; documentation retry head `dc0b8cb6ddc22e83ab23c54c9e5d23940a2652b4` passed Stone plus App/Assets/Variant/Summary/Netlify. **CP-SD-06A1 is NEXT**: add repository-side v5 read + guarded migration-operation support while keeping production mutation disabled.
