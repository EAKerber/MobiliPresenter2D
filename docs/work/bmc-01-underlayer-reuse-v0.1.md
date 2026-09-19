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
