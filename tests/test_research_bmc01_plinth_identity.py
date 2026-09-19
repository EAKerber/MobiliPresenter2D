from __future__ import annotations
import unittest
from PIL import Image
from tools.research_bmc01_plinth_identity import pmask, summarize_alpha_rgb

class PlinthIdentityTests(unittest.TestCase):
    def test_summary_respects_threshold_and_geometry(self):
        base=Image.new("RGBA",(4,2),(100,100,100,255))
        layer=Image.new("RGBA",(4,2),(0,0,0,0))
        layer.putpixel((1,0),(90,90,90,127))
        layer.putpixel((2,0),(80,80,80,255))
        geom=pmask((4,2),[[1,0],[2,0],[2,1],[1,1]])
        r=summarize_alpha_rgb(layer,base,geom,128)
        self.assertEqual(r["pixels"],1)
        self.assertEqual(r["meanRgbDifferenceToBase"],20)

if __name__=="__main__":
    unittest.main()
