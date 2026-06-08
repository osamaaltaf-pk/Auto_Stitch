import unittest
import os
import shutil
import json
from pathlib import Path
import sys
from fastapi.testclient import TestClient

BASE_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(BASE_DIR))

from app import app, PROJECT_ROOT
from tracker_utils import LANDMARK_NAMES

class TestDatasetAPI(unittest.TestCase):
    def setUp(self):
        self.client = TestClient(app)
        self.real_video = str(BASE_DIR / "subtle-animation-with-small-head-movements-only-th.mp4")
        self.temp_char_dir = PROJECT_ROOT / "projects" / "characters" / "test_char"

    def tearDown(self):
        # Clean up temporary test character folder if created
        if self.temp_char_dir.exists():
            shutil.rmtree(self.temp_char_dir)

    def test_propagate_invalid_video(self):
        payload = {
            "video_path": "non_existent.mp4",
            "start_frame": 0,
            "corrected_landmarks": {},
            "all_annotations": {}
        }
        response = self.client.post("/api/dataset/propagate", json=payload)
        self.assertEqual(response.status_code, 404)

    def test_propagate_success(self):
        if not os.path.exists(self.real_video):
            self.skipTest("Real test video not found in workspace")

        # Mock corrected landmarks (31 points)
        corrected = {
            name: {"x": 50.0, "y": 50.0} for name in LANDMARK_NAMES
        }
        all_ann = {
            "base_mw": 15.0,
            "base_mh": 10.0,
            "base_eye_dist": 20.0,
            "frames": [
                {
                    "frame_index": 0,
                    "confidence_tier": "green",
                    "confidence": 0.9,
                    "landmarks": corrected
                }
            ]
        }
        payload = {
            "video_path": self.real_video,
            "start_frame": 0,
            "corrected_landmarks": corrected,
            "all_annotations": all_ann
        }
        response = self.client.post("/api/dataset/propagate", json=payload)
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(data["status"], "ok")
        self.assertIn("annotations", data)
        
        # Verify propagated frame has correct root-level pose attributes and nested pose
        first_prop_frame = data["annotations"].get("1")
        self.assertIsNotNone(first_prop_frame)
        self.assertEqual(first_prop_frame["confidence_tier"], "yellow")
        self.assertIn("scale", first_prop_frame)
        self.assertIn("roll", first_prop_frame)
        self.assertIn("yaw", first_prop_frame)
        self.assertIn("mouth_mask_poly", first_prop_frame)
        self.assertEqual(len(first_prop_frame["mouth_mask_poly"]), 12)
        self.assertIn("pose", first_prop_frame)
        self.assertIn("scale", first_prop_frame["pose"])

    def test_save_invalid_video(self):
        payload = {
            "character_name": "test_char",
            "session_id": "test_session",
            "video_path": "non_existent.mp4",
            "annotations": {}
        }
        response = self.client.post("/api/dataset/save", json=payload)
        self.assertEqual(response.status_code, 404)

    def test_save_success(self):
        if not os.path.exists(self.real_video):
            self.skipTest("Real test video not found in workspace")

        corrected = {
            name: [50.0, 50.0] for name in LANDMARK_NAMES
        }
        
        # We only save 2 frames for speed
        all_ann = {
            "fps": 25.0,
            "frame_count": 2,
            "base_mw": 15.0,
            "base_mh": 10.0,
            "base_eye_dist": 20.0,
            "frames": [
                {
                    "frame_index": 0,
                    "timestamp": 0.0,
                    "confidence": 0.9,
                    "landmarks": corrected
                },
                {
                    "frame_index": 1,
                    "timestamp": 0.04,
                    "confidence": 0.8,
                    "landmarks": corrected
                }
            ]
        }
        payload = {
            "character_name": "test_char",
            "session_id": "test_session",
            "video_path": self.real_video,
            "annotations": all_ann
        }
        response = self.client.post("/api/dataset/save", json=payload)
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(data["status"], "ok")
        self.assertIn("path", data)
        
        # Verify saved files exist
        session_path = Path(data["path"])
        self.assertTrue(session_path.exists())
        self.assertTrue((session_path / "annotations.json").exists())
        self.assertTrue((session_path / "frames" / "frame_00000.jpg").exists())
        self.assertTrue((session_path / "thumbnails" / "frame_00000.jpg").exists())

    def test_load_dataset_not_found(self):
        response = self.client.get("/api/dataset/load?character_name=non_existent&session_id=none")
        self.assertEqual(response.status_code, 404)

    def test_load_dataset_success(self):
        # Create a mock annotations.json
        session_dir = self.temp_char_dir / "datasets" / "test_session"
        session_dir.mkdir(parents=True, exist_ok=True)
        json_path = session_dir / "annotations.json"
        
        mock_data = {
            "fps": 25.0,
            "frame_count": 1,
            "base_mw": 10.0,
            "base_mh": 5.0,
            "base_eye_dist": 15.0,
            "video_path": "mock_video.mp4",
            "frames": []
        }
        with open(json_path, "w", encoding="utf-8") as f:
            json.dump(mock_data, f)
            
        response = self.client.get("/api/dataset/load?character_name=test_char&session_id=test_session")
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(data["status"], "ok")
        self.assertEqual(data["annotations"]["video_path"], "mock_video.mp4")

    def test_generate_lip_sync_with_video_base(self):
        if not os.path.exists(self.real_video):
            self.skipTest("Real test video not found in workspace")
        
        payload = {
            "script": "[Character 1] Testing video base support.",
            "image_path": self.real_video,
            "chars": [
                {
                    "x": 50.0,
                    "y": 50.0,
                    "width": 16.0,
                    "height": 10.0,
                    "style": "rounded",
                    "skin_color": "#ffcc99",
                    "line_color": "#000000"
                }
            ],
            "char_names": ["Character 1"]
        }
        response = self.client.post("/api/generate/lip-sync", json=payload)
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(data["status"], "ok")
        self.assertIn("video_url", data)

if __name__ == "__main__":
    unittest.main()
