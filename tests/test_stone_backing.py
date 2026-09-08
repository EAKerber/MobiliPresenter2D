import json
from pathlib import Path
import subprocess
import tempfile
import unittest
from PIL import Image, ImageChops
from tools.build_stone_backing import ROOT, build


class StoneBackingTests(unittest.TestCase):
    def test_replay_and_reject_generated_surroundings(self):
        root = ROOT / 'review-assets/stone-backing'
        config = json.loads((root / 'config.json').read_text())
        expected = json.loads((root / 'generated/gate.json').read_text())
        with tempfile.TemporaryDirectory() as directory:
            directory = Path(directory)
            manifest_path = directory / 'manifest.json'
            subprocess.run(['node', str(ROOT / 'tools/variant_fidelity_manifest.js'),
                            '--cases', str(ROOT / 'reference/variant-cases.json'),
                            '--output', str(manifest_path)], cwd=ROOT, check=True, capture_output=True)
            donor = Image.open(root / 'generated/donor-regions.png').convert('RGB')
            allowed = Image.new('L', donor.size)
            for key in config['priority']:
                allowed = ImageChops.lighter(allowed, Image.open(root / f'generated/{key}-mask.png'))
            corrupt = Image.new('RGB', donor.size, (255, 0, 255))
            corrupt.paste(donor, (0, 0), allowed)
            corrupt.save(directory / 'donor.png')
            actual = build(config, json.loads(manifest_path.read_text()), directory / 'donor.png', directory / 'out')
            self.assertEqual(actual['backingSha256'], expected['backingSha256'])
            self.assertEqual(actual['allPresentMismatchPixels'], 0)
            self.assertEqual(actual['outsideBackingMaskPixels'], 0)
            self.assertEqual(actual['frontEdgeAndPlinthChangedPixels'], 0)
            self.assertEqual(actual['states'], expected['states'])
            self.assertEqual(len(actual['states']), 8)
            self.assertEqual(actual['semanticReview'], 'PENDING')
