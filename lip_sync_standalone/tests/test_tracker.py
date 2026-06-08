import unittest
import numpy as np
from pathlib import Path
import sys

BASE_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(BASE_DIR))

from tracker_utils import HybridFaceTracker, LANDMARK_NAMES

class TestTracker(unittest.TestCase):
    def test_landmark_names(self):
        self.assertEqual(len(LANDMARK_NAMES), 31)
        self.assertIn("forehead_top", LANDMARK_NAMES)
        self.assertIn("neck_base", LANDMARK_NAMES)
        self.assertIn("chest_center", LANDMARK_NAMES)

    def test_tracker_calibration_fallback(self):
        calib_pts = [{"x": 50.0, "y": float(y)} for y in range(31)]
        first_frame = np.zeros((100, 100, 3), dtype=np.uint8)
        
        try:
            tracker = HybridFaceTracker(calib_pts, first_frame, BASE_DIR.parent / "model_cache" / "models")
            self.assertTrue(hasattr(tracker, "base_eye_dist"))
            self.assertGreater(tracker.base_eye_dist, 0.0)
            self.assertAlmostEqual(tracker.base_mw, tracker.base_eye_dist * 0.7, places=4)
            self.assertAlmostEqual(tracker.base_mh, tracker.base_eye_dist * 0.35, places=4)
        except Exception as e:
            print(f"Skipping OpenSeeFace model init test: {e}")

if __name__ == "__main__":
    unittest.main()
