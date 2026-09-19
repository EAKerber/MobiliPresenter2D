from __future__ import annotations

import math
import unittest

from PIL import Image

import tools.materialize_perspective_donor_recipe as donor


def apply(coeffs, x, y):
    a, b, c, d, e, f, g, h = coeffs
    den = g * x + h * y + 1.0
    return ((a * x + b * y + c) / den, (d * x + e * y + f) / den)


class PerspectiveDonorMaterializerTests(unittest.TestCase):
    def test_coefficients_map_each_target_corner_to_donor_corner(self):
        target = [[2, 3], [10, 4], [11, 14], [1, 13]]
        source = [[20, 30], [50, 31], [49, 70], [21, 69]]
        coeffs = donor.perspective_coefficients(target, source)
        for (x, y), (u, v) in zip(target, source):
            actual_u, actual_v = apply(coeffs, x, y)
            self.assertTrue(math.isclose(actual_u, u, abs_tol=1e-8))
            self.assertTrue(math.isclose(actual_v, v, abs_tol=1e-8))

    def test_singular_quad_is_rejected(self):
        target = [[0, 0], [1, 0], [2, 0], [3, 0]]
        source = [[0, 0], [1, 0], [1, 1], [0, 1]]
        with self.assertRaises(donor.RecipeError):
            donor.perspective_coefficients(target, source)

    def test_polygon_mask_never_authorizes_pixels_outside_roi(self):
        size = (12, 12)
        quad = [[1, 1], [10, 1], [10, 10], [1, 10]]
        roi = (4, 3, 8, 9)
        mask = donor.polygon_mask(size, quad, supersampling=4, roi=roi)
        pixels = mask.load()
        for y in range(size[1]):
            for x in range(size[0]):
                if not (roi[0] <= x < roi[2] and roi[1] <= y < roi[3]):
                    self.assertEqual(pixels[x, y], 0)

    def test_protected_pixel_survives_projective_copy(self):
        size = (10, 10)
        source = Image.new("RGBA", size, (220, 20, 20, 255))
        target = Image.new("RGBA", size, (20, 40, 220, 255))
        protected = Image.new("L", size, 0)
        protected.putpixel((5, 5), 255)
        quad = [[2, 2], [8, 2], [8, 8], [2, 8]]
        result = donor.perspective_copy(
            source,
            target,
            quad,
            quad,
            (2, 2, 9, 9),
            1,
            protected,
        )
        self.assertEqual(result.getpixel((5, 5)), target.getpixel((5, 5)))
        self.assertEqual(result.getpixel((4, 4)), source.getpixel((4, 4)))

    def test_projective_copy_is_deterministic(self):
        size = (16, 16)
        source = Image.new("RGBA", size, (0, 0, 0, 255))
        for y in range(size[1]):
            for x in range(size[0]):
                source.putpixel((x, y), (x * 8, y * 8, (x + y) * 4, 255))
        target = Image.new("RGBA", size, (240, 240, 240, 255))
        protected = Image.new("L", size, 0)
        donor_quad = [[2, 2], [12, 2], [12, 12], [2, 12]]
        target_quad = [[3, 1], [13, 3], [11, 14], [1, 12]]
        first = donor.perspective_copy(source, target, donor_quad, target_quad, (0, 0, 16, 16), 4, protected)
        second = donor.perspective_copy(source, target, donor_quad, target_quad, (0, 0, 16, 16), 4, protected)
        self.assertEqual(first.tobytes(), second.tobytes())


if __name__ == "__main__":
    unittest.main()
