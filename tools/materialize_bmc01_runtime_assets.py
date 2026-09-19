#!/usr/bin/env python3
"""Materialize query-gated BMC-01 reconstruction assets inside the published app tree."""
from __future__ import annotations

import argparse
import json
from pathlib import Path

try:
    from tools.reconstruction_runtime_assets import ROOT, display_path, write_slot
except ModuleNotFoundError:
    from reconstruction_runtime_assets import ROOT, display_path, write_slot
DEFAULT_SOURCE = ROOT / "review-assets/research/bmc01-antialiased-completion-v0.1"
DEFAULT_OUTPUT = ROOT / "app/assets/kitchen/reconstruction/bmc01"
SLOTS = {
    "carcass": "carcass-candidate.png",
    "plinth": "plinth-candidate.png",
}



def materialize(source_dir: Path, output_dir: Path) -> dict:
    output_dir.mkdir(parents=True, exist_ok=True)
    records = []

    for slot, filename in SLOTS.items():
        records.append(
            write_slot(
                slot=slot,
                source_path=source_dir / filename,
                output_dir=output_dir,
                root=ROOT,
            )
        )

    manifest = {
        "schemaVersion": "BMC01RuntimeAssets 0.1",
        "status": "RESEARCH_ONLY",
        "sourceCandidate": display_path(source_dir),
        "slots": records,
        "contract": {
            "appearanceAndOwnershipSeparated": True,
            "publishedByNetlifyAppRoot": True,
            "defaultRuntimeEnabled": False,
            "activation": "?reconstruction=bmc01",
        },
    }
    manifest_path = output_dir / "manifest.json"
    manifest_path.write_text(json.dumps(manifest, indent=2, sort_keys=True) + "\n", encoding="utf-8")
    return manifest


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--source-dir", type=Path, default=DEFAULT_SOURCE)
    parser.add_argument("--output-dir", type=Path, default=DEFAULT_OUTPUT)
    args = parser.parse_args()

    source_dir = args.source_dir.resolve()
    output_dir = args.output_dir.resolve()
    manifest = materialize(source_dir, output_dir)
    print(json.dumps(manifest, sort_keys=True))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
