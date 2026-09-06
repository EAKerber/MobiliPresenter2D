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
        result = gap_gate.evaluate(self.grid, self.measurement('pass', [748, 540], [742, 586]))
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

    def test_experimental_p8_s28_geometry_passes(self):
        # Fitted line from deterministic local experiment: slope≈-0.1380,
        # with a 2.36..4.27 px positive gap to the authoritative stone edge.
        result = gap_gate.evaluate(self.grid, self.measurement('p8-s28', [747.35, 540], [741.0, 586]))
        self.assertEqual(result['overall'], 'PASS')
        self.assertLessEqual(result['slopeError'], 0.02)
        self.assertGreaterEqual(result['gapPx']['min'], 2.0)


if __name__ == '__main__':
    unittest.main()
