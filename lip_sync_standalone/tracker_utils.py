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
    Computes 6DOF parameters geometrically from the current 31 points and calibration points.
    All points are in [X, Y] format.
    Indices map to LANDMARK_NAMES:
      0: forehead_top
      5: eye_left
      6: eye_right
      9: nose_tip
      12..23: mouth_lips (12 points)
      25: jaw_center (chin)
    """
    # 1. Scale (Zoom)
    d_eyes = np.linalg.norm(pts[6] - pts[5])
    D_eyes = np.linalg.norm(calib_pts[6] - calib_pts[5])
    scale = d_eyes / D_eyes if D_eyes > 0 else 1.0
    
    # 2. Roll (tilt)
    a_eyes = np.atan2(pts[6, 1] - pts[5, 1], pts[6, 0] - pts[5, 0])
    A_eyes = np.atan2(calib_pts[6, 1] - calib_pts[5, 1], calib_pts[6, 0] - calib_pts[5, 0])
    roll = a_eyes - A_eyes
    roll_deg = float(np.degrees(roll))
    
    # 3. Yaw (turn left/right)
    eye_center = (pts[5] + pts[6]) / 2.0
    offset_nose = pts[9, 0] - eye_center[0]
    norm_offset = offset_nose / d_eyes if d_eyes > 0 else 0.0
    
    calib_eye_center = (calib_pts[5] + calib_pts[6]) / 2.0
    calib_offset_nose = calib_pts[9, 0] - calib_eye_center[0]
    calib_norm_offset = calib_offset_nose / D_eyes if D_eyes > 0 else 0.0
    
    yaw = float(np.degrees(np.arcsin(np.clip(norm_offset - calib_norm_offset, -0.7, 0.7))))
    
    # 4. Pitch (look up/down)
    dist_fn = pts[9, 1] - pts[0, 1]
    dist_nc = pts[25, 1] - pts[9, 1]  # Index 25 is jaw_center (chin)
    ratio = dist_fn / dist_nc if dist_nc > 0 else 1.0
    
    calib_dist_fn = calib_pts[9, 1] - calib_pts[0, 1]
    calib_dist_nc = calib_pts[25, 1] - calib_pts[9, 1]  # Index 25 is jaw_center (chin)
    calib_ratio = calib_dist_fn / calib_dist_nc if calib_dist_nc > 0 else 1.0
    
    pitch = float(np.clip((ratio / calib_ratio - 1.0) * 90.0, -45.0, 45.0))
    
    # Compute mouth center as centroid of 12 lip landmarks (indices 12 to 23)
    avg_cx = float(np.mean(pts[12:24, 0]))
    avg_cy = float(np.mean(pts[12:24, 1]))
    
    return {
        "scale": float(scale),
        "roll": roll_deg,
        "yaw": yaw,
        "pitch": pitch,
        "mouth_center": (avg_cx, avg_cy)
    }

LANDMARK_NAMES = [
    "forehead_top", "temple_left", "temple_right", "eyebrow_left", "eyebrow_right",
    "eye_left", "eye_right", "ear_left", "ear_right", "nose_tip",
    "cheek_left", "cheek_right",
    "mouth_lip_0", "mouth_lip_1", "mouth_lip_2", "mouth_lip_3", "mouth_lip_4", "mouth_lip_5",
    "mouth_lip_6", "mouth_lip_7", "mouth_lip_8", "mouth_lip_9", "mouth_lip_10", "mouth_lip_11",
    "jaw_left", "jaw_center", "jaw_right",
    "neck_base", "shoulder_left", "shoulder_right", "chest_center"
]


class HybridFaceTracker:
    def __init__(self, calib_points: list, first_frame: np.ndarray, model_dir: Path):
        """
        calib_points: list of dicts/lists representing coordinate centers.
        Can be 6-points or 20-points.
        """
        ensure_models(model_dir)
        h, w = first_frame.shape[:2]
        
        # Geometrically inflate 6-points to 31-points if needed
        self.calib_pts = np.zeros((31, 2), dtype=np.float32)
        
        parsed_pts = []
        for pt in calib_points:
            if isinstance(pt, dict):
                parsed_pts.append([pt['x'] * w / 100.0, pt['y'] * h / 100.0])
            else:
                parsed_pts.append(pt)
                
        if len(parsed_pts) < 31:
            # Assume 6-point layout: forehead (0), eye_l (1), eye_r (2), nose (3), mouth (4), chin (5)
            # We inflate it using default geometric ratios
            f_head = np.array(parsed_pts[0])
            eye_l = np.array(parsed_pts[1])
            eye_r = np.array(parsed_pts[2])
            nose = np.array(parsed_pts[3])
            mouth = np.array(parsed_pts[4])
            chin = np.array(parsed_pts[5])
            
            eye_dist = np.linalg.norm(eye_r - eye_l)
            face_h = chin[1] - f_head[1]
            
            # temple_left, temple_right
            temp_l = eye_l - np.array([eye_dist * 0.45, face_h * 0.1])
            temp_r = eye_r + np.array([eye_dist * 0.45, -face_h * 0.1])
            
            # eyebrow_left, eyebrow_right
            eb_l = eye_l - np.array([0.0, eye_dist * 0.25])
            eb_r = eye_r - np.array([0.0, eye_dist * 0.25])
            
            # ear_left, ear_right
            ear_l = temp_l + np.array([-eye_dist * 0.15, face_h * 0.25])
            ear_r = temp_r + np.array([eye_dist * 0.15, face_h * 0.25])
            
            # cheek_left, cheek_right
            ck_l = eye_l + np.array([0.0, face_h * 0.3])
            ck_r = eye_r + np.array([0.0, face_h * 0.3])
            
            # Inflate 12 mouth points around mouth center
            rx = eye_dist * 0.35
            ry = eye_dist * 0.175
            mouth_lms = []
            for i in range(12):
                theta = i * (2.0 * np.pi / 12.0)
                ex = rx * np.cos(theta)
                ey = ry * np.sin(theta)
                mouth_lms.append(mouth + np.array([ex, ey]))
                
            # jaw_left, jaw_right
            j_l = chin - np.array([eye_dist * 0.75, face_h * 0.1])
            j_r = chin + np.array([eye_dist * 0.75, face_h * 0.1])
            
            # neck_base, shoulders, chest
            neck = chin + np.array([0.0, face_h * 0.25])
            sh_l = chin + np.array([-eye_dist * 1.8, face_h * 0.5])
            sh_r = chin + np.array([eye_dist * 1.8, face_h * 0.5])
            chest = chin + np.array([0.0, face_h * 0.6])
            
            inflated = [
                f_head, temp_l, temp_r, eb_l, eb_r,
                eye_l, eye_r, ear_l, ear_r, nose,
                ck_l, ck_r
            ] + mouth_lms + [
                j_l, chin, j_r, neck, sh_l, sh_r, chest
            ]
            for idx, p in enumerate(inflated):
                self.calib_pts[idx] = p
        else:
            for idx, p in enumerate(parsed_pts[:31]):
                self.calib_pts[idx] = p
                
        self.prev_pts = self.calib_pts.copy()
        self.prev_gray = cv2.cvtColor(first_frame, cv2.COLOR_BGR2GRAY)
        
        # Initialize OpenSeeFace Tracker
        from tracker import Tracker
        self.tracker = Tracker(width=w, height=h, model_type=3, model_dir=str(model_dir), silent=True)
        assert self.tracker.landmark_count == 68, "Wrong model — mouth indices invalid"
        self.osf_calib = None
        
        # Calibration Metrics Fallback path
        self.base_eye_dist = float(np.linalg.norm(self.calib_pts[6] - self.calib_pts[5]))
        self.base_mw       = float(self.base_eye_dist * 0.7)
        self.base_mh       = float(self.base_eye_dist * 0.35)
        
        # Stable eye distance history for rolling average fallback when yaw > 60°
        self.stable_eye_distances = []

    def track_frame(self, frame: np.ndarray) -> dict:
        """
        Tracks the face (16 pts) using OpenSeeFace and body points (4 pts) using Optical Flow.
        Falls back entirely to Optical Flow if OpenSeeFace fails.
        """
        h, w = frame.shape[:2]
        curr_gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
        
        # 1. Attempt OpenSeeFace detection
        faces = self.tracker.predict(frame)
        
        confidence_tier = "yellow"
        is_osf_active = False
        mouth_mask_poly = []
        
        if len(faces) > 0 and faces[0].alive and faces[0].conf >= 0.65:
            f = faces[0]
            lms = f.lms # Shape (68, 3) where points are [y, x, conf]
            is_osf_active = True
            
            # Convert to [x, y] format for geometry calculations
            lms_xy = lms[:, 0:2][:, ::-1]
            
            # Use outer lip landmarks 48 to 59 as mask polygon
            mouth_mask_poly = lms_xy[48:60].tolist()
            
            if self.osf_calib is None:
                self.osf_calib = {
                    "pitch": float(f.euler[0]),
                    "yaw": float(f.euler[1]),
                    "roll": float(f.euler[2])
                }
                # Primary path: OpenSeeFace tracking available on calibration frame
                self.base_mw       = float(np.linalg.norm(lms_xy[54] - lms_xy[48]))
                self.base_mh       = float(np.linalg.norm(lms_xy[57] - lms_xy[51]))
                self.base_eye_dist = float(np.linalg.norm(lms_xy[45] - lms_xy[36]))
            
            pitch = float(f.euler[0]) - self.osf_calib["pitch"]
            yaw = float(f.euler[1]) - self.osf_calib["yaw"]
            roll = float(f.euler[2]) - self.osf_calib["roll"]
            
            E_left  = np.mean(lms_xy[42:48], axis=0)
            E_right = np.mean(lms_xy[36:42], axis=0)
            d_eyes  = np.linalg.norm(E_right - E_left)
            
            abs_yaw = abs(yaw)
            d_eyes_compensated = d_eyes
            if abs_yaw > 40.0:
                yaw_rad = np.radians(abs_yaw)
                d_eyes_compensated = d_eyes / np.cos(yaw_rad)
                
            if abs_yaw > 60.0:
                if self.stable_eye_distances:
                    d_eyes_compensated = np.mean(self.stable_eye_distances)
                else:
                    d_eyes_compensated = self.base_eye_dist
            else:
                if abs_yaw <= 40.0:
                    self.stable_eye_distances.append(d_eyes_compensated)
                    if len(self.stable_eye_distances) > 30:
                        self.stable_eye_distances.pop(0)
                        
            scale = d_eyes_compensated / self.base_eye_dist if self.base_eye_dist > 0 else 1.0
            
            eyebrows_mid = np.mean(lms_xy[17:27], axis=0)
            H_face  = lms_xy[8, 1] - eyebrows_mid[1]
            
            forehead_top = np.array([eyebrows_mid[0], eyebrows_mid[1] - H_face * 0.5])
            temple_left  = E_left  - np.array([d_eyes * 0.45,  H_face * 0.1])
            temple_right = E_right + np.array([d_eyes * 0.45, -H_face * 0.1])
            ear_left     = temple_left  + np.array([-d_eyes * 0.15, H_face * 0.25])
            ear_right    = temple_right + np.array([ d_eyes * 0.15, H_face * 0.25])
            
            eb_l = lms_xy[19]
            eb_r = lms_xy[24]
            nose = lms_xy[30]
            ck_l = lms_xy[4]
            ck_r = lms_xy[12]
            mouth_lms = list(lms_xy[48:60])
            mouth = np.mean(lms_xy[48:60], axis=0)
            j_l = lms_xy[3]
            chin = lms_xy[8]
            j_r = lms_xy[13]
            
            face_pts = [
                forehead_top, temple_left, temple_right, eb_l, eb_r,
                E_left, E_right, ear_left, ear_right, nose,
                ck_l, ck_r
            ] + mouth_lms + [
                j_l, chin, j_r
            ]
            
            # Estimate affine transform from previous face points to current face points
            src_face = self.prev_pts[0:27].astype(np.float32)
            dst_face = np.array(face_pts, dtype=np.float32)
            M, _ = cv2.estimateAffinePartial2D(src_face, dst_face)
            
            current_pts = np.zeros((31, 2), dtype=np.float32)
            for idx, p in enumerate(face_pts):
                current_pts[idx] = p
                
            if M is not None:
                for idx in range(4):
                    pt = np.array([self.prev_pts[27 + idx, 0], self.prev_pts[27 + idx, 1], 1.0], dtype=np.float32)
                    current_pts[27 + idx] = np.dot(M, pt)
            else:
                body_prev = self.prev_pts[27:31]
                body_next = track_points_lk(self.prev_gray, curr_gray, body_prev)
                for idx, p in enumerate(body_next):
                    current_pts[27 + idx] = p
                
            confidence_tier = "green"
        else:
            current_pts = track_points_lk(self.prev_gray, curr_gray, self.prev_pts)
            # Prevent body points drift by updating them geometrically using face points transform
            src_face = self.prev_pts[0:27].astype(np.float32)
            dst_face = current_pts[0:27].astype(np.float32)
            M, _ = cv2.estimateAffinePartial2D(src_face, dst_face)
            if M is not None:
                for idx in range(4):
                    pt = np.array([self.prev_pts[27 + idx, 0], self.prev_pts[27 + idx, 1], 1.0], dtype=np.float32)
                    current_pts[27 + idx] = np.dot(M, pt)
            
            pose = solve_pose_geometrically(current_pts, self.calib_pts)
            
            scale = pose["scale"]
            roll = pose["roll"]
            yaw = pose["yaw"]
            pitch = pose["pitch"]
            mouth = pose["mouth_center"]
            
            confidence_tier = "yellow"
            mouth_mask_poly = current_pts[12:24].tolist()
            
        if self.prev_pts is not None:
            prev_norm = self.prev_pts / np.array([w, h], dtype=np.float32)
            curr_norm = current_pts / np.array([w, h], dtype=np.float32)
            distances = np.linalg.norm(curr_norm - prev_norm, axis=1)
            if np.any(distances > 0.012):
                confidence_tier = "red"
                
        self.prev_pts = current_pts.copy()
        self.prev_gray = curr_gray.copy()
        
        landmarks_dict = {}
        for idx, name in enumerate(LANDMARK_NAMES):
            pt_status = "auto"
            if idx >= 27 and abs(yaw) > 45.0:
                pt_status = "yellow"
                
            landmarks_dict[name] = {
                "x": float(current_pts[idx, 0]),
                "y": float(current_pts[idx, 1]),
                "visible": True,
                "status": pt_status
            }
            
        return {
            "scale": float(scale),
            "roll": float(roll),
            "yaw": float(yaw),
            "pitch": float(pitch),
            "mouth_center": (float(mouth[0]), float(mouth[1])),
            "confidence_tier": confidence_tier,
            "landmarks": landmarks_dict,
            "base_mw": float(self.base_mw),
            "base_mh": float(self.base_mh),
            "base_eye_dist": float(self.base_eye_dist),
            "mouth_mask_poly": mouth_mask_poly
        }
