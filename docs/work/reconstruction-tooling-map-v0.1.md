# Reconstruction Tooling Map v0.1

Status: exploratory / implementation-aware  
Scope: current MobiliPresenter2D research branch plus source MobiliPresenter geometry tooling

## Purpose

Map existing code to the reconstruction architecture **without assuming that an existing tool already conforms to the intended method**.

This document is paired with implementation conformance audits. A filename or historical approved asset is not sufficient evidence that a tool should become canonical.

## Status vocabulary

### CONFORMANT
Implementation already matches the intended architectural responsibility closely enough to be considered a candidate building block.

### CONFORMANT_WITH_LIMITS
Implementation is correct for a bounded contract but should not be generalized beyond its stated scope.

### REUSABLE_CORE
Contains useful primitives that should be extracted/generalized before becoming architectural API.

### EXPERIMENT_ONLY
Useful for evidence generation or hypothesis testing. It must not become authority or promotion logic.

### CONTRACT_MISMATCH
Implementation behavior conflicts with, or is materially weaker than, the new architecture contract.

### SUPERSEDED
A stronger implementation already exists.

### REWRITE_JUSTIFIED
Only used when inspection shows that extraction/refactoring would be worse than a clean implementation.

### BLOCKED
Cannot currently be treated as runnable/reliable because a concrete implementation blocker exists.

## Promotion rule

A tool is not promoted because:
- it produced an approved asset;
- its name matches a desired capability;
- it is referenced by a workflow;
- it has historically passed a visual review.

Promotion requires:
1. implementation inspection;
2. test/evidence inspection;
3. architectural conformance;
4. explicit scope;
5. fail-closed behavior where required.

## Current map

| Architectural capability | Existing implementation | Current classification | What it actually does | Primary limitation / audit note |
|---|---|---|---|---|
| canonical baseline validation | `tools/validate-baseline.py` | CONFORMANT_WITH_LIMITS | preserves canonical baseline manifest/invariants | baseline-specific, not a general SourceResolver |
| variant manifest | `tools/variant_fidelity_manifest.js` | CONFORMANT_WITH_LIMITS | derives deterministic variant manifest/fingerprints | tied to current scene schema |
| variant rendering | `tools/render_variant_fidelity.py` | CONFORMANT_WITH_LIMITS | materializes target variants deterministically | scene-specific composition backend |
| candidate structural intake | `tools/validate_candidate_assets.py` | CONFORMANT_WITH_LIMITS | checks candidate schema, canvas, alpha bounds/ROI, hash and human-review state | intentionally does not prove authoring lineage or geometry |
| authoring provenance | `tools/validate_authoring_provenance.py` | CONFORMANT_WITH_LIMITS | binds candidate to contract, source refs, frame hashes, extraction report and recipe hash for `derived` method | method-specific lineage rules are not yet unified under Reconstruction Packet |
| exact delta extraction | `tools/extract_candidate_delta.py::extract_delta` | CONFORMANT_WITH_LIMITS | RGB diff, zero-change outside ROI, full-canvas opaque replacement delta, exact round-trip verification | syntax blocker repaired on the research branch; deliberately limited to `opaque-replacement-pixels` |
| exact pixel recipe | `tools/materialize_candidate_recipe.py` | CONFORMANT_WITH_LIMITS | replays explicit RGB pixels inside ROI and extracts deterministic delta | low-level historical recipe format, not a general reconstruction method |
| projective donor materialization | `tools/materialize_perspective_donor_recipe.py` | CONFORMANT_WITH_LIMITS / REUSABLE_CORE | validates recipe/contract/source/fingerprint, performs 4-point perspective copy, protects alpha-owned assets, extracts delta | exact historical replay now passes byte-for-byte; geometry is still recipe-authored and therefore this is not a ProjectionResolver |
| local pixel edge measurement | `tools/gap_pixel_gate.py` | CONFORMANT_WITH_LIMITS | measures actual candidate delta support against actual reference alpha edge across threshold sweep | specifically a horizontal visible-gap gate, not a generic geometry evaluator |
| human-calibrated line comparison | `tools/gap_parallelism_gate.py` | EXPERIMENT_ONLY / CONFORMANT_WITH_LIMITS | compares declared candidate line to human-calibrated reference and preserves direction/gap constraints | measurement is annotation-based, explicitly not pixel-edge authority |
| editorial perspective diagnostics | `tools/perspective_editorial_gate.py` | EXPERIMENT_ONLY | evaluates declared geometry, direction, alignment and correction vectors | explicitly reports `pixelEdgeVerification=NOT_EVALUATED` and `promotionEligible=false` |
| local mesh/warp hypothesis | `tools/experiment_gap_local_warp.py` | EXPERIMENT_ONLY | applies bounded piecewise local warp, reports integrity and reruns local pixel gate | explicitly not a rigid camera/plane correction and never promotion-eligible |
| review composition | `tools/render_candidate_review.py` | REUSABLE_CORE | reconstructs historical/current baseline, composites candidate, emits review sheet and ROI diff | its machine visual gate is locality/ROI only, not geometry or appearance validation |
| candidate set review | `tools/render_candidate_set_review.py` | CONFORMANT_WITH_LIMITS | stacks candidate-set completeness/review state | set orchestration, not reconstruction reasoning |
| perspective donor recipe data | `review-assets/recipes/module-02-exposed-right-side-v1.json` | CONFORMANT_WITH_LIMITS | records exact source hash, variant fingerprint, donor/target quads, protection and expected pixel result | target geometry remains bounded inference and is not linked to A1 physical primitive |
| authoring contracts | `review-assets/authoring-contracts.json` | CONFORMANT_WITH_LIMITS | constrains target variant, ROI, allowed methods, forbidden outcomes, delta policy | predates explicit authority/status/projection-confidence fields |
| Scene Core physical geometry | source repo `scene-core/src/fixtures/current-geometry.ts` | CONFORMANT for A1 source | explicit physical primitives, dimensions, roles and source bindings | not yet exposed to MobiliPresenter2D through a reconstruction packet/export |
| Promob source validation | source repo `scene-core/tools/dxf_inventory.py`, `validate_promob_profile.py` | CONFORMANT_WITH_LIMITS | inventories/validates Promob-derived source profile | source ingestion, not 2D projection |
| technical view projection | source repo technical drawing/isometric system | CONFORMANT_WITH_LIMITS | deterministic physical/technical projection with provenance | separate presentation backend; not photographic completion |
| research projection compatibility probe | `tools/research_projection_compatibility.py` | EXPERIMENT_ONLY | projects confirmed physical probes through the source fixed camera and compares direction/scale against canonical 2D measurements | diagnostic only; explicitly `promotionEligible=false`; current result rejects exact global transfer for BMC-01 |

## Capability gaps

The following architecture capabilities do not yet exist as stable general implementations.

### SourceResolver — MISSING

Needed responsibilities:
- exact source lookup;
- canonical frame hash;
- variant fingerprint;
- donor/source availability;
- historical replay manifest;
- authority metadata.

Existing code performs pieces of this across multiple tools.

### PhysicalGeometryResolver — MISSING in MobiliPresenter2D

A1 data exists in MobiliPresenter, but no reconstruction-facing export/API currently joins:
- module;
- face role;
- physical plane;
- internal geometry;
- source bindings;
- status.

### OcclusionResolver — MISSING

No current helper appears to answer at face level:

`configuration change -> newly exposed physical face(s) -> expected exposure region`.

Current scene variants encode outcomes rather than this general reasoning.

### ProjectionResolver — MISSING

Current code contains:
- editorial measurements;
- local pixel gates;
- hand-authored donor/target quads;
- a source-repo fixed camera.

There is no implementation that selects and reports:
- global-calibrated;
- planar-projective;
- local-derived;
- bounded-inference;
- blocked.

### ReconstructionPacket serializer/validator — MISSING

The information exists in recipes, contracts, manifests and calibration documents, but is not unified.

### NeutralFaceRenderer — MISSING

No general deterministic helper currently materializes a physical face into a neutral, locally shaded expected raster for use as:
- candidate;
- guide;
- generative conditioning input.

### Generic DonorResolver — MISSING

Current donors are explicitly authored in recipes. There is no ranked search by:
- same physical surface;
- same object;
- same material;
- same scene;
- external reference.

### Generic ProtectionGuideBuilder — PARTIAL

Current projective donor materializer can union alpha from listed protected assets.

Missing:
- protected vector regions;
- named physical ownership;
- configurable alpha threshold;
- reason/provenance per protected region.

### GateRunner — PARTIAL

Many good gates exist, but orchestration is workflow-specific. No packet-driven runner selects mandatory gates from case class and projection confidence.

### BenchmarkHarness — MISSING

The protocol now exists, but no implementation compares candidates under one fixed packet while preserving all outputs.

## Existing pipeline reality

The current candidate workflow already expresses a useful ordering:

1. unit tests;
2. baseline preservation;
3. runtime invariants;
4. target variant derivation;
5. approved asset validation;
6. candidate structural intake;
7. authoring provenance;
8. review composition;
9. specialized geometry/editorial gates;
10. candidate-set review;
11. review artifact upload.

This is valuable evidence for the new pipeline, but it is not yet packet-driven and contains historical role-specific steps.

## Replay evidence after v0.1 audit

Research run `35453134871` revalidated the repaired chain.

Observed:
- 29 focused tests: PASS;
- historical `module-03-hidden` source frame SHA reproduced exactly:
  `f502790c76afe612563958ca3acfcc7d653018d718d11d852ed3a45df553ecfa`;
- projective donor recipe replay candidate SHA reproduced exactly:
  `3becbf8a510dd76757593ed5c227482edef7af57c48877e9d2e714398e77fff8`;
- candidate bytes: exact match to historical candidate;
- changed pixels: `1910`;
- difference/alpha bounds: `[755,525,764,815]`;
- edited frame SHA reproduced exactly:
  `dfa445834900d87450392f3ccec827880eade882ca914153110b6f9d3558eca4`;
- outside authorized ROI changed pixels: `0`;
- round-trip mismatch pixels: `0`;
- historical authoring provenance: PASS.

This upgrades confidence in the deterministic donor/delta/provenance chain while leaving projection authority explicitly unresolved.

## Near-term audit priority

Deep implementation audit should follow BMC-01 dependency order:

1. `materialize_perspective_donor_recipe.py`;
2. `extract_candidate_delta.py`;
3. `validate_authoring_provenance.py`;
4. `validate_candidate_assets.py`;
5. `render_candidate_review.py`;
6. `gap_pixel_gate.py`;
7. `perspective_editorial_gate.py`;
8. `gap_parallelism_gate.py`;
9. `experiment_gap_local_warp.py`.

The purpose is not to rewrite them immediately. It is to decide which implementation pieces deserve promotion, extraction, containment or retirement.
