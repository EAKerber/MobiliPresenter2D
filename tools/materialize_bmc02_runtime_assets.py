#!/usr/bin/env python3
"""Materialize query-gated BMC-02 stone-termination runtime assets."""
from __future__ import annotations

import argparse
import json
from pathlib import Path

try:
    from tools.reconstruction_runtime_assets import ROOT, display_path, write_manifest, write_slot
except ModuleNotFoundError:
    from reconstruction_runtime_assets import ROOT, display_path, write_manifest, write_slot

DEFAULT_SOURCE = ROOT / "review-assets/candidates/module-03-left-termination-e-rounded-9px/candidate.png"
DEFAULT_OUTPUT = ROOT / "app/assets/kitchen/reconstruction/bmc02"


def materialize(source_path: Path, output_dir: Path) -> dict:
    record = write_slot(
        slot="termination",
        source_path=source_path,
        output_dir=output_dir,
        root=ROOT,
    )
    return write_manifest(
        output_dir=output_dir,
        schema_version="BMC02RuntimeAssets 0.1",
        operation_id="bmc02-module03-left-stone-termination",
        activation="?reconstruction=bmc02",
        records=[record],
        root=ROOT,
        source_candidate=display_path(source_path, ROOT),
        extra_contract={
            "materialPolicy": "stone-upper",
            "authorizedRoi": [720, 510, 755, 600],
        },
    )


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--source", type=Path, default=DEFAULT_SOURCE)
    parser.add_argument("--output-dir", type=Path, default=DEFAULT_OUTPUT)
    args = parser.parse_args()
    report = materialize(args.source.resolve(), args.output_dir.resolve())
    print(json.dumps(report, sort_keys=True))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
