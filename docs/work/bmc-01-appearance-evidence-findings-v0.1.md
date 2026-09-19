# BMC-01 — Appearance evidence findings v0.1

Status: research / no runtime promotion

## Purpose

Record what the deterministic BMC-01 experiments actually established about
appearance authority after the local geometry was tightened.

Geometry and appearance are deliberately separate questions.

The current geometry hypothesis is the adjacent-lower-region local transfer:

- Stone 03 current exposed-left edge: about `550 mm -> [+9.13,-22] px`;
- Module 02 carcass depth: `530 mm`;
- resulting carcass depth vector: about `[+8.80,-21.20] px`;
- local carcass quad:
  `[[742,590],[750.798,568.8],[750.798,834.8],[742,856]]`.

That geometry remains research-only.

## Finding 1 — nonzero alpha is not physical occupancy

The Module 02 source layer looked, initially, as if it already contained most
of the hidden side.

That interpretation was too strong.

Inside the locally projected side and to the right of x=742:

- geometry side pixels inspected: `2414`;
- alpha-positive pixels: `2304` / `95.44%`;
- effective opaque alpha mass: only about `25.52%`;
- alpha >=128: `528` / `21.87%`;
- alpha >=224: the same `528` pixels.

The distribution is almost binary in meaning:

- x=743..744: essentially opaque;
- x=745..751: low-alpha ramp, mostly alpha 7..19.

The low-alpha RGB is approximately `[38,31,27]` and differs from the local
base by roughly `193` mean channel levels. Promoting those RGB values to
opaque produced a nearly black face and catastrophic boundary/contact error.

Therefore:

`alpha-positive compositing support != face ownership`.

Soft alpha may encode shadow/edge falloff and cannot become an opaque hidden
face merely because it occupies the expected geometry.

## Finding 2 — even opaque source support needs semantic review

The x=743..744 opaque strip is much closer to the base scene than expected for
a complete side-face donor:

- mean RGB difference to base: about `7.19`;
- 80.3% of samples are within 10 mean channel levels of base;
- its row appearance reproduces horizontal background/tile transitions.

It is still useful as a local contact/edge cue, but is not accepted as a full
appearance donor for the hidden side.

This corrects the earlier wording that called the strip a canonical C0
underlayer.

## Deterministic candidate ladder

### v0.1 — any-alpha preservation

Only 101 pixels were reconstructed because every nonzero Module 02 alpha pixel
was treated as occupied.

Result:
- too conservative;
- retained the soft-alpha/background leakage;
- boundary error became worse after the edit.

Rejected as an ownership model.

### v0.2 — solid-alpha ownership + nearest strong seed

Only alpha >=128 was protected as Module 02 support.

Result:
- `1877` pixels reconstructed;
- zero protected overlap;
- zero ROI escape;
- contact error reduced to zero;
- boundary mean error reduced from about `8.83` to `4.43`.

However the two-column seed carries scene/background row structure, so the
reconstructed face inherits horizontal banding.

Useful process baseline, not final appearance.

### v0.3 — promote soft source RGB

Promoted the low-alpha Module 02 RGB to opaque inside the already-authorized
local geometry.

Result:
- boundary mean error about `177`;
- same-object contact error about `195`.

This is an intentionally useful failure.

The low-alpha RGB is shadow/compositing evidence, not hidden-face material
appearance.

Rejected.

### v0.4/v0.5 — smooth strong-seed continuation

Deterministic low-pass continuation reduced row striping. v0.5 also preserved
the nearest strong contact exactly.

v0.5:
- boundary mean error after: about `4.71`;
- contact error after: `0`;
- row-roughness max: about `10.29`.

The result is cleaner than nearest copying but still inherits semantic content
from the local strip, including background-aligned horizontal transitions.

Useful local-continuation benchmark, not preferred final donor.

### v0.6 — canonical Module 01 carcass-side projective donor

The donor already used by the historical recipe is reused:

`[[360,110],[378,110],[378,250],[360,250]]`.

Its appearance is projected into the **new local geometry**, rather than the
historical overextended quad.

No generation is used.

Metrics:
- changed pixels: `1877`;
- protected-owner overlap: `0`;
- outside authorized ROI: `0`;
- boundary mean error: `8.83 -> 5.32`;
- same-object contact error: `16.71 -> 4.81`;
- row roughness mean: about `0.098`;
- row roughness max: `4.0`.

Visual review also removes the conspicuous tile/background bands present in
the local-seed continuations.

Current interpretation:

**v0.6 is the strongest deterministic appearance hypothesis so far.**

It is still not promoted. Geometry remains local-derived and the donor needs a
final appearance/contact review before any runtime candidate is considered.

## Architectural consequence

Hidden-face reconstruction must distinguish at least four independent concepts:

1. **geometry entitlement** — where a face may exist;
2. **semantic ownership** — whether an existing source pixel actually belongs
   to that face;
3. **appearance evidence** — whether RGB/material information is safe to reuse;
4. **compositing support** — alpha/shadow/antialias contribution.

They are not interchangeable.

Recommended legacy order:

`physical geometry -> current projection evidence -> semantic ownership audit -> appearance donor -> deterministic delta -> visual/gates -> generation only for residual`.

This lesson is also useful for geometry-first future scenes: entity-ID and
face-ID passes eliminate most of this ambiguity at source.

## Next experiment

Do not add generation yet.

Next:
- keep v0.6 local geometry fixed;
- inspect color/contact adaptation only if it improves the donor without
  reintroducing background leakage;
- audit the recessed plinth independently instead of inheriting carcass depth
  or appearance;
- only then decide whether any residual needs generative harmonization.


## Antialiased combined candidate

After the v0.6 carcass-only result, the recessed plinth was audited
independently.

The existing Stone 02 asset has real strong-alpha plinth pixels because the
runtime already treats this lower strip as a separate material surface. It is
not valid to infer the plinth from the carcass depth, and it is not valid to
treat every low-alpha pixel as plinth ownership.

The first nearest-front-plinth continuation was useful but showed stair-stepped
geometry and over-strong local texture at review zoom.

The current antialiased candidate therefore:

- uses the local carcass quad and the local 348.83 mm plinth quad separately;
- maps the clean Module 01 carcass-side donor into the carcass quad;
- maps a clean Stone 02 front-plinth sample into the plinth quad;
- uses 4x supersampled target coverage;
- preserves current strong owner pixels;
- writes zero pixels outside the authorized ROI.

Current report:
`review-assets/research/bmc01-antialiased-completion-v0.1/report.json`.

Observed:
- combined changed pixels: 1,869;
- outside authorized ROI: 0;
- carcass candidate coverage: ~1,598 equivalent opaque pixels;
- plinth candidate coverage: ~128 equivalent opaque pixels;
- the visual staircase at diagonal face edges is materially reduced.

The remaining issue is no longer primarily donor geometry. It is runtime
material behavior.

The historical exposed-side entity is static RGB and has no finish group.
The reconstructed side must instead be split into material-responsive slots.

See:
`docs/work/bmc-01-material-slot-integration-v0.1.md`.
