from __future__ import annotations
import unittest
from PIL import Image
from tools.research_scene_projective_consistency import boundary_fits, residual_component, circular_spread

class SceneProjectiveConsistencyProbeTests(unittest.TestCase):
    def test_boundary_fit_recovers_axis_aligned_rectangle(self):
        im=Image.new("L",(20,20),0)
        for y in range(4,15):
            for x in range(3,17): im.putpixel((x,y),255)
        r=boundary_fits(im,128)
        self.assertAlmostEqual(r["top"]["angleDeg"],0,places=6)
        self.assertAlmostEqual(r["bottom"]["angleDeg"],0,places=6)
        self.assertAlmostEqual(r["left"]["angleFromVerticalDeg"],0,places=6)
        self.assertAlmostEqual(r["right"]["angleFromVerticalDeg"],0,places=6)

    def test_residual_component_follows_seeded_nonfront_region(self):
        layer=Image.new("L",(12,12),0); front=Image.new("L",(12,12),0)
        for y in range(2,10):
            for x in range(2,10): layer.putpixel((x,y),255)
        for y in range(2,10):
            for x in range(2,7): front.putpixel((x,y),255)
        r=residual_component(layer,front,128,[[7,3],[9,3],[9,8],[7,8]])
        self.assertEqual(r["status"],"OK")
        self.assertEqual(r["bounds"],[7,2,10,10])

    def test_orientation_spread_is_modulo_180(self):
        r=circular_spread([1.0,179.0,0.0])
        self.assertLess(r["maxAbsDeviationDeg"],2.0)

if __name__=="__main__":
    unittest.main()
