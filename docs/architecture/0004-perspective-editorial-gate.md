# Perspective editorial gate

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
- width fit.

When a dimension fails, the JSON output includes the direction of the required correction (`up`, `down`, `left`, `right`, `increase-depth`, `decrease-depth`, `expand-vertical`, `compress-vertical`). Passing dimensions emit `none`, avoiding needless micro-corrections.

The PNG overlay draws the scene grid and correction vectors so a human can audit the same evidence used by automation.

## R5A validation case

The first range donor fit preserved width and floor contact but left its cooktop roughly 55 px too low. The gate therefore emitted `verticalTranslation=up` and `verticalScale=expand-vertical` instead of prescribing an unconstrained rotation.

A deterministic sweep kept X and the floor fixed while expanding the candidate upward. The selected v2 transform uses placement `[495,508,742,900]` (about 1.188x the previous vertical extent). Its declared anchors are within the scene thresholds and the editorial gate returns PASS.

The range candidate remains subject to human visual review; an editorial PASS is not a promotion approval.
