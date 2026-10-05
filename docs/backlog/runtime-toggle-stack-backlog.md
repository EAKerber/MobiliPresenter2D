# Housekeeping backlog — runtime, assets and repository hygiene

Items intentionally deferred from the current functional work. None of these should be mixed into feature patches unless a regression proves they are required.

## Repository hygiene

- **Prune and organize stale branches**
  - Inventory branches by age, merged ancestry and unique commits.
  - Preserve only branches with still-relevant unique work or explicit review value.
  - Delete/archive stale branches after confirming no unmerged material is still needed.

- **PR #32 archived**
  - The draft `feat/global-finishes-stone-mobile-pip` was superseded by later work and is closed without merge.
  - Do not resurrect the full branch; recover isolated ideas only if a current requirement still needs them.

- **PR #34 deferred for product review**
  - Keep the exposed-sides/glass concept available for later inspection.
  - The implementation proved complex relative to its general usability gain, so do not promote it until the product value is reconsidered.

## Runtime / schema cleanup

- **Review legacy stone-skirting architecture**
  - `stone-skirting` likely survives from the earlier idea of treating stone and plinth as separate materials that could be coupled by configuration grouping.
  - Verify whether that abstraction still has value under the current schema or is now only compatibility debt.
  - Audit `#skirtingOverlay02`, `#skirtingOverlay03`, `plinthCanvas`, configuration grouping and any duplicated rodapé masks together before removing anything.

- **Persist normalized legacy administration**
  - Runtime/admin normalization currently self-heals legacy published configurations where `stone-skirting` is active but orphaned from the stage list.
  - Consider a one-time server-side migration that writes the normalized representation back to storage once the compatibility path is no longer needed.

## Asset / mask cleanup

- **Audit redundant and legacy masks/overlays**
  - No current visible artifact requires another immediate stone/glass repair pass.
  - Review whether historical repair masks/overlays are now redundant after the owner assets and stone runtime were corrected.
  - Include old pan/stone repair context, approved overlays and duplicated mask paths in the reachability audit.
  - Remove only after browser composition + pixel gates prove the asset is unreachable or redundant.

## UI/runtime infrastructure

- **Centralize scene z-index contracts**
  - Entity z-index values live in scene data while UI overlays use CSS/runtime constants.
  - Move toward one documented stack contract/token source so future entities cannot silently overtake grid, hotspots or selection UI.

- **Broader browser regression coverage**
  - Current gates cover stone/skirting/visibility/stacking and keyboard navigation.
  - Re-add responsive, navigation and other configurator flows incrementally in dedicated tests instead of coupling everything to the stone gate.

## CI maintenance

- **Historical asset/fidelity drift**
  - Candidate asset and variant-fidelity workflows still report failures from stale historical baselines/source hashes already divergent from `main`.
  - Rebaseline in a dedicated maintenance change; do not hide or normalize those failures inside unrelated runtime patches.
