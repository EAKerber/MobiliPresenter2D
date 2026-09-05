# R5A — module-02-hidden completion

Status: deterministic geometry materialized; `range-freestanding` pending.

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

## Hosted materialization receipt

The pixel assets are rebuilt in GitHub Actions rather than transported manually. Latest clean materialization:

- base commit: `38d65d9f07697cd87da958f0eb227dfec24e42cf`;
- resulting commit: `28c3bd7e087c225ce6b97f1b7ed302b5fb6d7a60`;
- readback: `PASS`;
- canonical manifest excludes `app/reports/**` because reports are derived QA outputs, not baseline authority;
- baseline id: `cozinha-01-r5a-pixelperfect-bridges1`;
- baseline validation: `28 assets / 62 canonical files / 0px`;
- current asset validation: `27 tracked images / 0px`;
- R5A pixel-perfect gate: `PASS`;
- default fingerprint: `scene2d-2c39d7fa`;
- module-02-hidden fingerprint: `scene2d-4692e364`;
- module-03-hidden fingerprint: `scene2d-e63f7d18`.

The only remaining visual debt in `module-02-hidden` is `replacement-placeholder`.

## Remaining R5A role: range-freestanding

The next authoring step is the first genuinely generative one. It must use the exact full-canvas `module-02-hidden` render from this materialized state as its primary edit target.

Authoring contract:

```text
exact 1536x1024 module-02-hidden frame
  -> localized image edit: add only freestanding range
  -> full-frame edited result
  -> pixel diff against exact source
  -> extract full-canvas RGBA candidate delta
  -> outside-ROI visible diff must be 0
  -> source + candidate must reproduce edited frame exactly
  -> machine review
  -> human visual review
```

The range is never generated as a standalone semantic kitchen scene and is never promoted directly from image generation output.

## Visual checklist for range

- product fits the physical bay;
- camera perspective matches the fixed scene;
- worktop/counter height relationship is plausible;
- feet/base contact the existing floor naturally;
- lighting and contact shadow match the scene;
- no background plate or pasted-on look;
- neighboring modules, wall, floor and upper cabinets remain unchanged;
- no visible seam.
