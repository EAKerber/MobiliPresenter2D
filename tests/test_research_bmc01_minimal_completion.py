from __future__ import annotations
import unittest
from PIL import Image
from tools.research_bmc01_minimal_completion import nearest_fill

class BMC01MinimalCompletionTests(unittest.TestCase):
    def test_nearest_fill_uses_only_donor(self):
        clean=Image.new("RGBA",(10,10),(10,20,30,255))
        clean.putpixel((5,5),(200,100,50,255))
        missing=Image.new("L",(10,10),0); missing.putpixel((6,5),255)
        donor=Image.new("L",(10,10),0); donor.putpixel((5,5),255)
        out,stats=nearest_fill(clean,missing,donor,3)
        self.assertEqual(out.getpixel((6,5)),(200,100,50,255))
        self.assertEqual(stats["filled"],1)
        self.assertEqual(out.getpixel((0,0))[3],0)

if __name__=="__main__":
    unittest.main()
