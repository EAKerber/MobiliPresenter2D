#!/usr/bin/env python3
"""Audit current ownership/material coverage of the historical BMC-02 stone return."""
from __future__ import annotations

import argparse
import json
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[1]


def alpha(path: Path) -> Image.Image:
    return Image.open(path).convert("RGBA").getchannel("A")


def points(mask: Image.Image, threshold: int = 1):
    data = mask.load()
    bounds = mask.getbbox()
    if not bounds:
        return []
    return [
        (x, y)
        for y in range(bounds[1], bounds[3])
        for x in range(bounds[0], bounds[2])
        if data[x, y] >= threshold
    ]


def coverage(mask: Image.Image, sample_points, threshold: int = 1):
    p = mask.load()
    hits = [(x, y) for x, y in sample_points if p[x, y] >= threshold]
    return {
        "threshold": threshold,
        "hitPixels": len(hits),
        "samplePixels": len(sample_points),
        "ratio": len(hits) / len(sample_points) if sample_points else 0,
        "hitBounds": [
            min(x for x, _ in hits),
            min(y for _, y in hits),
            max(x for x, _ in hits) + 1,
            max(y for _, y in hits) + 1,
        ] if hits else None,
    }


def union_masks(paths):
    masks = [alpha(path) if path.suffix.lower() == ".png" else None for path in paths]
    result = Image.new("L", masks[0].size if masks else (1, 1), 0)
    rp = result.load()
    for mask in masks:
        mp = mask.load()
        bounds = mask.getbbox()
        if not bounds:
            continue
        for y in range(bounds[1], bounds[3]):
            for x in range(bounds[0], bounds[2]):
                if mp[x, y] > rp[x, y]:
                    rp[x, y] = mp[x, y]
    return result


def run(cfg: dict, root: Path = ROOT):
    candidate_path = root / cfg["historicalCandidate"]
    candidate = alpha(candidate_path)
    sample_points = points(candidate, 1)
    if not sample_points:
        raise ValueError("historical candidate has no alpha")

    asset_results = {}
    for key, rel in cfg["assets"].items():
        mask = alpha(root / rel)
        asset_results[key] = {
            "alphaPositive": coverage(mask, sample_points, 1),
            "alpha128": coverage(mask, sample_points, 128),
            "alphaBounds": list(mask.getbbox()) if mask.getbbox() else None,
        }

    semantic_results = {}
    semantic_paths = {}
    for key, rel in cfg["semanticMasks"].items():
        mask = Image.open(root / rel).convert("L")
        semantic_results[key] = {
            "positive": coverage(mask, sample_points, 1),
            "bounds": list(mask.getbbox()) if mask.getbbox() else None,
        }
        semantic_paths[key] = root / rel

    exposed_union = Image.new("L", candidate.size, 0)
    ep = exposed_union.load()
    for key in ("stone03ExposedTop", "stone03ExposedFrontEdge"):
        m = Image.open(root / cfg["semanticMasks"][key]).convert("L")
        mp = m.load()
        b = m.getbbox()
        if b:
            for y in range(b[1], b[3]):
                for x in range(b[0], b[2]):
                    ep[x, y] = max(ep[x, y], mp[x, y])

    union_coverage = coverage(exposed_union, sample_points, 1)
    edge_x = int(cfg["measuredCabinetLeftEdgeX"])
    left_of_edge = sum(1 for x, _ in sample_points if x < edge_x)
    at_or_right = len(sample_points) - left_of_edge

    current_owner_hits = asset_results["stone03Exposed"]["alphaPositive"]["hitPixels"]
    semantic_hits = union_coverage["hitPixels"]

    if current_owner_hits == len(sample_points) and semantic_hits == len(sample_points):
        finding = "CURRENTLY_OWNED_AND_MATERIAL_COVERED"
    elif current_owner_hits == 0 and semantic_hits == 0:
        finding = "UNOWNED_MATERIAL_RESIDUAL"
    else:
        finding = "PARTIAL_OR_MIXED_OWNERSHIP"

    return {
        "schemaVersion": "BMC02TerminationOwnershipAuditReport 0.1",
        "sceneId": cfg["sceneId"],
        "operationId": cfg["operationId"],
        "targetVariant": cfg["targetVariant"],
        "targetVariantFingerprint": cfg["targetVariantFingerprint"],
        "promotionEligible": False,
        "historicalCandidate": {
            "path": cfg["historicalCandidate"],
            "pixels": len(sample_points),
            "bounds": list(candidate.getbbox()),
            "authorizedRoi": cfg["authorizedRoi"],
            "leftOfMeasuredCabinetEdgePixels": left_of_edge,
            "atOrRightOfMeasuredCabinetEdgePixels": at_or_right,
        },
        "assets": asset_results,
        "semanticMasks": semantic_results,
        "stone03ExposedUpperSemanticUnion": union_coverage,
        "finding": finding,
        "interpretation": [
            "candidate pixels left of x=736 are a bounded stone termination/overhang residual, not evidence for a full-height cabinet side panel",
            "current asset alpha and semantic material masks are audited separately",
            "a static exact-pixel recipe may be valid geometry/neutral evidence without being a material-responsive runtime representation"
        ],
    }


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--config", type=Path, required=True)
    parser.add_argument("--output", type=Path, required=True)
    args = parser.parse_args()
    cfg = json.loads(args.config.read_text(encoding="utf-8"))
    report = run(cfg)
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(report, indent=2, sort_keys=True) + "\n", encoding="utf-8")
    print(json.dumps({
        "finding": report["finding"],
        "candidatePixels": report["historicalCandidate"]["pixels"],
        "leftOfCabinetEdge": report["historicalCandidate"]["leftOfMeasuredCabinetEdgePixels"],
        "stone03OwnerHits": report["assets"]["stone03Exposed"]["alphaPositive"]["hitPixels"],
        "semanticHits": report["stone03ExposedUpperSemanticUnion"]["hitPixels"],
    }, sort_keys=True))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
