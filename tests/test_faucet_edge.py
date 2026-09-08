import json,tempfile,unittest
from pathlib import Path
from PIL import Image,ImageChops
from tools.materialize_faucet_edge import ROOT,run

class FaucetEdgeTests(unittest.TestCase):
    def test_generated_interior_and_background_are_rejected(self):
        root=ROOT/'review-assets/faucet-edge-donor'
        cfg=json.loads((root/'config.json').read_text())
        expected=json.loads((root/'generated/gate.json').read_text())
        band=Image.open(ROOT/cfg['allowedBand']).convert('L')
        alpha=Image.open(ROOT/cfg['object']).getchannel('A').point(lambda p:255 if p else 0)
        allowed=ImageChops.multiply(band,alpha).crop(tuple(cfg['crop']))
        donor=Image.open(root/'donor-crop.png').convert('RGB')
        poison=Image.new('RGB',donor.size,(0,255,0));poison.paste(donor,(0,0),allowed)
        with tempfile.TemporaryDirectory() as d:
            d=Path(d);poison.save(d/'donor.png');actual=run(d/'donor.png',d/'out')
            self.assertEqual(actual['candidateSha256'],expected['candidateSha256'])
            self.assertEqual(actual['sceneSha256'],expected['sceneSha256'])
            self.assertEqual(actual['alphaChangedPixels'],0)
            self.assertEqual(actual['outsideEdgePixels'],0)
            self.assertEqual(actual['interiorChangedPixels'],0)
