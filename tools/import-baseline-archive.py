#!/usr/bin/env python3
"""Materialize the exact R0 v3.3.0 archive into an isolated output tree.

The archive is verified against a committed inventory before any code from it is
executed. Canonical source tests run only on a disposable copy. The untouched
verified extraction is what gets copied to app/.
"""
from __future__ import annotations

import argparse
import hashlib
import json
import os
import shutil
import stat
import subprocess
import sys
import tempfile
import zipfile
from pathlib import Path, PurePosixPath

from PIL import Image, ImageChops

ROOT = Path(__file__).resolve().parents[1]
INVENTORY_PATH = ROOT / "reference" / "source-inventory-v3.3.0.json"
SOURCE_VALIDATION_PATH = ROOT / "reference" / "source-validation-v3.3.0.json"
EXPECTED_CANVAS = (1536, 1024)
EXPECTED_CORE = {
    "passed": True,
    "initialFingerprint": "scene2d-89ce17bc",
    "entities": 11,
    "controllableEntities": 8,
}
EXPECTED_FIDELITY = {
    "passed": True,
    "assetCount": 23,
    "pixelDifferenceCount": 0,
    "differenceBounds": None,
}


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def read_json(path: Path) -> dict:
    return json.loads(path.read_text(encoding="utf-8"))


def write_json(path: Path, payload: dict) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(payload, ensure_ascii=False, indent=2, sort_keys=True) + "\n", encoding="utf-8")


def safe_member_path(name: str) -> Path:
    pure = PurePosixPath(name)
    if pure.is_absolute() or not pure.parts or any(part in {"", ".", ".."} for part in pure.parts):
        raise RuntimeError(f"ARCHIVE_PATH_UNSAFE:{name}")
    return Path(*pure.parts)


def extract_verified_shape(archive: Path, destination: Path) -> None:
    with zipfile.ZipFile(archive) as opened:
        for member in opened.infolist():
            raw = member.filename.rstrip("/")
            if not raw:
                continue
            rel = safe_member_path(raw)
            unix_mode = member.external_attr >> 16
            if stat.S_ISLNK(unix_mode):
                raise RuntimeError(f"ARCHIVE_SYMLINK_UNSUPPORTED:{member.filename}")
            target = destination / rel
            if member.is_dir():
                target.mkdir(parents=True, exist_ok=True)
                continue
            target.parent.mkdir(parents=True, exist_ok=True)
            with opened.open(member) as source, target.open("wb") as sink:
                shutil.copyfileobj(source, sink)


def png_metadata(path: Path) -> dict:
    with Image.open(path) as image:
        alpha = image.convert("RGBA").getchannel("A")
        bbox = alpha.getbbox()
        return {"width": image.width, "height": image.height, "mode": image.mode, "alphaBounds": list(bbox) if bbox else None}


def verify_inventory(source: Path, inventory: dict) -> dict[str, dict]:
    expected = {record["path"]: record for record in inventory["files"]}
    observed_paths = sorted(p.relative_to(source).as_posix() for p in source.rglob("*") if p.is_file())
    if observed_paths != sorted(expected):
        raise RuntimeError(f"SOURCE_FILESET_MISMATCH:missing={sorted(set(expected)-set(observed_paths))}:extra={sorted(set(observed_paths)-set(expected))}")
    for rel, record in expected.items():
        path = source / rel
        if path.stat().st_size != record["size"]: raise RuntimeError(f"SOURCE_SIZE_MISMATCH:{rel}")
        if sha256(path) != record["sha256"]: raise RuntimeError(f"SOURCE_SHA256_MISMATCH:{rel}")
        if "png" in record and png_metadata(path) != record["png"]: raise RuntimeError(f"SOURCE_PNG_METADATA_MISMATCH:{rel}")
    return expected


def parse_json_output(completed: subprocess.CompletedProcess[str], label: str) -> dict:
    if completed.returncode != 0: raise RuntimeError(f"{label}_FAILED:{completed.stderr or completed.stdout}")
    lines = [line.strip() for line in completed.stdout.splitlines() if line.strip()]
    if not lines: raise RuntimeError(f"{label}_NO_OUTPUT")
    try: return json.loads(lines[-1])
    except json.JSONDecodeError as exc: raise RuntimeError(f"{label}_NON_JSON:{lines[-1]}") from exc


def run_canonical_tests(source: Path) -> tuple[dict, dict]:
    with tempfile.TemporaryDirectory(prefix="r0-source-tests-") as tmp:
        test_root = Path(tmp) / "source"
        shutil.copytree(source, test_root)
        core = parse_json_output(subprocess.run(["node", "tools/test-core.js"], cwd=test_root, text=True, capture_output=True, check=False), "SOURCE_CORE_TEST")
        fidelity = parse_json_output(subprocess.run([sys.executable, "tools/validate-assets.py"], cwd=test_root, text=True, capture_output=True, check=False), "SOURCE_FIDELITY_TEST")
    if core != EXPECTED_CORE: raise RuntimeError(f"SOURCE_CORE_RESULT_UNEXPECTED:{core}")
    for key, expected in EXPECTED_FIDELITY.items():
        if fidelity.get(key) != expected: raise RuntimeError(f"SOURCE_FIDELITY_RESULT_UNEXPECTED:{key}:{fidelity.get(key)}!={expected}")
    return core, fidelity


def verify_technical_data(source: Path, inventory_records: dict[str, dict]) -> tuple[dict, list[dict]]:
    technical = read_json(source / "data" / "technical-data.json")
    if technical.get("baselineId") != "cozinha-01-phase3-stone-split1": raise RuntimeError(f"BASELINE_ID_UNEXPECTED:{technical.get('baselineId')}")
    canvas = technical.get("canvas") or {}
    if (canvas.get("width"), canvas.get("height")) != EXPECTED_CANVAS: raise RuntimeError(f"SOURCE_CANVAS_UNEXPECTED:{canvas}")
    assets=[]
    for rel, expected in technical["files"].items():
        record=inventory_records.get(rel)
        if record is None: raise RuntimeError(f"TECHNICAL_ASSET_NOT_IN_INVENTORY:{rel}")
        if record["sha256"] != expected["sha256"]: raise RuntimeError(f"TECHNICAL_SHA256_MISMATCH:{rel}")
        png=record.get("png")
        if not png or [png["width"],png["height"]] != [1536,1024]: raise RuntimeError(f"TECHNICAL_CANVAS_MISMATCH:{rel}")
        if png["alphaBounds"] != expected["alphaBounds"]: raise RuntimeError(f"TECHNICAL_ALPHA_MISMATCH:{rel}")
        assets.append({"path":f"app/{rel}","size":record["size"],"sha256":record["sha256"],"dimensions":[png["width"],png["height"]],"alphaBounds":png["alphaBounds"],"canonicalCanvas":True})
    with Image.open(source/"assets/kitchen/base.png") as opened: composed=opened.convert("RGBA")
    for rel in technical["compositionOrder"]:
        with Image.open(source/rel) as opened: composed=Image.alpha_composite(composed,opened.convert("RGBA"))
    with Image.open(source/"assets/kitchen/composicao-completa.png") as opened: golden=opened.convert("RGBA")
    difference=ImageChops.difference(composed,golden)
    if difference.getbbox() is not None: raise RuntimeError(f"SOURCE_GOLDEN_DIFFERENCE:{list(difference.getbbox())}")
    return technical, assets


def materialize(archive: Path, output_root: Path) -> dict:
    inventory=read_json(INVENTORY_PATH); expected_archive=inventory["archive"]; actual_hash=sha256(archive)
    if archive.stat().st_size != expected_archive["size"]: raise RuntimeError(f"ARCHIVE_SIZE_MISMATCH:{archive.stat().st_size}!={expected_archive['size']}")
    if actual_hash != expected_archive["sha256"]: raise RuntimeError(f"ARCHIVE_SHA256_MISMATCH:{actual_hash}!={expected_archive['sha256']}")
    with tempfile.TemporaryDirectory(prefix="r0-source-") as tmp:
        source=Path(tmp)/"verified-source"; source.mkdir(); extract_verified_shape(archive,source)
        records=verify_inventory(source,inventory); core,fidelity=run_canonical_tests(source); technical,assets=verify_technical_data(source,records)
        if output_root.exists(): shutil.rmtree(output_root)
        (output_root/"reference").mkdir(parents=True,exist_ok=True); shutil.copytree(source,output_root/"app")
        files=[{"path":f"app/{r['path']}","size":r["size"],"sha256":r["sha256"]} for r in inventory["files"]]
        golden=next(item for item in assets if item["path"]=="app/assets/kitchen/composicao-completa.png")
        manifest={"schemaVersion":"BaselineManifest 0.1","status":"READY","sceneId":"cozinha-01","baselineId":technical["baselineId"],"source":{"archiveName":expected_archive["name"],"archiveSize":expected_archive["size"],"archiveSha256":expected_archive["sha256"],"actualUploadName":archive.name,"exactBytesRequired":True,"sourceLocated":True,"materializedInRepository":True},"canvas":{"width":1536,"height":1024,"origin":[0,0]},"files":files,"golden":golden,"assets":assets,"defaultComposition":{"background":"app/assets/kitchen/base.png","layers":[f"app/{rel}" for rel in technical["compositionOrder"]]},"expectedRuntime":EXPECTED_CORE,"sourceValidation":{"trackedAssetCount":23,"pixelDifferenceCount":0,"differenceBounds":None,"canonicalCore":core,"canonicalFidelity":fidelity}}
        write_json(output_root/"reference"/"baseline-manifest.json",manifest)
        validation=read_json(SOURCE_VALIDATION_PATH); validation.update({"status":"PASS","repositoryMaterialized":True,"blocker":None,"actualUploadName":archive.name,"canonicalTests":{"core":core,"fidelity":fidelity}}); write_json(output_root/"reference"/"source-validation-v3.3.0.json",validation)
        return manifest


def main() -> int:
    parser=argparse.ArgumentParser(); parser.add_argument("archive",type=Path); parser.add_argument("--output-root",type=Path,required=True); args=parser.parse_args()
    try: manifest=materialize(args.archive.resolve(),args.output_root.resolve())
    except (OSError,RuntimeError,zipfile.BadZipFile,json.JSONDecodeError) as exc:
        print(json.dumps({"status":"FAIL","code":"BASELINE_IMPORT_FAILED","detail":str(exc)},ensure_ascii=False)); return 2
    print(json.dumps({"status":"PASS","baselineId":manifest["baselineId"],"files":len(manifest["files"]),"assets":len(manifest["assets"]),"archiveSha256":manifest["source"]["archiveSha256"],"pixelDifferenceCount":0},ensure_ascii=False,sort_keys=True)); return 0
if __name__=="__main__": raise SystemExit(main())
