import copy
import json
from pathlib import Path
import tempfile
import unittest
from PIL import Image, ImageChops
from tools.build_stone_surface_masks import build, ROOT, sha

class StoneSurfaceMasksTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.config=json.loads((ROOT/'review-assets/stone-masks/config.json').read_text())
        cls.temp=tempfile.TemporaryDirectory()
        cls.output=Path(cls.temp.name)
        cls.report=build(cls.config,ROOT,cls.output)

    @classmethod
    def tearDownClass(cls): cls.temp.cleanup()

    def test_protected_object_landmarks_not_tinted(self):
        # Independent landmarks on visible objects, not read from exclusion config.
        points={'stone-02':[(570,535),(675,533),(550,558)],'stone-03':[(1000,535),(955,564),(810,533)]}
        for record in self.report['records']:
            mask=Image.open(self.output/record['file'])
            for point in points[record['asset'][:8]]:
                self.assertEqual(mask.getpixel(point),0,(record['file'],point))
        self.assertGreater(Image.open(self.output/'stone-03-exposed-top.png').getpixel((1120,565)),0)
        self.assertGreater(Image.open(self.output/'stone-03-exposed-backsplash.png').getpixel((1120,535)),0)

    def test_reproducible_disjoint_masks_within_owner_alpha(self):
        for asset in self.config['assets']:
            alpha=Image.open(ROOT/asset['path']).convert('RGBA').getchannel('A')
            occupied=Image.new('L',alpha.size)
            for record in (r for r in self.report['records'] if r['asset']==asset['id']):
                mask=Image.open(self.output/record['file'])
                self.assertEqual(sha(self.output/record['file']),sha(ROOT/'review-assets/stone-masks/generated'/record['file']))
                self.assertIsNone(ImageChops.subtract(mask,alpha).getbbox())
                self.assertIsNone(ImageChops.multiply(mask,occupied).getbbox())
                occupied=ImageChops.lighter(occupied,mask.point(lambda v:255 if v else 0))

    def test_changed_source_requires_recalibration(self):
        changed=copy.deepcopy(self.config)
        changed['assets'][0]['sha256']='0'*64
        with tempfile.TemporaryDirectory() as directory:
            with self.assertRaisesRegex(ValueError,'source hash drift'):
                build(changed,ROOT,Path(directory))
