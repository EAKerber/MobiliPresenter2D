#!/usr/bin/env python3
from __future__ import annotations

import argparse
import json
import math
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


def _line_from_spec(spec: dict) -> tuple[float, float]:
    line = spec.get("line")
    if line is not None:
        return float(line["slopeDxDy"]), float(line["intercept"])
    if "back" in spec and "front" in spec:
        return _line_from_points(spec["back"], spec["front"])
    raise ValueError("line spec must provide line or back/front points")


def _evaluation_rows(grid: dict) -> tuple[int, int, float | None]:
    if grid.get("schemaVersion") == "GapParallelismGrid 0.2":
        horizon = float(grid["horizon"]["y"])
        band = grid["evaluationBandY"]
        y0 = max(float(band[0]), horizon)
        y1 = float(band[1])
        if y1 < y0:
            raise ValueError("evaluation band must extend below the horizon")
        return math.ceil(y0), math.floor(y1), horizon
    rows = grid["measurementRows"]
    y0, y1 = int(rows[0]), int(rows[1])
    if y1 < y0:
        raise ValueError("measurementRows must be ascending")
    return y0, y1, None


def evaluate(grid: dict, measurement: dict) -> dict:
    grid_schema = grid.get("schemaVersion")
    measurement_schema = measurement.get("schemaVersion")
    if grid_schema not in {"GapParallelismGrid 0.1", "GapParallelismGrid 0.2"}:
        raise ValueError("unsupported gap grid schema")
    if measurement_schema not in {"GapParallelismMeasurement 0.1", "GapParallelismMeasurement 0.2"}:
        raise ValueError("unsupported gap measurement schema")
    if grid.get("sceneId") != measurement.get("sceneId"):
        raise ValueError("scene mismatch")

    reference = grid["reference"]
    candidate = measurement["candidate"]
    thresholds = grid["thresholds"]

    if grid_schema == "GapParallelismGrid 0.2":
        if reference.get("authority") != "human-calibrated":
            raise ValueError("v0.2 reference authority must be human-calibrated")
        if not reference.get("source"):
            raise ValueError("v0.2 reference source is required")

    ref_slope, ref_intercept = _line_from_spec(reference)
    cand_slope, cand_intercept = _line_from_spec(candidate)
    slope_error = abs(cand_slope - ref_slope)
    angle_error_deg = abs(math.degrees(math.atan(cand_slope)) - math.degrees(math.atan(ref_slope)))
    direction_match = (ref_slope == 0 and cand_slope == 0) or (ref_slope * cand_slope > 0)

    y0, y1, horizon = _evaluation_rows(grid)
    gaps = []
    for y in range(y0, y1 + 1):
        ref_x = ref_slope * y + ref_intercept
        cand_x = cand_slope * y + cand_intercept
        gaps.append(ref_x - cand_x)

    min_gap = min(gaps)
    max_gap = max(gaps)
    mean_gap = sum(gaps) / len(gaps)
    gap_variation = max_gap - min_gap

    slope_pass = direction_match and slope_error <= float(thresholds["slopeErrorMax"])
    angle_limit = thresholds.get("angleErrorDegMax")
    angle_pass = True if angle_limit is None else angle_error_deg <= float(angle_limit)
    positive_gap_pass = min_gap >= float(thresholds["minGapPx"])
    max_gap_limit = thresholds.get("maxGapPx")
    max_gap_pass = True if max_gap_limit is None else max_gap <= float(max_gap_limit)
    variation_limit = thresholds.get("maxGapVariationPx")
    variation_pass = True if variation_limit is None else gap_variation <= float(variation_limit)
    status = PASS if slope_pass and angle_pass and positive_gap_pass and max_gap_pass and variation_pass else FAIL

    correction = "none"
    if not direction_match or not slope_pass or not angle_pass:
        correction = "rear-edge-right" if cand_slope > ref_slope else "rear-edge-left"
    elif not positive_gap_pass:
        correction = "increase-gap"
    elif not max_gap_pass:
        correction = "decrease-gap"
    elif not variation_pass:
        correction = "stabilize-gap"

    diagnostics = []
    diagnostics.append("gap_parallel" if slope_pass and angle_pass else ("gap_direction_inverted" if not direction_match else "gap_angle_off"))
    diagnostics.append("gap_positive" if positive_gap_pass else "gap_overlap_or_contact")
    if max_gap_limit is not None:
        diagnostics.append("gap_width_within_limit" if max_gap_pass else "gap_too_wide")
    if variation_limit is not None:
        diagnostics.append("gap_variation_stable" if variation_pass else "gap_variation_excessive")
    if grid_schema == "GapParallelismGrid 0.2":
        diagnostics.append("horizon_applied")
        diagnostics.append("human_calibrated_reference")

    result = {
        "schemaVersion": "GapParallelismGate 0.2" if grid_schema == "GapParallelismGrid 0.2" else "GapParallelismGate 0.1",
        "sceneId": grid["sceneId"],
        "candidateId": measurement["candidateId"],
        "role": measurement.get("role"),
        "targetVariant": measurement.get("targetVariant"),
        "overall": status,
        "reference": {
            "slopeDxDy": round(ref_slope, 6),
            "intercept": round(ref_intercept, 6),
            "source": reference.get("source"),
            "authority": reference.get("authority"),
        },
        "candidate": {
            "slopeDxDy": round(cand_slope, 6),
            "intercept": round(cand_intercept, 6),
        },
        "evaluationRows": [y0, y1],
        "horizonY": horizon,
        "slopeError": round(slope_error, 6),
        "angleErrorDeg": round(angle_error_deg, 6),
        "directionMatch": direction_match,
        "gapPx": {
            "min": round(min_gap, 3),
            "mean": round(mean_gap, 3),
            "max": round(max_gap, 3),
            "variation": round(gap_variation, 3),
        },
        "gates": {
            "parallelism": PASS if slope_pass else FAIL,
            "angle": PASS if angle_pass else FAIL,
            "positiveGap": PASS if positive_gap_pass else FAIL,
            "maximumGap": PASS if max_gap_pass else FAIL,
            "gapVariation": PASS if variation_pass else FAIL,
        },
        "vector": correction,
        "diagnostics": diagnostics,
        "anchorPercent": grid.get("anchorPercent"),
        "anchorPixel": grid.get("anchorPixel"),
    }
    if grid_schema == "GapParallelismGrid 0.2":
        result["calibration"] = reference.get("calibration")
    return result


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
            "schemaVersion": "GapParallelismGate 0.2",
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
