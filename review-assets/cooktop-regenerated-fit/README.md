# Regenerated cooktop review

REVIEW / visual approval pending. No runtime installation.

Reconstruction uses the historical pot-free cooktop as reference. Two RGB outputs with painted checkerboards were rejected; the third output has actual RGBA transparency. Exact prompts and source hash/crop are recorded. The retained donor alpha is not synthesized from its dark pixels.

Reproduce:

```sh
node tools/variant_fidelity_manifest.js --cases reference/variant-cases.json --output /tmp/cooktop-manifest.json
python tools/fit_regenerated_cooktop.py --manifest /tmp/cooktop-manifest.json --output-dir review-assets/cooktop-regenerated-fit/generated
```

The fit is 214 × 32 at (520,540), using premultiplied alpha resizing. Pot removal reuses the historical clean plate only inside pans-02; the old cooktop is replaced using the existing cooktop backing mask. The rest of the runtime frame remains exact. Neither sink candidate nor drainer removal is applied.

Local checks: 13,745 changed pixels; zero outside replacement support; zero changed pixels in sink/faucet/drainer or front edge/body. Contrast probes preserve opaque cooktop pixels. CI rebuilds review and full scene; scene PNG is omitted from Git to avoid duplicating the full frame.

Review grate continuity, burner and knob geometry, projected depth, contact, and edge fringe. Numeric PASS validates confinement, not visual correctness. The independent width/height fit and inferred backing remain limitations. Light/graphite backgrounds are local diagnostic patches, not production finishes.
