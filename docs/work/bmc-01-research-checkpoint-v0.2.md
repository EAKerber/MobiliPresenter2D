# BMC-01 — Research checkpoint v0.2

Status: research / no runtime promotion  
Branch: `research/reconstruction-architecture-v0.1`

## Current conclusion

The historical Module 02 right-side overlay should not be used as geometric
authority.

Its long depth was derived from evidence that is now known to be contaminated
by conditional joint-bridge support. The historical carcass/plinth corners move
roughly 45–49 px relative to the current local-depth hypothesis.

The current legacy-scene method is intentionally local and elastic:

1. measure the stable Stone 03 exposed-left top-depth edge;
2. anchor Module 02 at the independently recovered front seam x=742;
3. scale the local depth vector by confirmed physical depths;
4. audit current alpha support semantically, not merely numerically;
5. reconstruct only the residual authorized geometry;
6. keep carcass and plinth as independent material slots.

## Geometry

Reference:
- Stone 03 physical depth: 550 mm;
- current measured front→back vector: approximately `[+9.130,-22]` px.

Module 02:
- carcass depth: 530 mm;
- carcass vector: approximately `[+8.798,-21.2]` px;
- carcass quad:
  `[[742,590],[750.798,568.8],[750.798,834.8],[742,856]]`.

Plinth:
- physical depth: 348.83 mm;
- plinth vector: approximately `[+5.791,-13.953]` px;
- plinth quad:
  `[[742,856],[747.791,842.047],[747.791,884.047],[742,898]]`.

These are local-derived, not a recovered global camera.

## Ownership correction

The current Module 02 layer has a broad low-alpha ramp to the right of the
front seam.

Inside the local carcass side:
- 95.44% of side pixels have nonzero alpha;
- only 21.87% are alpha >=128;
- effective opaque alpha mass is ~25.52%;
- x=745..751 is mostly alpha 7..19 with dark RGB near `[38,31,27]`.

Promoting that low-alpha RGB to opaque failed severely.

Conclusion:
`compositing alpha != semantic face ownership`.

## Strongest deterministic appearance candidate

`review-assets/research/bmc01-antialiased-completion-v0.1`

Method:
- 4x supersampled local geometry;
- carcass donor: clean visible Module 01 carcass-side sample;
- plinth donor: clean visible Stone 02 front-plinth sample;
- current strong owner pixels preserved;
- no generation.

Report highlights:
- 1,869 changed pixels in the combined candidate;
- zero nonzero candidate pixels outside the authorized ROI;
- smoother diagonal boundaries than the binary-mask predecessors.

This is still a research candidate, not an approved runtime asset.

## Material-slot finding

The current historical entity
`module-02-right-exposed-face` is an accessory with `finishGroups: []`.

That is structurally incompatible with the commercial finish system and
explains why an exposed portion can remain at the old color.

The replacement must be material-aware:

- carcass side -> Module 02 MDF/front finish slot;
- recessed plinth side -> front/MDF finish by default;
- recessed plinth side -> stone material only when `stone-skirting` is enabled.

Research proof:
`review-assets/research/bmc01-material-slot-preview-v0.1`.

Three diagnostic material combinations changed zero pixels outside the proposed
carcass/plinth slots.

## Rejected or downgraded paths

- historical long BMC-01 quad: comparison only;
- global Promob fixed-camera transfer: unsupported for this canonical frame;
- low-alpha source RGB promotion: rejected;
- any-alpha-as-ownership: rejected;
- raw nearest same-object fill: useful baseline, visually banded;
- static RGB replacement as final runtime representation: rejected by finish
  behavior.

## Next implementation gate

Before changing runtime:

1. convert the antialiased candidate into explicit neutral appearance + masks;
2. add conditional material recipes for `module-03-hidden`;
3. prove published front finishes recolor the carcass side;
4. prove plinth follows front finish unless `stone-skirting` is enabled;
5. run the four visibility cases and finish combinations in browser;
6. preserve exact pixels outside the reconstructed masks;
7. only after that consider replacing the historical exposed-side overlay.

No generative residual is justified yet.


## Runtime gate completed

The previously listed implementation gate is now substantially complete in a
research-only path.

Completed:
- neutral appearance and alpha ownership are separate app-local assets;
- carcass and plinth are separate material slots;
- visibility is conditional on Module 02 visible + Module 03 hidden;
- published MDF finishes recolor the carcass side;
- plinth follows MDF by default;
- plinth follows stone only with `stone-skirting`;
- all four Module 02 / Module 03 visibility combinations pass;
- zero reconstruction pixels escape the authorized ROI;
- 95 Python tests and current app deterministic gates pass;
- current golden remains at zero pixel difference in the default runtime.

The reconstruction is still query-gated and is not promoted by default.

Next decision gate is visual rather than architectural:
historical-vs-reconstructed comparison at normal scale and magnified seam scale,
with special attention to the carcass/plinth junction.

See:
`docs/work/bmc-01-runtime-material-gate-v0.1.md`.
