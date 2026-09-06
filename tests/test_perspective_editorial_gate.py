import importlib.util
from pathlib import Path
import unittest
ROOT=Path(__file__).resolve().parents[1]
spec=importlib.util.spec_from_file_location('peg',ROOT/'tools'/'perspective_editorial_gate.py')
peg=importlib.util.module_from_spec(spec); spec.loader.exec_module(peg)

class PerspectiveEditorialGateTests(unittest.TestCase):
    def setUp(self):
        self.grid={
          'sceneId':'cozinha-01',
          'reference':{'counterBackY':520,'counterFrontY':586,'floorContactY':898,'verticalAxisX':742,'bayLeftX':495,'bayRightX':742},
          'thresholds':{'horizontalRollDeg':0.75,'verticalAxisDeg':0.75,'depthRatioMin':0.90,'depthRatioMax':1.10,'frontAlignmentPx':4,'backAlignmentPx':6,'floorContactPx':5,'centerAlignmentPx':4,'widthFitPx':4}
        }
    def measurement(self, cid, back, front, floor=898):
        return {'candidateId':cid,'role':'range-freestanding','targetVariant':'module-02-hidden','candidate':{'cooktopBackY':back,'cooktopFrontY':front,'floorContactY':floor,'leftX':495,'rightX':742,'rollDeviationDeg':0.0,'verticalAxisDeviationDeg':0.0}}
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

    def test_vector_corrected_fit_passes(self):
        r=peg.evaluate(self.grid,self.measurement('v2',517.5,588.78,897.62))
        self.assertEqual(r['overall'],'PASS')
        self.assertEqual(r['vectors']['verticalTranslation'],'none')
        self.assertEqual(r['vectors']['depthAdjustment'],'none')
        self.assertEqual(r['vectors']['horizontalTranslation'],'none')
        self.assertEqual(r['vectors']['verticalScale'],'none')

if __name__=='__main__': unittest.main()
