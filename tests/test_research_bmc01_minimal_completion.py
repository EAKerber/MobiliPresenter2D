from __future__ import annotations
import unittest
from PIL import Image
from tools.research_bmc01_minimal_completion import nearest_fill, binary_alpha, promote_soft_host_rgb, smooth_seed_fill, candidate_row_roughness, projective_donor_fill

class BMC01MinimalCompletionTests(unittest.TestCase):
    def test_binary_alpha_respects_threshold(self):
        import tempfile
        from pathlib import Path
        from unittest.mock import patch
        with tempfile.TemporaryDirectory() as td:
            root=Path(td)
            im=Image.new("RGBA",(3,1))
            im.putdata([(0,0,0,0),(0,0,0,19),(0,0,0,255)])
            (root/"a.png").parent.mkdir(parents=True,exist_ok=True)
            im.save(root/"a.png")
            with patch("tools.research_bmc01_minimal_completion.ROOT",root):
                self.assertEqual(list(binary_alpha("a.png",128).getdata()),[0,0,255])

    def test_promote_soft_host_rgb_only_inside_missing_and_below_threshold(self):
        clean=Image.new("RGBA",(4,1),(1,2,3,255))
        host=Image.new("RGBA",(4,1))
        host.putdata([
            (10,20,30,0),
            (40,50,60,19),
            (70,80,90,127),
            (100,110,120,255),
        ])
        missing=Image.new("L",(4,1),255)
        out,n=promote_soft_host_rgb(clean,missing,host,128)
        self.assertEqual(n,2)
        self.assertEqual(out.getpixel((0,0))[3],0)
        self.assertEqual(out.getpixel((1,0)),(40,50,60,255))
        self.assertEqual(out.getpixel((2,0)),(70,80,90,255))
        self.assertEqual(out.getpixel((3,0))[3],0)

    def test_projective_donor_fill_changes_only_missing_mask(self):
        clean=Image.new("RGBA",(12,12),(20,40,60,255))
        for y in range(2,10):
            for x in range(2,6):
                clean.putpixel((x,y),(100+x,120+y,140,255))
        missing=Image.new("L",(12,12),0)
        for y in range(3,9):
            for x in range(7,10): missing.putpixel((x,y),255)
        out,stats=projective_donor_fill(
            clean,missing,
            [[2,2],[5,2],[5,9],[2,9]],
            [[7,3],[9,3],[9,8],[7,8]],
        )
        self.assertEqual(stats["filled"],18)
        self.assertEqual(out.getpixel((0,0))[3],0)
        self.assertEqual(out.getpixel((8,5))[3],255)

    def test_smooth_seed_fill_preserves_contact_column(self):
        clean=Image.new("RGBA",(8,8),(0,0,0,255))
        donor=Image.new("L",(8,8),0)
        missing=Image.new("L",(8,8),0)
        for y in range(1,7):
            donor.putpixel((2,y),255)
            clean.putpixel((2,y),(20+y*10,20+y*10,20+y*10,255))
            for x in range(3,6): missing.putpixel((x,y),255)
        out,stats=smooth_seed_fill(clean,missing,donor,2,"rightmost")
        self.assertEqual(stats["filled"],18)
        for y in range(1,7):
            self.assertEqual(out.getpixel((3,y))[:3],clean.getpixel((2,y))[:3])
        self.assertGreater(candidate_row_roughness(out)["pairCount"],0)

    def test_nearest_fill_uses_only_donor(self):
        clean=Image.new("RGBA",(10,10),(10,20,30,255))
        clean.putpixel((5,5),(200,100,50,255))
        missing=Image.new("L",(10,10),0); missing.putpixel((6,5),255)
        donor=Image.new("L",(10,10),0); donor.putpixel((5,5),255)
        out,stats=nearest_fill(clean,missing,donor,3)
        self.assertEqual(out.getpixel((6,5)),(200,100,50,255))
        self.assertEqual(stats["filled"],1)
        self.assertEqual(out.getpixel((0,0))[3],0)

if __name__=="__main__":
    unittest.main()
