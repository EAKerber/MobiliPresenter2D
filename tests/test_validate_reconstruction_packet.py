from __future__ import annotations

import json
import tempfile
import unittest
from pathlib import Path

from tools.validate_reconstruction_packet import validate_packet


def minimal_packet(root: Path):
    (root / "asset").mkdir()
    (root / "asset" / "neutral.png").write_bytes(b"x")
    (root / "asset" / "mask.png").write_bytes(b"x")
    manifest = {
        "status": "RESEARCH_ONLY",
        "contract": {
            "defaultRuntimeEnabled": False,
            "appearanceAndOwnershipSeparated": True,
        },
        "slots": [
            {"slot": "carcass", "neutral": "asset/neutral.png", "mask": "asset/mask.png"}
        ],
    }
    (root / "manifest.json").write_text(json.dumps(manifest))
    (root / "evidence.txt").write_text("ok")
    return {
        "schemaVersion": "ReconstructionPacket 0.1",
        "identity": {
            "targetVariantFingerprint": "scene2d-test",
            "baseProductCommit": "a" * 40,
        },
        "confidence": {"G": "confirmed", "P": "derived", "A": "derived", "O": "confirmed"},
        "claims": [{"id": "c1", "status": "confirmed", "source": "test"}],
        "physicalGeometry": {},
        "ownership": {},
        "transformationEvidence": {"confidence": "local-derived", "globalCameraClaim": False},
        "visualEvidence": {},
        "editContract": {
            "authorizedRoi": [0, 0, 10, 10],
            "zeroChangeOutsideRoi": True,
            "defaultRuntimeMustRemainUnchanged": True,
            "materialSlots": ["carcass"],
        },
        "authoringPlan": {"generation": {"allowed": False}},
        "acceptance": {
            "machine": {
                "outsideAuthorizedRoiPixels": 0,
                "goldenPixelDifferenceCountDefaultRuntime": 0,
            },
            "humanReview": {"status": "PENDING"},
        },
        "lifecycle": {"state": "AGENT_REVIEW", "defaultPromotionAllowed": False},
        "provenance": {
            "requiredPaths": ["evidence.txt"],
            "runtimeAssetsManifest": "manifest.json",
        },
    }


class ReconstructionPacketTests(unittest.TestCase):
    def test_minimal_valid_packet(self):
        with tempfile.TemporaryDirectory() as td:
            root = Path(td)
            self.assertEqual(validate_packet(minimal_packet(root), root), [])

    def test_rejects_promotion_before_human_approval(self):
        with tempfile.TemporaryDirectory() as td:
            root = Path(td)
            packet = minimal_packet(root)
            packet["lifecycle"]["defaultPromotionAllowed"] = True
            self.assertIn("lifecycle.defaultPromotionAllowed", validate_packet(packet, root))

    def test_rejects_invalid_roi_and_claim_status(self):
        with tempfile.TemporaryDirectory() as td:
            root = Path(td)
            packet = minimal_packet(root)
            packet["editContract"]["authorizedRoi"] = [1, 1, 1, 2]
            packet["claims"][0]["status"] = "looks-good"
            errors = validate_packet(packet, root)
            self.assertIn("editContract.authorizedRoi", errors)
            self.assertIn("claims[0].status", errors)


if __name__ == "__main__":
    unittest.main()
