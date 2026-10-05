# Backlog — runtime toggle / stacking audit

Items found while repairing the stone skirting toggle and scene stacking contracts that are intentionally outside the current functional patch.

## Deferred

- **Legacy `.scene-skirting` overlays**
  - Verify whether `#skirtingOverlay02` / `#skirtingOverlay03` still participate in any current user path now that `plinthCanvas` owns the MDF/stone switching behavior.
  - Remove only after proving they are unreachable or redundant in browser gates.

- **Centralize scene z-index contracts**
  - Entity z-index values live in scene data while UI overlays currently use CSS/runtime constants.
  - Consider a single documented stack contract or token source so future entities cannot silently overtake grid/hotspots/selection UI.

- **Historical asset/fidelity CI drift**
  - Candidate asset and variant-fidelity workflows currently report failures caused by stale historical baselines/source hashes already divergent from `main`.
  - Rebaseline in a dedicated maintenance change; do not mix it with runtime behavior fixes.

- **Broader browser regression coverage**
  - The previous `tests/stone-browser.cjs` targeted obsolete stone-color controls and had stopped exercising the current configurator.
  - The current patch restores coverage for stone/skirting/visibility/stacking contracts. Re-add broader responsive and navigation coverage incrementally in dedicated tests rather than coupling it to the stone test.

- **Persist normalized legacy administration**
  - Runtime/admin normalization self-heals legacy published configurations where `stone-skirting` is active but orphaned from the stage list.
  - Consider a one-time server-side migration that writes the normalized representation back to storage, after the new runtime contract is proven in production.
