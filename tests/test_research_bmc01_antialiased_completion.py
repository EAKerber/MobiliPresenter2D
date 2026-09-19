from __future__ import annotations
import unittest
from PIL import Image
from tools.research_bmc01_antialiased_completion import alpha_mass, boundary_alpha

class BMC01AntialiasedCompletionTests(unittest.TestCase):
    def test_alpha_mass(self):
        m=Image.new("L",(2,1)); m.putdata([255,128])
        self.assertAlmostEqual(alpha_mass(m),1+128/255)

    def test_boundary_alpha_finds_neighbor(self):
        m=Image.new("L",(5,5),0); m.putpixel((2,2),255)
        b=boundary_alpha(m)
        self.assertEqual(sum(1 for v in b.getdata() if v),4)

if __name__=="__main__":
    unittest.main()
