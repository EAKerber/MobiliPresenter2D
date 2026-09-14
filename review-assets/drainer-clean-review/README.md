# Drainer removal and joint review

REVIEW / visual approval pending. No runtime installation.

The historical removal left wire-like granite ghosts. A generated local crop repairs that texture; only the existing drainer mask intersected with y520..564 receives the new donor. The historical wall reconstruction above this band is retained. Source frame is actual default runtime with the approved faucet.

```sh
node tools/variant_fidelity_manifest.js --cases reference/variant-cases.json --output /tmp/joint-manifest.json
python tools/review_drainer_clean.py --manifest /tmp/joint-manifest.json --output-dir review-assets/drainer-clean-review/generated
```

The script rebuilds sink and cooktop reviews, asserts disjoint supports, and composes their exact pixels with drainer removal. Local results: 9,418 drainer pixels and 26,495 joint pixels changed; zero outside masks, zero overlap, zero removal-patch round-trip mismatch. The front and body remain exact. Full scenes and intermediate component rebuilds are CI artifacts instead of duplicate Git assets.

Review texture continuity and contact, sink rim, cooktop grates and overall scale. Reconstructed hidden texture is inferred. Checks establish confinement and replay only; default-state joint review does not install runtime visibility behavior or confer human approval.
