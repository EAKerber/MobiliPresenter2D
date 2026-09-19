from __future__ import annotations
import unittest
from PIL import Image
from tools.research_bmc01_geometry_support import polygon_mask, audit_geometry, roi_mask

class BMC01GeometrySupportTests(unittest.TestCase):
    def test_support_split_is_exact(self):
        size=(20,20)
        support=Image.new("L",size,0)
        for y in range(5,16):
            for x in range(5,10):
                support.putpixel((x,y),255)
        overlay=Image.new("L",size,0)
        roi=roi_mask(size,[0,0,20,20])
        r=audit_geometry("x",[[5,5],[15,5],[15,15],[5,15]],support,overlay,roi)
        self.assertEqual(r["totalPixels"],r["preOverlayExistingSupportPixels"]+r["preOverlayMissingPixels"])
        self.assertEqual(r["outsideAuthorizedRoiPixels"],0)

if __name__=="__main__":
    unittest.main()
