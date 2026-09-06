# Perspective editorial gate

**Evidence scope correction:** the R5A yaw PASS below is a result on declared
geometry, not pixel-edge or human visual approval. The original stone reference
was rejected during human review. See
[R5A pixel calibration](../work/r5a-gap-pixel-calibration.md) for the measured
failure, independent horizontal reference, contrast sweep and rejected warp.

## Purpose

The perspective editorial gate turns high-level visual placement decisions into reproducible measurements and signed correction vectors. It complements, rather than replaces, ROI/diff and transparency gates.

Pipeline:

`candidate -> ROI/diff -> mask/transparency -> perspective editorial gate -> human review`

## Contract

For candidate classes configured as blocking, the gate evaluates:

- horizontal roll;
- vertical axis;
- projected top-plane depth;
- front and rear worktop alignment;
- floor contact;
- lateral centering;
- width fit;
- signed depth/yaw orientation.

When a dimension fails, the JSON output includes the direction of the required correction (`up`, `down`, `left`, `right`, `increase-depth`, `decrease-depth`, `expand-vertical`, `compress-vertical`, `rear-edge-right`, `rear-edge-left`). Passing dimensions emit `none`, avoiding needless micro-corrections.

The signed yaw dimension compares an explicitly measured candidate depth vector with a versioned scene reference. Both slope magnitude and direction must agree within the configured threshold. This exists specifically to prevent direction-inversion errors where an edit has a plausible correction magnitude but applies it with the wrong sign.

The PNG overlay draws the scene grid and the reference/candidate depth vectors so a human can audit the same evidence used by automation.

## R5A validation case

The first range donor fit preserved width and floor contact but left its cooktop roughly 55 px too low. The gate therefore emitted `verticalTranslation=up` and `verticalScale=expand-vertical` instead of prescribing an unconstrained rotation.

A deterministic sweep kept X and the floor fixed while expanding the candidate upward. The selected height transform uses placement `[495,508,742,900]` (about 1.188x the previous vertical extent).

Human review then identified a residual directional mismatch. A second symmetric sweep tested both yaw signs rather than assuming the correction direction. Whole-body shear was rejected because it tilted the oven body; the accepted transform changes only the top plane:

- scene reference vector from exposed module-03 stone: `[-9,+66]`, slope `-0.1364`;
- candidate top-plane rear edge shifts `+12 px` right and fades to `0 px` at local `y=84`;
- body below the hinge is preserved;
- resulting candidate vector: `[-12,+84]`, slope `-0.1429`;
- slope error: `0.0065`, limit `0.02`;
- direction match: true.

The gate returns PASS with `yawCorrection=none`. Regression tests explicitly assert that the opposite-sign vector fails and emits `rear-edge-right`.

The range candidate remains subject to human visual review; an editorial PASS is not a promotion approval.
