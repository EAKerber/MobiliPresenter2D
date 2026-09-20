from __future__ import annotations

import unittest

from tools.research_bmc04_generation_input import crop_points, make_polygon_mask


class BMC04GenerationInputTests(unittest.TestCase):
    def test_crop_points(self):
        self.assertEqual(
            crop_points([(523.0, 573.0), (733.0, 552.0)], (500, 525, 750, 585)),
            [(23.0, 48.0), (233.0, 27.0)],
        )

    def test_polygon_mask_is_bounded(self):
        mask = make_polygon_mask((20, 20), [(2, 10), (15, 10), (17, 4), (5, 4)])
        self.assertIsNotNone(mask.getbbox())
        self.assertEqual(mask.getpixel((0, 0)), 0)
        self.assertEqual(mask.getpixel((10, 7)), 255)


if __name__ == "__main__":
    unittest.main()
