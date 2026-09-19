from __future__ import annotations
import unittest
from PIL import Image
from tools.research_stone_depth_edges import trace

class StoneDepthEdgeProbeTests(unittest.TestCase):
    def test_right_edge_trace_recovers_linear_boundary(self):
        im=Image.new("L",(40,40),0)
        for y in range(10,21):
            right=30-(y-10)//2
            for x in range(5,right+1):
                im.putpixel((x,y),255)
        r=trace(im,[20,35],[10,20],128,"right")
        self.assertIsNotNone(r["fit"])
        self.assertLess(r["fit"]["rmsPx"],0.6)
        self.assertGreater(r["frontToBackVectorPx"][0],0)

if __name__=="__main__":
    unittest.main()
