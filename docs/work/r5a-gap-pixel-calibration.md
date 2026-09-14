# R5A — pixel calibration after human correction

The historical p8/s28 local parallelism PASS is invalid. It compared two
declared lines near slope -0.138, while the human red stroke indicated about
-0.481. The purple horizontal reference was also incorrectly reinterpreted as
an automatic evaluation cut. It is now recorded independently. Its proximity
to the backsplash/top-surface transition does not identify a physical vanishing
horizon or determine camera pitch.

## Exact source recovery and real edges

The clean `module-02-hidden` render reproduced the original SHA-256:
`3bebae52fc781ed0bf391cf6ef82c62f7caa810551dc261481f51976c2de7a85`.
The recovered p8/s28 full composite differs from it only within the authorized
range ROI. It is a local experimental composite, not the current PR #8 donor.

`tools/gap_pixel_gate.py` measures actual alpha occupancy of the canonical
exposed stone layer against visible candidate delta support in the exact clean
frame. It records input hashes, every sampled point and four contrast
thresholds (8/16/24/32). It does not read colored annotations or use the warp
recipe itself as candidate geometry. Threshold-sensitive classifications and
missing edges are BLOCKED. Image mismatch, missing reference alpha and an
empty threshold sweep cannot pass.

The measured diagonal occupies approximately scene y=553..569. The following
contour is almost vertical, so the straight-segment fit uses explicit interior
rows 553..567, with no automatic clipping by the purple reference. This
selection is an agent interpretation of the actual pixels and remains
reviewable; it is not a new human-approved annotation.

Fixture crop: `[715,515,775,615]`, without resizing. The config records the scene
offset and both full-frame and cropped input hashes.

| Quantity | p8/s28, actual pixels |
| --- | --- |
| Stone slope dx/dy | -0.5000 |
| Candidate visible-support slope | -0.0929 to -0.1179 |
| Angular error | 19.84 to 21.26 degrees |
| Horizontal sampled gap | 0 to 6 pixels |
| Gate at all four thresholds | FAIL |

Delta support is contrast-dependent and is not recovered object alpha.
Reporting all four thresholds avoids presenting one selected contour as
ground truth. A local PASS still cannot establish whole-plane perspective,
world-space distances, optical pitch or human approval.

## Bounded warp experiment — rejected

`tools/experiment_gap_local_warp.py` tests factors -1, 0.75, 1 and 1.25 on a
piecewise local warp. It fixes x=690 and proposes shifts at x=742 through knots
`[(528,0),(550,4),(553,4),(567,-2),(586,0),(608,0)]`. It affects only the right
part of the top plane and explicitly is not a rigid homography/pitch solution.

No candidate passed. Factor 0.75 had the smallest worst-case angular error,
0.33..3.02 degrees, but its sampled gap still reached zero at low thresholds,
straightness/variation failed, and 12 attempted stone-overlap pixels were
detected before masking. This attempt is rejected, not silently rescued by
the scene-protection mask.

The protected output changed 2,889 pixels, bbox `[690,529,749,586]`, with zero
changes outside the warp envelope, below body y=608, below floor y=838, or in
the opaque stone. Preserving those invariants does not override the failures.
The visible mesh also bends the local rim and is not a global camera correction.

## Reproduction

```bash
python -m unittest discover -s tests -p 'test_gap*.py'
python tools/gap_pixel_gate.py \
  --source-frame review-assets/calibration/gap-pixel-v3/source.png \
  --candidate-frame review-assets/calibration/gap-pixel-v3/candidate.png \
  --reference-layer review-assets/calibration/gap-pixel-v3/reference.png \
  --config review-assets/calibration/gap-pixel-v3/config.json \
  --output-dir /tmp/gap-pixel-v3
```

The second command must exit 1 and write `overall=FAIL`. Successful regression
tests mean the rejected image is correctly rejected, not that the asset is
approved. The original line-arithmetic gate remains usable for calculations,
but now reports `declared-line-geometry-only` and `pixelEdgeVerification=NOT_EVALUATED`.

The reusable full-frame experiment additionally needs the exact clean frame,
p8/s28 composite and full-frame config supplied in the review package. Do not
substitute PR #8's different donor or recreate inputs from prose.

Next investigation: a single coherent top-plane transform constrained by the
actual rear/top and front boundaries, with overlap tested before raster
clipping. If those constraints conflict, revise pitch/placement jointly rather
than bend the rim further to obtain a local numeric PASS. No runtime asset or
human approval is changed by this calibration.
