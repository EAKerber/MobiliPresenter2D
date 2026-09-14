import copy
import json
from pathlib import Path
import sys
import tempfile
import unittest
from PIL import Image, ImageChops
from tools.build_stone_surface_masks import build, ROOT, sha

sys.path.insert(0, str(ROOT/'tools'))
from build_approved_stone import material_mask

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

    def test_approved_materializer_bridge_visibility_follows_host(self):
        for asset_id,host,other in [
            ('stone-02-bridge','module-02','module-03'),
            ('stone-03-bridge','module-03','module-02'),
        ]:
            asset=next(item for item in self.config['assets'] if item['id']==asset_id)
            bridge_config=copy.deepcopy(self.config)
            bridge_config['assets']=[asset]
            own=material_mask(bridge_config,{host})
            hidden=material_mask(bridge_config,{other})
            full=material_mask(self.config,{host})
            self.assertIsNotNone(own.getbbox(),f'{asset_id} must contribute material pixels when its host alone is visible')
            self.assertIsNone(hidden.getbbox(),f'{asset_id} must not contribute when its host is hidden')
            self.assertIsNone(ImageChops.subtract(own,full).getbbox(),f'{asset_id} pixels must be included in the host-only material mask')

    def test_changed_source_requires_recalibration(self):
        changed=copy.deepcopy(self.config)
        changed['assets'][0]['sha256']='0'*64
        with tempfile.TemporaryDirectory() as directory:
            with self.assertRaisesRegex(ValueError,'source hash drift'):
                build(changed,ROOT,Path(directory))
