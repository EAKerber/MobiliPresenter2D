from __future__ import annotations

import tempfile
import unittest
from pathlib import Path

from PIL import Image

from tools.reconstruction_runtime_assets import write_slot


class ReconstructionRuntimeAssetTests(unittest.TestCase):
    def test_write_slot_separates_rgb_and_alpha(self):
        with tempfile.TemporaryDirectory() as td:
            root = Path(td)
            source = root / "candidate.png"
            out = root / "out"
            image = Image.new("RGBA", (3, 2), (200, 180, 160, 0))
            image.putpixel((1, 0), (120, 110, 100, 128))
            image.putpixel((1, 1), (90, 80, 70, 255))
            image.save(source)

            record = write_slot(
                slot="termination",
                source_path=source,
                output_dir=out,
                root=root,
            )
            mask = Image.open(root / record["mask"]).convert("L")
            neutral = Image.open(root / record["neutral"]).convert("RGB")
            self.assertEqual(list(mask.getdata()), [0, 128, 0, 0, 255, 0])
            self.assertEqual(neutral.getpixel((1, 0)), (120, 110, 100))
            self.assertEqual(neutral.getpixel((0, 0)), (0, 0, 0))


if __name__ == "__main__":
    unittest.main()
