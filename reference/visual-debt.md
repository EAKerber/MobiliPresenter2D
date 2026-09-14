# Current visual debt — R5A, 2026-09-07

This list describes the approved-range work branch. It replaces stale R4 claims;
historical checkpoints remain in Git. A machine gate is not human aesthetic approval.

## Resolved implementation debt

- Module 02 column contamination: bounded alpha cleanup implemented in R4.
- Module 02 finish coverage: real mask protects appliance pixels.
- Stone 02/03 joints: subtractive variants and exact conditional bridges implemented in R5A; reconstruction and golden gates pass.
- Replacement placeholder: approved stove RGBA now appears when module 02 is hidden.

The old `raw-neighbor-cut` description and endcap proposal do not describe the
current subtractive stone solution. Do not reintroduce the old completion overlay.

## Current visual review

- Column/tile phase: no obvious active defect reproduced during the 2026-09-07 image inspection. This is a qualitative observation, not measured physical tile alignment. No background edit justified.
- Module 03/04 contact and stone joint: no obvious new seam in the rendered cases; retain regression checks.
- Stove: approved appearance and unchanged masked pixels. The mask excludes a separate floor shadow; floor-contact appearance remains a visual review item.
- Both modules hidden: stove layer renders exactly without cabinet/stone occlusion. Its isolated right edge and floor contact need human judgment; do not synthesize a new side or shadow without a concrete correction brief.

## Reproducible cases

| Case | Current fingerprint | Evidence |
| --- | --- | --- |
| default | scene2d-913a7841 | Exact current golden, 0 changed pixels |
| module-02-hidden | scene2d-b00d727b | Approved replacement; changes confined to object mask |
| module-03-hidden | scene2d-5e212005 | Exposed stone 02, bridges hidden |
| modules-02-03-hidden | scene2d-339d55d8 | Exact isolated stove layer; both stones and bridges hidden |

`reference/variant-cases.json` defines the actions and visibility assertions.
The fourth case is marked `review`, not human-approved. Phase 3 technical review
is complete for these four cases; final aesthetic closure is not implied.
