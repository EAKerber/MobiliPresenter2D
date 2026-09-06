# R5A — module-02-hidden completion

Current status: approved generated range cutout integrated in runtime. See [current project status](STATUS-ATUAL.md).

The receipts below are historical. The old v2 perspective PASS was invalidated by human calibration and does not approve the current asset.

## Accepted deterministic geometry

The 02↔03 joint is no longer authored as additive end-cap blocks. The accepted edit is subtractive and pixel-derived:

- rebuild the canonical stone layers;
- reapply the accepted R4 module-02 left-strip alpha cleanup;
- remove the confirmed pale stone-02 contamination by alpha reduction only;
- derive exposed-right stone-02 and exposed-left stone-03 variants by reducing alpha along the reviewed cut lines;
- store the removed source pixels as exact `joint-bridge` layers;
- show both bridges only while module 02 and module 03 are simultaneously visible.

This gives the desired state rule:

```text
02 visible + 03 visible -> clipped stones + exact bridges = continuous canonical joint
02 visible + 03 hidden  -> exposed-right stone 02, bridges host-hidden
02 hidden  + 03 visible -> exposed-left stone 03, bridges host-hidden
```

No new stone RGB is synthesized. Each `variant + bridge` reconstructs its cleaned source stone exactly.

## Module 02 finish mask

`app/assets/kitchen/masks/02.png` is derived from the actual module-02 alpha minus the protected appliance rectangle `[516,609,739,840]`.

Hard gates require:

- mask pixels outside module-02 alpha: `0`;
- mask pixels inside the appliance-protected rectangle: `0`;
- mask is non-empty.

## Hosted deterministic geometry receipt

- baseline id: `cozinha-01-r5a-pixelperfect-bridges1`;
- baseline validation: `28 assets / 62 canonical files / 0px`;
- current asset validation: `27 tracked images / 0px`;
- R5A pixel-perfect gate: `PASS`;
- default fingerprint: `scene2d-2c39d7fa`;
- module-02-hidden fingerprint: `scene2d-4692e364`;
- module-03-hidden fingerprint: `scene2d-e63f7d18`.

The only remaining visual debt in `module-02-hidden` is `replacement-placeholder` until a range candidate receives human approval and promotion.

## Range authoring contract

```text
exact 1536x1024 module-02-hidden frame
  -> generated donor used only as source material
  -> deterministic alpha preparation / placement
  -> deterministic signed perspective correction
  -> full-frame edited result
  -> pixel diff against exact source
  -> extract full-canvas RGBA candidate delta
  -> outside-ROI visible diff must be 0
  -> source + candidate must reproduce edited frame exactly
  -> perspective editorial gate
  -> human visual review
```

No generated scene is promoted directly.

## Perspective editorial gate

R5A formalizes a deterministic high-level visual gate using a measured scene grid and signed correction vectors. It evaluates roll, vertical axis, projected top-plane depth, front/back counter alignment, floor contact, centering, width fit and signed depth/yaw orientation. Failed measures emit corrective vectors such as `up`, `left`, `increase-depth`, `expand-vertical`, `rear-edge-right` or `rear-edge-left`; passing measures emit `none`.

The first range fit preserved width and floor contact but left the cooktop approximately 55 px too low. The gate classified that fit as an inverted editorial correction and emitted `verticalTranslation=up` plus `verticalScale=expand-vertical`.

The selected height transform keeps X and the floor fixed and expands the range upward:

- previous placement: `[495,570,742,900]`;
- current placement: `[495,508,742,900]`;
- declared back edge: `517.50`;
- declared front edge: `588.78`;
- declared floor contact: `897.62`;
- scene back/front/floor references: `520 / 586 / 898`.

A subsequent symmetric yaw sweep tested both signs instead of assuming a correction direction. The measured scene depth reference comes from the exposed module-03 stone edge:

- reference vector: `[-9,+66]`, slope `-0.1364`;
- negative-sign corrections diverged from the reference;
- selected correction moves only the rear cooktop edge `+12 px` right, fading to `0 px` at local `y=84`;
- oven body and floor contact below that hinge remain unchanged;
- candidate vector: `[-12,+84]`, slope `-0.1429`;
- signed slope error: `0.0065` with limit `0.02`;
- direction match: `true`;
- resulting `yawCorrection`: `none`.

## Current hosted range-v2 receipt

GitHub Actions rebuilt the candidate from the versioned donor payload and deterministic recipe with the signed yaw transform physically applied to the candidate bytes:

- active candidate SHA-256: `f5e2289b2bf1376d2d7481f357da532ac8e24d493abd9643ada5506eb2617115`;
- edited frame SHA-256: `d61a8592aa7ffb36bf10433daaf53f443689908d91094a34e3f3a1300fae2dfe`;
- changed pixels: `96530`;
- difference bounds: `[495,508,742,923]`;
- changed pixels outside authorized ROI: `0`;
- round-trip mismatch pixels: `0`;
- source frame SHA-256: `3bebae52fc781ed0bf391cf6ef82c62f7caa810551dc261481f51976c2de7a85`.

Final candidate-gates run `34003581293` passed:

- 24 unit tests;
- canonical baseline / golden `0px`;
- R5A pixel-perfect invariants;
- candidate intake;
- authoring provenance;
- individual machine visual gate;
- signed Perspective Editorial Gate;
- complete candidate-set machine gate;
- review artifact upload.

The signed editorial result is `PASS` with all correction vectors `none`. Artifact ID: `9980221625`, SHA-256 digest `64746b54ed278d0893027c40919245c40c43dab21ad7234419c735ddb778535c`.

The rejected v1 range candidate was removed from the active candidate inbox but remains available in Git history. The current v2 candidate remains `REVIEW / PENDING`; no runtime promotion has occurred.

## Visual checklist for range

- product fits the physical bay;
- camera perspective matches the fixed scene;
- worktop/counter height relationship is plausible;
- feet/base contact the existing floor naturally;
- lighting and contact shadow match the scene;
- no background plate or pasted-on look;
- neighboring modules, wall, floor and upper cabinets remain unchanged;
- no visible seam.
