from __future__ import annotations

import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

from PIL import Image

import tools.materialize_bmc02_runtime_assets as module


class BMC02RuntimeAssetTests(unittest.TestCase):
    def test_materializes_single_stone_slot(self):
        with tempfile.TemporaryDirectory() as td:
            root = Path(td)
            source = root / "candidate.png"
            out = root / "out"
            image = Image.new("RGBA", (4, 3), (180, 170, 160, 0))
            image.putpixel((1, 1), (120, 110, 100, 255))
            image.save(source)

            with patch.object(module, "ROOT", root):
                # Helper receives module ROOT for display paths through wrapper constants.
                manifest = module.materialize(source, out)

            self.assertEqual(manifest["operationId"], "bmc02-module03-left-stone-termination")
            self.assertEqual([row["slot"] for row in manifest["slots"]], ["termination"])
            self.assertEqual(manifest["slots"][0]["nonzeroPixels"], 1)
            self.assertFalse(manifest["contract"]["defaultRuntimeEnabled"])


if __name__ == "__main__":
    unittest.main()
