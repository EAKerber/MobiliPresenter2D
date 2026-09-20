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
GENERATION_MODES = {
    "residual-completion",
    "isolated-object-synthesis",
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
    if generation.get("allowed") is True:
        if not generation.get("reason"):
            fail(errors, "authoringPlan.generation.reason")
        if generation.get("mode") not in GENERATION_MODES:
            fail(errors, "authoringPlan.generation.mode")

        guide = packet.get("generationGuide")
        if not isinstance(guide, dict):
            fail(errors, "generationGuide")
        else:
            if not guide.get("inputReceipt"):
                fail(errors, "generationGuide.inputReceipt")
            else:
                receipt_path = root / guide["inputReceipt"]
                if not receipt_path.exists():
                    fail(errors, "generationGuide.inputReceipt.missing")
                else:
                    receipt = json.loads(receipt_path.read_text(encoding="utf-8"))
                    if receipt.get("status") != "READY_FOR_BOUNDED_GENERATION":
                        fail(errors, "generationGuide.inputReceipt.status")
                    contract = receipt.get("generationContract") or {}
                    if contract.get("directGeneratedPromotionAllowed") is not False:
                        fail(errors, "generationGuide.directGeneratedPromotionAllowed")
                    if contract.get("largePostGenerationWarpAllowed") is not False:
                        fail(errors, "generationGuide.largePostGenerationWarpAllowed")
                    budget = receipt.get("postFitBudget") or {}
                    if budget.get("projectiveWarpAllowed") is not False:
                        fail(errors, "generationGuide.postFitBudget.projectiveWarpAllowed")

            perceptual = guide.get("perceptualTargetAuthority")
            if perceptual not in (None, "appearance-only"):
                fail(errors, "generationGuide.perceptualTargetAuthority")

    if identity.get("caseClass") == "T6-G-bounded-generative-appliance-replacement":
        if generation.get("allowed") is not True:
            fail(errors, "T6-G.generation.allowed")
        if generation.get("mode") != "isolated-object-synthesis":
            fail(errors, "T6-G.generation.mode")
        if edit.get("directGeneratedPromotionAllowed") is not False:
            fail(errors, "T6-G.editContract.directGeneratedPromotionAllowed")

        guide = packet.get("generationGuide") or {}
        footprint = guide.get("hardFootprintQuadPx")
        expected_corners = {"frontLeft", "frontRight", "backRight", "backLeft"}
        if not isinstance(footprint, dict) or set(footprint) != expected_corners:
            fail(errors, "T6-G.generationGuide.hardFootprintQuadPx")
        else:
            for name in sorted(expected_corners):
                point = footprint.get(name)
                if (
                    not isinstance(point, list)
                    or len(point) != 2
                    or not all(isinstance(value, (int, float)) for value in point)
                ):
                    fail(errors, f"T6-G.generationGuide.hardFootprintQuadPx.{name}")

        budget = guide.get("postFitBudget") or {}
        for key in ("translationPx", "uniformScalePercent", "rotationDeg"):
            value = budget.get(key)
            if not isinstance(value, (int, float)) or value < 0:
                fail(errors, f"T6-G.generationGuide.postFitBudget.{key}")
        if budget.get("projectiveWarpAllowed") is not False:
            fail(errors, "T6-G.generationGuide.postFitBudget.projectiveWarpAllowed")

        forbidden = set(guide.get("forbiddenOutcomes") or [])
        required_forbidden = {
            "moving or reshaping stone",
            "changing module geometry",
            "changing scene camera",
            "editing outside cooktop ROI",
        }
        if not required_forbidden.issubset(forbidden):
            fail(errors, "T6-G.generationGuide.forbiddenOutcomes")

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
    lifecycle_state = lifecycle.get("state")
    machine_required = lifecycle_state in {"MACHINE_VALID", "AGENT_REVIEW", "HUMAN_REVIEW_PENDING", "APPROVED"}
    for key in ("outsideAuthorizedRoiPixels", "goldenPixelDifferenceCountDefaultRuntime"):
        if key in machine:
            if machine.get(key) != 0:
                fail(errors, f"acceptance.machine.{key}")
        elif machine_required:
            fail(errors, f"acceptance.machine.{key}")

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
