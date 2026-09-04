# Candidate photographic assets

This tree is a quarantine/review area, not runtime authority.

A candidate is a full-canvas 1536×1024 RGBA PNG whose opaque/semitransparent pixels already live at their final `(0,0)` scene coordinates. Runtime repositioning, scaling and reframing are forbidden.

Each PNG must have a sibling metadata document using `CandidateAsset 0.1`. Candidates pass through:

1. structural gate — canvas, alpha, role, target variant, provenance and authorized ROI;
2. composition gate — deterministic overlay on the R2 target variant, with zero changes outside the authorized ROI;
3. human visual gate — checklist bound to the exact candidate SHA-256.

`APPROVED` in metadata is not enough by itself. Promotion eligibility is derived only when the image hash, structural/composition gates and complete human checklist agree.

No file in this directory is copied into `app/` automatically.
