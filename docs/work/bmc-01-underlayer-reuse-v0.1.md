# BMC-01 — Existing underlayer reuse audit v0.1

Status: research-only

The reconstruction pipeline must inspect hidden **source layers** before
synthesizing a hidden face.

For Module 02 this matters because the current `02_inferior_fogao.png` already
contains a light strip to the right of the independently measured front seam
x=742. In the default composition, Module 03 is drawn later and hides that
strip. When Module 03 is disabled, the same exact Module 02 pixels are revealed.

This audit quantifies how much of the locally projected side is already present
as same-object canonical underlayer and how much is actually covered by Module
03 in the default state.

Architectural consequence:

`occluded canonical underlayer -> C0 reuse`

must precede donor transfer, deterministic rendering or generation.

Only the residual portion that has no valid underlayer should enter
reconstruction authoring.


## Correction after alpha-confidence and RGB identity audits

The original v0.1 interpretation was deliberately conservative but semantically
too strong.

The current Module 02 layer has a wide low-alpha ramp to the right of x=744.
Most of that ramp is not opaque hidden-face material:

- x=743..744 is essentially opaque;
- x=745..751 is primarily alpha 7..19;
- the low-alpha RGB is a dark shadow/compositing value, not an opaque side-face color.

The opaque x=743..744 strip also tracks the base scene closely and carries
background-aligned row transitions.

Therefore this document's original shorthand

`occluded canonical underlayer -> C0 reuse`

is superseded by:

`candidate underlayer -> alpha-confidence -> semantic identity -> C0 reuse only if both pass`.

For BMC-01 the opaque strip remains useful as contact evidence, but the full
hidden-side appearance now prefers the clean Module 01 carcass-side donor.

See:
`docs/work/bmc-01-appearance-evidence-findings-v0.1.md`.
