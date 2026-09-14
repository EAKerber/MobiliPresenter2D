#!/usr/bin/env python3
from __future__ import annotations
from pathlib import Path
from PIL import Image
import hashlib, json

ROOT = Path(__file__).resolve().parents[1]
APP = ROOT / "app"
MANIFEST = ROOT / "reference" / "baseline-manifest.json"


def sha(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def file_record(path: Path) -> dict[str, object]:
    return {"path": path.relative_to(ROOT).as_posix(), "sha256": sha(path), "size": path.stat().st_size}


def image_record(path: Path) -> dict[str, object]:
    with Image.open(path) as image:
        rgba = image.convert("RGBA")
        bbox = rgba.getchannel("A").getbbox()
        dimensions = list(image.size)
    return {
        **file_record(path),
        "dimensions": dimensions,
        "alphaBounds": list(bbox) if bbox else None,
        "canonicalCanvas": dimensions == [1536, 1024],
    }


def is_canonical_app_file(path: Path) -> bool:
    relative = path.relative_to(APP)
    # dist/ and reports/ are rebuild/test outputs. They are never baseline source authority.
    return path.is_file() and "dist" not in relative.parts and "reports" not in relative.parts


def main() -> int:
    manifest = json.loads(MANIFEST.read_text(encoding="utf-8"))
    manifest["baselineId"] = "cozinha-01-r5a-pixelperfect-bridges1"
    manifest["files"] = [
        file_record(path)
        for path in sorted(APP.rglob("*"))
        if is_canonical_app_file(path)
    ]
    asset_paths = sorted((APP / "assets" / "kitchen").rglob("*.png")) + sorted(
        (APP / "tools" / "sources").glob("*.png")
    )
    manifest["assets"] = [image_record(path) for path in asset_paths]
    golden_path = APP / "assets" / "kitchen" / "composicao-completa.png"
    manifest["golden"] = image_record(golden_path)
    manifest["defaultComposition"] = {
        "background": "app/assets/kitchen/base.png",
        "layers": [
            "app/assets/kitchen/layers/01_modulo_lavanderia.png",
            "app/assets/kitchen/layers/02_inferior_fogao.png",
            "app/assets/kitchen/variants/stone-02-cozinha-exposed-right.png",
            "app/assets/kitchen/bridges/stone-02-joint-bridge.png",
            "app/assets/kitchen/layers/03_inferior_pia.png",
            "app/assets/kitchen/variants/stone-03-pia-exposed-left.png",
            "app/assets/kitchen/bridges/stone-03-joint-bridge.png",
            "app/assets/kitchen/layers/04_lateral_geladeira.png",
            "app/assets/kitchen/layers/05_aereo_fogao.png",
            "app/assets/kitchen/layers/06_aereo_pia.png",
            "app/assets/kitchen/layers/07_aereo_geladeira.png",
            "app/assets/kitchen/layers/08_iluminacao.png",
        ],
    }
    MANIFEST.write_text(
        json.dumps(manifest, ensure_ascii=False, indent=2, sort_keys=True) + "\n",
        encoding="utf-8",
    )
    print(
        json.dumps(
            {
                "status": "PASS",
                "baselineId": manifest["baselineId"],
                "files": len(manifest["files"]),
                "assets": len(manifest["assets"]),
                "reportsExcluded": True,
            },
            sort_keys=True,
        )
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
