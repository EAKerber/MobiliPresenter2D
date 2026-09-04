# Candidate photographic assets

This tree is a quarantine/review area, not runtime authority.

A candidate is a full-canvas 1536×1024 RGBA PNG whose opaque/semitransparent pixels already live at their final `(0,0)` scene coordinates. Runtime repositioning, scaling and reframing are forbidden.

Each PNG must have a sibling metadata document using `CandidateAsset 0.1`. Candidates pass through:

1. structural gate — canvas, alpha, role, target variant, provenance and authorized ROI;
2. composition gate — deterministic overlay on the target variant, with zero changes outside the authorized ROI;
3. human visual gate — checklist bound to the exact candidate SHA-256.

`APPROVED` in metadata is not enough by itself. Promotion eligibility is derived only when the image hash, structural/composition gates and complete human checklist agree.

## Candidate sets

Some visual states require more than one independent photographic role. `candidate-sets.json` declares ordered sets without merging role authority. The set gate selects exactly one structurally valid candidate per required role, composes them in the declared order and checks the combined result again.

- missing role → `INCOMPLETE`, never implicit approval;
- multiple valid candidates for the same required role → fail closed as ambiguous;
- combined visible diff must remain inside the union of the selected candidate ROIs;
- set-level approval is bound to the exact SHA-256 of every selected candidate and requires its own visual checklist.

No file in this directory is copied into `app/` automatically.
