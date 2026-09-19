from __future__ import annotations
import unittest
from PIL import Image
from tools.research_bmc01_material_slots import parse_hex, colorize_with_shading

class BMC01MaterialSlotTests(unittest.TestCase):
    def test_parse_hex(self):
        self.assertEqual(parse_hex("#30312f"),(48,49,47))

    def test_colorize_preserves_alpha(self):
        src=Image.new("RGBA",(2,1),(200,200,200,255))
        mask=Image.new("L",(2,1)); mask.putdata([255,128])
        out=colorize_with_shading(src,mask,"#808080")
        self.assertEqual(out.getpixel((0,0))[3],255)
        self.assertEqual(out.getpixel((1,0))[3],128)

if __name__=="__main__":
    unittest.main()
