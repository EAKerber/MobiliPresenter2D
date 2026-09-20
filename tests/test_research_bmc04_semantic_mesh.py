from __future__ import annotations
import json, unittest
from pathlib import Path
import importlib.util

ROOT=Path(__file__).resolve().parents[1]
SPEC=importlib.util.spec_from_file_location('mesh',ROOT/'tools/research_bmc04_semantic_mesh.py')
mesh=importlib.util.module_from_spec(SPEC); SPEC.loader.exec_module(mesh)
CFG=json.loads((ROOT/'review-assets/research/bmc04-compact-donor-mesh-v0.1.json').read_text())

class SemanticMeshTests(unittest.TestCase):
    def test_center_preserving_real_donor_envelope(self):
        r=mesh.evaluate(CFG)
        self.assertEqual([round(x,3) for x in r['compactFootprint']['offsetMm']],[113.005,45.0])
        q=r['compactFootprint']['quadPx']
        self.assertAlmostEqual(q['frontLeft'][1],572.2,places=6)
        self.assertAlmostEqual(q['backLeft'][1],553.8,places=6)
        self.assertGreater(q['backLeft'][0],q['frontLeft'][0])
        self.assertGreater(q['backRight'][0],q['frontRight'][0])

    def test_semantic_counts_and_control_column(self):
        r=mesh.evaluate(CFG)
        burners=[v for v in r['semanticAnchors'].values() if v['kind']=='burner-center']
        controls=[v for v in r['semanticAnchors'].values() if v['kind']=='control-center']
        self.assertEqual(len(burners),4)
        self.assertEqual(len(controls),4)
        xs=[v['normalizedPhysical'][0] for v in controls]
        self.assertLess(max(xs)-min(xs),1e-9)
        raster_ys=[v['normalizedRaster'][1] for v in controls]
        self.assertEqual(raster_ys,sorted(raster_ys))
        physical_ys=[v['normalizedPhysical'][1] for v in controls]
        self.assertEqual(physical_ys,sorted(physical_ys,reverse=True))
        # on the local host plane, deeper/back anchors drift right; source top is physical rear
        tx=[v['targetPx'][0] for v in controls]
        self.assertEqual(tx,sorted(tx,reverse=True))

    def test_legacy_footprint_is_only_comparison(self):
        r=mesh.evaluate(CFG)
        self.assertEqual(r['legacyFootprint']['sizeMm'],[600.0,520.0])
        self.assertEqual(r['compactFootprint']['sizeMm'],[565.0,460.0])
        self.assertFalse(r['promotionEligible'])

if __name__=='__main__': unittest.main()
