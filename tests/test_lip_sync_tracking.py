import os
import sys
import time
from pathlib import Path
import numpy as np
import cv2

# Add lip_sync_standalone to sys.path so we can import tracker_utils
BASE_DIR = Path(__file__).resolve().parent.parent
sys.path.append(str(BASE_DIR / "lip_sync_standalone"))

from tracker_utils import HybridFaceTracker, ensure_models

def main():
    print("=== Lip-Sync Tracking Test ===")
    
    # 1. Setup paths
    model_dir = BASE_DIR / "model_cache" / "models"
    video_path = BASE_DIR / "lip_sync_standalone" / "subtle-animation-with-small-head-movements-only-th.mp4"
    
    print(f"Project root: {BASE_DIR}")
    print(f"Model cache dir: {model_dir}")
    print(f"Test video path: {video_path}")
    
    if not video_path.exists():
        print(f"Error: Test video not found at {video_path}")
        return
        
    # 2. Download/ensure models
    print("\nEnsuring OpenSeeFace models are cached...")
    start_t = time.time()
    ensure_models(model_dir)
    print(f"ensure_models completed in {time.time() - start_t:.2f} seconds.")
    
    # Check that model files exist
    from tracker_utils import REQUIRED_MODELS
    for m in REQUIRED_MODELS:
        p = model_dir / m
        print(f"Model {m}: {'FOUND' if p.exists() else 'MISSING'} ({p.stat().st_size if p.exists() else 0} bytes)")
        
    # 3. Load video frames
    print("\nLoading test video frames...")
    cap = cv2.VideoCapture(str(video_path))
    if not cap.isOpened():
        print("Error: Could not open test video.")
        return
        
    frames = []
    while True:
        ret, frame = cap.read()
        if not ret:
            break
        frames.append(frame)
    cap.release()
    print(f"Loaded {len(frames)} frames from video.")
    if not frames:
        print("Error: No frames loaded.")
        return
        
    # 4. Initialize tracker
    # We will pass a standard layout for 6 calibration points (as percentages)
    # Ordering: forehead, eye_left, eye_right, nose, mouth, chin
    calib_points = [
        {"x": 50.0, "y": 25.0},  # forehead
        {"x": 45.0, "y": 40.0},  # eye_left
        {"x": 55.0, "y": 40.0},  # eye_right
        {"x": 50.0, "y": 50.0},  # nose
        {"x": 50.0, "y": 68.0},  # mouth
        {"x": 50.0, "y": 80.0}   # chin
    ]
    
    print("\nInitializing HybridFaceTracker...")
    try:
        tracker = HybridFaceTracker(calib_points, frames[0], model_dir)
        print("HybridFaceTracker initialized successfully.")
    except Exception as e:
        print(f"Error initializing tracker: {e}")
        import traceback
        traceback.print_exc()
        return
        
    # 5. Track first 20 frames and output results
    print("\nTracking first 20 frames...")
    print(f"{'Frame':<6} | {'Yaw':<8} | {'Pitch':<8} | {'Roll':<8} | {'Scale':<8} | {'Mouth Center':<15}")
    print("-" * 65)
    
    for i in range(min(20, len(frames))):
        start_frame_t = time.time()
        pose = tracker.track_frame(frames[i])
        duration = (time.time() - start_frame_t) * 1000.0
        
        yaw = pose.get("yaw", 0.0)
        pitch = pose.get("pitch", 0.0)
        roll = pose.get("roll", 0.0)
        scale = pose.get("scale", 1.0)
        mouth_center = pose.get("mouth_center", (0.0, 0.0))
        
        print(f"{i:<6} | {yaw:<8.2f} | {pitch:<8.2f} | {roll:<8.2f} | {scale:<8.2f} | ({mouth_center[0]:.1f}, {mouth_center[1]:.1f}) ({duration:.1f}ms)")
        
    print("\nTracking verification complete!")

if __name__ == "__main__":
    main()
