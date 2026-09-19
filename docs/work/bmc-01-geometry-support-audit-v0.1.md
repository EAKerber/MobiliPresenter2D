# BMC-01 — Geometry support audit v0.1

Status: research-only / before appearance authoring

## Purpose

Before drawing a new side face, determine how much of each proposed geometry is
already represented by current canonical Module 02 / stone pixels.

This matters because the current Module 02 layer already has opaque pixels to
the right of the independently measured front/side seam x=742. A geometry
proposal that mostly lies inside those pixels is not a missing face; it is
mainly a re-description of existing raster support.

The audit compares:

- historical carcass quad;
- historical plinth quad;
- local physical-depth-transfer carcass quad;
- local physical-depth-transfer plinth quad.

Pre-overlay support is the union of:
- `02_inferior_fogao.png`;
- current `stone-02-cozinha-exposed-right.png`;
- `approved-stone-02.png`.

The existing `module-02-right-exposed-face.png` overlay is kept separate and
used only to ask how the historical candidate intersects each geometry.

## Correction after first execution

The first materialized report exposed a tooling bug before its numbers were
accepted: raw 8-bit alpha values were being multiplied and inverted directly,
so anti-aliased pixels could be counted in both "existing" and "missing".
That violates set partitioning.

The audit was corrected to binarize every support/overlay mask first and to run
an alpha-threshold sweep at `1` and `128`. It now hard-fails unless:

`totalPixels = existingSupportPixels + missingPixels`

for every geometry and threshold.

The superseded first report must not be interpreted.

## Gate interpretation

A future neutral-face or donor candidate should be authored from the **missing
geometry mask**, not blindly from the whole face polygon.

This preserves already-canonical pixels and makes generation, if any, residual
by construction.

No geometry from this audit is promotion-eligible. It is an input to the BMC-01
benchmark and must remain inside the authorized ROI.
