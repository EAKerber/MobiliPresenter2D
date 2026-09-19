from __future__ import annotations
import unittest
from PIL import Image
from tools.research_bmc01_underlayer_reuse import binary

class BMC01UnderlayerReuseTests(unittest.TestCase):
    def test_binary_threshold(self):
        a=Image.new("L",(3,1))
        a.putdata([0,1,128])
        self.assertEqual(list(binary(a,1).getdata()),[0,255,255])
        self.assertEqual(list(binary(a,128).getdata()),[0,0,255])

if __name__=="__main__":
    unittest.main()
