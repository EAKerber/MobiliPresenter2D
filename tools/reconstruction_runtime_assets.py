#!/usr/bin/env python3
"""Shared runtime-asset primitives for deterministic reconstruction slots."""
from __future__ import annotations

import hashlib
import json
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[1]


def sha256(path: Path) -> str:
    h = hashlib.sha256()
    with path.open("rb") as handle:
        for block in iter(lambda: handle.read(1024 * 1024), b""):
            h.update(block)
    return h.hexdigest()


def alpha_mass(mask: Image.Image) -> float:
    return sum(mask.getdata()) / 255.0


def display_path(path: Path, root: Path = ROOT) -> str:
    try:
        return str(path.relative_to(root))
    except ValueError:
        return str(path)


def write_slot(
    *,
    slot: str,
    source_path: Path,
    output_dir: Path,
    root: Path = ROOT,
    output_stem: str | None = None,
) -> dict:
    """Split one RGBA candidate into neutral RGB + alpha ownership mask."""
    if not source_path.is_file():
        raise FileNotFoundError(source_path)

    source = Image.open(source_path).convert("RGBA")
    mask = source.getchannel("A")
    binary = mask.point(lambda value: 255 if value else 0)

    neutral = Image.new("RGB", source.size, (0, 0, 0))
    neutral.paste(source.convert("RGB"), (0, 0), binary)

    stem = output_stem or slot
    output_dir.mkdir(parents=True, exist_ok=True)
    neutral_path = output_dir / f"{stem}-neutral.png"
    mask_path = output_dir / f"{stem}-mask.png"
    neutral.save(neutral_path, optimize=True)
    mask.save(mask_path, optimize=True)

    return {
        "slot": slot,
        "source": display_path(source_path, root),
        "sourceSha256": sha256(source_path),
        "size": list(source.size),
        "nonzeroPixels": sum(1 for value in mask.getdata() if value),
        "alphaMass": round(alpha_mass(mask), 6),
        "bounds": list(mask.getbbox()) if mask.getbbox() else None,
        "neutral": display_path(neutral_path, root),
        "neutralSha256": sha256(neutral_path),
        "mask": display_path(mask_path, root),
        "maskSha256": sha256(mask_path),
    }


def write_manifest(
    *,
    output_dir: Path,
    schema_version: str,
    operation_id: str,
    activation: str,
    records: list[dict],
    root: Path = ROOT,
    source_candidate: str | None = None,
    extra_contract: dict | None = None,
) -> dict:
    contract = {
        "appearanceAndOwnershipSeparated": True,
        "publishedByNetlifyAppRoot": True,
        "defaultRuntimeEnabled": False,
        "activation": activation,
    }
    if extra_contract:
        contract.update(extra_contract)

    manifest = {
        "schemaVersion": schema_version,
        "status": "RESEARCH_ONLY",
        "operationId": operation_id,
        "slots": records,
        "contract": contract,
    }
    if source_candidate:
        manifest["sourceCandidate"] = source_candidate

    output_dir.mkdir(parents=True, exist_ok=True)
    manifest_path = output_dir / "manifest.json"
    manifest_path.write_text(json.dumps(manifest, indent=2, sort_keys=True) + "\n", encoding="utf-8")
    return manifest
