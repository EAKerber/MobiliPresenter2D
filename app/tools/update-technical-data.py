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
    data["baselineId"] = "cozinha-01-r6-clean-ghosts-mirrored-cooktop"
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
    tracked.discard("assets/kitchen/overlays/module-06-left-return.png")
    tracked.add("assets/kitchen/overlays/tempered-glass.png")
    tracked.update(data["compositionOrder"])
    # Runtime overlays are source assets too, even when hidden in the default composition.
    tracked.update({
        "assets/kitchen/layers/stone-02-cozinha.png",
        "assets/kitchen/layers/stone-03-pia.png",
        "assets/kitchen/masks/02.png",
        "assets/kitchen/substitutions/range-freestanding.png",
        "assets/kitchen/overlays/faucet-approved.png",
        "assets/kitchen/overlays/approved-stone-02.png",
        "assets/kitchen/overlays/approved-stone-03.png",
        "assets/kitchen/masks/04-06-seam-bridge.png",
        "assets/kitchen/masks/04-with-06-seam.png",
        "assets/kitchen/composicao-completa.png",
    })
    files = data.setdefault("files", {})
    files.pop("assets/kitchen/bridges/front-04-06-finish-bridge.png", None)
    files.pop("assets/kitchen/overlays/module-06-left-return.png", None)
    for side_asset in (
        "assets/kitchen/overlays/module-05-right-return.png",
        "assets/kitchen/overlays/module-07-left-return.png",
        "assets/kitchen/overlays/range-freestanding-right-side.png",
    ):
        tracked.discard(side_asset)
        files.pop(side_asset, None)
    files.pop("assets/kitchen/overlays/module-02-right-exposed-face.png", None)
    files.pop("assets/kitchen/masks/module-02-right-exposed-face.png", None)
    files.pop("assets/kitchen/overlays/module-07-floor-side-bridge.png", None)
    # technical-data is an inventory of real files, not a tombstone ledger.
    # Drop missing tracked PNGs so deleting a proven-orphan asset cannot leave a stale record behind.
    for rel in list(files):
        path = ROOT / rel
        if path.suffix.lower() == ".png" and not path.is_file():
            files.pop(rel, None)
            tracked.discard(rel)
    for rel in sorted(tracked):
        path = ROOT / rel
        if path.suffix.lower() == ".png" and path.is_file(): files[rel] = record(path)
    PATH.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8", newline="\n")
    print(json.dumps({"status": "PASS", "baselineId": data["baselineId"], "trackedImages": len(files)}, sort_keys=True))
    return 0

if __name__ == "__main__": raise SystemExit(main())
