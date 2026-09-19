from __future__ import annotations
import unittest
from tools.research_project_rect_on_host_quad import project, rect_quad

class PlanarRectProjectionTests(unittest.TestCase):
    def test_rectangle_host_maps_identity(self):
        host={
          "frontLeft":[0,10],"frontRight":[10,10],
          "backRight":[10,0],"backLeft":[0,0],
        }
        self.assertEqual(project(host,[100,100],[50,50]),[5.0,5.0])
        q=rect_quad(host,[100,100],[20,20],[60,60])
        self.assertEqual(q["frontLeft"],[2.0,8.0])
        self.assertEqual(q["frontRight"],[8.0,8.0])
        self.assertEqual(q["backRight"],[8.0,2.0])
        self.assertEqual(q["backLeft"],[2.0,2.0])

if __name__=="__main__":
    unittest.main()
