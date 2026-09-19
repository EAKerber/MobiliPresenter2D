import json
from pathlib import Path
import tempfile
import unittest
from PIL import Image, ImageChops
from tools.materialize_stone_cleanplate import ROOT,run,sha,masks
from tools.build_stone_surface_masks import build as build_surface_masks

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
        lineage=json.loads((p/'accepted-surfaces-lineage.json').read_text())

        # Front-edge masks and empty bridge plinth masks were not changed by the
        # later measured plinth expansion, so their user-approved hashes remain exact.
        for path,digest in accepted['sha256ByPath'].items():
            if '-front-edge.png' in path or '-bridge-plinth.png' in path:
                self.assertEqual(sha(ROOT/path),digest)

        # The exposed plinth masks were intentionally expanded after the user's
        # acceptance. Preserve that acceptance as historical evidence instead of
        # silently rewriting its hashes: reconstruct the old polygons, prove they
        # still produce the exact accepted bytes, then prove the current masks are
        # pixelwise supersets (no accepted coverage was removed).
        config=json.loads((ROOT/'review-assets/stone-masks/config.json').read_text())
        for group,polygon in lineage['historicalPlinthPolygons'].items():
            config['groups'][group]['surfaces']['plinth']=polygon
        with tempfile.TemporaryDirectory() as d:
            old_dir=Path(d)
            build_surface_masks(config,ROOT,old_dir)
            for asset in ('stone-02-exposed','stone-03-exposed'):
                current_path=ROOT/f'review-assets/stone-masks/generated/{asset}-plinth.png'
                historical_path=old_dir/f'{asset}-plinth.png'
                accepted_key=f'review-assets/stone-masks/generated/{asset}-plinth.png'
                self.assertEqual(sha(historical_path),accepted['sha256ByPath'][accepted_key])
                current=Image.open(current_path).convert('L')
                historical=Image.open(historical_path).convert('L')
                self.assertIsNone(
                    ImageChops.subtract(historical,current).getbbox(),
                    f'{asset}: current plinth lost historically accepted mask coverage'
                )
                self.assertIsNotNone(
                    ImageChops.subtract(current,historical).getbbox(),
                    f'{asset}: lineage says plinth expanded but masks are identical'
                )

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
