from __future__ import annotations

import hashlib
import tempfile
import unittest
from pathlib import Path

from PIL import Image

import tools.render_candidate_set_review as setreview


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


class CandidateAssetSetTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.root = Path(self.tmp.name)
        self.original_root = setreview.REPO_ROOT
        setreview.REPO_ROOT = self.root
        self.variant_dir = self.root / "variants"
        self.variant_dir.mkdir()
        Image.new("RGBA", (1536, 1024), (240, 240, 240, 255)).save(self.variant_dir / "module-02-hidden.png")
        self.variant_manifest = {
            "schemaVersion": "VariantRenderManifest 0.1",
            "sceneId": "cozinha-01",
            "cases": [{"id": "module-02-hidden", "fingerprint": "scene2d-test"}],
        }
        self.sets = {
            "schemaVersion": "CandidateAssetSets 0.1",
            "sceneId": "cozinha-01",
            "sets": [{
                "id": "module-02-hidden-complete",
                "targetVariant": "module-02-hidden",
                "roleOrder": ["module-02-bay-completion", "range-freestanding"],
                "resolvesDebtCodes": ["raw-neighbor-cut", "replacement-placeholder"],
                "visualChecklist": ["contact-natural", "no-seam"],
                "humanReview": {
                    "status": "PENDING",
                    "reviewer": None,
                    "reviewedAt": None,
                    "candidateSha256ByRole": {},
                    "checklist": {},
                },
            }],
        }
        self.out = self.root / "out"

    def tearDown(self):
        setreview.REPO_ROOT = self.original_root
        self.tmp.cleanup()

    def make_candidate(self, cid, role, bbox, roi, promotion=False):
        path = self.root / "review-assets" / "candidates" / cid / "candidate.png"
        path.parent.mkdir(parents=True, exist_ok=True)
        image = Image.new("RGBA", (1536, 1024), (0, 0, 0, 0))
        pixels = image.load()
        for y in range(bbox[1], bbox[3]):
            for x in range(bbox[0], bbox[2]):
                pixels[x, y] = (150, 120, 90, 255)
        image.save(path)
        return {
            "id": cid,
            "role": role,
            "targetVariant": "module-02-hidden",
            "structuralGate": "PASS",
            "imagePath": path.relative_to(self.root).as_posix(),
            "imageSha256": sha256(path),
            "authorizedRoi": list(roi),
            "promotionEligible": promotion,
        }

    def test_missing_roles_is_pass_incomplete(self):
        intake = {"schemaVersion": "CandidateAssetIntakeReport 0.1", "status": "PASS", "candidates": []}
        result = setreview.render_sets(self.sets, self.variant_manifest, intake, self.variant_dir, self.out)
        self.assertEqual(result["status"], "PASS")
        self.assertEqual(result["code"], "SETS_INCOMPLETE")
        self.assertEqual(result["reviews"][0]["setState"], "INCOMPLETE")

    def test_complete_pending_set_composes_in_declared_order(self):
        bay = self.make_candidate("bay", "module-02-bay-completion", (480, 500, 520, 700), (470, 480, 780, 930))
        stove = self.make_candidate("range", "range-freestanding", (520, 500, 700, 900), (460, 430, 790, 950))
        intake = {"schemaVersion": "CandidateAssetIntakeReport 0.1", "status": "PASS", "candidates": [bay, stove]}
        result = setreview.render_sets(self.sets, self.variant_manifest, intake, self.variant_dir, self.out)
        review = result["reviews"][0]
        self.assertEqual(result["status"], "PASS")
        self.assertEqual(review["setState"], "COMPLETE")
        self.assertEqual(review["machineVisualGate"], "PASS")
        self.assertEqual(review["outsideAuthorizedRoisChangedPixelCount"], 0)
        self.assertFalse(review["promotionEligible"])
        self.assertTrue((self.out / "module-02-hidden-complete" / "review-sheet.jpg").exists())

    def test_ambiguous_role_fails_closed(self):
        bay = self.make_candidate("bay", "module-02-bay-completion", (480, 500, 520, 700), (470, 480, 780, 930))
        stove1 = self.make_candidate("range1", "range-freestanding", (520, 500, 650, 850), (460, 430, 790, 950))
        stove2 = self.make_candidate("range2", "range-freestanding", (540, 500, 700, 850), (460, 430, 790, 950))
        intake = {"schemaVersion": "CandidateAssetIntakeReport 0.1", "status": "PASS", "candidates": [bay, stove1, stove2]}
        result = setreview.render_sets(self.sets, self.variant_manifest, intake, self.variant_dir, self.out)
        self.assertEqual(result["status"], "FAIL")
        self.assertEqual(result["reviews"][0]["errorCode"], "SET_ROLE_AMBIGUOUS")

    def test_set_approval_is_bound_to_exact_candidate_hashes(self):
        bay = self.make_candidate("bay", "module-02-bay-completion", (480, 500, 520, 700), (470, 480, 780, 930), promotion=True)
        stove = self.make_candidate("range", "range-freestanding", (520, 500, 700, 900), (460, 430, 790, 950), promotion=True)
        self.sets["sets"][0]["humanReview"] = {
            "status": "APPROVED",
            "reviewer": "human-reviewer",
            "reviewedAt": "2026-09-04T20:00:00-03:00",
            "candidateSha256ByRole": {
                "module-02-bay-completion": bay["imageSha256"],
                "range-freestanding": stove["imageSha256"],
            },
            "checklist": {"contact-natural": True, "no-seam": True},
        }
        intake = {"schemaVersion": "CandidateAssetIntakeReport 0.1", "status": "PASS", "candidates": [bay, stove]}
        result = setreview.render_sets(self.sets, self.variant_manifest, intake, self.variant_dir, self.out)
        self.assertEqual(result["promotionEligibleCount"], 1)

    def test_diff_outside_declared_rois_fails_machine_gate(self):
        bay = self.make_candidate("bay", "module-02-bay-completion", (100, 100, 120, 120), (470, 480, 780, 930))
        stove = self.make_candidate("range", "range-freestanding", (520, 500, 700, 900), (460, 430, 790, 950))
        intake = {"schemaVersion": "CandidateAssetIntakeReport 0.1", "status": "PASS", "candidates": [bay, stove]}
        result = setreview.render_sets(self.sets, self.variant_manifest, intake, self.variant_dir, self.out)
        self.assertEqual(result["status"], "FAIL")
        self.assertEqual(result["reviews"][0]["machineVisualGate"], "FAIL")
        self.assertGreater(result["reviews"][0]["outsideAuthorizedRoisChangedPixelCount"], 0)


if __name__ == "__main__":
    unittest.main()
