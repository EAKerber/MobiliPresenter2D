from __future__ import annotations
import unittest
from PIL import Image
from tools.research_bmc01_guide_review import mask

class BMC01GuideReviewTests(unittest.TestCase):
    def test_polygon_mask_nonempty(self):
        m=mask((30,30),[[5,5],[20,5],[20,20],[5,20]])
        self.assertIsNotNone(m.getbbox())
        self.assertGreater(sum(1 for v in m.getdata() if v),0)

if __name__=="__main__":
    unittest.main()
