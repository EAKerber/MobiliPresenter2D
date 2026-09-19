from __future__ import annotations
import unittest
from tools.research_depth_cue_ownership import raster_line

class DepthCueOwnershipTests(unittest.TestCase):
    def test_raster_line_preserves_endpoints(self):
        pts=raster_line((2,5),(7,1))
        self.assertEqual(pts[0],(2,5))
        self.assertEqual(pts[-1],(7,1))
        self.assertEqual(len(pts),len(set(pts)))

if __name__=="__main__":
    unittest.main()
