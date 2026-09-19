from __future__ import annotations
import unittest
from tools.research_bmc01_underlayer_identity import summarize

class UnderlayerIdentityTests(unittest.TestCase):
    def test_summary(self):
        r=summarize([0,2,4,10])
        self.assertEqual(r["pixels"],4)
        self.assertEqual(r["max"],10)
        self.assertAlmostEqual(r["meanAbsChannelDifference"],4)

if __name__=="__main__":
    unittest.main()
