from __future__ import annotations

import hashlib
import json
import tempfile
import unittest
from pathlib import Path

from PIL import Image

import tools.validate_authoring_provenance as provenance


class CandidateAuthoringProvenanceTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.root = Path(self.temp.name)
        self.original_repo_root = provenance.REPO_ROOT
        provenance.REPO_ROOT = self.root
        self.candidate_root = self.root / "review-assets" / "candidates" / "termination-001"
        self.candidate_root.mkdir(parents=True)
        self.roles = {"roles": [{"id": "module-03-left-termination", "authoringContractId": "termination-edit"}]}
        self.contracts = {
            "schemaVersion": "CandidateAuthoringContracts 0.1",
            "contracts": [{
                "id": "termination-edit",
                "role": "module-03-left-termination",
                "targetVariant": "module-02-hidden",
                "mode": "edit-existing-canonical-frame",
                "deltaExtractionRequired": True,
                "requiredSourceReferences": ["base.png", "variant:module-02-hidden@fingerprint"],
            }],
        }
        self.image = self.candidate_root / "candidate.png"
        Image.new("RGBA", (8, 8), (0, 0, 0, 0)).save(self.image)
        self.image_sha = self.sha(self.image)
        self.report = self.candidate_root / "extraction-report.json"
        self.report.write_text(json.dumps({
            "schemaVersion": "CandidateDeltaExtractionReport 0.1",
            "status": "PASS",
            "role": "module-03-left-termination",
            "targetVariant": "module-02-hidden",
            "authoringContractId": "termination-edit",
            "sourceFrameSha256": "1" * 64,
            "editedFrameSha256": "2" * 64,
            "candidateSha256": self.image_sha,
            "outsideAuthorizedRoiChangedPixelCount": 0,
            "roundtripMismatchPixelCount": 0,
        }), encoding="utf-8")

    def tearDown(self):
        provenance.REPO_ROOT = self.original_repo_root
        self.temp.cleanup()

    @staticmethod
    def sha(path: Path) -> str:
        return hashlib.sha256(path.read_bytes()).hexdigest()

    def metadata(self):
        return {
            "schemaVersion": "CandidateAsset 0.1",
            "id": "termination-001",
            "role": "module-03-left-termination",
            "targetVariant": "module-02-hidden",
            "imagePath": "review-assets/candidates/termination-001/candidate.png",
            "expectedImageSha256": self.image_sha,
            "provenance": {
                "method": "image-edit",
                "authoringContractId": "termination-edit",
                "sourceReferences": ["base.png", "variant:module-02-hidden@fingerprint"],
                "sourceFrameSha256": "1" * 64,
                "editedFrameSha256": "2" * 64,
                "deltaExtractionRequired": True,
                "extractionReport": "review-assets/candidates/termination-001/extraction-report.json",
            },
        }

    def test_valid_extracted_candidate_passes(self):
        path = self.candidate_root / "candidate.json"
        path.write_text(json.dumps(self.metadata()), encoding="utf-8")
        record = provenance.validate_record(path, self.roles, self.contracts)
        self.assertEqual(record["status"], "PASS")

    def test_missing_required_frame_reference_fails(self):
        data = self.metadata()
        data["provenance"]["sourceReferences"] = ["base.png"]
        path = self.candidate_root / "candidate.json"
        path.write_text(json.dumps(data), encoding="utf-8")
        with self.assertRaises(provenance.AuthoringProvenanceError) as ctx:
            provenance.validate_record(path, self.roles, self.contracts)
        self.assertEqual(ctx.exception.code, "AUTHORING_SOURCE_REFERENCE_MISSING")

    def test_stale_extraction_report_candidate_hash_fails(self):
        report = json.loads(self.report.read_text())
        report["candidateSha256"] = "0" * 64
        self.report.write_text(json.dumps(report), encoding="utf-8")
        path = self.candidate_root / "candidate.json"
        path.write_text(json.dumps(self.metadata()), encoding="utf-8")
        with self.assertRaises(provenance.AuthoringProvenanceError) as ctx:
            provenance.validate_record(path, self.roles, self.contracts)
        self.assertEqual(ctx.exception.code, "AUTHORING_CANDIDATE_HASH_MISMATCH")


if __name__ == "__main__":
    unittest.main()
