import importlib.util
from pathlib import Path
import unittest
ROOT=Path(__file__).resolve().parents[1]
spec=importlib.util.spec_from_file_location('peg',ROOT/'tools'/'perspective_editorial_gate.py')
peg=importlib.util.module_from_spec(spec); spec.loader.exec_module(peg)
gap_spec=importlib.util.spec_from_file_location('gpg',ROOT/'tools'/'gap_parallelism_gate.py')
gpg=importlib.util.module_from_spec(gap_spec); gap_spec.loader.exec_module(gpg)

class PerspectiveEditorialGateTests(unittest.TestCase):
    def setUp(self):
        self.grid={
          'sceneId':'cozinha-01',
          'reference':{'counterBackY':520,'counterFrontY':586,'floorContactY':898,'verticalAxisX':742,'bayLeftX':495,'bayRightX':742,'signedDepthVector':{'dx':-9,'dy':66,'source':'test'}},
          'thresholds':{'horizontalRollDeg':0.75,'verticalAxisDeg':0.75,'depthRatioMin':0.90,'depthRatioMax':1.10,'frontAlignmentPx':4,'backAlignmentPx':6,'floorContactPx':5,'centerAlignmentPx':4,'widthFitPx':4,'signedDepthSlopeErrorMax':0.02}
        }
    def measurement(self, cid, back, front, floor=898, depth=(-12,84)):
        return {'candidateId':cid,'role':'range-freestanding','targetVariant':'module-02-hidden','candidate':{'cooktopBackY':back,'cooktopFrontY':front,'floorContactY':floor,'leftX':495,'rightX':742,'rollDeviationDeg':0.0,'verticalAxisDeviationDeg':0.0,'signedDepthVector':{'dx':depth[0],'dy':depth[1]}}}
    def test_old_fit_fails_with_signed_up_vector(self):
        r=peg.evaluate(self.grid,self.measurement('old',578,638))
        self.assertEqual(r['overall'],'FAIL')
        self.assertEqual(r['vectors']['verticalTranslation'],'up')
        self.assertEqual(r['vectors']['verticalScale'],'expand-vertical')
        self.assertIn('looks_like_inverted_editorial_correction',r['diagnostics'])
    def test_horizontal_vector_points_back_toward_reference_center(self):
        m=self.measurement('right-shift',517.5,588.78,897.62)
        m['candidate']['leftX']=505; m['candidate']['rightX']=752
        r=peg.evaluate(self.grid,m)
        self.assertEqual(r['overall'],'FAIL')
        self.assertEqual(r['vectors']['horizontalTranslation'],'left')
    def test_inverted_depth_direction_fails_and_points_rear_right(self):
        r=peg.evaluate(self.grid,self.measurement('inverted',517.5,588.78,897.62,depth=(12,84)))
        self.assertEqual(r['overall'],'FAIL')
        self.assertEqual(r['gates']['signedDepthVector']['status'],'FAIL')
        self.assertFalse(r['gates']['signedDepthVector']['directionMatch'])
        self.assertEqual(r['vectors']['yawCorrection'],'rear-edge-right')
        self.assertIn('signed_depth_direction_inverted',r['diagnostics'])
    def test_zero_depth_yaw_fails_and_points_rear_right(self):
        r=peg.evaluate(self.grid,self.measurement('zero-yaw',517.5,588.78,897.62,depth=(0,84)))
        self.assertEqual(r['overall'],'FAIL')
        self.assertEqual(r['vectors']['yawCorrection'],'rear-edge-right')
    def test_vector_and_yaw_corrected_fit_passes(self):
        r=peg.evaluate(self.grid,self.measurement('v2',517.5,588.78,897.62,depth=(-12,84)))
        self.assertEqual(r['overall'],'PASS')
        self.assertEqual(r['vectors']['verticalTranslation'],'none')
        self.assertEqual(r['vectors']['depthAdjustment'],'none')
        self.assertEqual(r['vectors']['horizontalTranslation'],'none')
        self.assertEqual(r['vectors']['verticalScale'],'none')
        self.assertEqual(r['vectors']['yawCorrection'],'none')
        self.assertIn('signed_depth_aligned',r['diagnostics'])


class HumanCalibratedLocalGapGateTests(unittest.TestCase):
    def setUp(self):
        self.grid={
          'schemaVersion':'GapParallelismGrid 0.2',
          'sceneId':'cozinha-01',
          'anchorPercent':[48.6,54.6],
          'anchorPixel':[746,559],
          'horizon':{'y':552.6,'role':'semantic evaluation cut','source':'human markup'},
          'evaluationBandY':[553.2,575.0],
          'reference':{
            'authority':'human-calibrated',
            'line':{'slopeDxDy':-0.4809818313541041,'intercept':1017.1919515694187},
            'source':'human red correction',
            'calibration':{'zoomScale':5}
          },
          'thresholds':{'slopeErrorMax':0.025,'angleErrorDegMax':1.5,'minGapPx':0.5,'maxGapPx':6.0,'maxGapVariationPx':1.75}
        }
    def measurement(self,cid,slope,intercept):
        return {'schemaVersion':'GapParallelismMeasurement 0.2','sceneId':'cozinha-01','candidateId':cid,'role':'range-freestanding','targetVariant':'module-02-hidden','candidate':{'line':{'slopeDxDy':slope,'intercept':intercept}}}
    def test_previous_agent_pass_becomes_fail_when_horizon_and_red_line_are_authority(self):
        r=gpg.evaluate(self.grid,self.measurement('old-p8-s28',-0.11293054771315682,805.55))
        self.assertEqual(r['overall'],'FAIL')
        self.assertGreater(r['angleErrorDeg'],19.0)
        self.assertEqual(r['gates']['angle'],'FAIL')
        self.assertIn('horizon_applied',r['diagnostics'])
        self.assertIn('human_calibrated_reference',r['diagnostics'])
    def test_parallel_human_calibrated_candidate_passes(self):
        r=gpg.evaluate(self.grid,self.measurement('corrected',-0.49181253529079216,1019.8004685897108))
        self.assertEqual(r['overall'],'PASS')
        self.assertEqual(r['gates']['parallelism'],'PASS')
        self.assertEqual(r['gates']['angle'],'PASS')
        self.assertEqual(r['gates']['gapVariation'],'PASS')
        self.assertEqual(r['vector'],'none')
    def test_opposite_direction_is_never_accepted(self):
        r=gpg.evaluate(self.grid,self.measurement('inverted',+0.4809818313541041,474.0))
        self.assertEqual(r['overall'],'FAIL')
        self.assertFalse(r['directionMatch'])
        self.assertIn('gap_direction_inverted',r['diagnostics'])
    def test_horizon_clips_rows_above_semantic_cut(self):
        r=gpg.evaluate(self.grid,self.measurement('corrected',-0.49181253529079216,1019.8004685897108))
        self.assertEqual(r['evaluationRows'],[554,575])
        self.assertEqual(r['horizonY'],552.6)
    def test_v02_rejects_agent_inferred_reference_authority(self):
        grid=dict(self.grid); grid['reference']=dict(self.grid['reference']); grid['reference']['authority']='agent-inferred'
        with self.assertRaisesRegex(ValueError,'human-calibrated'):
            gpg.evaluate(grid,self.measurement('x',-0.49,1019.8))

if __name__=='__main__': unittest.main()
