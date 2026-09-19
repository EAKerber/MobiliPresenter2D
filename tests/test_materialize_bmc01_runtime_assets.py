from __future__ import annotations

import tempfile
import unittest
from pathlib import Path

from PIL import Image

from tools.materialize_bmc01_runtime_assets import materialize


class BMC01RuntimeAssetTests(unittest.TestCase):
    def test_separates_rgb_from_alpha_ownership(self):
        with tempfile.TemporaryDirectory() as td:
            root = Path(td)
            source = root / "source"
            output = root / "out"
            source.mkdir()

            for name in ("carcass-candidate.png", "plinth-candidate.png"):
                image = Image.new("RGBA", (3, 2), (200, 180, 160, 0))
                image.putpixel((1, 0), (120, 110, 100, 128))
                image.putpixel((1, 1), (90, 80, 70, 255))
                image.save(source / name)

            manifest = materialize(source, output)
            self.assertEqual(len(manifest["slots"]), 2)
            for record in manifest["slots"]:
                mask = Image.open(root / record["mask"]).convert("L")
                neutral = Image.open(root / record["neutral"]).convert("RGB")
                self.assertEqual(list(mask.getdata()), [0, 128, 0, 0, 255, 0])
                self.assertEqual(neutral.getpixel((1, 0)), (120, 110, 100))
                self.assertEqual(neutral.getpixel((0, 0)), (0, 0, 0))


if __name__ == "__main__":
    unittest.main()
