import os
import shutil
import zipfile
import logging
import math
from pathlib import Path
import httpx
import numpy as np
import cv2

# Configure logging
logger = logging.getLogger("tracker-utils")

REQUIRED_MODELS = [
    "lm_model3_opt.onnx",
    "retinaface_640x640_opt.onnx",
    "priorbox_640x640.json",
    "mnv3_gaze32_split_opt.onnx",
    "mnv3_detection_opt.onnx"
]

def ensure_models(model_dir: Path):
    """Checks if the 5 required model files are cached. If not, downloads and extracts them."""
    model_dir.mkdir(parents=True, exist_ok=True)
    missing = [m for m in REQUIRED_MODELS if not (model_dir / m).exists()]
    if not missing:
        logger.info("All OpenSeeFace models are already cached.")
        return

    logger.info(f"OpenSeeFace models are missing: {missing}. Downloading from releases...")
    zip_url = "https://github.com/emilianavt/OpenSeeFace/releases/download/v1.20.4/OpenSeeFace-v1.20.4.zip"
    temp_zip = model_dir / "temp_openseeface.zip"
    
    try:
        # Download zip file via stream
        with open(temp_zip, "wb") as f:
            with httpx.stream("GET", zip_url, follow_redirects=True, timeout=120.0) as r:
                r.raise_for_status()
                for chunk in r.iter_bytes(chunk_size=16384):
                    f.write(chunk)
        logger.info("Download complete. Extracting model files...")
        
        # Extract models folder files
        with zipfile.ZipFile(temp_zip, "r") as z:
            for member in z.infolist():
                if "models/" in member.filename and not member.is_dir():
                    filename = os.path.basename(member.filename)
                    if filename in REQUIRED_MODELS:
                        with z.open(member) as source, open(model_dir / filename, "wb") as target:
                            shutil.copyfileobj(source, target)
                        logger.info(f"Extracted: {filename}")
        logger.info("All model files cached successfully.")
    except Exception as e:
        logger.error(f"Error downloading models: {e}")
        # Cleanup partial extractions
        for m in REQUIRED_MODELS:
            p = model_dir / m
            if p.exists():
                try:
                    p.unlink()
                except:
                    pass
        raise e
    finally:
        if temp_zip.exists():
            try:
                temp_zip.unlink()
            except:
                pass

def track_points_lk(prev_gray: np.ndarray, curr_gray: np.ndarray, prev_pts: np.ndarray) -> np.ndarray:
    """
    Tracks 6 points from prev_gray to curr_gray using Lucas-Kanade optical flow.
    prev_pts is a float32 numpy array of shape (6, 2) representing [X, Y].
    """
    lk_params = dict(
        winSize=(31, 31),
        maxLevel=3,
        criteria=(cv2.TERM_CRITERIA_EPS | cv2.TERM_CRITERIA_COUNT, 30, 0.01)
    )
    p0 = prev_pts.astype(np.float32).reshape(-1, 1, 2)
    p1, status, _ = cv2.calcOpticalFlowPyrLK(prev_gray, curr_gray, p0, None, **lk_params)
    
    status = status.reshape(-1)
    next_pts = p1.reshape(-1, 2)
    
    # Check if any points failed to track (status == 0)
    success_idx = np.where(status == 1)[0]
    if len(success_idx) < len(prev_pts):
        if len(success_idx) >= 3:
            # Estimate partial affine transform (translation + rotation + scale) from successful points
            src = prev_pts[success_idx]
            dst = next_pts[success_idx]
            M, _ = cv2.estimateAffinePartial2D(src, dst)
            if M is not None:
                for i in range(len(prev_pts)):
                    if status[i] == 0:
                        pt = np.array([prev_pts[i][0], prev_pts[i][1], 1.0])
                        next_pts[i] = M.dot(pt)
            else:
                for i in range(len(prev_pts)):
                    if status[i] == 0:
                        next_pts[i] = prev_pts[i]
        else:
            # Fallback to keeping previous position
            for i in range(len(prev_pts)):
                if status[i] == 0:
                    next_pts[i] = prev_pts[i]
                    
    return next_pts

def solve_pose_geometrically(pts: np.ndarray, calib_pts: np.ndarray) -> dict:
    """
    Computes 6DOF parameters geometrically from the current 6 points and calibration points.
    All points are in [X, Y] format.
    Indices:
      0: forehead_top
      1: eye_left
      2: eye_right
      3: nose_tip
      4: mouth_center
      5: chin
    """
    # 1. Scale (Zoom)
    d_eyes = np.linalg.norm(pts[2] - pts[1])
    D_eyes = np.linalg.norm(calib_pts[2] - calib_pts[1])
    scale = d_eyes / D_eyes if D_eyes > 0 else 1.0
    
    # 2. Roll (tilt)
    a_eyes = np.atan2(pts[2, 1] - pts[1, 1], pts[2, 0] - pts[1, 0])
    A_eyes = np.atan2(calib_pts[2, 1] - calib_pts[1, 1], calib_pts[2, 0] - calib_pts[1, 0])
    roll = a_eyes - A_eyes
    roll_deg = float(np.degrees(roll))
    
    # 3. Yaw (turn left/right)
    # Nose center offset from eye midpoint
    eye_center = (pts[1] + pts[2]) / 2.0
    offset_nose = pts[3, 0] - eye_center[0]
    norm_offset = offset_nose / d_eyes if d_eyes > 0 else 0.0
    
    calib_eye_center = (calib_pts[1] + calib_pts[2]) / 2.0
    calib_offset_nose = calib_pts[3, 0] - calib_eye_center[0]
    calib_norm_offset = calib_offset_nose / D_eyes if D_eyes > 0 else 0.0
    
    yaw = float(np.degrees(np.arcsin(np.clip(norm_offset - calib_norm_offset, -0.7, 0.7))))
    
    # 4. Pitch (look up/down)
    # Forehead to nose Y vs nose to chin Y
    dist_fn = pts[3, 1] - pts[0, 1]
    dist_nc = pts[5, 1] - pts[3, 1]
    ratio = dist_fn / dist_nc if dist_nc > 0 else 1.0
    
    calib_dist_fn = calib_pts[3, 1] - calib_pts[0, 1]
    calib_dist_nc = calib_pts[5, 1] - calib_pts[3, 1]
    calib_ratio = calib_dist_fn / calib_dist_nc if calib_dist_nc > 0 else 1.0
    
    pitch = float(np.clip((ratio / calib_ratio - 1.0) * 90.0, -45.0, 45.0))
    
    return {
        "scale": float(scale),
        "roll": roll_deg,
        "yaw": yaw,
        "pitch": pitch,
        "mouth_center": (float(pts[4, 0]), float(pts[4, 1]))
    }

class HybridFaceTracker:
    def __init__(self, calib_points: list, first_frame: np.ndarray, model_dir: Path):
        """
        calib_points: list of dicts with keys 'x', 'y' (percentages) or directly [x, y] coordinates.
        Ordering: forehead, eye_left, eye_right, nose, mouth, chin.
        """
        # Load OpenSeeFace models
        ensure_models(model_dir)
        
        h, w = first_frame.shape[:2]
        self.calib_pts = np.zeros((6, 2), dtype=np.float32)
        for i, pt in enumerate(calib_points):
            if isinstance(pt, dict):
                self.calib_pts[i] = [pt['x'] * w / 100.0, pt['y'] * h / 100.0]
            else:
                self.calib_pts[i] = pt
                
        self.prev_pts = self.calib_pts.copy()
        self.prev_gray = cv2.cvtColor(first_frame, cv2.COLOR_BGR2GRAY)
        
        # Initialize OpenSeeFace Tracker
        from tracker import Tracker
        self.tracker = Tracker(width=w, height=h, model_type=3, model_dir=str(model_dir), silent=True)
        self.osf_calib = None
        
    def track_frame(self, frame: np.ndarray) -> dict:
        """
        Tracks the face and returns the 6DOF pose dictionary.
        """
        h, w = frame.shape[:2]
        curr_gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
        
        # 1. Attempt OpenSeeFace detection
        faces = self.tracker.predict(frame)
        
        if len(faces) > 0 and faces[0].alive and faces[0].conf >= 0.65:
            f = faces[0]
            # OpenSeeFace lms coordinate format is [Y, X, conf]
            # Convert selected landmarks to [X, Y]
            # Landmark index mapping:
            # Left Eye: average of 42-47
            # Right Eye: average of 36-41
            # Nose Tip: 30
            # Chin: 8
            # Mouth Center: average of outer and inner mouth landmarks (48-65)
            lms = f.lms
            
            eye_l = np.mean(lms[42:48, 0:2], axis=0)[::-1]  # [X, Y]
            eye_r = np.mean(lms[36:42, 0:2], axis=0)[::-1]
            nose = lms[30, 0:2][::-1]
            chin = lms[8, 0:2][::-1]
            mouth = np.mean(lms[48:66, 0:2], axis=0)[::-1]
            
            # Estimate Forehead: go up from eyebrow midpoint relative to eyebrow-to-chin distance
            eyebrows_mid = np.mean(lms[17:27, 0:2], axis=0)[::-1]
            face_height = chin[1] - eyebrows_mid[1]
            forehead = eyebrows_mid.copy()
            forehead[1] -= face_height * 0.45
            
            current_pts = np.vstack([forehead, eye_l, eye_r, nose, mouth, chin]).astype(np.float32)
            
            # Sync our tracking points to avoid drift
            self.prev_pts = current_pts.copy()
            self.prev_gray = curr_gray.copy()
            
            # Solve using OpenSeeFace parameters (convert coordinates to match our orientation)
            # OpenSeeFace euler[0] is pitch, euler[1] is yaw, euler[2] is roll
            # Calibrate absolute OpenSeeFace euler angles relative to the first successful frame
            if self.osf_calib is None:
                self.osf_calib = {
                    "pitch": float(f.euler[0]),
                    "yaw": float(f.euler[1]),
                    "roll": float(f.euler[2])
                }
            
            pitch = float(f.euler[0]) - self.osf_calib["pitch"]
            yaw = float(f.euler[1]) - self.osf_calib["yaw"]
            roll = float(f.euler[2]) - self.osf_calib["roll"]
            
            # Scale relative to eye distance
            d_eyes = np.linalg.norm(eye_r - eye_l)
            D_eyes = np.linalg.norm(self.calib_pts[2] - self.calib_pts[1])
            scale = d_eyes / D_eyes if D_eyes > 0 else 1.0
            
            return {
                "scale": float(scale),
                "roll": roll,
                "yaw": yaw,
                "pitch": pitch,
                "mouth_center": (float(mouth[0]), float(mouth[1]))
            }
            
        else:
            # 2. Fall back to Optical Flow
            next_pts = track_points_lk(self.prev_gray, curr_gray, self.prev_pts)
            pose = solve_pose_geometrically(next_pts, self.calib_pts)
            
            self.prev_pts = next_pts.copy()
            self.prev_gray = curr_gray.copy()
            return pose
