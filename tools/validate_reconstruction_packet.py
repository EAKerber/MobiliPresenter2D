#!/usr/bin/env python3
"""Minimal fail-closed validator for Reconstruction Packet 0.1."""
from __future__ import annotations

import argparse
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
CLAIM_STATUSES = {"confirmed", "derived", "inferred", "blocked"}
CONFIDENCE = CLAIM_STATUSES
LIFECYCLE = {
    "DRAFT",
    "MACHINE_VALID",
    "AGENT_REVIEW",
    "HUMAN_REVIEW_PENDING",
    "APPROVED",
    "REJECTED",
    "SUPERSEDED",
}


def fail(errors: list[str], message: str) -> None:
    errors.append(message)


def valid_roi(value) -> bool:
    if not isinstance(value, list) or len(value) != 4:
        return False
    if not all(isinstance(v, (int, float)) for v in value):
        return False
    x0, y0, x1, y1 = value
    return x1 > x0 and y1 > y0


def validate_packet(packet: dict, root: Path = ROOT) -> list[str]:
    errors: list[str] = []
    if packet.get("schemaVersion") != "ReconstructionPacket 0.1":
        fail(errors, "schemaVersion")

    for key in (
        "identity", "confidence", "claims", "physicalGeometry", "ownership",
        "transformationEvidence", "visualEvidence", "editContract",
        "authoringPlan", "acceptance", "lifecycle", "provenance",
    ):
        if key not in packet:
            fail(errors, f"missing:{key}")

    identity = packet.get("identity") or {}
    fingerprint = identity.get("targetVariantFingerprint")
    if not isinstance(fingerprint, str) or not fingerprint:
        fail(errors, "identity.targetVariantFingerprint")
    for key in ("baseProductCommit",):
        value = identity.get(key)
        if not isinstance(value, str) or not re.fullmatch(r"[0-9a-f]{40}", value):
            fail(errors, f"identity.{key}")

    confidence = packet.get("confidence") or {}
    for axis in ("G", "P", "A", "O"):
        if confidence.get(axis) not in CONFIDENCE:
            fail(errors, f"confidence.{axis}")

    claims = packet.get("claims")
    if not isinstance(claims, list) or not claims:
        fail(errors, "claims")
    else:
        ids = set()
        for index, claim in enumerate(claims):
            cid = claim.get("id")
            if not cid or cid in ids:
                fail(errors, f"claims[{index}].id")
            ids.add(cid)
            if claim.get("status") not in CLAIM_STATUSES:
                fail(errors, f"claims[{index}].status")
            if not claim.get("source"):
                fail(errors, f"claims[{index}].source")

    transform = packet.get("transformationEvidence") or {}
    if transform.get("confidence") not in {
        "global-calibrated", "planar-projective", "local-derived",
        "bounded-inference", "blocked",
    }:
        fail(errors, "transformationEvidence.confidence")
    if transform.get("globalCameraClaim") is True and transform.get("confidence") != "global-calibrated":
        fail(errors, "transformationEvidence.globalCameraClaim")

    edit = packet.get("editContract") or {}
    if not valid_roi(edit.get("authorizedRoi")):
        fail(errors, "editContract.authorizedRoi")
    if edit.get("zeroChangeOutsideRoi") is not True:
        fail(errors, "editContract.zeroChangeOutsideRoi")
    if edit.get("defaultRuntimeMustRemainUnchanged") is not True:
        fail(errors, "editContract.defaultRuntimeMustRemainUnchanged")

    plan = packet.get("authoringPlan") or {}
    generation = plan.get("generation") or {}
    if generation.get("allowed") is True and not generation.get("reason"):
        fail(errors, "authoringPlan.generation.reason")

    lifecycle = packet.get("lifecycle") or {}
    if lifecycle.get("state") not in LIFECYCLE:
        fail(errors, "lifecycle.state")
    human = ((packet.get("acceptance") or {}).get("humanReview") or {}).get("status")
    if lifecycle.get("defaultPromotionAllowed") is True and human != "APPROVED":
        fail(errors, "lifecycle.defaultPromotionAllowed")

    provenance = packet.get("provenance") or {}
    for rel in provenance.get("requiredPaths") or []:
        path = root / rel
        if not path.exists():
            fail(errors, f"missing-path:{rel}")

    manifest_rel = provenance.get("runtimeAssetsManifest")
    if manifest_rel:
        manifest_path = root / manifest_rel
        if not manifest_path.exists():
            fail(errors, f"missing-runtime-manifest:{manifest_rel}")
        else:
            manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
            if manifest.get("status") != "RESEARCH_ONLY":
                fail(errors, "runtime-manifest.status")
            contract = manifest.get("contract") or {}
            if contract.get("defaultRuntimeEnabled") is not False:
                fail(errors, "runtime-manifest.defaultRuntimeEnabled")
            if contract.get("appearanceAndOwnershipSeparated") is not True:
                fail(errors, "runtime-manifest.appearanceAndOwnershipSeparated")
            slots = {row.get("slot"): row for row in manifest.get("slots") or []}
            if set(slots) != set(edit.get("materialSlots") or []):
                fail(errors, "runtime-manifest.materialSlots")
            for slot, row in slots.items():
                for key in ("neutral", "mask"):
                    rel = row.get(key)
                    if not rel or not (root / rel).exists():
                        fail(errors, f"runtime-manifest.{slot}.{key}")

    machine = (packet.get("acceptance") or {}).get("machine") or {}
    if machine.get("outsideAuthorizedRoiPixels") != 0:
        fail(errors, "acceptance.machine.outsideAuthorizedRoiPixels")
    if machine.get("goldenPixelDifferenceCountDefaultRuntime") != 0:
        fail(errors, "acceptance.machine.goldenPixelDifferenceCountDefaultRuntime")

    return errors


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("packet", type=Path)
    parser.add_argument("--root", type=Path, default=ROOT)
    args = parser.parse_args()
    packet = json.loads(args.packet.read_text(encoding="utf-8"))
    errors = validate_packet(packet, args.root)
    result = {
        "schemaVersion": "ReconstructionPacketValidation 0.1",
        "packet": str(args.packet),
        "status": "PASS" if not errors else "FAIL",
        "errors": errors,
    }
    print(json.dumps(result, indent=2, sort_keys=True))
    return 0 if not errors else 1


if __name__ == "__main__":
    raise SystemExit(main())
