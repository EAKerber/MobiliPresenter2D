# Candidate photographic assets

This tree is a quarantine/review area, not runtime authority.

A candidate is a full-canvas 1536×1024 RGBA PNG whose opaque/semitransparent pixels already live at their final `(0,0)` scene coordinates. Runtime repositioning, scaling and reframing are forbidden.

Each PNG must have a sibling metadata document using `CandidateAsset 0.1`. Candidates pass through:

1. structural gate — canvas, alpha, role, target variant, provenance and authorized ROI;
2. authoring provenance gate — for roles bound to an authoring contract, prove that the candidate came from an edited canonical full frame followed by deterministic delta extraction;
3. composition gate — deterministic overlay on the target variant, with zero changes outside the authorized ROI;
4. human visual gate — checklist bound to the exact candidate SHA-256.

`APPROVED` in metadata is not enough by itself. Promotion eligibility is derived only when the image hash, structural/composition gates and complete human checklist agree.

## Canonical full-frame authoring

`authoring-contracts.json` defines roles that may only be authored by editing the existing canonical scene frame. For those roles, a free-generation image or a semantically similar reconstruction is invalid even if it looks plausible.

The required flow is:

```text
canonical 1536×1024 target frame
  -> localized image edit
  -> returned 1536×1024 edited frame
  -> exact RGB diff against source
  -> reject if any visible change lies outside the role ROI
  -> extract changed pixels into a transparent 1536×1024 layer
  -> recompose source + layer
  -> require 0 round-trip mismatch pixels
```

`tools/extract_candidate_delta.py` performs the extraction and emits `candidate.png`, `candidate.json`, `difference.png` and `extraction-report.json`. The provenance validator binds those files, source/edited-frame SHA-256 values, required source references and the exact candidate hash.

## Candidate sets

Some visual states require more than one independent photographic role. `candidate-sets.json` declares ordered sets without merging role authority. The set gate selects exactly one structurally valid candidate per required role, composes them in the declared order and checks the combined result again.

- missing role → `INCOMPLETE`, never implicit approval;
- multiple valid candidates for the same required role → fail closed as ambiguous;
- combined visible diff must remain inside the union of the selected candidate ROIs;
- set-level approval is bound to the exact SHA-256 of every selected candidate and requires its own visual checklist.

No file in this directory is copied into `app/` automatically.
