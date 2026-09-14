import base64
import io
import json
import unittest
from pathlib import Path

from PIL import Image


ROOT = Path(__file__).resolve().parents[1]


class FinishMaskSemanticsTests(unittest.TestCase):
    def test_finish_masks_have_transparent_alpha_support(self):
        technical = json.loads((ROOT / "app/data/technical-data.json").read_text())
        for number in range(1, 8):
            path = ROOT / f"app/assets/kitchen/masks/{number:02d}.png"
            with Image.open(path) as image:
                self.assertIn("A", image.getbands(), path.name)
                alpha = image.getchannel("A")
                self.assertEqual(alpha.getpixel((0, 0)), 0, path.name)
                expected = technical["files"][f"assets/kitchen/masks/{number:02d}.png"]["alphaBounds"]
                self.assertEqual(list(alpha.getbbox()), expected, path.name)

    def test_inline_module02_mask_preserves_alpha_bytes(self):
        source = (ROOT / "app/data/mask-data.js").read_text()
        payload = source.split("Object.freeze(", 1)[1].split("});\n})(window);", 1)[0] + "}"
        encoded = json.loads(payload)["assets/kitchen/masks/02.png"].split(",", 1)[1]
        with Image.open(io.BytesIO(base64.b64decode(encoded))) as inline:
            with Image.open(ROOT / "app/assets/kitchen/masks/02.png") as canonical:
                self.assertEqual(inline.convert("RGBA").tobytes(), canonical.convert("RGBA").tobytes())


if __name__ == "__main__":
    unittest.main()
