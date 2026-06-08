import sys
import cv2
import numpy as np
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent
sys.path.append(str(BASE_DIR / "lip_sync_standalone"))
from tracker import Tracker

def main():
    video_path = BASE_DIR / "lip_sync_standalone" / "subtle-animation-with-small-head-movements-only-th.mp4"
    model_dir = BASE_DIR / "model_cache" / "models"
    
    cap = cv2.VideoCapture(str(video_path))
    t = Tracker(624, 624, model_type=3, model_dir=str(model_dir), silent=True)
    
    frame_idx = 0
    while True:
        ret, frame = cap.read()
        if not ret:
            break
        faces = t.predict(frame)
        if faces and faces[0].alive:
            f = faces[0]
            print(f"Face found on frame {frame_idx} with confidence {f.conf}")
            print("euler:", f.euler)
            print("lms[66] (which tracker_utils.py thinks is mouth):", f.lms[66, 0:2])
            print("lms[67]:", f.lms[67, 0:2])
            # calculate mouth center from landmarks 48 to 65
            mouth_center = np.mean(f.lms[48:66, 0:2], axis=0)
            print("Mouth center (mean of 48-65):", mouth_center)
            # compare to nose (30) and chin (8)
            print("Nose (30):", f.lms[30, 0:2])
            print("Chin (8):", f.lms[8, 0:2])
            break
        frame_idx += 1
    cap.release()

if __name__ == "__main__":
    main()
