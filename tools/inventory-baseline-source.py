#!/usr/bin/env python3
"""Create a deterministic, read-only inventory of an extracted baseline source tree."""
from __future__ import annotations

import argparse
import hashlib
import json
import sys
from pathlib import Path

try:
    from PIL import Image
except ImportError:
    Image = None


def sha256(path: Path) -> str:
    h = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            h.update(chunk)
    return h.hexdigest()


def png_metadata(path: Path) -> dict:
    if Image is None:
        raise RuntimeError("Pillow is required for PNG metadata; install tools/requirements.txt")
    with Image.open(path) as image:
        width, height = image.size
        has_alpha = "A" in image.getbands() or "transparency" in image.info
        alpha_bounds = None
        if has_alpha:
            alpha = image.convert("RGBA").getchannel("A")
            bbox = alpha.getbbox()
            alpha_bounds = list(bbox) if bbox else None
        return {
            "width": width,
            "height": height,
            "mode": image.mode,
            "alphaBounds": alpha_bounds,
        }


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("source_dir", type=Path)
    parser.add_argument("--output", type=Path)
    args = parser.parse_args()

    root = args.source_dir.resolve()
    if not root.is_dir():
        print(json.dumps({"status": "FAIL", "code": "SOURCE_DIR_MISSING", "detail": str(root)}))
        return 2

    records = []
    try:
        for path in sorted(root.rglob("*")):
            if path.is_symlink():
                print(json.dumps({"status": "FAIL", "code": "SOURCE_SYMLINK_UNSUPPORTED", "detail": str(path)}))
                return 2
            if not path.is_file():
                continue
            rel = path.relative_to(root).as_posix()
            record = {
                "path": rel,
                "size": path.stat().st_size,
                "sha256": sha256(path),
            }
            if path.suffix.lower() == ".png":
                record["png"] = png_metadata(path)
            records.append(record)
    except (OSError, RuntimeError) as exc:
        print(json.dumps({"status": "FAIL", "code": "SOURCE_INVENTORY_FAILED", "detail": str(exc)}))
        return 2

    payload = {
        "schemaVersion": "BaselineSourceInventory 0.1",
        "rootName": root.name,
        "fileCount": len(records),
        "files": records,
    }
    text = json.dumps(payload, ensure_ascii=False, indent=2, sort_keys=True) + "\n"
    if args.output:
        args.output.parent.mkdir(parents=True, exist_ok=True)
        args.output.write_text(text, encoding="utf-8")
    else:
        sys.stdout.write(text)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
