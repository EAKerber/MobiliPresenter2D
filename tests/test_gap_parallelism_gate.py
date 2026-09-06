import importlib.util
from pathlib import Path
import unittest

ROOT = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location('gap_gate', ROOT / 'tools' / 'gap_parallelism_gate.py')
gap_gate = importlib.util.module_from_spec(spec)
spec.loader.exec_module(gap_gate)


class GapParallelismGateTests(unittest.TestCase):
    def setUp(self):
        self.grid = {
            'schemaVersion': 'GapParallelismGrid 0.1',
            'sceneId': 'cozinha-01',
            'anchorPercent': [48.6, 54.6],
            'anchorPixel': [746, 559],
            'measurementRows': [540, 586],
            'reference': {
                'back': [751, 520],
                'front': [742, 586],
                'source': 'test reference stone edge',
            },
            'thresholds': {
                'slopeErrorMax': 0.02,
                'minGapPx': 2.0,
                'maxGapPx': 8.0,
            },
        }

    def measurement(self, cid, back, front):
        return {
            'schemaVersion': 'GapParallelismMeasurement 0.1',
            'sceneId': 'cozinha-01',
            'candidateId': cid,
            'role': 'range-freestanding',
            'targetVariant': 'module-02-hidden',
            'candidate': {'back': back, 'front': front},
        }

    def test_parallel_positive_gap_passes(self):
        result = gap_gate.evaluate(self.grid, self.measurement('pass', [745, 540], [739, 586]))
        self.assertEqual(result['overall'], 'PASS')
        self.assertEqual(result['gates']['parallelism'], 'PASS')
        self.assertEqual(result['gates']['positiveGap'], 'PASS')
        self.assertEqual(result['vector'], 'none')

    def test_inverted_direction_fails_and_points_rear_right(self):
        result = gap_gate.evaluate(self.grid, self.measurement('inverted', [728, 540], [739, 586]))
        self.assertEqual(result['overall'], 'FAIL')
        self.assertFalse(result['directionMatch'])
        self.assertEqual(result['vector'], 'rear-edge-right')
        self.assertIn('gap_direction_inverted', result['diagnostics'])

    def test_parallel_but_overlapping_gap_fails(self):
        result = gap_gate.evaluate(self.grid, self.measurement('overlap', [752, 540], [746, 586]))
        self.assertEqual(result['overall'], 'FAIL')
        self.assertEqual(result['gates']['parallelism'], 'PASS')
        self.assertEqual(result['gates']['positiveGap'], 'FAIL')
        self.assertEqual(result['vector'], 'increase-gap')

    def test_historical_declared_lines_do_not_verify_asset_pixels(self):
        # Historical wrong reference can still produce arithmetic PASS.
        # This must never be presented as pixel-edge verification.
        result = gap_gate.evaluate(self.grid, self.measurement('historical-declared', [744.35, 540], [738.0, 586]))
        self.assertEqual(result['overall'], 'PASS')
        self.assertLessEqual(result['slopeError'], 0.02)
        self.assertGreaterEqual(result['gapPx']['min'], 2.0)
        self.assertEqual(result['pixelEdgeVerification'], 'NOT_EVALUATED')
        self.assertFalse(result['promotionEligible'])

    def test_horizontal_reference_does_not_implicitly_clip_band(self):
        self.grid.update(schemaVersion='GapParallelismGrid 0.2',
                         horizon={'y': 552.6}, evaluationBandY=[540, 586])
        self.grid['reference'].update(authority='human-calibrated')
        result = gap_gate.evaluate(self.grid, self.measurement('declared', [748, 540], [742, 586]))
        self.assertEqual(result['evaluationRows'], [540, 586])
        self.assertEqual(result['horizonY'], 552.6)


if __name__ == '__main__':
    unittest.main()
