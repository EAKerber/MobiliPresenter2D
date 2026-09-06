#!/usr/bin/env python3
from __future__ import annotations

import argparse
import json
from pathlib import Path

PASS = "PASS"
FAIL = "FAIL"


def load(path: Path) -> dict:
    return json.loads(path.read_text(encoding="utf-8"))


def _line_from_points(back: list[float], front: list[float]) -> tuple[float, float]:
    x0, y0 = float(back[0]), float(back[1])
    x1, y1 = float(front[0]), float(front[1])
    dy = y1 - y0
    if dy == 0:
        raise ValueError("line points must have distinct y coordinates")
    slope = (x1 - x0) / dy
    intercept = x0 - slope * y0
    return slope, intercept


def evaluate(grid: dict, measurement: dict) -> dict:
    if grid.get("schemaVersion") != "GapParallelismGrid 0.1":
        raise ValueError("unsupported gap grid schema")
    if measurement.get("schemaVersion") != "GapParallelismMeasurement 0.1":
        raise ValueError("unsupported gap measurement schema")
    if grid.get("sceneId") != measurement.get("sceneId"):
        raise ValueError("scene mismatch")

    reference = grid["reference"]
    candidate = measurement["candidate"]
    thresholds = grid["thresholds"]

    ref_slope, ref_intercept = _line_from_points(reference["back"], reference["front"])
    cand_slope, cand_intercept = _line_from_points(candidate["back"], candidate["front"])
    slope_error = abs(cand_slope - ref_slope)
    direction_match = (ref_slope == 0 and cand_slope == 0) or (ref_slope * cand_slope > 0)

    rows = grid["measurementRows"]
    y0, y1 = int(rows[0]), int(rows[1])
    if y1 < y0:
        raise ValueError("measurementRows must be ascending")

    gaps = []
    for y in range(y0, y1 + 1):
        ref_x = ref_slope * y + ref_intercept
        cand_x = cand_slope * y + cand_intercept
        gaps.append(ref_x - cand_x)

    min_gap = min(gaps)
    max_gap = max(gaps)
    mean_gap = sum(gaps) / len(gaps)

    slope_pass = direction_match and slope_error <= float(thresholds["slopeErrorMax"])
    positive_gap_pass = min_gap >= float(thresholds["minGapPx"])
    max_gap_limit = thresholds.get("maxGapPx")
    max_gap_pass = True if max_gap_limit is None else max_gap <= float(max_gap_limit)
    status = PASS if slope_pass and positive_gap_pass and max_gap_pass else FAIL

    correction = "none"
    if not slope_pass:
        # More-positive dx/dy than the scene means the rear edge must move right
        # to make the candidate slope more negative. The opposite case moves left.
        correction = "rear-edge-right" if cand_slope > ref_slope else "rear-edge-left"
    elif not positive_gap_pass:
        correction = "increase-gap"
    elif not max_gap_pass:
        correction = "decrease-gap"

    diagnostics = []
    diagnostics.append("gap_parallel" if slope_pass else ("gap_direction_inverted" if not direction_match else "gap_slope_off"))
    diagnostics.append("gap_positive" if positive_gap_pass else "gap_overlap_or_contact")
    if max_gap_limit is not None:
        diagnostics.append("gap_width_within_limit" if max_gap_pass else "gap_too_wide")

    return {
        "schemaVersion": "GapParallelismGate 0.1",
        "sceneId": grid["sceneId"],
        "candidateId": measurement["candidateId"],
        "role": measurement.get("role"),
        "targetVariant": measurement.get("targetVariant"),
        "overall": status,
        "reference": {
            "back": reference["back"],
            "front": reference["front"],
            "slopeDxDy": round(ref_slope, 6),
            "source": reference.get("source"),
        },
        "candidate": {
            "back": candidate["back"],
            "front": candidate["front"],
            "slopeDxDy": round(cand_slope, 6),
        },
        "measurementRows": [y0, y1],
        "slopeError": round(slope_error, 6),
        "directionMatch": direction_match,
        "gapPx": {
            "min": round(min_gap, 3),
            "mean": round(mean_gap, 3),
            "max": round(max_gap, 3),
        },
        "gates": {
            "parallelism": PASS if slope_pass else FAIL,
            "positiveGap": PASS if positive_gap_pass else FAIL,
            "maximumGap": PASS if max_gap_pass else FAIL,
        },
        "vector": correction,
        "diagnostics": diagnostics,
        "anchorPercent": grid.get("anchorPercent"),
        "anchorPixel": grid.get("anchorPixel"),
    }


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--grid", type=Path, required=True)
    parser.add_argument("--measurement", type=Path, required=True)
    parser.add_argument("--output", type=Path, required=True)
    args = parser.parse_args()

    try:
        result = evaluate(load(args.grid), load(args.measurement))
    except (OSError, ValueError, KeyError, json.JSONDecodeError) as exc:
        result = {
            "schemaVersion": "GapParallelismGate 0.1",
            "overall": FAIL,
            "code": "GAP_PARALLELISM_GATE_ERROR",
            "detail": str(exc),
        }

    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(result, indent=2, ensure_ascii=False, sort_keys=True) + "\n", encoding="utf-8")
    print(json.dumps({
        "overall": result["overall"],
        "candidateId": result.get("candidateId"),
        "vector": result.get("vector"),
        "diagnostics": result.get("diagnostics", []),
    }, sort_keys=True))
    return 0 if result["overall"] == PASS else 1


if __name__ == "__main__":
    raise SystemExit(main())
