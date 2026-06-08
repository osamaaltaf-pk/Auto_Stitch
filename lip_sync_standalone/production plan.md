You have two versions — Doc 6 is the refined one that closes all gaps, Doc 7 is the older one with known bugs still in it. I'll merge them, taking all fixes from Doc 6 and discarding all superseded content from Doc 7.

---

# Production Plan: 20-Point Lip-Sync Annotation Tool & OpenSeeFace Integration (Final)

This plan implements a production-ready workflow for animated lip-sync and character landmark annotation. It expands the system to a 20-point face/body tracking structure, implements async audio processing, auto-propagation with human correction, convex-hull mouth masking, saves high-fidelity training datasets, and builds a dedicated annotation workspace UI.

## User Review Required

> [!IMPORTANT]
> - The database schema/model is extended to support 20 coordinates with full `CharacterConfig` styling properties.
> - A directory structure will be established at `d:\Osama_mvp\projects\characters\` to store dataset crops and JSON metadata.
> - Ear and temple nodes are estimated geometrically from tracked facial features — they are `BODY_HEURISTIC` points, not directly tracked by OpenSeeFace.
> - The tracker uses Lucas-Kanade optical flow to propagate body landmarks (neck, shoulders, chest) temporally, as OpenSeeFace only tracks facial coordinates.
> - Mouth masking uses the convex hull of outer lip landmarks (48–59) expanded by `outline_width + 2px` — not a wide jaw-to-chin polygon.
> - Rhubarb CLI calls are fully async via `asyncio.create_subprocess_exec` with a polling status endpoint.
> - Drift threshold is resolution-independent: `> 0.012` normalized units, not an absolute pixel value.

---

## Proposed Changes

### 1. Data Models & Backend APIs
#### [MODIFY] `app.py`

* Update `CharacterConfig` Pydantic model:

```python
class CharacterConfig(BaseModel):
    x: float
    y: float
    width: float
    height: float
    style: str
    skin_color: str = "#FFCC99"
    line_color: str = "#000000"
    outline_width: float = 2.0
    rotation: float = 0.0
    perspective: float = 1.0
    face_angle: float = 0.0
    landmarks_calib: Optional[List[Dict[str, float]]] = None
```

* Implement `/api/dataset/save` endpoint:
  * Accept project details, video path, and frame annotations.
  * Crop the upper body region of each frame to $2:3$ aspect ratio with 10% padding.
  * Save dataset crops as high-quality JPEGs (`quality=95`) or PNG to preserve fine lip detail. Save UI preview thumbnails separately at `quality=70`.
  * Save normalized $(x, y)$ coordinates, `fps`, `frame_count`, and calibration metrics to `projects/characters/[name]/datasets/[session]/annotations.json` using the standardized schema:

```json
{
  "fps": 24.0,
  "frame_count": 240,
  "base_mw": 42.3,
  "base_mh": 18.1,
  "base_eye_dist": 67.5,
  "frames": [
    {
      "frame_index": 0,
      "timestamp": 0.0,
      "confidence": 0.81,
      "landmarks": {
        "mouth_center": [0.51, 0.63],
        "jaw_center": [0.50, 0.78],
        "eye_left": [0.38, 0.42],
        "eye_right": [0.62, 0.42]
      }
    }
  ]
}
```

---

### 2. Hybrid Tracking Engine & Geometry Formulas
#### [MODIFY] `tracker_utils.py`

* Update `HybridFaceTracker` to handle 20 keypoints.

* **16 Facial Landmarks Mapping** — explicit subset from OpenSeeFace 68-point output. Assert on startup: `assert tracker.landmark_count == 68, "Wrong model — mouth indices invalid"`:

```python
FACIAL_SUBSET = {
    0:  "forehead_top",   # BODY_HEURISTIC — see formula below
    1:  "temple_left",    # BODY_HEURISTIC — see formula below
    2:  "temple_right",   # BODY_HEURISTIC — see formula below
    3:  "eyebrow_left",   # landmark 19
    4:  "eyebrow_right",  # landmark 24
    5:  "eye_left",       # mean of landmarks 42-47
    6:  "eye_right",      # mean of landmarks 36-41
    7:  "ear_left",       # BODY_HEURISTIC — see formula below
    8:  "ear_right",      # BODY_HEURISTIC — see formula below
    9:  "nose_tip",       # landmark 30
    10: "cheek_left",     # landmark 4
    11: "cheek_right",    # landmark 12
    12: "mouth_center",   # mean of landmarks 48-67 (centroid of all lip points)
    13: "jaw_left",       # landmark 3
    14: "jaw_center",     # landmark 8 (chin)
    15: "jaw_right"       # landmark 13
}
# Points 16-19: neck, shoulder_left, shoulder_right, chest — BODY_HEURISTIC via LK
```

* **Estimated Geometry Formulas** for `BODY_HEURISTIC` facial points:

```python
E_left  = mean(lms[42:48])
E_right = mean(lms[36:42])
D_eyes  = norm(E_right - E_left)
eyebrows_mid = mean(lms[17:27])
H_face  = lms[8, 1] - eyebrows_mid[1]

forehead_top_x = eyebrows_mid[0]
forehead_top_y = eyebrows_mid[1] - H_face * 0.5

temple_left  = E_left  - [D_eyes * 0.45,  H_face * 0.1]
temple_right = E_right + [D_eyes * 0.45, -H_face * 0.1]
ear_left     = temple_left  + [-D_eyes * 0.15, H_face * 0.25]
ear_right    = temple_right + [ D_eyes * 0.15, H_face * 0.25]
```

* **Calibration Metrics** — computed from raw 68-point output before subsetting:

```python
# Primary path: OpenSeeFace tracking available on calibration frame
base_mw       = norm(lms[54] - lms[48])   # mouth corners
base_mh       = norm(lms[57] - lms[51])   # outer lip centers
base_eye_dist = norm(lms[45] - lms[36])   # outer eye corners

# Fallback path: OpenSeeFace failed on frame 1
base_eye_dist = norm(calib_pts[6] - calib_pts[5])
base_mw       = base_eye_dist * 0.7
base_mh       = base_eye_dist * 0.35
```

* **Profile Shot & Eye Scale Flags**:
  * `|yaw| > 45°`: flag body coordinates as Yellow (far shoulder occluded).
  * `|yaw| > 40°`: compensate eye distance by dividing by `cos(yaw)`.
  * `|yaw| > 60°`: fall back to rolling average of recent stable eye distances to prevent scale collapse.

* **Incremental Propagation Stop Condition**:
  * When propagating corrections from Frame $X$ forward, stop and anchor at any frame $Y > X$ where OpenSeeFace confidence $\ge 0.65$, treating it as a new keyframe. Do not overwrite high-confidence tracked frames with optically-flowed data.

* **`track_frame(frame)` return contract**:
  * Predict 68 facial landmarks via OpenSeeFace, subset to 16 facial points using `FACIAL_SUBSET`.
  * Compute 4 BODY_HEURISTIC facial estimates (forehead, temples, ears).
  * Track 4 body points (neck, shoulders, chest) via Lucas-Kanade optical flow.
  * If face tracking lost: fall back to LK optical flow for all 20 landmarks.
  * Return: `coordinates (20×2)`, `head_angles (pitch, yaw, roll)`, `scale`, `confidence (per-point)`.

---

### 3. Async Audio Processing & Compositor Bridge
#### [MODIFY] `app.py`

* **Pre-flight Audio Conversion** — convert to 16kHz mono PCM WAV before Rhubarb. Validate output:

```python
result = subprocess.run(
    ["ffmpeg", "-y", "-i", input_audio, "-ac", "1", "-ar", "16000",
     "-c:a", "pcm_s16le", output_wav],
    capture_output=True
)
if result.returncode != 0:
    raise RuntimeError(f"FFmpeg failed: {result.stderr.decode()}")
if not os.path.exists(output_wav) or os.path.getsize(output_wav) == 0:
    raise RuntimeError("FFmpeg produced empty output")
```

* **Async Rhubarb Invocation**:
  * `POST /api/rhubarb/run` — kicks off job, returns `job_id` immediately:

```python
RHUBARB_JOBS = {}

async def run_rhubarb(job_id, audio_path, output_json):
    process = await asyncio.create_subprocess_exec(
        RHUBARB_PATH, "-f", "json", audio_path, "-o", output_json,
        stdout=asyncio.subprocess.PIPE, stderr=asyncio.subprocess.PIPE
    )
    RHUBARB_JOBS[job_id] = {"process": process, "status": "running", "output": output_json}
    await process.wait()
    RHUBARB_JOBS[job_id]["status"] = "done" if process.returncode == 0 else "failed"
```

  * `GET /api/rhubarb/status/<job_id>` — polls `process.returncode`, returns cues JSON once status is `done`.

* **Convex Hull Mouth Masking**:
  * If OpenSeeFace tracking active: use outer lip landmarks 48–59 as mask polygon stored in `pose["mouth_mask_poly"]`.
  * If optical flow fallback: approximate outer lips as a 12-point ellipse around `mouth_center`, scaled by frame `scale`, rotated by head `roll`.
  * Expand mask outward from centroid before filling:

```python
P_expanded = centroid + (P - centroid) * (1.0 + (outline_width + 2.0) / (norm(P - centroid) + 1e-5))
```

  * Fill expanded convex hull with `skin_color` before drawing the sprite.

* **Timing Alignment**:
  * For each frame at timestamp $t$: look up active viseme (`A`–`H` or `X`) from Rhubarb schedule.
  * Any frame $t$ beyond Rhubarb's final cue timestamp defaults to viseme `X` (silence).

* **Coordinate Mapping**:
  * Retrieve `mouth_center`, scale, `roll`, and `yaw` for the frame from `annotations.json`.

* **Yaw Foreshortening with Lerp Smoothing**:
  * Front-facing layout: $|yaw| < 20°$
  * 3/4-view (horizontal lip compression): $20° \le |yaw| < 60°$
  * Side-profile wedge: $|yaw| \ge 60°$
  * Smooth mode transitions: linearly interpolate (`lerp`) raw $(x, y)$ landmark offsets between adjacent modes over a $\pm 5°$ blend zone at both the $20°$ and $60°$ thresholds.

* **Sprite Scale Metric**:
  * Scale factor = `(current_eye_dist_compensated / base_eye_dist)`.
  * Apply to `base_mw` and `base_mh` proportionally.

* **Viseme X**:
  * Draw a closed lip line at `mouth_center` using `line_color` and `outline_width` from `CharacterConfig`.

* **Final Compositing**:
  * Alpha-composite the yaw-corrected, roll-rotated, scaled mouth sprite onto the masked frame at `mouth_center`.

---

### 4. Interactive Annotation & Review UI
#### [MODIFY] `static/index.html` & `static/app.js`

* **Confidence Thresholds**:
  * 🟢 **Green**: OpenSeeFace confidence $\ge 0.65$. No review needed.
  * 🟡 **Yellow**: OpenSeeFace lost; LK optical flow active. Verify recommended.
  * 🔴 **Red**: Any landmark moves $> 0.012$ normalized units between consecutive frames. Manual annotation required.

* **Visual Frame Strip**: Horizontal timeline at bottom, each frame tab colored by threshold above.

* **Landmarks Canvas Editor**:
  * Render frame with 20 color-coded marker dots overlaid.
  * Drag-and-drop correction on any point. On save, triggers backend re-propagation from corrected frame forward, stopping at next Green keyframe.

* **Sidebar Point Selector**:
  * List of all 20 named landmarks with checkboxes for visibility/occlusion state.
  * BODY_HEURISTIC points visually distinguished from directly-tracked points (e.g. dashed border on marker dot).

---

## Verification Plan

### Automated Tests

```bash
python -m unittest tests.test_tracker        # landmark mapping, calibration, propagation stop
python -m unittest tests.test_compositor     # masking, sprite scale, yaw lerp
python -m unittest tests.test_ffmpeg_guard   # invalid audio input, empty output detection
python -m unittest tests.test_rhubarb_async  # non-blocking endpoint, status polling
```

### Manual Verification

1. **Model Loading & Initialization**: Verify OpenSeeFace loads with 68-point model. Confirm startup assertion passes. Verify 4 BODY_HEURISTIC facial points are computed from geometry, not duplicated jaw indices.

2. **Optical Flow Propagation**: Track a 100-frame segment. Verify shoulders and neck track accurately with LK flow as character moves.

3. **Manual Override & Propagation Stop**: Drag a shoulder point to a new location, click Save & Propagate. Verify subsequent frames update. Verify propagation stops at the next Green (confidence $\ge 0.65$) frame and does not overwrite it.

4. **Dataset Export**: Confirm `datasets/` folder contains `quality=95` JPEGs (or PNG), `quality=70` preview thumbnails, and `annotations.json` conforming to the defined schema with `fps`, `frame_count`, `base_mw`, `base_mh`, `base_eye_dist`.

5. **Compositing Spatial & Rotation Test**:
   * *Pass*: Sprite center offset $\le 4\text{px}$ from tracked `mouth_center`. Rotation matches head roll within $\pm 2°$. Measured across 100-frame test run.

6. **Temporal Sync Test**:
   * *Pass*: Active mouth shape matches expected viseme within $\pm 1$ frame. Boundary frames within $20\text{ms}$ of a viseme transition excluded from check.

7. **Async Rhubarb Test**: Submit a 60-second audio clip to `/api/rhubarb/run`. Verify endpoint returns `job_id` immediately without blocking. Poll `/api/rhubarb/status/<job_id>` until done. Verify cues JSON is correct.

8. **FFmpeg Guard Test**: Pass a corrupt audio file to the pre-flight converter. Verify `RuntimeError` is raised with the FFmpeg stderr message before Rhubarb is invoked.