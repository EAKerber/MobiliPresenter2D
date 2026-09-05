from __future__ import annotations

import unittest

from PIL import Image

import tools.extract_candidate_delta as delta


class CandidateDeltaAuthoringTests(unittest.TestCase):
    def setUp(self):
        self.source = Image.new("RGBA", (32, 24), (100, 100, 100, 255))
        self.roi = (8, 6, 24, 20)

    def test_inside_roi_extracts_exact_roundtrip_layer(self):
        edited = self.source.copy()
        for y in range(10, 14):
            for x in range(12, 18):
                edited.putpixel((x, y), (210, 30, 40, 255))
        candidate, report, _ = delta.extract_delta(self.source, edited, self.roi)
        self.assertEqual(report["status"], "PASS")
        self.assertEqual(report["outsideAuthorizedRoiChangedPixelCount"], 0)
        self.assertEqual(report["roundtripMismatchPixelCount"], 0)
        self.assertEqual(report["changedPixelCount"], 24)
        self.assertEqual(candidate.getchannel("A").getbbox(), (12, 10, 18, 14))
        self.assertEqual(
            Image.alpha_composite(self.source, candidate).convert("RGB").tobytes(),
            edited.convert("RGB").tobytes(),
        )

    def test_any_change_outside_roi_is_rejected(self):
        edited = self.source.copy()
        edited.putpixel((2, 2), (200, 0, 0, 255))
        with self.assertRaises(delta.DeltaExtractionError) as ctx:
            delta.extract_delta(self.source, edited, self.roi)
        self.assertEqual(ctx.exception.code, "DELTA_OUTSIDE_AUTHORIZED_ROI")

    def test_empty_edit_is_rejected(self):
        with self.assertRaises(delta.DeltaExtractionError) as ctx:
            delta.extract_delta(self.source, self.source.copy(), self.roi)
        self.assertEqual(ctx.exception.code, "DELTA_EMPTY")

    def test_mismatched_frame_size_is_rejected(self):
        edited = Image.new("RGBA", (31, 24), (100, 100, 100, 255))
        with self.assertRaises(delta.DeltaExtractionError) as ctx:
            delta.extract_delta(self.source, edited, self.roi)
        self.assertEqual(ctx.exception.code, "AUTHORING_FRAME_SIZE_MISMATCH")


if __name__ == "__main__":
    unittest.main()
