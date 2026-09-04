# R3 — Candidate asset intake and visual gates

Status: candidate

## Goal

Make offline photographic asset production reviewable before any generated or edited pixels become runtime authority.

R3 does not alter the frozen v3.3.0 files under `app/` and does not promote a candidate automatically.

## Pipeline

`candidate PNG + metadata → structural intake → R2 target-variant composition → machine visual gate → human visual gate → promotion eligibility`

### Structural gate

A candidate must:

- be a 1536 × 1024 RGBA PNG;
- already live at final `(0,0)` scene coordinates;
- have non-empty alpha;
- keep every non-zero alpha pixel inside the role-specific authorized ROI;
- fit role-specific alpha-bounds limits;
- target an existing R2 variant allowed by its role;
- preserve source/provenance references;
- keep review state coherent (`REVIEW/PENDING`, `APPROVED/APPROVED`, or `REJECTED/REJECTED`).

The ROI rule intentionally rejects studio/catalog cutouts or generated transparency glows that cover broad portions of the canvas, even when the file technically has an alpha channel.

### Composition/machine visual gate

The candidate is alpha-composited over the deterministic R2 target render. The resulting diff must be non-empty and contain zero changed pixels outside the authorized ROI. The default/golden path remains protected by the R0 and R2 gates.

The workflow emits the target variant, candidate alpha preview, composed variant, difference image, ROI crops, JSON review receipt, and a review sheet.

### Human visual gate

Geometry/contact/realism remain visual judgments. Each role defines a checklist. Approval is bound to the exact candidate SHA-256; changing the PNG invalidates a previous approval.

A candidate is promotion-eligible only when:

1. structural gate = PASS;
2. machine visual gate = PASS;
3. human review = APPROVED;
4. reviewer + timestamp + every role checklist item are present and true;
5. `expectedImageSha256` equals the actual candidate bytes.

Promotion itself belongs to a later slice and remains explicit.

## Current roles

### `range-freestanding`

Target: `module-02-hidden`.

The visual gate asks whether the freestanding range fits the opening, matches perspective/worktop height, contacts the floor naturally, matches lighting, avoids a pasted-object look and leaks no background. Passing this role may resolve `replacement-placeholder`; it does not silently claim the neighbor-cut debt is solved.

### `module-02-right-endcap`

Target: `module-03-hidden`.

The visual gate asks whether stone termination, cabinet side, plinth and seam read as physically complete and photographically coherent. This role targets `raw-neighbor-cut`.

## Probe result that motivated the gates

The first image-generation probes reproduced the broad method but not the asset contract: the tool produced centered/product-like cutouts with alpha extending far outside the intended scene ROI. They are useful negative fixtures, not promotable assets. R3 turns that failure into a deterministic rejection rather than relying on memory or prompt wording.
