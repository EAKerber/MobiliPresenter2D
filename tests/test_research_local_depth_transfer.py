from __future__ import annotations
import unittest
from tools.research_local_depth_transfer import transfer

class LocalDepthTransferTests(unittest.TestCase):
    def test_scales_reference_vector_by_physical_depth_ratio(self):
        ref={"frontPx":[0,10],"backPx":[10,-10],"physicalDepthMm":500}
        target={"physicalDepthMm":250,"frontTopPx":[100,100],"frontBottomPx":[100,200]}
        r=transfer(ref,target)
        self.assertEqual(r["targetFrontToBackVectorPx"],[5.0,-10.0])
        self.assertEqual(r["quad"],[[100.0,100.0],[105.0,90.0],[105.0,190.0],[100.0,200.0]])

if __name__=="__main__":
    unittest.main()
