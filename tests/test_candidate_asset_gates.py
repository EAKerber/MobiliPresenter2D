from __future__ import annotations

import json
import tempfile
import unittest
from pathlib import Path

from PIL import Image, ImageChops

import tools.validate_candidate_assets as gates
import tools.render_candidate_review as review


class CandidateAssetGateTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.root = Path(self.temp.name)
        self.candidate_root = self.root / "review-assets" / "candidates"
        self.candidate_root.mkdir(parents=True)
        self.roles = {
            "schemaVersion": "CandidateAssetRoles 0.1",
            "sceneId": "cozinha-01",
            "canvas": {"width": 1536, "height": 1024, "origin": [0, 0]},
            "roles": [
                {
                    "id": "range-freestanding",
                    "targetVariants": ["module-02-hidden"],
                    "authorizedRoi": [460, 430, 790, 950],
                    "minAlphaBBox": {"width": 120, "height": 220},
                    "maxAlphaBBoxArea": 171600,
                    "resolvesDebtCodes": ["replacement-placeholder"],
                    "visualChecklist": ["fits-opening", "perspective-match"],
                }
            ],
        }
        self.cases = {
            "schemaVersion": "VariantFidelityCases 0.1",
            "sceneId": "cozinha-01",
            "cases": [{"id": "module-02-hidden"}],
        }
        self.roles_path = self.root / "roles.json"
        self.cases_path = self.root / "cases.json"
        self.roles_path.write_text(json.dumps(self.roles), encoding="utf-8")
        self.cases_path.write_text(json.dumps(self.cases), encoding="utf-8")
        self.original_repo_root = gates.REPO_ROOT
        gates.REPO_ROOT = self.root

    def tearDown(self):
        gates.REPO_ROOT = self.original_repo_root
        self.temp.cleanup()

    def make_candidate(self, candidate_id="valid", bbox=(500, 500, 700, 900), *, status="REVIEW", review_status="PENDING"):
        folder = self.candidate_root / candidate_id
        folder.mkdir(parents=True, exist_ok=True)
        image_path = folder / "candidate.png"
        image = Image.new("RGBA", (1536, 1024), (0, 0, 0, 0))
        pixels = image.load()
        for y in range(bbox[1], bbox[3]):
            for x in range(bbox[0], bbox[2]):
                pixels[x, y] = (180, 180, 180, 255)
        image.save(image_path)
        metadata = {
            "schemaVersion": "CandidateAsset 0.1",
            "id": candidate_id,
            "role": "range-freestanding",
            "targetScene": "cozinha-01",
            "targetVariant": "module-02-hidden",
            "imagePath": image_path.relative_to(self.root).as_posix(),
            "status": status,
            "provenance": {
                "method": "image-generation",
                "sourceReferences": ["canonical-master", "module-02-hidden"],
            },
            "humanReview": {
                "status": review_status,
                "reviewer": None,
                "reviewedAt": None,
                "checklist": {},
            },
        }
        metadata_path = folder / "candidate.json"
        metadata_path.write_text(json.dumps(metadata), encoding="utf-8")
        return metadata_path, image_path, metadata

    def test_valid_review_candidate_passes_structural_gate(self):
        metadata_path, _, _ = self.make_candidate()
        record = gates.validate_candidate(metadata_path, self.roles, self.cases, self.candidate_root)
        self.assertEqual(record["structuralGate"], "PASS")
        self.assertEqual(record["humanVisualGate"], "PENDING")
        self.assertFalse(record["promotionEligible"])
        self.assertEqual(record["outsideRoiAlphaPixels"], 0)

    def test_alpha_outside_authorized_roi_fails(self):
        metadata_path, _, _ = self.make_candidate(bbox=(100, 100, 700, 900))
        with self.assertRaises(gates.CandidateValidationError) as ctx:
            gates.validate_candidate(metadata_path, self.roles, self.cases, self.candidate_root)
        self.assertEqual(ctx.exception.code, "CANDIDATE_ALPHA_OUTSIDE_AUTHORIZED_ROI")

    def test_wrong_canvas_fails(self):
        metadata_path, image_path, _ = self.make_candidate()
        Image.new("RGBA", (1024, 1024), (0, 0, 0, 0)).save(image_path)
        with self.assertRaises(gates.CandidateValidationError) as ctx:
            gates.validate_candidate(metadata_path, self.roles, self.cases, self.candidate_root)
        self.assertEqual(ctx.exception.code, "CANDIDATE_CANVAS_MISMATCH")

    def test_approval_requires_hash_bound_complete_checklist(self):
        metadata_path, image_path, metadata = self.make_candidate(status="APPROVED", review_status="APPROVED")
        metadata["expectedImageSha256"] = gates.sha256_file(image_path)
        metadata["humanReview"] = {
            "status": "APPROVED",
            "reviewer": "human-reviewer",
            "reviewedAt": "2026-09-04T00:00:00-03:00",
            "checklist": {"fits-opening": True, "perspective-match": True},
        }
        metadata_path.write_text(json.dumps(metadata), encoding="utf-8")
        record = gates.validate_candidate(metadata_path, self.roles, self.cases, self.candidate_root)
        self.assertTrue(record["humanApproved"])

    def test_approval_rejects_stale_hash(self):
        metadata_path, _, metadata = self.make_candidate(status="APPROVED", review_status="APPROVED")
        metadata["expectedImageSha256"] = "0" * 64
        metadata["humanReview"] = {
            "status": "APPROVED",
            "reviewer": "human-reviewer",
            "reviewedAt": "2026-09-04T00:00:00-03:00",
            "checklist": {"fits-opening": True, "perspective-match": True},
        }
        metadata_path.write_text(json.dumps(metadata), encoding="utf-8")
        with self.assertRaises(gates.CandidateValidationError) as ctx:
            gates.validate_candidate(metadata_path, self.roles, self.cases, self.candidate_root)
        self.assertIn(ctx.exception.code, {"CANDIDATE_IMAGE_HASH_MISMATCH", "APPROVAL_HASH_MISMATCH"})

    def test_review_diff_counts_rgb_change_on_opaque_scene(self):
        baseline = Image.new("RGBA", (4, 4), (10, 10, 10, 255))
        candidate = Image.new("RGBA", (4, 4), (0, 0, 0, 0))
        candidate.putpixel((2, 2), (200, 50, 50, 255))
        composed = Image.alpha_composite(baseline, candidate)
        difference = ImageChops.difference(composed.convert("RGB"), baseline.convert("RGB"))
        self.assertEqual(review.nonzero_pixel_count(difference), 1)
        self.assertEqual(difference.getbbox(), (2, 2, 3, 3))

    def test_no_candidates_is_pass_not_approval(self):
        report = gates.validate_all(self.candidate_root, self.roles_path, self.cases_path)
        self.assertEqual(report["status"], "PASS")
        self.assertEqual(report["code"], "NO_CANDIDATES")
        self.assertEqual(report["candidateCount"], 0)


if __name__ == "__main__":
    unittest.main()
