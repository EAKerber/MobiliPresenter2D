# Regenerated sink candidate

Status: REVIEW / human approval pending. Runtime is unchanged.

The generated transparent donor reconstructs the complete thin rim and basin. It is fitted to (936,561), 149 × 12 pixels, using premultiplied-alpha Lanczos resizing. This is a fixed-camera fit, not proof of original geometry.

Reproduce:

```sh
node tools/variant_fidelity_manifest.js --cases reference/variant-cases.json --output /tmp/sink-manifest.json
python tools/fit_regenerated_sink.py --manifest /tmp/sink-manifest.json --output-dir review-assets/sink-regenerated-fit/generated
```

The original-stone comparison changes 3,332 pixels, zero outside the union of sink removal mask and new alpha support. The approved faucet overlay is preserved. Contrasting local color probes separate the faucet backing from its metal and verify exact neutral replay, unchanged opaque metal, and confinement. The historical faucet removal mask retains occlusion priority over the sink; this joint is not a newly approved independent movable asset.

Review the complete rim, angular ends, shallow projection and faint edge residue. Local solid-color patches are diagnostic backgrounds, not completed stone finishes. No numeric check grants visual approval. Cooktop and drainer remain subsequent tasks in the same pipeline.
