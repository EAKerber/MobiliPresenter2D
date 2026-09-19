from __future__ import annotations

import tempfile
import unittest
from pathlib import Path

from PIL import Image

from tools.research_bmc02_termination_ownership import coverage, points


class BMC02TerminationOwnershipTests(unittest.TestCase):
    def test_points_and_coverage(self):
        candidate = Image.new("L", (5, 3), 0)
        candidate.putpixel((1, 1), 255)
        candidate.putpixel((2, 1), 128)
        sample = points(candidate)
        self.assertEqual(sample, [(1, 1), (2, 1)])

        owner = Image.new("L", (5, 3), 0)
        owner.putpixel((2, 1), 255)
        result = coverage(owner, sample, 1)
        self.assertEqual(result["hitPixels"], 1)
        self.assertEqual(result["samplePixels"], 2)
        self.assertEqual(result["ratio"], 0.5)


if __name__ == "__main__":
    unittest.main()
