from __future__ import annotations
import unittest
from PIL import Image
from tools.research_scene_projective_consistency import boundary_fits, residual_component, circular_spread, intersect_yx_lines, least_squares_intersection, trace_internal_luma_edge, vertical_internal_seam_probe

class SceneProjectiveConsistencyProbeTests(unittest.TestCase):
    def test_boundary_fit_recovers_axis_aligned_rectangle(self):
        im=Image.new("L",(20,20),0)
        for y in range(4,15):
            for x in range(3,17): im.putpixel((x,y),255)
        r=boundary_fits(im,128)
        self.assertAlmostEqual(r["top"]["angleDeg"],0,places=6)
        self.assertAlmostEqual(r["bottom"]["angleDeg"],0,places=6)
        self.assertIn("intercept",r["top"])
        self.assertIn("intercept",r["bottom"])
        self.assertAlmostEqual(r["left"]["angleFromVerticalDeg"],0,places=6)
        self.assertAlmostEqual(r["right"]["angleFromVerticalDeg"],0,places=6)

    def test_residual_component_follows_seeded_nonfront_region(self):
        layer=Image.new("L",(12,12),0); front=Image.new("L",(12,12),0)
        for y in range(2,10):
            for x in range(2,10): layer.putpixel((x,y),255)
        for y in range(2,10):
            for x in range(2,7): front.putpixel((x,y),255)
        r=residual_component(layer,front,128,[[7,3],[9,3],[9,8],[7,8]],"right",1)
        self.assertEqual(r["status"],"OK")
        self.assertEqual(r["bounds"],[7,2,10,10])

    def test_line_intersection_recovers_vanishing_point(self):
        first={"dyDx":1.0,"intercept":0.0}
        second={"dyDx":-1.0,"intercept":10.0}
        self.assertEqual(intersect_yx_lines(first,second),[5.0,5.0])

    def test_vertical_internal_seam_probe_ignores_outer_alpha_edge(self):
        im=Image.new("RGBA",(20,20),(0,0,0,0))
        for y in range(2,18):
            for x in range(3,17):
                value=40 if x<10 else 210
                im.putpixel((x,y),(value,value,value,255))
        r=vertical_internal_seam_probe(im,[7,17],[3,16],128,0.5)
        self.assertEqual(r["status"],"OK")
        self.assertIn(r["best"]["x"],[9,10])
        self.assertNotEqual(r["best"]["x"],16)

    def test_internal_luma_edge_trace_recovers_sloped_seam(self):
        im=Image.new("RGBA",(30,30),(100,100,100,255))
        for x in range(4,25):
            seam=10+(x-4)//3
            for y in range(seam,29):
                im.putpixel((x,y),(180,180,180,255))
        r=trace_internal_luma_edge(im,4,25,13,10,3,1.0,128)
        self.assertEqual(r["status"],"OK")
        self.assertGreater(r["dyDx"],0.2)

    def test_least_squares_intersection_exact_lines(self):
        lines=[
            ("x", [1.0,0.0,-5.0]),
            ("y", [0.0,1.0,-7.0]),
        ]
        fit=least_squares_intersection(lines)
        self.assertAlmostEqual(fit["point"][0],5.0)
        self.assertAlmostEqual(fit["point"][1],7.0)
        self.assertAlmostEqual(fit["rmsPx"],0.0)

    def test_orientation_spread_is_modulo_180(self):
        r=circular_spread([1.0,179.0,0.0])
        self.assertLess(r["maxAbsDeviationDeg"],2.0)

if __name__=="__main__":
    unittest.main()
