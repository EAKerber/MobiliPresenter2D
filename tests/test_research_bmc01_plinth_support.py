from __future__ import annotations
import unittest
from tools.research_bmc01_plinth_support import rgb_diff

class PlinthSupportTests(unittest.TestCase):
    def test_rgb_diff(self):
        self.assertEqual(rgb_diff((10,20,30),(13,17,30)),2)

if __name__=="__main__":
    unittest.main()
