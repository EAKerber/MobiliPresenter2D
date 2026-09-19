from __future__ import annotations
import unittest
from PIL import Image
from tools.research_bmc01_combined_completion import binary_alpha
from unittest.mock import patch
from pathlib import Path
import tempfile

class BMC01CombinedCompletionTests(unittest.TestCase):
    def test_binary_alpha_threshold(self):
        with tempfile.TemporaryDirectory() as td:
            root=Path(td)
            im=Image.new("RGBA",(3,1))
            im.putdata([(1,2,3,0),(1,2,3,127),(1,2,3,255)])
            im.save(root/"x.png")
            with patch("tools.research_bmc01_combined_completion.ROOT",root):
                self.assertEqual(list(binary_alpha("x.png",128).getdata()),[0,0,255])

if __name__=="__main__":
    unittest.main()
