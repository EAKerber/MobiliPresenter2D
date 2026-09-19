#!/usr/bin/env python3
"""Research-only probe for cross-frame camera/projection compatibility.

This tool is diagnostic. It does not resolve projection authority and is never
promotion-eligible by itself.
"""
from __future__ import annotations

import argparse
import json
import math
from pathlib import Path


def project(point, camera):
    x, y, z = map(float, point)
    cx, cy, cz = map(float, camera["cameraProjectPositionMm"])
    px, py = map(float, camera["principalPointPx"])
    focal = float(camera["focalLengthPx"])
    depth = y - cy
    if depth <= 0:
        raise ValueError("point is not in front of +Y camera")
    return [
        px + focal * (x - cx) / depth,
        py - focal * (z - cz) / depth,
    ]


def vector(a, b):
    return [float(b[0]) - float(a[0]), float(b[1]) - float(a[1])]


def angle_deg(v):
    return math.degrees(math.atan2(v[1], v[0]))


def magnitude(v):
    return math.hypot(v[0], v[1])


def normalize_angle_delta(a, b):
    delta = (a - b + 180.0) % 360.0 - 180.0
    return abs(delta)


def front_scale_sample(sample, camera):
    focal = float(camera["focalLengthPx"])
    camera_y = float(camera["cameraProjectPositionMm"][1])
    depth = float(sample["frontPlaneYmm"]) - camera_y
    if depth <= 0:
        raise ValueError(f"invalid front-plane depth for {sample['id']}")
    px_per_mm = focal / depth
    predicted_width = float(sample["physicalWidthMm"]) * px_per_mm
    predicted_height = float(sample["physicalHeightMm"]) * px_per_mm
    scale_x = float(sample["observedWidthPx"]) / predicted_width
    scale_y = float(sample["observedHeightPx"]) / predicted_height
    return {
        "id": sample["id"],
        "status": sample["status"],
        "calibrationPxPerMm": px_per_mm,
        "predictedWidthPx": predicted_width,
        "predictedHeightPx": predicted_height,
        "observedWidthPx": float(sample["observedWidthPx"]),
        "observedHeightPx": float(sample["observedHeightPx"]),
        "effectiveScaleX": scale_x,
        "effectiveScaleY": scale_y,
        "effectiveAnisotropyXOverY": scale_x / scale_y,
        "limitation": sample.get("limitation"),
    }


def evaluate(config):
    camera = config["sourceCalibration"]
    probe = config["depthProbe"]
    predicted_front = project(probe["physicalFrontMm"], camera)
    predicted_back = project(probe["physicalBackMm"], camera)
    predicted_vector = vector(predicted_front, predicted_back)
    observed_vector = vector(probe["observedFrontPx"], probe["observedBackPx"])

    predicted_angle = angle_deg(predicted_vector)
    observed_angle = angle_deg(observed_vector)
    predicted_slope = predicted_vector[0] / predicted_vector[1]
    observed_slope = observed_vector[0] / observed_vector[1]
    required_anisotropy = observed_slope / predicted_slope

    envelope_samples = [
        front_scale_sample(sample, camera)
        for sample in config.get("frontEnvelopeSamples", [])
    ]

    return {
        "schemaVersion": "ProjectionCompatibilityProbeReport 0.1",
        "sceneId": config["sceneId"],
        "status": "DIAGNOSTIC_ONLY",
        "promotionEligible": False,
        "depthProbe": {
            "id": probe["id"],
            "predictedFrontPxCalibrationFrame": predicted_front,
            "predictedBackPxCalibrationFrame": predicted_back,
            "predictedVectorPx": predicted_vector,
            "observedVectorPx2D": observed_vector,
            "predictedMagnitudePx": magnitude(predicted_vector),
            "observedMagnitudePx": magnitude(observed_vector),
            "predictedAngleDeg": predicted_angle,
            "observedAngleDeg": observed_angle,
            "angleDifferenceDeg": normalize_angle_delta(predicted_angle, observed_angle),
            "predictedDxDy": predicted_slope,
            "observedDxDy": observed_slope,
            "requiredAnisotropyXOverY": required_anisotropy,
            "physicalStatus": probe["physicalStatus"],
            "observedStatus": probe["observedStatus"],
        },
        "frontEnvelopeSamples": envelope_samples,
        "interpretation": {
            "similarityTransformExactTransfer": "REJECTED_FOR_TESTED_PROBE",
            "reason": "translation + uniform scale cannot change vector direction",
            "anisotropicScaleCheck": "COMPARE_REQUIRED_RATIO_WITH_COARSE_FRONT_ENVELOPES",
            "warning": "front alphaBounds are coarse proxies, so they support rejection diagnostics but are not sufficient to establish a final affine mapping",
        },
    }


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--config", type=Path, required=True)
    parser.add_argument("--output", type=Path, required=True)
    args = parser.parse_args()
    config = json.loads(args.config.read_text(encoding="utf-8"))
    if config.get("schemaVersion") != "ProjectionCompatibilityProbe 0.1":
        raise SystemExit("unsupported projection probe schema")
    report = evaluate(config)
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(report, indent=2, sort_keys=True) + "\n", encoding="utf-8")
    print(json.dumps({
        "status": report["status"],
        "angleDifferenceDeg": round(report["depthProbe"]["angleDifferenceDeg"], 4),
        "requiredAnisotropyXOverY": round(report["depthProbe"]["requiredAnisotropyXOverY"], 4),
        "frontEnvelopeAnisotropy": [
            round(item["effectiveAnisotropyXOverY"], 4)
            for item in report["frontEnvelopeSamples"]
        ],
    }, sort_keys=True))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
