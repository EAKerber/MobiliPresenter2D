from __future__ import annotations

import json
import tempfile
import unittest
from pathlib import Path

from PIL import Image, ImageDraw

from tools.research_bmc04_post_generation_gate import evaluate


def write_input(root: Path):
    inp = root / "input"
    inp.mkdir()
    support = Image.new("L", (40, 20), 0)
    ImageDraw.Draw(support).polygon([(5, 16), (34, 16), (31, 7), (9, 7)], fill=255)
    support.save(inp / "footprint-max-support.png")
    ImageChops = __import__("PIL.ImageChops", fromlist=["ImageChops"])
    protection = ImageChops.invert(support)
    protection.save(inp / "protection-mask.png")
    Image.new("RGBA", (40, 20), (200, 200, 200, 255)).save(inp / "clean-cooktop-free.png")
    receipt = {
        "operationId": "bmc04-test",
        "postFitBudget": {
            "translationPx": 3,
            "uniformScalePercent": 3,
            "rotationDeg": 1.5,
            "projectiveWarpAllowed": False,
        },
    }
    (inp / "receipt.json").write_text(json.dumps(receipt))
    return inp


class BMC04PostGenerationGateTests(unittest.TestCase):
    def test_matching_trapezoid_passes(self):
        with tempfile.TemporaryDirectory() as td:
            root = Path(td)
            inp = write_input(root)
            candidate = Image.new("RGBA", (80, 40), (0, 0, 0, 0))
            ImageDraw.Draw(candidate).polygon(
                [(10, 32), (68, 32), (62, 14), (18, 14)],
                fill=(20, 20, 20, 255),
            )
            path = root / "candidate.png"
            candidate.save(path)
            result = evaluate(path, inp, root / "out")
            self.assertEqual(result["status"], "PASS")
            self.assertEqual(result["gates"]["outsideMaximumSupportPixels"], 0)

    def test_axis_aligned_rectangle_is_rejected_by_support(self):
        with tempfile.TemporaryDirectory() as td:
            root = Path(td)
            inp = write_input(root)
            candidate = Image.new("RGBA", (80, 40), (0, 0, 0, 0))
            ImageDraw.Draw(candidate).rectangle((10, 14, 68, 32), fill=(20, 20, 20, 255))
            path = root / "candidate.png"
            candidate.save(path)
            result = evaluate(path, inp, root / "out")
            self.assertEqual(result["status"], "FAIL")
            self.assertIn(
                "generated-silhouette-escapes-maximum-support",
                result["errors"],
            )


if __name__ == "__main__":
    unittest.main()
