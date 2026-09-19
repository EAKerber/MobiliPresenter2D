from __future__ import annotations
import unittest
from tools.research_bmc04_generation_inputs import localize

class BMC04GenerationInputTests(unittest.TestCase):
    def test_localize(self):
        self.assertEqual(localize([[12,23],[20,30]],[10,20,40,50]),[[2.0,3.0],[10.0,10.0]])

if __name__=="__main__":
    unittest.main()
