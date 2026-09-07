import json
from pathlib import Path
import tempfile
import unittest
from PIL import Image
from tools.materialize_stone_cleanplate import ROOT,run,sha,masks

class StoneCleanPlateTests(unittest.TestCase):
    def test_replay_and_preserve_approved_surface_masks(self):
        p=ROOT/'review-assets/stone-cleanplate'
        expected=json.loads((p/'generated/gate.json').read_text())
        with tempfile.TemporaryDirectory() as d:
            actual=run(p/'config.json',p/'generated/donor-regions.png',Path(d))
            self.assertEqual(actual['candidateSha256'],expected['candidateSha256'])
            self.assertEqual(actual['composedSha256'],expected['composedSha256'])
            self.assertEqual(actual['outsideRemovalMaskChangedPixels'],0)
            self.assertEqual(actual['roundtripMismatchPixels'],0)
        accepted=json.loads((p/'accepted-surfaces.json').read_text())
        for path,digest in accepted['sha256ByPath'].items():self.assertEqual(sha(ROOT/path),digest)

    def test_generated_surroundings_cannot_enter_candidate(self):
        p=ROOT/'review-assets/stone-cleanplate'
        config=json.loads((p/'config.json').read_text());_,allowed=masks(config)
        donor=Image.open(p/'generated/donor-regions.png').convert('RGB')
        corrupted=Image.new('RGB',donor.size,(255,0,255));corrupted.paste(donor,(0,0),allowed)
        with tempfile.TemporaryDirectory() as d:
            d=Path(d);corrupted.save(d/'corrupted.png')
            actual=run(p/'config.json',d/'corrupted.png',d/'out')
            expected=json.loads((p/'generated/gate.json').read_text())
            self.assertEqual(actual['candidateSha256'],expected['candidateSha256'])
