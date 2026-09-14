#!/usr/bin/env python3
from __future__ import annotations
from pathlib import Path
from PIL import Image
import hashlib, json

ROOT = Path(__file__).resolve().parent.parent
PATH = ROOT / "data" / "technical-data.json"

def sha(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()

def record(path: Path) -> dict[str, object]:
    with Image.open(path) as image:
        bbox = image.convert("RGBA").getchannel("A").getbbox()
    return {"sha256": sha(path), "alphaBounds": list(bbox) if bbox else None}

def main() -> int:
    data = json.loads(PATH.read_text(encoding="utf-8"))
    data["baselineId"] = "cozinha-01-r5a-pixelperfect-bridges1"
    data["compositionOrder"] = [
        "assets/kitchen/layers/01_modulo_lavanderia.png",
        "assets/kitchen/layers/02_inferior_fogao.png",
        "assets/kitchen/variants/stone-02-cozinha-exposed-right.png",
        "assets/kitchen/bridges/stone-02-joint-bridge.png",
        "assets/kitchen/layers/03_inferior_pia.png",
        "assets/kitchen/variants/stone-03-pia-exposed-left.png",
        "assets/kitchen/bridges/stone-03-joint-bridge.png",
        "assets/kitchen/layers/04_lateral_geladeira.png",
        "assets/kitchen/layers/05_aereo_fogao.png",
        "assets/kitchen/layers/06_aereo_pia.png",
        "assets/kitchen/layers/07_aereo_geladeira.png",
        "assets/kitchen/layers/08_iluminacao.png",
    ]
    tracked = set(data.get("files", {}))
    tracked.update(data["compositionOrder"])
    tracked.update({
        "assets/kitchen/layers/stone-02-cozinha.png",
        "assets/kitchen/layers/stone-03-pia.png",
        "assets/kitchen/masks/02.png",
        "assets/kitchen/composicao-completa.png",
    })
    files = data.setdefault("files", {})
    for rel in sorted(tracked):
        path = ROOT / rel
        if path.suffix.lower() == ".png" and path.is_file(): files[rel] = record(path)
    PATH.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({"status": "PASS", "baselineId": data["baselineId"], "trackedImages": len(files)}, sort_keys=True))
    return 0

if __name__ == "__main__": raise SystemExit(main())
