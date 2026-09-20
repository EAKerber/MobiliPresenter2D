# BMC-04 — compact real-donor calibration v0.1

Status: research-only / review pending  
Branch: `research/bmc04-compact-donor-calibration-v0.1`

## Purpose

Replace the earlier blind appliance-layout generation with a deterministic
semantic guide based on a real compact four-burner cooktop family before any
new ImageGen attempt.

This slice does **not** promote a cooktop candidate and does not change the
default runtime.

## Real-product calibration source

Primary donor family:

- Consul CD060BE;
- official product page:
  https://www.consul.com.br/cooktop-consul-4-bocas-vidro-temperado-com-grades-firmes/p
- manufacturer dimensions used by the mesh: `565 × 460 mm`;
- four burners, built-in, glass table.

The manufacturer envelope/topology is treated as product evidence. Component
centers measured from the official product raster are not treated as CAD or
manufacturer-exact physical coordinates. They remain bounded raster inference
with an explicit ±8 px source-measurement uncertainty.

Contrast family:

- Tramontina Slim Glass Flat 4GG 100;
- official product family is approximately `1000 × 380 mm` with four burners
  aligned horizontally;
- retained as a negative/contrast example rather than the BMC-04 donor family.

## What changed relative to the prior BMC-04 hypothesis

The existing BMC-04 `600 × 520 mm` slot remains historical comparison only.
It was already marked inferred.

The compact donor envelope is `565 × 460 mm`.

To avoid introducing an arbitrary new translation in the legacy scene, v0.1
preserves the center of the previous inferred footprint and replaces only its
envelope. On the `791.01 × 550 mm` Stone02 host this gives:

- left/right margin: `113.005 mm`;
- front/back margin: `45 mm`;
- compact offset from host front-left: `[113.005, 45.0] mm`.

This placement remains a **derived legacy-scene hypothesis**. It is not
confirmed installation geometry.

## Local host-plane projection

The Stone02 transform remains local-derived, not a global camera solution.

Projected compact footprint in the canonical `1536 × 1024` frame:

- front-left: `[530.586851, 572.2]`;
- front-right: `[710.422240, 572.2]`;
- back-right: `[726.432686, 553.8]`;
- back-left: `[555.558223, 553.8]`.

Both depth edges drift right toward the rear, preserving the local Stone02
orientation rather than a symmetric catalog-product yaw.

## Semantic contract

The guide fixes before generation:

- exactly four burner centers;
- compact 2×2 burner topology;
- exactly four controls;
- one right-side control column;
- source depth ordering of the controls;
- mechanically plausible grate relationship around each burner;
- no generated change to counts or topology.

Generation may author appearance. It may not become geometry authority.

## Deterministic artifacts

- `review-assets/research/bmc04-compact-donor-mesh-v0.1.json`
- `review-assets/research/bmc04-compact-donor-mesh-v0.1-report.json`
- `review-assets/research/bmc04-compact-donor-mesh-v0.1-donor.svg`
- `review-assets/research/bmc04-compact-donor-mesh-v0.1-target.svg`
- `tools/research_bmc04_semantic_mesh.py`
- `tests/test_research_bmc04_semantic_mesh.py`

## Gates observed

Local deterministic check:

- 3 focused unit tests: PASS;
- regenerated report: byte-identical to checked artifact;
- regenerated donor SVG: byte-identical;
- regenerated target SVG: byte-identical.

## Stop condition before next generation

Do not return to free-form/blind cooktop generation.

The next ImageGen attempt should consume:

1. the real-donor semantic structure;
2. the projected target semantic guide;
3. the clean BMC-04 scene reference;
4. the current cooktop/reference evidence;
5. preferably an actual real-product donor raster surfaced to the image model;
6. the existing appearance-only perceptual target when available.

Reject/regenerate if the result changes semantic counts/topology, creates
nonsense controls/grates, or needs a projective repair to fit the local host
plane.
