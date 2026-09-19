from __future__ import annotations
import unittest
from PIL import Image
from tools.research_bmc01_underlayer_reuse import binary, alpha_confidence

class BMC01UnderlayerReuseTests(unittest.TestCase):
    def test_binary_threshold(self):
        a=Image.new("L",(3,1))
        a.putdata([0,1,128])
        self.assertEqual(list(binary(a,1).getdata()),[0,255,255])
        self.assertEqual(list(binary(a,128).getdata()),[0,0,255])

    def test_alpha_confidence_separates_soft_solid_and_strong_support(self):
        raw=Image.new("L",(5,1))
        raw.putdata([0,8,127,128,224])
        geom=Image.new("L",(5,1),255)
        r=alpha_confidence(raw,geom,-1,[[1,15],[16,127],[128,223],[224,255]],128,224)
        self.assertEqual(r["geometrySidePixels"],5)
        self.assertEqual(r["alphaPositivePixels"],4)
        self.assertEqual(r["solidPixels"],2)
        self.assertEqual(r["strongPixels"],1)
        self.assertAlmostEqual(r["effectiveOpaqueCoverageRatio"],sum([0,8,127,128,224])/(255*5))
        self.assertEqual([x["pixels"] for x in r["histogram"]],[1,1,1,1])

if __name__=="__main__":
    unittest.main()
