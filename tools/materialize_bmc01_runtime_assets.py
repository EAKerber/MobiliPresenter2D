#!/usr/bin/env python3
"""Materialize query-gated BMC-01 reconstruction assets inside the published app tree."""
from __future__ import annotations

import argparse
import hashlib
import json
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
DEFAULT_SOURCE = ROOT / "review-assets/research/bmc01-antialiased-completion-v0.1"
DEFAULT_OUTPUT = ROOT / "app/assets/kitchen/reconstruction/bmc01"
SLOTS = {
    "carcass": "carcass-candidate.png",
    "plinth": "plinth-candidate.png",
}


def sha256(path: Path) -> str:
    h = hashlib.sha256()
    with path.open("rb") as handle:
        for block in iter(lambda: handle.read(1024 * 1024), b""):
            h.update(block)
    return h.hexdigest()


def alpha_mass(mask: Image.Image) -> float:
    return sum(mask.getdata()) / 255.0


def materialize(source_dir: Path, output_dir: Path) -> dict:
    output_dir.mkdir(parents=True, exist_ok=True)
    records = []

    for slot, filename in SLOTS.items():
        source_path = source_dir / filename
        if not source_path.is_file():
            raise FileNotFoundError(source_path)

        source = Image.open(source_path).convert("RGBA")
        mask = source.getchannel("A")
        binary = mask.point(lambda value: 255 if value else 0)

        # Keep source RGB only where this slot owns at least some alpha. Alpha is
        # carried separately so material rendering never conflates appearance with
        # semantic ownership.
        neutral = Image.new("RGB", source.size, (0, 0, 0))
        neutral.paste(source.convert("RGB"), (0, 0), binary)

        neutral_path = output_dir / f"{slot}-neutral.png"
        mask_path = output_dir / f"{slot}-mask.png"
        neutral.save(neutral_path, optimize=True)
        mask.save(mask_path, optimize=True)

        records.append(
            {
                "slot": slot,
                "source": str(source_path.relative_to(ROOT)),
                "sourceSha256": sha256(source_path),
                "size": list(source.size),
                "nonzeroPixels": sum(1 for value in mask.getdata() if value),
                "alphaMass": round(alpha_mass(mask), 6),
                "bounds": list(mask.getbbox()) if mask.getbbox() else None,
                "neutral": str(neutral_path.relative_to(ROOT)),
                "neutralSha256": sha256(neutral_path),
                "mask": str(mask_path.relative_to(ROOT)),
                "maskSha256": sha256(mask_path),
            }
        )

    manifest = {
        "schemaVersion": "BMC01RuntimeAssets 0.1",
        "status": "RESEARCH_ONLY",
        "sourceCandidate": str(source_dir.relative_to(ROOT)),
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
