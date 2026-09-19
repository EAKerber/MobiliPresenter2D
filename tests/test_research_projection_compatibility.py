from __future__ import annotations

import unittest

from tools.research_projection_compatibility import evaluate, project


class ProjectionCompatibilityResearchTests(unittest.TestCase):
    def camera(self):
        return {
            "cameraProjectPositionMm": [0, 0, 0],
            "principalPointPx": [100, 50],
            "focalLengthPx": 100,
        }

    def test_projection_matches_axis_aligned_perspective_assumption(self):
        self.assertEqual(project([10, 100, 20], self.camera()), [110, 30])

    def test_depth_probe_reports_direction_change_against_similarity_transfer(self):
        config = {
            "schemaVersion": "ProjectionCompatibilityProbe 0.1",
            "sceneId": "x",
            "sourceCalibration": self.camera(),
            "depthProbe": {
                "id": "p",
                "physicalFrontMm": [10, 100, 20],
                "physicalBackMm": [10, 200, 20],
                "observedFrontPx": [0, 0],
                "observedBackPx": [20, -80],
                "physicalStatus": "confirmed",
                "observedStatus": "measured",
            },
            "frontEnvelopeSamples": [{
                "id": "front",
                "status": "proxy",
                "physicalWidthMm": 100,
                "physicalHeightMm": 100,
                "frontPlaneYmm": 100,
                "observedWidthPx": 100,
                "observedHeightPx": 100,
            }],
        }
        report = evaluate(config)
        self.assertEqual(report["status"], "DIAGNOSTIC_ONLY")
        self.assertFalse(report["promotionEligible"])
        self.assertGreater(report["depthProbe"]["angleDifferenceDeg"], 1)
        self.assertEqual(
            report["interpretation"]["similarityTransformExactTransfer"],
            "REJECTED_FOR_TESTED_PROBE",
        )


if __name__ == "__main__":
    unittest.main()
