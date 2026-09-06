import copy
import importlib.util
import json
from pathlib import Path
import tempfile
import unittest

from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[1]
SPEC = importlib.util.spec_from_file_location('gap_pixels', ROOT/'tools/gap_pixel_gate.py')
gate = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(gate)
FIXTURE = ROOT/'review-assets/calibration/gap-pixel-v3'


class GapPixelGateTests(unittest.TestCase):
    def setUp(self):
        self.config = json.loads((FIXTURE/'config.json').read_text())
        self.source, self.candidate, self.reference = [Image.open(FIXTURE/(k+'.png')).copy()
                                                     for k in ('source','candidate','reference')]

    def test_real_p8_s28_fails_every_threshold_despite_old_declared_pass(self):
        report = gate.measure(self.source,self.candidate,self.reference,self.config)
        self.assertEqual(report['overall'],'FAIL')
        self.assertAlmostEqual(report['referenceLine']['slopeDxDy'],-.5)
        for run in report['thresholdSweep']:
            self.assertEqual(run['status'],'FAIL')
            self.assertGreater(run['angleErrorDeg'],19)
            self.assertLess(run['angleErrorDeg'],22)
            self.assertEqual(run['gapPx']['min'],0)
        self.assertFalse(report['promotionEligible'])

    def test_absent_visible_candidate_is_blocked(self):
        report = gate.measure(self.source,self.source,self.reference,self.config)
        self.assertEqual(report['overall'],'BLOCKED')

    def test_straight_parallel_synthetic_support_passes_without_visual_approval(self):
        # Independent geometry fixture: constant two-pixel gap between two stair-step edges.
        source=Image.new('RGB',(60,100),'white')
        candidate=source.copy()
        ref=Image.new('RGBA',source.size)
        for y in range(38,53):
            x=35-(y-38)//2
            ImageDraw.Draw(ref).line((x,y,59,y),fill=(120,100,80,255))
            ImageDraw.Draw(candidate).line((0,y,x-3,y),fill='black')
        report=gate.measure(source,candidate,ref,self.config)
        self.assertEqual(report['overall'],'PASS')
        self.assertEqual(report['humanReview'],'PENDING')
        self.assertFalse(report['promotionEligible'])

    def test_reference_without_alpha_is_rejected(self):
        with self.assertRaisesRegex(ValueError,'alpha'):
            gate.measure(self.source,self.candidate,self.reference.convert('RGB'),self.config)

    def test_different_source_hash_is_rejected(self):
        with tempfile.TemporaryDirectory() as directory:
            config=copy.deepcopy(self.config)
            config['expectedSha256']['source']='0'*64
            path=Path(directory)/'config.json'
            path.write_text(json.dumps(config))
            with self.assertRaisesRegex(ValueError,'source image hash mismatch'):
                gate.run(FIXTURE/'source.png',FIXTURE/'candidate.png',FIXTURE/'reference.png',path,Path(directory)/'out')

    def test_empty_threshold_sweep_cannot_pass(self):
        self.config['deltaThresholds']=[]
        with self.assertRaises(ValueError):
            gate.measure(self.source,self.candidate,self.reference,self.config)

    def test_horizon_is_independent_of_explicit_measurement_rows(self):
        self.config['horizontalReference']['y']=99
        report=gate.measure(self.source,self.candidate,self.reference,self.config)
        self.assertEqual(report['evaluationRows'],[38,52])


if __name__=='__main__':
    unittest.main()
