# Stone top-surface depth-edge probe v0.1

Status: research-only

The previous BMC-01 work showed that the historical long Module 02 line mixed
conditional joint pixels with exposed-state geometry. The repository already
contains a better semantic constraint that had not been connected to the
reconstruction research: `review-assets/stone-masks/config.json`.

That configuration explicitly separates:
- backsplash;
- top surface;
- front edge;
- plinth.

For both stone 02 and stone 03 the conservative top-surface band is y=552..574.
Scene Core independently defines each slab depth as 550 mm.

This probe therefore measures the **actual current exposed variant alpha edge
only within that semantic top band**:

- rightmost edge of exposed stone 02;
- leftmost edge of exposed stone 03.

It runs an alpha-threshold sweep and compares the measured edge against the
existing conservative surface polygon.

If stone 02 is stable enough, it is preferable for BMC-01 because it is the
same host/module region directly above the missing right carcass face. Stone 03
remains a useful adjacent cross-check.

Neither edge is a global camera calibration.
