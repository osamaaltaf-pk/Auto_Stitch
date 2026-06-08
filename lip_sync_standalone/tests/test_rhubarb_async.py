import unittest
from pathlib import Path
import sys
from fastapi.testclient import TestClient

BASE_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(BASE_DIR))

from app import app, RHUBARB_JOBS

class TestRhubarbAsync(unittest.TestCase):
    def setUp(self):
        self.client = TestClient(app)

    def test_rhubarb_non_existent_audio(self):
        response = self.client.post("/api/rhubarb/run", json={"audio_path": "non_existent.wav"})
        self.assertEqual(response.status_code, 404)

    def test_status_endpoint_not_found(self):
        response = self.client.get("/api/rhubarb/status/invalid_job_id")
        self.assertEqual(response.status_code, 404)

    def test_status_endpoint_running(self):
        job_id = "test-job-123"
        RHUBARB_JOBS[job_id] = {"process": None, "status": "running", "output": Path("cues.json")}
        
        response = self.client.get(f"/api/rhubarb/status/{job_id}")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["status"], "running")
        
        del RHUBARB_JOBS[job_id]

if __name__ == "__main__":
    unittest.main()
