import os
import re
import sys
import json
import httpx
import wave
import asyncio
import logging
import subprocess
from pathlib import Path
from typing import List, Dict, Any, Optional
from fastapi import FastAPI, UploadFile, File, HTTPException, Form
from fastapi.responses import FileResponse, HTMLResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
from PIL import Image, ImageDraw, ImageColor
import numpy as np

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("lip-sync-standalone")

# Setup Directory Paths
BASE_DIR = Path(__file__).resolve().parent
STATIC_DIR = BASE_DIR / "static"
UPLOADS_DIR = STATIC_DIR / "uploads"
GENERATED_DIR = STATIC_DIR / "generated_mouths"
OUTPUT_DIR = STATIC_DIR / "output"

UPLOADS_DIR.mkdir(parents=True, exist_ok=True)
GENERATED_DIR.mkdir(parents=True, exist_ok=True)
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

app = FastAPI(title="Lip-Sync Standalone Lab")
app.mount("/static", StaticFiles(directory=str(STATIC_DIR)), name="static")

# Helper to find bin directory (for ffmpeg and rhubarb)
PROJECT_ROOT = BASE_DIR.parent
FFMPEG_PATH = PROJECT_ROOT / "bin" / "ffmpeg.exe"
RHUBARB_PATH = PROJECT_ROOT / "bin" / "rhubarb.exe"

if not FFMPEG_PATH.exists():
    FFMPEG_PATH = Path("ffmpeg") # Fallback to system path

class FrameSequenceReader:
    """
    Unified video/folder reader that mimics cv2.VideoCapture.
    If 'path' is a directory, it reads image files sorted in natural order.
    If 'path' is a video file, it delegates to cv2.VideoCapture.
    """
    def __init__(self, path: str):
        self.path = path
        self.is_dir = os.path.isdir(path)
        self.frames = []
        self.current_idx = 0

        if self.is_dir:
            valid_exts = {".png", ".jpg", ".jpeg", ".bmp", ".webp"}
            all_files = os.listdir(path)
            image_files = [
                os.path.join(path, f) for f in all_files
                if os.path.splitext(f)[1].lower() in valid_exts
            ]
            def _atoi(text): return int(text) if text.isdigit() else text
            def _natural(text): return [_atoi(c) for c in re.split(r'(\d+)', text)]
            self.frames = sorted(image_files, key=_natural)
            self.target_size = None
        else:
            import cv2
            self.cap = cv2.VideoCapture(path)

    def isOpened(self) -> bool:
        if self.is_dir:
            return len(self.frames) > 0
        return self.cap.isOpened()

    def read(self):
        if self.is_dir:
            if self.current_idx < len(self.frames):
                import cv2
                frame = cv2.imread(self.frames[self.current_idx])
                if frame is not None:
                    if self.target_size is None:
                        self.target_size = (frame.shape[1], frame.shape[0])
                    else:
                        if (frame.shape[1], frame.shape[0]) != self.target_size:
                            logger.warning(f"FrameSequenceReader resizing frame {self.current_idx} from {frame.shape[1]}x{frame.shape[0]} to {self.target_size[0]}x{self.target_size[1]}")
                            frame = cv2.resize(frame, self.target_size, interpolation=cv2.INTER_LINEAR)
                self.current_idx += 1
                return (True, frame) if frame is not None else (False, None)
            return False, None
        return self.cap.read()

    def get(self, propId):
        import cv2
        if self.is_dir:
            if propId == cv2.CAP_PROP_FRAME_COUNT:
                return float(len(self.frames))
            elif propId == cv2.CAP_PROP_FPS:
                return 25.0  # placeholder; actual FPS is user-supplied
            elif propId == cv2.CAP_PROP_POS_FRAMES:
                return float(self.current_idx)
            return 0.0
        return self.cap.get(propId)

    def set(self, propId, value):
        import cv2
        if self.is_dir:
            if propId == cv2.CAP_PROP_POS_FRAMES:
                self.current_idx = min(max(0, int(value)), len(self.frames))
                return True
            return False
        return self.cap.set(propId, value)

    def release(self):
        if not self.is_dir:
            self.cap.release()

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
  face_angle: float = 0.0   # -90=full left profile, 0=front, +90=full right profile
  landmarks_calib: Optional[List[Dict[str, float]]] = None
  sprite_char_override: Optional[str] = None

class LipSyncRequest(BaseModel):
  script: str
  image_path: str
  char1: Optional[CharacterConfig] = None
  char2: Optional[CharacterConfig] = None
  chars: Optional[List[CharacterConfig]] = None
  char_names: Optional[List[str]] = None
  safe_mode: bool = False
  video_path: Optional[str] = None
  landmarks_calib: Optional[List[Dict[str, float]]] = None
  annotations: Optional[Dict[str, Any]] = None
  render_all_smoothing: Optional[bool] = False
  smoothing_level: Optional[int] = 3
  sprite_char_override: Optional[str] = None


class ColorSampleRequest(BaseModel):
  image_path: str
  mouth_x: float
  mouth_y: float
  mouth_width: float
  mouth_height: float

# UI index route
@app.get("/", response_class=HTMLResponse)
async def serve_index():
    index_file = STATIC_DIR / "index.html"
    if index_file.exists():
        with open(index_file, "r", encoding="utf-8") as f:
            return HTMLResponse(content=f.read())
    return HTMLResponse(content="<h3>index.html not found!</h3>")

# Serve uploaded character images
@app.get("/api/serve-image")
async def serve_image(path: str):
    if not os.path.exists(path):
        raise HTTPException(status_code=404, detail="File not found")
    
    ext = os.path.splitext(path)[1].lower()
    video_extensions = {".mp4", ".avi", ".mov", ".mkv", ".webm"}
    image_extensions = {".png", ".jpg", ".jpeg", ".bmp", ".webp", ".gif"}
    is_dir = os.path.isdir(path)
    
    if ext in video_extensions or is_dir:
        import cv2
        from fastapi.responses import Response
        cap = FrameSequenceReader(path)
        if not cap.isOpened():
            raise HTTPException(status_code=500, detail="Could not open video or frame folder")
        ret, frame = cap.read()
        cap.release()
        if not ret:
            raise HTTPException(status_code=500, detail="Could not read first frame")
        ret_enc, buffer = cv2.imencode(".jpg", frame)
        if not ret_enc:
            raise HTTPException(status_code=500, detail="Could not encode frame as jpeg")
        return Response(content=buffer.tobytes(), media_type="image/jpeg")
    elif ext in image_extensions:
        return FileResponse(path)
    else:
        return FileResponse(path)

# Upload Endpoint
@app.post("/api/upload")
async def upload_image(file: UploadFile = File(...)):
    try:
        ext = os.path.splitext(file.filename)[1]
        save_path = UPLOADS_DIR / f"character_base{ext}"
        with open(save_path, "wb") as f:
            f.write(await file.read())
        logger.info(f"Uploaded character image saved at: {save_path}")
        return {"status": "ok", "file_path": str(save_path)}
    except Exception as e:
        logger.error(f"Upload failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# Folder Upload Endpoint — for pre-extracted frame sequences
@app.post("/api/upload-folder")
async def upload_folder(files: List[UploadFile] = File(...)):
    try:
        import uuid
        valid_exts = {".png", ".jpg", ".jpeg", ".bmp", ".webp"}
        image_files = [f for f in files if os.path.splitext(f.filename)[1].lower() in valid_exts]
        if not image_files:
            raise HTTPException(status_code=400, detail="No valid image files found in the uploaded folder.")
        
        folder_id = uuid.uuid4().hex[:10]
        folder_dir = UPLOADS_DIR / "uploaded_folders" / folder_id
        folder_dir.mkdir(parents=True, exist_ok=True)
        
        # Custom sort helper for natural ordering
        def atoi(text):
            return int(text) if text.isdigit() else text
        def natural_keys(text):
            return [atoi(c) for c in re.split(r'(\d+)', text)]
        
        sorted_files = sorted(image_files, key=lambda f: natural_keys(f.filename))
        
        for img_file in sorted_files:
            # Strip any directory prefix from the filename to save flat
            flat_name = os.path.basename(img_file.filename)
            save_path = folder_dir / flat_name
            with open(save_path, "wb") as out:
                out.write(await img_file.read())
        
        logger.info(f"Uploaded frame folder saved at: {folder_dir} ({len(sorted_files)} frames)")
        return {"status": "ok", "file_path": str(folder_dir), "frame_count": len(sorted_files)}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Folder upload failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# Color Sampling Endpoint
@app.post("/api/character/sample-color")
async def sample_character_color(req: ColorSampleRequest):
    if not os.path.exists(req.image_path):
        raise HTTPException(status_code=404, detail="Character base image not found")
    
    try:
        ext = os.path.splitext(req.image_path)[1].lower()
        video_extensions = {".mp4", ".avi", ".mov", ".mkv", ".webm"}
        image_extensions = {".png", ".jpg", ".jpeg", ".bmp", ".webp"}
        is_dir = os.path.isdir(req.image_path)
        if ext in video_extensions or is_dir:
            import cv2
            cap = FrameSequenceReader(req.image_path)
            if not cap.isOpened():
                raise HTTPException(status_code=500, detail="Could not open character video/frame folder")
            ret, frame = cap.read()
            cap.release()
            if not ret:
                raise HTTPException(status_code=500, detail="Could not read first frame")
            # Convert BGR (OpenCV) to RGBA (PIL)
            frame_rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGBA)
            img = Image.fromarray(frame_rgb)
        else:
            img = Image.open(req.image_path).convert("RGBA")
        width, height = img.size
        
        # Translate center relative coords to pixels
        cx = int((req.mouth_x / 100.0) * width)
        cy = int((req.mouth_y / 100.0) * height)
        mw = max(10, int((req.mouth_width / 100.0) * width))
        mh = max(6, int((req.mouth_height / 100.0) * height))
        
        # Bounding box of mouth selection
        x0 = max(0, cx - mw // 2)
        y0 = max(0, cy - mh // 2)
        x1 = min(width,  cx + mw // 2)
        y1 = min(height, cy + mh // 2)
        
        # ── SKIN TONE: Sample a ring OUTSIDE the mouth bounding box ──────────
        # For cel-shaded anime/cartoon art, sampling OUTSIDE the mouth selection
        # and using MODE (most frequent quantized color) gives the true flat skin
        # color — not the muddy average contaminated by teeth, tongue, or shadows.
        ring = max(10, min(mw, mh) // 2)   # ring width ~50% of smaller dimension
        
        sx0 = max(0,      x0 - ring)
        sy0 = max(0,      y0 - ring)
        sx1 = min(width,  x1 + ring)
        sy1 = min(height, y1 + ring)
        
        outside_pixels = []
        for oy in range(sy0, sy1):
            for ox in range(sx0, sx1):
                if x0 <= ox <= x1 and y0 <= oy <= y1:
                    continue   # skip inner mouth selection
                p = img.getpixel((ox, oy))
                if p[3] < 80:
                    continue   # skip transparent
                brightness = p[0] + p[1] + p[2]
                if brightness < 80 or brightness > 720:
                    continue   # skip outlines (<80) and white backgrounds (>720)
                # Quantize to nearest 8 to group near-identical flat tones
                qr = (p[0] >> 3) << 3
                qg = (p[1] >> 3) << 3
                qb = (p[2] >> 3) << 3
                outside_pixels.append((qr, qg, qb))
        
        if not outside_pixels:
            # Fallback: sample face area directly above the mouth
            for oy in range(max(0, y0 - ring * 3), max(0, y0)):
                for ox in range(x0, x1):
                    p = img.getpixel((ox, oy))
                    if p[3] > 80:
                        qr = (p[0] >> 3) << 3
                        qg = (p[1] >> 3) << 3
                        qb = (p[2] >> 3) << 3
                        outside_pixels.append((qr, qg, qb))
        
        if outside_pixels:
            from collections import Counter
            mode_color = Counter(outside_pixels).most_common(1)[0][0]
            skin_hex = f"#{mode_color[0]:02x}{mode_color[1]:02x}{mode_color[2]:02x}"
        else:
            skin_hex = "#ffcc99"
        
        # ── OUTLINE / LIP COLOR: Dominant dark on the mouth border edge band ──
        # Only look at the top+bottom thin band inside the selection where the
        # lip outline pixels live — NOT the entire interior (which includes teeth).
        edge_band = max(2, mh // 5)
        edge_pixels = []
        for ox in range(x0, x1):
            for oy in range(y0, min(y0 + edge_band, y1)):
                p = img.getpixel((ox, oy))
                if p[3] > 80:
                    edge_pixels.append(p[:3])
            for oy in range(max(y0, y1 - edge_band), y1):
                p = img.getpixel((ox, oy))
                if p[3] > 80:
                    edge_pixels.append(p[:3])
        
        if edge_pixels:
            from collections import Counter
            dark_pixels = [p for p in edge_pixels if (p[0]+p[1]+p[2]) < 200]
            if dark_pixels:
                qd = [((p[0]>>4)<<4, (p[1]>>4)<<4, (p[2]>>4)<<4) for p in dark_pixels]
                mode_dark = Counter(qd).most_common(1)[0][0]
                line_hex = f"#{mode_dark[0]:02x}{mode_dark[1]:02x}{mode_dark[2]:02x}"
            else:
                darkest = min(edge_pixels, key=lambda p: p[0]+p[1]+p[2])
                line_hex = f"#{darkest[0]:02x}{darkest[1]:02x}{darkest[2]:02x}"
        else:
            line_hex = "#000000"
        
        logger.info(f"Color sampled (outside-ring mode) → skin:{skin_hex}  line:{line_hex}")
        return {"skin_color": skin_hex, "line_color": line_hex}
    except Exception as e:
        logger.error(f"Error sampling color: {e}")
        raise HTTPException(status_code=500, detail=f"Failed sampling: {str(e)}")


# Dialogue Script Parsing
def parse_dialogue(script_text: str) -> List[Dict[str, Any]]:
    # Regex to match "[Character X] Text..."
    pattern = re.compile(r"\[([^\]]+)\]\s*([^\[]+)")
    matches = pattern.findall(script_text)
    
    dialogue_lines = []
    for match in matches:
        char_name = match[0].strip()
        text = match[1].strip()
        if text:
            dialogue_lines.append({
                "character": char_name,
                "text": text
            })
            
    # Fallback if no tags exist
    if not dialogue_lines and script_text.strip():
        dialogue_lines.append({
            "character": "Character 1",
            "text": script_text.strip()
        })
        
    return dialogue_lines

# Call PocketTTS Server
async def generate_tts_segment(text: str, filename: str) -> Path:
    out_path = UPLOADS_DIR / filename
    if out_path.exists():
        out_path.unlink()
        
    payload = {
        "text": text,
        "voice": "alba",
        "format": "wav"
    }
    
    # PocketTTS runs on port 8000
    tts_url = "http://127.0.0.1:8000/api/generate"
    logger.info(f"Calling PocketTTS at {tts_url} with text: '{text[:30]}...'")
    
    async with httpx.AsyncClient(trust_env=False) as client:
        try:
            resp = await client.post(tts_url, json=payload, timeout=60.0)
            if resp.status_code == 200:
                with open(out_path, "wb") as f:
                    f.write(resp.content)
                logger.info(f"TTS segment raw generated: {out_path}")
                
                # Convert 32-bit float WAV to standard 16-bit PCM integer WAV using FFmpeg
                temp_path = out_path.with_name(f"temp_{filename}")
                if out_path.exists():
                    out_path.rename(temp_path)
                
                try:
                    convert_to_16khz_mono_pcm(temp_path, out_path)
                except Exception as convert_err:
                    logger.error(f"FFmpeg conversion helper failed: {convert_err}")
                    # fallback to basic copy or command if needed, but our helper is robust
                    raise convert_err
                
                if temp_path.exists():
                    temp_path.unlink()
                    
                return out_path
            else:
                logger.error(f"PocketTTS returned code {resp.status_code}: {resp.text}")
                raise RuntimeError(f"TTS Synthesis error: {resp.text}")
        except Exception as e:
            logger.error(f"Connection to PocketTTS failed: {e}")
            # Fallback to creating a silent wave file of appropriate duration to keep prototype working
            words_count = len(text.split())
            est_duration = max(1.0, words_count * 0.35)
            logger.warning(f"Creating mock silent audio wave for fallback: {est_duration:.2f}s")
            create_silent_wav(out_path, est_duration)
            return out_path

def create_silent_wav(path: Path, duration: float):
    # Generates a basic silent 1-channel mono 16kHz WAV file
    sample_rate = 16000
    num_samples = int(duration * sample_rate)
    with wave.open(str(path), 'wb') as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(sample_rate)
        w.writeframes(b'\x00\x00' * num_samples)

# Rhubarb execution (WAV -> JSON) with energy envelope fallback
def run_rhubarb(audio_path: Path) -> List[Dict[str, Any]]:
    output_json = audio_path.with_suffix(".json")
    if output_json.exists():
        output_json.unlink()
        
    if RHUBARB_PATH.exists():
        logger.info(f"Invoking rhubarb.exe on: {audio_path}")
        cmd = [
            str(RHUBARB_PATH),
            "-f", "json",
            "-o", str(output_json),
            str(audio_path)
        ]
        try:
            res = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True, timeout=30.0)
            if res.returncode == 0 and output_json.exists():
                with open(output_json, "r", encoding="utf-8") as f:
                    data = json.load(f)
                    return data.get("mouthCues", [])
            logger.error(f"Rhubarb process failed with code {res.returncode}. Stderr: {res.stderr}")
        except Exception as e:
            logger.error(f"Exception running Rhubarb CLI: {e}")
            
    # Fallback Procedural speech analyzer (computes mouth visemes based on wave amplitudes)
    logger.warning("Rhubarb.exe not found or failed. Running fallback audio amplitude viseme mapper...")
    return run_procedural_viseme_analyzer(audio_path)

def run_procedural_viseme_analyzer(audio_path: Path) -> List[Dict[str, Any]]:
    # Simple speech analyzer: reads WAV frame amplitudes and outputs mouth shape cues based on loudness
    cues = []
    try:
        with wave.open(str(audio_path), 'rb') as w:
            fps = w.getframerate()
            n_frames = w.getnframes()
            sampwidth = w.getsampwidth()
            
            # Read all frames
            frames = w.readframes(n_frames)
            
            # Translate binary data based on bit width
            if sampwidth == 2:
                # 16-bit PCM
                import struct
                samples = struct.unpack(f"<{n_frames}h", frames)
            else:
                # Fallback to simple pacing if not 16-bit
                duration = n_frames / fps
                return generate_pacing_cues(duration)
                
            # Compute windowed energy (chunk size corresponding to 0.04s frame duration)
            chunk_size = int(fps * 0.04)
            cues = []
            
            current_viseme = 'X'
            viseme_start = 0.0
            
            for i in range(0, len(samples), chunk_size):
                chunk = samples[i:i+chunk_size]
                if not chunk:
                    break
                
                # Compute root-mean-square amplitude
                rms = (sum(s**2 for s in chunk) / len(chunk)) ** 0.5
                norm_rms = min(1.0, rms / 8000.0) # normalize relative to average voice loudness
                
                time_s = i / fps
                
                # Determine viseme mapping based on normalized energy
                if norm_rms < 0.05:
                    viseme = 'X' # Closed
                elif norm_rms < 0.15:
                    viseme = 'A' # Very small
                elif norm_rms < 0.3:
                    viseme = 'B' # Small open
                elif norm_rms < 0.5:
                    viseme = 'C' # Open
                elif norm_rms < 0.7:
                    viseme = 'F' # Wide open
                else:
                    viseme = 'D' # Large pucker
                    
                if viseme != current_viseme:
                    if time_s > viseme_start:
                        cues.append({"start": viseme_start, "end": time_s, "value": current_viseme})
                    current_viseme = viseme
                    viseme_start = time_s
                    
            # Add final cue
            duration = n_frames / fps
            if duration > viseme_start:
                cues.append({"start": viseme_start, "end": duration, "value": current_viseme})
                
    except Exception as e:
        logger.error(f"Error in wave analyzer fallback: {e}")
        return generate_pacing_cues(1.0)
        
    return cues

def generate_pacing_cues(duration: float) -> List[Dict[str, Any]]:
    # Creates rhythmic syllables (open/close) every 0.15s
    cues = []
    t = 0.0
    visemes = ['B', 'C', 'X', 'F', 'D', 'X', 'C', 'X']
    idx = 0
    while t < duration:
        end = min(duration, t + 0.15)
        cues.append({"start": t, "end": end, "value": visemes[idx % len(visemes)]})
        t = end
        idx += 1
    return cues

import math

# ─── Mouth zone helpers ──────────────────────────────────────────

def draw_base_shape(draw, box, fill=None, outline=None, width=1, style='rounded'):
    """Helper to draw mouth base shapes supporting capsule, flat, rounded, smile, and u-shaped styles."""
    x0, y0, x1, y1 = box
    if x1 <= x0 or y1 <= y0:
        return
    
    if style == 'capsule':
        # Radius is proportional to box dimensions
        radius = max(2, min(x1 - x0, y1 - y0) // 3)
        draw.rounded_rectangle(box, radius=radius, fill=fill, outline=outline, width=width)
    elif style == 'u-shaped':
        draw.chord(box, start=0, end=180, fill=fill, outline=outline, width=width)
    else:
        # For rounded, flat, smile, etc., draw an ellipse
        draw.ellipse(box, fill=fill, outline=outline, width=width)

def _approx_bezier_polygon(p0, p1, p2, steps=12):
    """Quadratic Bezier approximated as a list of (x,y) points."""
    pts = []
    for i in range(steps + 1):
        t = i / steps
        x = (1-t)**2 * p0[0] + 2*(1-t)*t * p1[0] + t**2 * p2[0]
        y = (1-t)**2 * p0[1] + 2*(1-t)*t * p1[1] + t**2 * p2[1]
        pts.append((x, y))
    return pts


def draw_smile_teeth_grid(draw, px, cy, rx, ry, ls, rs, lip, thickness):
    """Draw a toothy grid of lines within an elliptical mouth boundary."""
    # Draw horizontal center line
    x0 = int(px - rx * ls + thickness)
    x1 = int(px + rx * rs - thickness)
    draw.line([x0, int(cy), x1, int(cy)], fill=lip, width=max(1, thickness))
    
    # Draw vertical separator lines relative to the perspective centers
    steps = [-0.6, -0.3, 0.0, 0.3, 0.6]
    for s in steps:
        if s < 0:
            tx = int(px + s * rx * ls)
        else:
            tx = int(px + s * rx * rs)
            
        dy = ry * math.sqrt(max(0.0, 1.0 - s**2))
        y_top = int(cy - dy + thickness)
        y_bot = int(cy + dy - thickness)
        if y_bot > y_top:
            draw.line([tx, y_top, tx, y_bot], fill=lip, width=1)


def draw_front_mouth(draw, viseme, w, h, skin, lip, cavity, teeth, tongue, style, thickness):
    """Front-facing mouth (|face_angle| < 20). Original algorithm."""
    show_details = (style != 'flat')

    if viseme == 'X':
        if style in ('u-shaped', 'smile'):
            draw.arc([2, h//4, w-2, h//2+h//4], start=0, end=180, fill=lip, width=thickness)
        else:
            draw.line([2, h//2, w-2, h//2], fill=lip, width=thickness)
    elif viseme == 'A':
        if style == 'smile':
            draw_base_shape(draw, [w//4, h//2-2, 3*w//4, h//2+2], fill=teeth, outline=lip, width=thickness, style='rounded')
            draw_smile_teeth_grid(draw, w//2, h//2, w//4 - 2, 2, 1.0, 1.0, lip, 1)
        else:
            draw_base_shape(draw, [w//4, h//2-2, 3*w//4, h//2+2], fill=cavity, outline=lip, width=thickness, style=style)
    elif viseme in ('B', 'E'):
        oh = h // 3
        if style == 'smile':
            draw_base_shape(draw, [2, h//2-oh//2, w-2, h//2+oh//2], fill=teeth, outline=lip, width=thickness, style='rounded')
            draw_smile_teeth_grid(draw, w//2, h//2, w//2 - 2, oh//2, 1.0, 1.0, lip, thickness)
        else:
            draw_base_shape(draw, [2, h//2-oh//2, w-2, h//2+oh//2], fill=cavity, outline=lip, width=thickness, style=style)
            if show_details:
                if style == 'u-shaped':
                    draw.rectangle([w//4, h//2+1, 3*w//4, h//2+oh//3], fill=teeth)
                else:
                    draw.rectangle([w//4, h//2-oh//2+1, 3*w//4, h//2-oh//2+oh//3+1], fill=teeth)
    elif viseme in ('C', 'F'):
        oh = h // 2
        yt = h//2 - oh//2; yb = h//2 + oh//2
        if style == 'smile':
            draw_base_shape(draw, [2, yt, w-2, yb], fill=teeth, outline=lip, width=thickness, style='rounded')
            draw_smile_teeth_grid(draw, w//2, h//2, w//2 - 2, oh//2, 1.0, 1.0, lip, thickness)
        else:
            draw_base_shape(draw, [2, yt, w-2, yb], fill=cavity, outline=lip, width=thickness, style=style)
            if show_details:
                if style == 'u-shaped':
                    draw.rectangle([w//4, h//2+1, 3*w//4, h//2+oh//3], fill=teeth)
                    draw.chord([w//4, yb-oh//3, 3*w//4, yb], start=180, end=360, fill=tongue)
                else:
                    draw.chord([w//4, yt, 3*w//4, yt+oh//2], start=0, end=180, fill=teeth)
                    draw.chord([w//4, yb-oh//3, 3*w//4, yb], start=180, end=360, fill=tongue)
    elif viseme in ('D', 'G'):
        if style == 'smile':
            draw_base_shape(draw, [2, 2, w-2, h-2], fill=teeth, outline=lip, width=thickness, style='rounded')
            draw_smile_teeth_grid(draw, w//2, h//2, w//2 - 2, h//2 - 2, 1.0, 1.0, lip, thickness)
        else:
            draw_base_shape(draw, [2, 2, w-2, h-2], fill=cavity, outline=lip, width=thickness, style=style)
            if show_details:
                if style == 'u-shaped':
                    draw.rectangle([w//4, h//2+1, 3*w//4, h//2+h//6], fill=teeth)
                    draw.chord([w//3, h-h//4, 2*w//3, h-2], start=180, end=360, fill=teeth)
                    draw.ellipse([w//3, h-h//3, 2*w//3, h-2], fill=tongue)
                else:
                    draw.chord([w//4, 2, 3*w//4, 2+h//3], start=0, end=180, fill=teeth)
                    draw.chord([w//3, h-h//4, 2*w//3, h-2], start=180, end=360, fill=teeth)
                    draw.ellipse([w//3, h-h//3, 2*w//3, h-2], fill=tongue)
    elif viseme == 'H':
        wn = w // 2; xs = w//2 - wn//2
        if style == 'smile':
            draw_base_shape(draw, [xs, h//4, xs+wn, 3*h//4], fill=teeth, outline=lip, width=thickness, style='rounded')
            draw_smile_teeth_grid(draw, w//2, h//2, wn//2, h//4, 1.0, 1.0, lip, thickness)
        else:
            draw_base_shape(draw, [xs, h//4, xs+wn, 3*h//4], fill=cavity, outline=lip, width=thickness, style=style)
            if show_details:
                draw.ellipse([xs+wn//3, 3*h//4-h//6, xs+2*wn//3, 3*h//4-1], fill=tongue)
    else:
        draw.line([2, h//2, w-2, h//2], fill=lip, width=thickness)


def draw_three_quarter_mouth(draw, viseme, w, h, skin, lip, cavity, teeth, tongue, style, thickness, t, side):
    """
    3/4-view mouth. t=0 (front-like) → t=1 (nearly profile).
    side: +1=facing right, -1=facing left.
    Near side has full lips; far side is compressed.
    """
    # How much the far side is squashed (at t=1, far side = 25% width)
    far_ratio  = 1.0 - t * 0.75        # 1.0 → 0.25
    near_ratio = 1.0 - t * 0.15        # 1.0 → 0.85

    # Horizontal pivot point (where center of face curve is)
    # Smoothly interpolates from center (0.5) to profile edge (0.65 for right, 0.35 for left)
    pivot_x = int(w * (0.5 + side * t * 0.15))

    # Left half width / right half width
    if side > 0:
        lw = int((w // 2) * far_ratio)
        rw = int((w // 2) * near_ratio)
    else:
        lw = int((w // 2) * near_ratio)
        rw = int((w // 2) * far_ratio)

    x0 = max(1, pivot_x - lw)
    x1 = min(w-1, pivot_x + rw)
    show_details = style != 'flat'

    if viseme == 'X':
        if style in ('u-shaped', 'smile'):
            draw.arc([x0, h//4, x1, h//2+h//4], start=0, end=180, fill=lip, width=thickness)
        else:
            draw.line([x0, h//2, x1, h//2], fill=lip, width=thickness)
    elif viseme == 'A':
        if style == 'smile':
            draw_base_shape(draw, [x0, h//2-2, x1, h//2+2], fill=teeth, outline=lip, width=thickness, style='rounded')
            draw_smile_teeth_grid(draw, pivot_x, h//2, w//2, 2, lw / (w//2), rw / (w//2), lip, thickness)
        elif style == 'u-shaped':
            draw.chord([x0, h//2-2, x1, h//2+2], start=0, end=180, fill=cavity, outline=lip, width=thickness)
        else:
            draw.ellipse([x0, h//2-2, x1, h//2+2], fill=cavity, outline=lip, width=thickness)
    elif viseme in ('B', 'E'):
        oh = max(3, int(h // 3 * (1 - t * 0.3)))
        if style == 'smile':
            draw_base_shape(draw, [x0, h//2-oh//2, x1, h//2+oh//2], fill=teeth, outline=lip, width=thickness, style='rounded')
            draw_smile_teeth_grid(draw, pivot_x, h//2, w//2, oh//2, lw / (w//2), rw / (w//2), lip, thickness)
        else:
            if style == 'u-shaped':
                draw.chord([x0, h//2-oh//2, x1, h//2+oh//2], start=0, end=180, fill=cavity, outline=lip, width=thickness)
            else:
                draw.ellipse([x0, h//2-oh//2, x1, h//2+oh//2], fill=cavity, outline=lip, width=thickness)
            if show_details:
                # Teeth only on near side
                tx0 = pivot_x if side > 0 else x0
                tx1 = x1     if side > 0 else pivot_x
                if style == 'u-shaped':
                    draw.rectangle([tx0, h//2+1, tx1, h//2+oh//3], fill=teeth)
                else:
                    draw.rectangle([tx0, h//2-oh//2+1, tx1, h//2-oh//2+oh//3], fill=teeth)
    elif viseme in ('C', 'F'):
        oh = max(4, int(h // 2 * (1 - t * 0.2)))
        yt = h//2 - oh//2; yb = h//2 + oh//2
        if style == 'smile':
            draw_base_shape(draw, [x0, yt, x1, yb], fill=teeth, outline=lip, width=thickness, style='rounded')
            draw_smile_teeth_grid(draw, pivot_x, h//2, w//2, oh//2, lw / (w//2), rw / (w//2), lip, thickness)
        else:
            if style == 'u-shaped':
                draw.chord([x0, yt, x1, yb], start=0, end=180, fill=cavity, outline=lip, width=thickness)
            else:
                draw.ellipse([x0, yt, x1, yb], fill=cavity, outline=lip, width=thickness)
            if show_details:
                tx0 = pivot_x if side > 0 else x0
                tx1 = x1     if side > 0 else pivot_x
                if style == 'u-shaped':
                    draw.rectangle([tx0, h//2+1, tx1, h//2+oh//3], fill=teeth)
                    draw.chord([tx0, yb-oh//3, tx1, yb],  start=180, end=360, fill=tongue)
                else:
                    draw.chord([tx0, yt, tx1, yt+oh//2], start=0, end=180, fill=teeth)
                    draw.chord([tx0, yb-oh//3, tx1, yb],  start=180, end=360, fill=tongue)
    elif viseme in ('D', 'G'):
        yt = 2; yb = h - 2
        if style == 'smile':
            draw_base_shape(draw, [x0, yt, x1, yb], fill=teeth, outline=lip, width=thickness, style='rounded')
            draw_smile_teeth_grid(draw, pivot_x, h//2, w//2, h//2 - 2, lw / (w//2), rw / (w//2), lip, thickness)
        else:
            if style == 'u-shaped':
                draw.chord([x0, yt, x1, yb], start=0, end=180, fill=cavity, outline=lip, width=thickness)
            else:
                draw.ellipse([x0, yt, x1, yb], fill=cavity, outline=lip, width=thickness)
            if show_details:
                tx0 = pivot_x if side > 0 else x0
                tx1 = x1     if side > 0 else pivot_x
                if style == 'u-shaped':
                    draw.rectangle([tx0, h//2+1, tx1, h//2+h//6], fill=teeth)
                    draw.chord([tx0, yb-h//4, tx1, yb],   start=180, end=360, fill=teeth)
                    draw.ellipse([tx0+2, yb-h//3, tx1-2, yb-2], fill=tongue)
                else:
                    draw.chord([tx0, yt, tx1, yt+h//3],  start=0, end=180, fill=teeth)
                    draw.chord([tx0, yb-h//4, tx1, yb],   start=180, end=360, fill=teeth)
                    draw.ellipse([tx0+2, yb-h//3, tx1-2, yb-2], fill=tongue)
    elif viseme == 'H':
        wn = (x1 - x0) // 2
        xs = (x0 + x1) // 2 - wn // 2
        if style == 'smile':
            draw_base_shape(draw, [xs, h//4, xs+wn, 3*h//4], fill=teeth, outline=lip, width=thickness, style='rounded')
            draw_smile_teeth_grid(draw, (xs + xs + wn)//2, h//2, wn//2, h//4, 1.0, 1.0, lip, thickness)
        elif style == 'u-shaped':
            draw.chord([xs, h//4, xs+wn, 3*h//4], start=0, end=180, fill=cavity, outline=lip, width=thickness)
        else:
            draw.ellipse([xs, h//4, xs+wn, 3*h//4], fill=cavity, outline=lip, width=thickness)
    else:
        draw.line([x0, h//2, x1, h//2], fill=lip, width=thickness)


def draw_profile_mouth(draw, viseme, w, h, skin, lip, cavity, teeth, tongue, style, thickness, side):
    """
    Full side-profile mouth.
    side: +1=facing right (mouth opens rightward), -1=facing left.
    """
    # Anchor point: left edge when facing right, right edge when facing left
    ax = int(w * 0.15) if side > 0 else int(w * 0.85)   # 'hinge' of jaw
    tip = int(w * 0.78) if side > 0 else int(w * 0.22)   # lip tip X

    cy = h // 2   # vertical center

    # Opening height (how much jaw drops) per viseme
    open_amounts = {'X': 0, 'A': max(2, h//8), 'B': h//6, 'E': h//6,
                    'C': h//4, 'F': h//4, 'D': h//3, 'G': h//3, 'H': h//5}
    jaw_drop = open_amounts.get(viseme, 0)

    if style == 'flat':
        jaw_drop = max(0, jaw_drop // 2)

    # Calculate Y coordinates and points based on style
    if style == 'u-shaped':
        upper_y = cy
        lower_y = cy + jaw_drop
        up_ctrl_y = cy
        lo_ctrl_y = cy + jaw_drop + h // 10
        
        up_ctrl = (int(tip * 0.65) if side > 0 else w - int(tip * 0.65), up_ctrl_y)
        lo_ctrl = (int(tip * 0.65) if side > 0 else w - int(tip * 0.65), lo_ctrl_y)
        
        up_pts = _approx_bezier_polygon((ax, upper_y), up_ctrl, (tip, upper_y))
        lo_pts = _approx_bezier_polygon((ax, lower_y), lo_ctrl, (tip, lower_y + 2))
    elif style == 'capsule':
        upper_y = cy - jaw_drop // 2
        lower_y = cy + jaw_drop // 2
        # Boxy flat lines
        up_pts = [(ax, upper_y), (int(w * 0.5), upper_y), (tip, upper_y - 1)]
        lo_pts = [(ax, lower_y), (int(w * 0.5), lower_y), (tip, lower_y + 1)]
    else:
        # Default curved wedge (rounded, smile, flat)
        upper_y = cy - jaw_drop // 2
        lower_y = cy + jaw_drop // 2
        up_ctrl = (int(tip * 0.65) if side > 0 else w - int(tip * 0.65), cy - h // 6)
        lo_ctrl = (int(tip * 0.65) if side > 0 else w - int(tip * 0.65), cy + h // 6)
        up_pts = _approx_bezier_polygon((ax, upper_y), (up_ctrl[0], upper_y - h // 10), (tip, upper_y - 2))
        lo_pts = _approx_bezier_polygon((ax, lower_y), (lo_ctrl[0], lower_y + h // 10), (tip, lower_y + 2))

    # Draw skin-filled wedge backplate matching the profile lip boundary
    wedge_poly = up_pts + list(reversed(lo_pts))
    draw.polygon(wedge_poly, fill=skin)

    if jaw_drop > 0:
        # Fill mouth cavity polygon: upper bezier + reverse of lower bezier
        cavity_poly = up_pts + list(reversed(lo_pts))
        draw.polygon(cavity_poly, fill=cavity)

        # Teeth strip along upper lip interior (near tip)
        if jaw_drop > h // 7 and style != 'flat':
            teeth_pts = [
                (up_pts[-1][0], up_pts[-1][1]),
                (up_pts[len(up_pts)*2//3][0], up_pts[len(up_pts)*2//3][1]),
                (lo_pts[len(lo_pts)*2//3][0], lo_pts[len(lo_pts)*2//3][1] - 1),
                (lo_pts[-1][0], lo_pts[-1][1] - 1),
            ]
            draw.polygon(teeth_pts, fill=teeth)
            
            if style == 'smile':
                # Draw vertical separator lines on the teeth polygon
                x_start = up_pts[len(up_pts)*2//3][0]
                x_end = up_pts[-1][0]
                for i in range(1, 3):
                    tx = int(x_start + (x_end - x_start) * i / 3)
                    idx = len(up_pts)*2//3 + (len(up_pts)//3)*i//3
                    ty_up = int(up_pts[idx][1])
                    ty_lo = int(lo_pts[idx][1] - 1)
                    draw.line([tx, ty_up, tx, ty_lo], fill=lip, width=1)

        # Tongue blob for wide open
        if jaw_drop >= h // 4 and style != 'flat':
            tx = int(tip * 0.55) if side > 0 else w - int(tip * 0.55)
            draw.ellipse([tx - 4, lower_y - jaw_drop//4, tx + 4, lower_y + 2], fill=tongue)

    # Draw lip outline
    up_int = [(int(x), int(y)) for x, y in up_pts]
    lo_int = [(int(x), int(y)) for x, y in lo_pts]
    if len(up_int) >= 2:
        draw.line(up_int, fill=lip, width=thickness)
    if len(lo_int) >= 2:
        draw.line(lo_int, fill=lip, width=thickness)
    
    # For capsule, outline the front edge too!
    if style == 'capsule' and jaw_drop > 0:
        draw.line([up_int[-1], lo_int[-1]], fill=lip, width=thickness)
        
    # Hinge corner dot
    draw.ellipse([ax-1, cy-1, ax+1, cy+1], fill=lip)


# ─── Main dispatcher ─────────────────────────────────────────────

def render_single_mode(mode: str, viseme: str, cfg: CharacterConfig, w: int, h: int) -> Image.Image:
    mouth_img = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    draw = ImageDraw.Draw(mouth_img)
    
    try:
        lip_color   = ImageColor.getrgb(cfg.line_color)
    except:
        lip_color   = (0, 0, 0, 255)
    try:
        skin_color  = ImageColor.getrgb(cfg.skin_color)
    except:
        skin_color  = (255, 204, 153, 255)

    cavity_color = (15, 15, 15, 255)
    teeth_color  = (255, 255, 255, 255)
    tongue_color = (245, 110, 125, 255)
    thickness    = max(1, int(getattr(cfg, 'outline_width', 2.0)))
    angle        = getattr(cfg, 'face_angle', 0.0)
    abs_angle    = abs(angle)
    side         = 1 if angle >= 0 else -1   # +1=facing right, -1=facing left

    # 1. Always draw skin backplate (ONLY for front and 3/4 views!)
    if mode != 'profile':
        draw_base_shape(draw, [0, 0, w, h], fill=skin_color, style=cfg.style)

    if mode == 'front':
        draw_front_mouth(draw, viseme, w, h, skin_color, lip_color,
                         cavity_color, teeth_color, tongue_color, cfg.style, thickness)
    elif mode == 'three_quarter':
        clamped_angle = max(20.0, min(60.0, abs_angle))
        t = (clamped_angle - 20.0) / 40.0
        draw_three_quarter_mouth(draw, viseme, w, h, skin_color, lip_color,
                                 cavity_color, teeth_color, tongue_color,
                                 cfg.style, thickness, t, side)
    else:
        draw_profile_mouth(draw, viseme, w, h, skin_color, lip_color,
                           cavity_color, teeth_color, tongue_color,
                           cfg.style, thickness, side)

    return mouth_img

def draw_mouth_sprite(viseme: str, cfg: CharacterConfig, w: int, h: int) -> Image.Image:
    """Route to the correct zone renderer based on cfg.face_angle with blend zones."""
    angle = getattr(cfg, 'face_angle', 0.0)
    abs_angle = abs(angle)
    
    if abs_angle < 15.0:
        return render_single_mode('front', viseme, cfg, w, h)
    elif abs_angle < 25.0:
        # Blend front and three_quarter
        img_front = render_single_mode('front', viseme, cfg, w, h)
        img_34 = render_single_mode('three_quarter', viseme, cfg, w, h)
        t = (abs_angle - 15.0) / 10.0
        return Image.blend(img_front, img_34, t)
    elif abs_angle < 55.0:
        return render_single_mode('three_quarter', viseme, cfg, w, h)
    elif abs_angle < 65.0:
        # Blend three_quarter and profile
        img_34 = render_single_mode('three_quarter', viseme, cfg, w, h)
        img_prof = render_single_mode('profile', viseme, cfg, w, h)
        t = (abs_angle - 55.0) / 10.0
        return Image.blend(img_34, img_prof, t)
    else:
        return render_single_mode('profile', viseme, cfg, w, h)


def sample_dynamic_skin_color(frame_bgr, mouth_mask_poly):
    """
    Samples the skin color from the actual video frame by taking the average of pixels
    immediately outside the mouth_mask_poly boundary to inherit current lighting and shading.
    """
    if not mouth_mask_poly:
        return (255, 204, 153, 255)
    try:
        poly_pts = np.array(mouth_mask_poly, dtype=np.float32)
        centroid = np.mean(poly_pts, axis=0)
        h_max, w_max = frame_bgr.shape[:2]
        sampled_colors = []
        for P in poly_pts:
            diff = P - centroid
            # Expand outward by 35% to sample cheek/lip/chin skin
            sample_pt = centroid + diff * 1.35
            sx = int(np.clip(sample_pt[0], 0, w_max - 1))
            sy = int(np.clip(sample_pt[1], 0, h_max - 1))
            sampled_colors.append(frame_bgr[sy, sx])
        if not sampled_colors:
            return (255, 204, 153, 255)
        avg_bgr = np.mean(sampled_colors, axis=0)
        return (int(avg_bgr[2]), int(avg_bgr[1]), int(avg_bgr[0]), 255)
    except Exception as e:
        logger.error(f"Error in sample_dynamic_skin_color: {e}")
        return (255, 204, 153, 255)


def load_custom_mouth_sprite(char_name: str, viseme: str, face_angle: float, target_w: int, target_h: int) -> Optional[Image.Image]:
    """
    Attempts to load a custom uploaded mouth sprite PNG for the given character name and viseme,
    matching the closest face angle and mirroring if necessary.
    """
    custom_base_dir = STATIC_DIR / "uploads" / "custom_mouths" / char_name
    if not custom_base_dir.exists():
        return None
        
    # List all subdirectories that are valid integer angles
    available_angles = []
    for d in custom_base_dir.iterdir():
        if d.is_dir():
            try:
                available_angles.append(int(d.name))
            except ValueError:
                continue
                
    if not available_angles:
        return None
        
    # Find the closest available angle to the requested face_angle
    closest_angle = min(available_angles, key=lambda a: abs(a - face_angle))
    
    # Try loading mouth_{viseme}.png (checking for Neutral/X aliases too)
    sprite_file = custom_base_dir / str(closest_angle) / f"mouth_{viseme}.png"
    if not sprite_file.exists():
        if viseme == 'X':
            sprite_file = custom_base_dir / str(closest_angle) / "mouth_Neutral.png"
        elif viseme == 'Neutral':
            sprite_file = custom_base_dir / str(closest_angle) / "mouth_X.png"
            
    if not sprite_file.exists():
        return None
        
    try:
        img = Image.open(sprite_file).convert("RGBA")
        
        # Mirror check: if target face_angle and closest_angle are opposite signs
        if (face_angle < -10 and closest_angle > 10) or (face_angle > 10 and closest_angle < -10):
            logger.info(f"Mirroring custom mouth sprite {viseme} from angle {closest_angle}° for face_angle {face_angle}°")
            img = img.transpose(Image.Transpose.FLIP_LEFT_RIGHT)
            
        # Resize to target size (mw, mh)
        img = img.resize((target_w, target_h), Image.Resampling.LANCZOS)
        return img
    except Exception as e:
        logger.error(f"Error loading custom mouth sprite {viseme} for {char_name}: {e}")
        return None

# Compile and cache all character mouths with tilt rotations & perspective flips/compressions
def generate_character_mouth_set(cfg: CharacterConfig, char_name: str, base_w: int, base_h: int) -> Path:
    char_dir = GENERATED_DIR / char_name
    char_dir.mkdir(parents=True, exist_ok=True)

    mw = max(10, int((cfg.width / 100.0) * base_w))
    mh = max(6,  int((cfg.height / 100.0) * base_h))

    visemes = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'X']

    # If custom sprites exist on disk for this character, always prefer them.
    # Check whether any angle subfolder exists under custom_mouths/{char_name}/
    custom_base_dir = STATIC_DIR / "uploads" / "custom_mouths" / char_name
    has_custom_sprites = (cfg.style.lower() in ['designed', 'custom'] or getattr(cfg, 'sprite_char_override', None)) and custom_base_dir.exists() and any(d.is_dir() for d in custom_base_dir.iterdir())

    # Persistent cache: if custom sprites already generated, skip regeneration.
    if has_custom_sprites:
        all_cached = all((char_dir / f"mouth_{v}.png").exists() for v in visemes)
        if all_cached:
            logger.info(f"Using persisted custom sprites for {char_name}: {char_dir}")
            return char_dir

    for v in visemes:
        sprite = None
        # Always try custom uploaded sprites first (if they exist), regardless of style setting.
        if has_custom_sprites:
            sprite = load_custom_mouth_sprite(char_name, v, cfg.face_angle, mw, mh)
            
        if sprite is None:
            # Fallback to procedural mouth SVGs
            sprite = draw_mouth_sprite(v, cfg, mw, mh)

        # Perspective scale (extra horizontal compress/flip on top of face_angle)
        if hasattr(cfg, 'perspective') and abs(cfg.perspective - 1.0) > 0.01:
            p_val = cfg.perspective
            new_w = max(4, int(mw * abs(p_val)))
            sprite = sprite.resize((new_w, mh), Image.Resampling.LANCZOS)
            if p_val < 0:
                sprite = sprite.transpose(Image.Transpose.FLIP_LEFT_RIGHT)

        # Rotation tilt
        # (negated to match CSS clockwise rotation, and multiplied by side for relative jawline tilt symmetry)
        if hasattr(cfg, 'rotation') and cfg.rotation != 0:
            side = 1 if cfg.face_angle >= 0 else -1
            actual_rot = -cfg.rotation * side
            sprite = sprite.rotate(actual_rot, resample=Image.Resampling.BICUBIC, expand=True)

        sprite.save(char_dir / f"mouth_{v}.png")

    logger.info(f"Generated mouth sprites (face_angle={cfg.face_angle:.0f}°) for {char_name}: {char_dir}")
    return char_dir

# Concatenate Audio clips
def concat_audio_clips(audio_paths: List[Path], gap_duration: float = 0.25) -> Path:
    import wave
    out_wav = OUTPUT_DIR / "final_voiceover.wav"
    if out_wav.exists():
        out_wav.unlink()
        
    # Read parameters from first WAV
    with wave.open(str(audio_paths[0]), 'rb') as w_in:
        params = w_in.getparams()
        
    sample_rate = params.framerate
    channels = params.nchannels
    sampwidth = params.sampwidth
    
    # Generate gap frames
    gap_samples = int(gap_duration * sample_rate)
    gap_data = b'\x00' * (gap_samples * channels * sampwidth)
    
    with wave.open(str(out_wav), 'wb') as w_out:
        w_out.setparams(params)
        for idx, path in enumerate(audio_paths):
            with wave.open(str(path), 'rb') as w_in:
                w_out.writeframes(w_in.readframes(w_in.getnframes()))
            # Write gap after each segment except last
            if idx < len(audio_paths) - 1:
                w_out.writeframes(gap_data)
                
    return out_wav

# Main generation endpoint
@app.post("/api/generate/lip-sync")
async def generate_lip_sync(req: LipSyncRequest):
    if not os.path.exists(req.image_path):
        raise HTTPException(status_code=404, detail="Character image not found")
        
    try:
        # Load base image and convert to RGBA
        ext = os.path.splitext(req.image_path)[1].lower()
        video_extensions = {".mp4", ".avi", ".mov", ".mkv", ".webm"}
        image_extensions = {".png", ".jpg", ".jpeg", ".bmp", ".webp"}
        is_dir = os.path.isdir(req.image_path)
        if ext in video_extensions or is_dir:
            import cv2
            cap = FrameSequenceReader(req.image_path)
            if not cap.isOpened():
                raise HTTPException(status_code=500, detail="Could not open character video/frame folder")
            ret, frame = cap.read()
            cap.release()
            if not ret:
                raise HTTPException(status_code=500, detail="Could not read first frame")
            # Convert BGR (OpenCV) to RGBA (PIL)
            frame_rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGBA)
            base_img = Image.fromarray(frame_rgb)
        else:
            base_img = Image.open(req.image_path).convert("RGBA")
        base_w, base_h = base_img.size

        # Downscale base image if it is too large and safe mode is enabled to prevent out-of-memory errors in FFmpeg
        if req.safe_mode:
            max_dim = 1280
            if base_w > max_dim or base_h > max_dim:
                if base_w >= base_h:
                    new_w = max_dim
                    new_h = int(base_h * max_dim / base_w)
                else:
                    new_h = max_dim
                    new_w = int(base_w * max_dim / base_h)
                logger.info(f"Downscaling input image from {base_w}x{base_h} to {new_w}x{new_h} for safety.")
                base_img = base_img.resize((new_w, new_h), Image.Resampling.LANCZOS)
                base_w, base_h = base_img.size

        # Ensure base dimensions are even (required for yuv420p video format)
        even_w = (base_w // 2) * 2
        even_h = (base_h // 2) * 2
        if even_w != base_w or even_h != base_h:
            base_img = base_img.resize((even_w, even_h), Image.Resampling.LANCZOS)
            base_w, base_h = base_img.size
        
        # Ensure backward compatibility for chars list
        chars = req.chars
        char_names = req.char_names
        if not chars:
            chars = []
            char_names = []
            if req.char1:
                chars.append(req.char1)
                char_names.append("Character 1")
            if req.char2:
                chars.append(req.char2)
                char_names.append("Character 2")

        # 1. Parse dialogues
        dialogues = parse_dialogue(req.script)
        if not dialogues:
            raise HTTPException(status_code=400, detail="Could not parse dialogue tags. Write tags like [Character 1] text.")
            
        logger.info(f"Parsed dialogues: {dialogues}")
        
        # 2. Generate audio segments and build cue schedules
        segment_audios = []
        global_timeline = [] # list of {"char_idx": int, "viseme": str, "start": float, "end": float}
        
        current_time = 0.0
        gap_duration = 0.25
        
        for idx, line in enumerate(dialogues):
            # Map character tag to char_idx (1-based index)
            char_idx = 1
            c_tag = line["character"].lower().strip()
            
            found = False
            for c_i, name in enumerate(char_names):
                if name.lower().strip() in c_tag or c_tag in name.lower().strip():
                    char_idx = c_i + 1
                    found = True
                    break
            
            if not found:
                m_digit = re.search(r"\d+", c_tag)
                if m_digit:
                    char_idx = int(m_digit.group())
                    if char_idx > len(chars):
                        char_idx = 1
                
            seg_filename = f"seg_{idx:02d}.wav"
            seg_path = await generate_tts_segment(line["text"], seg_filename)
            segment_audios.append(seg_path)
            
            # Fetch audio duration
            with wave.open(str(seg_path), 'rb') as w:
                frames = w.getnframes()
                rate = w.getframerate()
                duration = frames / rate
                
            # Run Rhubarb on this segment
            cues = run_rhubarb(seg_path)
            
            # Project cues onto global timeline
            for cue in cues:
                global_timeline.append({
                    "char_idx": char_idx,
                    "viseme": cue["value"],
                    "start": current_time + cue["start"],
                    "end": current_time + cue["end"]
                })
                
            current_time += duration
            if idx < len(dialogues) - 1:
                current_time += gap_duration
                
        # 3. Concatenate all audio segments into a final voiceover WAV
        final_wav = concat_audio_clips(segment_audios, gap_duration)
        logger.info(f"Final audio assembled at {final_wav} with duration {current_time:.2f}s")
        
        # 4. Generate and compile frames
        if req.video_path:
            logger.info(f"Video path provided: {req.video_path}. Launching 6DOF frame-by-frame tracker...")
            if not os.path.exists(req.video_path):
                raise HTTPException(status_code=404, detail="Input video path not found")
                
            import cv2
            from tracker_utils import HybridFaceTracker
            
            # Open sequence (video file or image folder) to read frames
            cap = FrameSequenceReader(req.video_path)
            if not cap.isOpened():
                raise RuntimeError(f"Could not open input video/folder: {req.video_path}")
                
            # Read all frames of the video
            video_frames = []
            while True:
                ret, frame = cap.read()
                if not ret:
                    break
                video_frames.append(frame)
            cap.release()
            
            num_video_frames = len(video_frames)
            logger.info(f"Loaded {num_video_frames} frames from video.")
            if num_video_frames == 0:
                raise RuntimeError("Input video contains no frames.")
                
            # Total frames to generate for the output video (depends on audio duration)
            
            # Total frames to generate for the output video (depends on audio duration)
            total_frames = int(current_time * 25.0)
            logger.info(f"Generating {total_frames} frames for video lip-sync overlay...")
                
            # Local helper to inflate 6 landmarks to 31 landmarks for a given character
            def _get_calib_pts_31(c_cfg):
                c_pts = c_cfg.landmarks_calib
                if not c_pts or len(c_pts) < 6:
                    mx, my = c_cfg.x, c_cfg.y
                    c_pts = [
                        {"x": mx,       "y": my - 28.0}, # forehead_top
                        {"x": mx - 7.0, "y": my - 15.0}, # eye_left
                        {"x": mx + 7.0, "y": my - 15.0}, # eye_right
                        {"x": mx,       "y": my -  7.0}, # nose_tip
                        {"x": mx,       "y": my},        # mouth_center
                        {"x": mx,       "y": my + 10.0}  # chin
                    ]
                parsed_pts = []
                for pt in c_pts:
                    if isinstance(pt, dict):
                        parsed_pts.append([pt['x'] * base_w / 100.0, pt['y'] * base_h / 100.0])
                    else:
                        parsed_pts.append(pt)
                
                c_pts_31 = np.zeros((31, 2), dtype=np.float32)
                if len(parsed_pts) < 31:
                    f_head = np.array(parsed_pts[0])
                    eye_l = np.array(parsed_pts[1])
                    eye_r = np.array(parsed_pts[2])
                    nose = np.array(parsed_pts[3])
                    mouth = np.array(parsed_pts[4])
                    chin = np.array(parsed_pts[5])
                    
                    eye_dist = np.linalg.norm(eye_r - eye_l)
                    face_h = chin[1] - f_head[1]
                    
                    temp_l = eye_l - np.array([eye_dist * 0.45, face_h * 0.1])
                    temp_r = eye_r + np.array([eye_dist * 0.45, -face_h * 0.1])
                    eb_l = eye_l - np.array([0.0, eye_dist * 0.25])
                    eb_r = eye_r - np.array([0.0, eye_dist * 0.25])
                    ear_l = temp_l + np.array([-eye_dist * 0.15, face_h * 0.25])
                    ear_r = temp_r + np.array([eye_dist * 0.15, face_h * 0.25])
                    ck_l = eye_l + np.array([0.0, face_h * 0.3])
                    ck_r = eye_r + np.array([0.0, face_h * 0.3])
                    
                    # Inflate 12 mouth points around mouth center
                    rx = eye_dist * 0.35
                    ry = eye_dist * 0.175
                    mouth_lms = []
                    for li in range(12):
                        theta = li * (2.0 * np.pi / 12.0)
                        ex = rx * np.cos(theta)
                        ey = ry * np.sin(theta)
                        mouth_lms.append(mouth + np.array([ex, ey]))
                        
                    j_l = chin - np.array([eye_dist * 0.75, face_h * 0.1])
                    j_r = chin + np.array([eye_dist * 0.75, face_h * 0.1])
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
                        c_pts_31[idx] = p
                else:
                    for idx, p in enumerate(parsed_pts[:31]):
                        c_pts_31[idx] = p
                return c_pts_31

            # Extract character annotations mapping
            char_anns = {}
            if req.annotations:
                if "characters" in req.annotations:
                    char_anns = req.annotations["characters"]
                else:
                    # Legacy single-character wrap
                    char_anns = {"1": req.annotations}

            poses_by_char = {}
            base_mw_by_char = {}
            base_mh_by_char = {}

            from tracker_utils import solve_pose_geometrically, LANDMARK_NAMES

            for c_i, char_cfg in enumerate(chars):
                char_idx = c_i + 1
                char_id = str(char_idx)
                
                calib_pts_31 = _get_calib_pts_31(char_cfg)
                base_eye_dist = float(np.linalg.norm(calib_pts_31[6] - calib_pts_31[5]))
                
                char_ann = char_anns.get(char_id) if req.annotations else None
                
                if char_ann:
                    logger.info(f"Using user annotations for character {char_id}")
                    base_mw = float(char_ann.get("base_mw", base_eye_dist * 0.7))
                    base_mh = float(char_ann.get("base_mh", base_eye_dist * 0.35))
                    
                    frames_to_process = {}
                    frames_list_or_dict = char_ann.get("frames", [])
                    if isinstance(frames_list_or_dict, list):
                        for f_item in frames_list_or_dict:
                            idx = f_item.get("frame_index")
                            if idx is not None:
                                frames_to_process[int(idx)] = f_item
                    elif isinstance(frames_list_or_dict, dict):
                        for k, v in frames_list_or_dict.items():
                            m = re.search(r"\d+", k)
                            idx = int(m.group()) if m else int(v.get("frame_index", k))
                            frames_to_process[idx] = v
                            
                    char_poses = []
                    for idx in range(num_video_frames):
                        if idx in frames_to_process:
                            f_item = frames_to_process[idx]
                            stored_mc = f_item.get("mouth_center")
                            mc_px = None
                            
                            if stored_mc is not None and isinstance(stored_mc, (list, tuple)) and len(stored_mc) >= 2:
                                v0 = float(stored_mc[0])
                                v1 = float(stored_mc[1])
                                if v0 > 2.0 or v1 > 2.0:
                                    mc_px = (v0, v1)
                                elif v0 > 0.0 or v1 > 0.0:
                                    mc_px = (v0 * base_w, v1 * base_h)
                                    
                            if mc_px is None:
                                f_lms = f_item.get("landmarks", {})
                                mc_lm = f_lms.get("mouth_center")
                                if mc_lm is not None:
                                    if isinstance(mc_lm, (list, tuple)) and len(mc_lm) >= 2:
                                        lx, ly = float(mc_lm[0]), float(mc_lm[1])
                                    elif isinstance(mc_lm, dict):
                                        lx, ly = float(mc_lm.get("x", 0)), float(mc_lm.get("y", 0))
                                    else:
                                        lx, ly = 0.0, 0.0
                                    if lx > 2.0 or ly > 2.0:
                                        mc_px = (lx, ly)
                                    elif lx > 0.0 or ly > 0.0:
                                        mc_px = (lx * base_w, ly * base_h)
                                        
                            lip_pts = []
                            f_lms = f_item.get("landmarks", {})
                            for li in range(12):
                                lm = f_lms.get(f"mouth_lip_{li}")
                                if lm is not None:
                                    if isinstance(lm, (list, tuple)) and len(lm) >= 2:
                                        lx, ly = float(lm[0]), float(lm[1])
                                    elif isinstance(lm, dict):
                                        lx, ly = float(lm.get("x", 0)), float(lm.get("y", 0))
                                    else:
                                        continue
                                    if lx <= 2.0 and ly <= 2.0:
                                        lx *= base_w
                                        ly *= base_h
                                    lip_pts.append([lx, ly])
                                    
                            if mc_px is None and len(lip_pts) == 12:
                                mc_px = np.mean(lip_pts, axis=0)
                                
                            if mc_px is not None:
                                mc_x, mc_y = mc_px
                                scale = float(f_item.get("scale", 1.0))
                                roll_deg = float(f_item.get("roll", 0.0))
                                yaw_deg = float(f_item.get("yaw", 0.0))
                                pitch_deg = float(f_item.get("pitch", 0.0))
                                
                                mouth_mask_poly = f_item.get("mouth_mask_poly", [])
                                if not mouth_mask_poly:
                                    if len(lip_pts) == 12:
                                        mouth_mask_poly = lip_pts
                                    else:
                                        rx = (base_mw / 2.0) * scale
                                        ry = (base_mh / 2.0) * scale
                                        roll_rad = np.radians(-roll_deg)
                                        mouth_mask_poly = []
                                        for li in range(12):
                                            theta = li * (2.0 * np.pi / 12.0)
                                            ex = rx * np.cos(theta)
                                            ey = ry * np.sin(theta)
                                            rx_rot = ex * np.cos(roll_rad) - ey * np.sin(roll_rad)
                                            ry_rot = ex * np.sin(roll_rad) + ey * np.cos(roll_rad)
                                            mouth_mask_poly.append([mc_x + rx_rot, mc_y + ry_rot])
                                            
                                f_item.update({
                                    "scale": scale,
                                    "roll": roll_deg,
                                    "yaw": yaw_deg,
                                    "pitch": pitch_deg,
                                    "mouth_center": [mc_x, mc_y],
                                    "mouth_mask_poly": mouth_mask_poly
                                })
                                char_poses.append(f_item)
                            else:
                                # Fallback 31-point solve
                                pts_31 = np.zeros((31, 2), dtype=np.float32)
                                if f_lms:
                                    for lm_idx, name in enumerate(LANDMARK_NAMES):
                                        pt = f_lms.get(name)
                                        if pt is None:
                                            continue
                                        if isinstance(pt, (list, tuple)):
                                            px_val, py_val = float(pt[0]), float(pt[1])
                                        elif isinstance(pt, dict):
                                            px_val, py_val = float(pt.get("x", 0)), float(pt.get("y", 0))
                                        else:
                                            continue
                                        if px_val <= 2.0 and py_val <= 2.0:
                                            px_val *= base_w
                                            py_val *= base_h
                                        pts_31[lm_idx] = [px_val, py_val]
                                    pose = solve_pose_geometrically(pts_31, calib_pts_31)
                                    cx, cy = pose["mouth_center"]
                                    mouth_mask_poly = pts_31[12:24].tolist()
                                    f_item.update({
                                        "scale": pose["scale"], "roll": pose["roll"],
                                        "yaw": pose["yaw"], "pitch": pose["pitch"],
                                        "mouth_center": pose["mouth_center"],
                                        "mouth_mask_poly": mouth_mask_poly
                                    })
                                char_poses.append(f_item)
                        else:
                            char_poses.append(char_poses[-1] if char_poses else {
                                "scale": 1.0, "roll": 0.0, "yaw": 0.0, "pitch": 0.0,
                                "mouth_center": [calib_pts_31[12, 0], calib_pts_31[12, 1]],
                                "mouth_mask_poly": []
                            })
                    poses_by_char[char_id] = char_poses
                    base_mw_by_char[char_id] = base_mw
                    base_mh_by_char[char_id] = base_mh
                    
                else:
                    # Run tracker live for this character
                    logger.info(f"Running live tracker for character {char_id}")
                    calib_pts = char_cfg.landmarks_calib
                    if not calib_pts or len(calib_pts) < 6:
                        mx, my = (char_cfg.x / 100.0) * base_w, (char_cfg.y / 100.0) * base_h
                        calib_pts = [
                            {"x": mx,       "y": my - 28.0}, # forehead_top
                            {"x": mx - 7.0, "y": my - 15.0}, # eye_left
                            {"x": mx + 7.0, "y": my - 15.0}, # eye_right
                            {"x": mx,       "y": my -  7.0}, # nose_tip
                            {"x": mx,       "y": my},        # mouth_center
                            {"x": mx,       "y": my + 10.0}  # chin
                        ]
                    from tracker_utils import HybridFaceTracker
                    model_dir = BASE_DIR.parent / "model_cache" / "models"
                    tracker = HybridFaceTracker(calib_pts, video_frames[0], model_dir)
                    
                    char_poses = []
                    for idx, frame in enumerate(video_frames):
                        pose = tracker.track_frame(frame)
                        char_poses.append(pose)
                    poses_by_char[char_id] = char_poses
                    base_mw_by_char[char_id] = max(10, int((char_cfg.width / 100.0) * base_w))
                    base_mh_by_char[char_id] = max(6,  int((char_cfg.height / 100.0) * base_h))

            # Determine the active smoothing level
            active_smoothing = req.smoothing_level or 3
            if req.annotations and isinstance(req.annotations, dict):
                saved_smoothing = req.annotations.get("selected_smoothing")
                if saved_smoothing is not None:
                    active_smoothing = int(saved_smoothing)

            # Decide which levels to render
            render_levels = [1, 2, 3, 4] if req.render_all_smoothing else [active_smoothing]

            # Setup output directories for frames
            frames_dirs = {}
            for lvl in render_levels:
                dir_name = f"frames_{lvl}" if req.render_all_smoothing else "frames"
                path = OUTPUT_DIR / dir_name
                if path.exists():
                    import shutil
                    shutil.rmtree(path)
                path.mkdir(parents=True, exist_ok=True)
                frames_dirs[lvl] = path

            # Smooth poses for each character, for each level
            smoothed_poses_by_char = {}
            for char_id, char_poses in poses_by_char.items():
                smoothed_poses_by_char[char_id] = {}
                for lvl in render_levels:
                    smoothed_poses_by_char[char_id][lvl] = smooth_poses(char_poses, lvl)

            # Main rendering loop over all total_frames
            for lvl in render_levels:
                for f in range(total_frames):
                    t = f * 0.04
                    
                    # Determine active visemes for each character
                    active_visemes = ['X'] * len(chars)
                    for cue in global_timeline:
                        if cue["start"] <= t <= cue["end"]:
                            c_idx = cue["char_idx"] - 1
                            if 0 <= c_idx < len(chars):
                                active_visemes[c_idx] = cue["viseme"]
                    
                    # Retrieve frame base image
                    frame_idx = min(f, num_video_frames - 1)
                    frame_bgr = video_frames[frame_idx]
                    frame_img_base = Image.fromarray(cv2.cvtColor(frame_bgr, cv2.COLOR_BGR2RGBA))
                    
                    frame_img = frame_img_base.copy()
                    
                    # Render each character onto the frame
                    for c_i, char_cfg in enumerate(chars):
                        char_idx = c_i + 1
                        char_id = str(char_idx)
                        
                        pose = smoothed_poses_by_char[char_id][lvl][frame_idx]
                        scale = pose["scale"]
                        base_mw = base_mw_by_char[char_id]
                        base_mh = base_mh_by_char[char_id]
                        mw = max(10, int(base_mw * scale))
                        mh = max(6,  int(base_mh * scale))
                        
                        # Build frame config
                        frame_cfg = CharacterConfig(
                            x=char_cfg.x,
                            y=char_cfg.y,
                            width=char_cfg.width,
                            height=char_cfg.height,
                            style=char_cfg.style,
                            skin_color=char_cfg.skin_color,
                            line_color=char_cfg.line_color,
                            rotation=0.0,
                            perspective=1.0,
                            face_angle=pose["yaw"]
                        )
                        
                        vis = active_visemes[c_i]
                        # Always try custom uploaded sprites first if they exist/are configured.
                        sprite = None
                        using_custom_sprite = False
                        req_override = getattr(req, 'sprite_char_override', None)
                        cname = None
                        if req_override and c_i == 0:
                            cname = req_override
                        elif getattr(char_cfg, 'sprite_char_override', None):
                            cname = char_cfg.sprite_char_override
                        elif char_cfg.style.lower() in ['designed', 'custom']:
                            cname = char_names[c_i] if char_names and c_i < len(char_names) else f"char{c_i+1}"

                        if cname:
                            custom_dir = STATIC_DIR / "uploads" / "custom_mouths" / cname
                            if custom_dir.exists():
                                # Size custom sprite using the same slider-based formula as SVG sprites:
                                # cfg.width% of frame width, cfg.height% of frame height, scaled by face scale.
                                sprite_w = max(10, int((char_cfg.width  / 100.0) * base_w * scale))
                                sprite_h = max(6,  int((char_cfg.height / 100.0) * base_h * scale))
                                sprite = load_custom_mouth_sprite(cname, vis, pose["yaw"], sprite_w, sprite_h)
                                if sprite is not None:
                                    using_custom_sprite = True

                        # Mouth area handling
                        mouth_mask_poly = pose.get("mouth_mask_poly", [])
                        cx, cy = pose["mouth_center"]

                        # Calculate target dimensions first to use for custom sprite erase quad
                        target_w = max(10, int((char_cfg.width / 100.0) * base_w * scale))
                        tracked_h = 0.0
                        if len(mouth_mask_poly) >= 10:
                            tracked_h = float(np.linalg.norm(np.array(mouth_mask_poly[3]) - np.array(mouth_mask_poly[9])))
                        viseme_aperture = {'A': 1.0, 'B': 0.3, 'C': 0.8, 'D': 0.9, 'E': 0.6, 'F': 0.7, 'G': 0.5, 'H': 0.4, 'X': 0.1}
                        min_open_h = (char_cfg.height / 100.0) * base_h * scale * viseme_aperture.get(vis, 0.1)
                        target_h = max(6, int(max(tracked_h, min_open_h)))

                        # 1. Erase the mouth underlay first (always, to prevent ghosting)
                        skin_rgb = (255, 204, 153, 255)
                        try:
                            # Sample dynamic skin color
                            sample_poly = mouth_mask_poly if mouth_mask_poly else []
                            if not sample_poly:
                                rx = target_w / 2.0
                                ry = target_h / 2.0
                                sample_poly = [
                                    [cx - rx, cy - ry], [cx + rx, cy - ry],
                                    [cx + rx, cy + ry], [cx - rx, cy + ry]
                                ]
                            skin_rgb = sample_dynamic_skin_color(frame_bgr, sample_poly)
                        except Exception as e:
                            logger.error(f"Error sampling dynamic skin color: {e}")
                            try:
                                skin_rgb = ImageColor.getrgb(char_cfg.skin_color)
                            except:
                                pass

                        draw = ImageDraw.Draw(frame_img)
                        if using_custom_sprite:
                            # Erase a quad matching the custom mouth width and calibrated mouth height to cover the full original mouth line
                            theta = np.radians(pose["roll"])
                            cos_t = np.cos(theta)
                            sin_t = np.sin(theta)
                            erase_w = target_w * 1.10
                            calibrated_h = (char_cfg.height / 100.0) * base_h * scale
                            erase_h = max(8, int(calibrated_h * 1.25))
                            half_ew = erase_w / 2.0
                            half_eh = erase_h / 2.0
                            
                            erase_offsets = [
                                (-half_ew, -half_eh),
                                (half_ew, -half_eh),
                                (half_ew, half_eh),
                                (-half_ew, half_eh)
                            ]
                            erase_corners = []
                            for dx, dy in erase_offsets:
                                rx = dx * cos_t - dy * sin_t
                                ry = dx * sin_t + dy * cos_t
                                erase_corners.append((int(cx + rx), int(cy + ry)))
                            draw.polygon(erase_corners, fill=skin_rgb)
                        else:
                            if mouth_mask_poly:
                                poly_pts = np.array(mouth_mask_poly, dtype=np.float32)
                                centroid = np.mean(poly_pts, axis=0)
                                outline_width = float(char_cfg.outline_width) if hasattr(char_cfg, 'outline_width') else 2.0
                                expanded_pts = []
                                for P in poly_pts:
                                    diff = P - centroid
                                    dist = np.linalg.norm(diff)
                                    factor = 1.0 + (outline_width + 4.0) / (dist + 1e-5)
                                    P_expanded = centroid + diff * factor
                                    expanded_pts.append((int(P_expanded[0]), int(P_expanded[1])))
                                draw.polygon(expanded_pts, fill=skin_rgb)

                        # 2. Render and paste the mouth sprite
                        if using_custom_sprite:
                            # Convert sprite to NumPy array
                            sprite_np = np.array(sprite)
                            sh, sw = sprite_np.shape[:2]
                            
                            # Compute rotated box corners for rendering
                            theta = np.radians(pose["roll"])
                            cos_t = np.cos(theta)
                            sin_t = np.sin(theta)
                            half_w = target_w / 2.0
                            half_h = target_h / 2.0
                            
                            offsets = [
                                (-half_w, -half_h),
                                (half_w, -half_h),
                                (half_w, half_h),
                                (-half_w, half_h)
                            ]
                            
                            rotated_corners = []
                            for dx, dy in offsets:
                                rx = dx * cos_t - dy * sin_t
                                ry = dx * sin_t + dy * cos_t
                                rotated_corners.append([cx + rx, cy + ry])
                                
                            # Warp sprite using OpenCV
                            src_pts = np.array([[0, 0], [sw - 1, 0], [sw - 1, sh - 1], [0, sh - 1]], dtype=np.float32)
                            dst_pts = np.array(rotated_corners, dtype=np.float32)
                            
                            M = cv2.getPerspectiveTransform(src_pts, dst_pts)
                            frame_w, frame_h = frame_img.size
                            warped_sprite = cv2.warpPerspective(sprite_np, M, (frame_w, frame_h), flags=cv2.INTER_LANCZOS4, borderMode=cv2.BORDER_CONSTANT, borderValue=(0,0,0,0))
                            
                            warped_sprite_img = Image.fromarray(warped_sprite, 'RGBA')
                            frame_img.paste(warped_sprite_img, (0, 0), warped_sprite_img)
                        else:
                            # Procedural SVG path
                            if sprite is None:
                                sprite = draw_mouth_sprite(vis, frame_cfg, mw, mh)
                            if abs(pose["roll"]) > 0.01:
                                sprite = sprite.rotate(-pose["roll"], resample=Image.Resampling.BICUBIC, expand=True)
                            sw, sh = sprite.size
                            frame_img.paste(sprite, (int(cx - sw // 2), int(cy - sh // 2)), sprite)
                    
                    # Save frame
                    frame_img.convert("RGBA").save(frames_dirs[lvl] / f"frame_{f:05d}.png")
        else:
            # 4. Generate and cache mouth sprite assets for all characters (Static Image Mode)
            char_mouth_dirs = []
            char_sprites_list = []
            for c_i, char_cfg in enumerate(chars):
                # Use the real character name or the override name so custom sprite
                # uploads stored under custom_mouths/{char_name}/ are found correctly.
                req_override = getattr(req, 'sprite_char_override', None)
                if req_override and c_i == 0:
                    cname = req_override
                else:
                    cname = getattr(char_cfg, 'sprite_char_override', None) or (char_names[c_i] if char_names and c_i < len(char_names) else f"char{c_i+1}")
                mouth_dir = generate_character_mouth_set(char_cfg, cname, base_w, base_h)
                char_mouth_dirs.append(mouth_dir)
                sprites = {v: Image.open(mouth_dir / f"mouth_{v}.png") for v in ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'X']}
                char_sprites_list.append(sprites)
            
            # Check if base path is a video/frame folder and load frames if so
            ext = os.path.splitext(req.image_path)[1].lower()
            video_extensions = {".mp4", ".avi", ".mov", ".mkv", ".webm"}
            is_video = ext in video_extensions or os.path.isdir(req.image_path)
            
            video_frames = []
            if is_video:
                import cv2
                cap = FrameSequenceReader(req.image_path)
                if cap.isOpened():
                    while True:
                        ret, frame = cap.read()
                        if not ret:
                            break
                        video_frames.append(frame)
                    cap.release()
                logger.info(f"Loaded {len(video_frames)} background frames from video base character.")
            
            # 5. Track mouth positions per-frame using LK Optical Flow (for video mode)
            # When the base character is a video the face moves every frame.
            # We MUST track the calibrated mouth point with optical flow so the sprite follows the face.
            # Without this, the mouth stays at a fixed pixel coordinate while the face moves → static bug.
            if is_video and video_frames:
                import cv2
                lk_params = dict(
                    winSize=(31, 31),
                    maxLevel=3,
                    criteria=(cv2.TERM_CRITERIA_EPS | cv2.TERM_CRITERIA_COUNT, 30, 0.01)
                )
                # Build initial tracked points for each character's mouth center
                # Each char has its own calibrated mouth pixel position as the seed
                tracked_centers = []  # list of (cx, cy) lists, one per character, per video frame
                
                # Seed positions from char_cfg x/y percentage → pixels
                init_pts = np.array(
                    [[(cfg.x / 100.0) * base_w, (cfg.y / 100.0) * base_h] for cfg in chars],
                    dtype=np.float32
                ).reshape(-1, 1, 2)  # shape: (num_chars, 1, 2)
                
                prev_gray = cv2.cvtColor(video_frames[0], cv2.COLOR_BGR2GRAY)
                # Frame 0: use seed positions directly
                tracked_centers.append([(
                    int(init_pts[i, 0, 0]), int(init_pts[i, 0, 1])
                ) for i in range(len(chars))])
                
                curr_pts = init_pts.copy()
                for v_idx in range(1, len(video_frames)):
                    curr_gray = cv2.cvtColor(video_frames[v_idx], cv2.COLOR_BGR2GRAY)
                    next_pts, status, _ = cv2.calcOpticalFlowPyrLK(
                        prev_gray, curr_gray, curr_pts, None, **lk_params
                    )
                    # Accept tracked points; fall back to previous position if tracking failed
                    status = status.reshape(-1)
                    for i in range(len(chars)):
                        if status[i] == 0:
                            next_pts[i] = curr_pts[i]  # keep previous position
                    tracked_centers.append([(
                        int(float(next_pts[i, 0, 0])), int(float(next_pts[i, 0, 1]))
                    ) for i in range(len(chars))])
                    curr_pts = next_pts.copy()
                    prev_gray = curr_gray
                logger.info(f"LK optical flow tracking complete for {len(video_frames)} frames, {len(chars)} character(s).")
            else:
                # Static image: fixed position every frame
                fixed = [(int((cfg.x / 100.0) * base_w), int((cfg.y / 100.0) * base_h)) for cfg in chars]
                tracked_centers = [fixed] * int(current_time * 25.0 + 1)

            # 6. Overlay and compile frames
            total_frames = int(current_time * 25.0)
            logger.info(f"Generating {total_frames} frames for video overlay...")
            
            frames_dir = OUTPUT_DIR / "frames"
            if frames_dir.exists():
                import shutil
                shutil.rmtree(frames_dir)
            frames_dir.mkdir(parents=True, exist_ok=True)
            
            # Determine the active smoothing level
            active_smoothing = req.smoothing_level or 3
            if req.annotations and isinstance(req.annotations, dict):
                saved_smoothing = req.annotations.get("selected_smoothing")
                if saved_smoothing is not None:
                    active_smoothing = int(saved_smoothing)

            # Decide which levels to render
            render_levels = [1, 2, 3, 4] if req.render_all_smoothing else [active_smoothing]

            # 1. Prepare smoothed poses / centers for each level in render_levels
            smoothed_poses_dict = {}
            smoothed_centers_dict = {}
            
            if req.annotations:
                for lvl in render_levels:
                    smoothed_poses_dict[lvl] = smooth_poses(poses, lvl)
            else:
                for lvl in render_levels:
                    smoothed_centers_dict[lvl] = smooth_tracked_centers(tracked_centers, lvl)

            # Setup output directories for frames
            frames_dirs = {}
            for lvl in render_levels:
                dir_name = f"frames_{lvl}" if req.render_all_smoothing else "frames"
                path = OUTPUT_DIR / dir_name
                if path.exists():
                    import shutil
                    shutil.rmtree(path)
                path.mkdir(parents=True, exist_ok=True)
                frames_dirs[lvl] = path

            # Main rendering loop
            for f in range(total_frames):
                t = f * 0.04
                
                # Find active viseme(s)
                if req.annotations:
                    vis = 'X'
                    for cue in global_timeline:
                        if cue["char_idx"] == 1 and cue["start"] <= t <= cue["end"]:
                            vis = cue["viseme"]
                            break
                else:
                    active_visemes = ['X'] * len(chars)
                    for cue in global_timeline:
                        if cue["start"] <= t <= cue["end"]:
                            c_idx = cue["char_idx"] - 1
                            if 0 <= c_idx < len(chars):
                                active_visemes[c_idx] = cue["viseme"]
                
                # Load frame base image
                if req.annotations:
                    frame_idx = min(f, num_video_frames - 1)
                    frame_bgr = video_frames[frame_idx]
                    frame_img_base = Image.fromarray(cv2.cvtColor(frame_bgr, cv2.COLOR_BGR2RGBA))
                else:
                    if is_video and video_frames:
                        frame_idx = min(f, len(video_frames) - 1)
                        frame_bgr = video_frames[frame_idx]
                        frame_img_base = Image.fromarray(cv2.cvtColor(frame_bgr, cv2.COLOR_BGR2RGBA))
                    else:
                        frame_img_base = base_img.copy()

                # Render each smoothing level
                for lvl in render_levels:
                    frame_img = frame_img_base.copy()
                    
                    if req.annotations:
                        # Annotation Lab Path
                        pose = smoothed_poses_dict[lvl][frame_idx]
                        scale = pose["scale"]
                        mw = max(10, int(base_mw * scale))
                        mh = max(6,  int(base_mh * scale))
                        
                        frame_cfg = CharacterConfig(
                            x=char_cfg.x, y=char_cfg.y,
                            width=char_cfg.width, height=char_cfg.height,
                            style=char_cfg.style, skin_color=char_cfg.skin_color,
                            line_color=char_cfg.line_color, rotation=0.0, perspective=1.0,
                            face_angle=pose["yaw"]
                        )
                        
                        # Always try custom uploaded sprites first if they exist/are configured.
                        sprite = None
                        using_custom_sprite = False
                        req_override = getattr(req, 'sprite_char_override', None)
                        ann_cname = None
                        if req_override:
                            ann_cname = req_override
                        elif getattr(char_cfg, 'sprite_char_override', None):
                            ann_cname = char_cfg.sprite_char_override
                        elif char_cfg.style.lower() in ['designed', 'custom']:
                            ann_cname = char_names[0] if char_names else "Character 1"

                        if ann_cname:
                            custom_dir = STATIC_DIR / "uploads" / "custom_mouths" / ann_cname
                            if custom_dir.exists():
                                # Size custom sprite using the same slider-based formula as SVG sprites:
                                # cfg.width% of frame width, cfg.height% of frame height, scaled by face scale.
                                sprite_w = max(10, int((char_cfg.width  / 100.0) * base_w * scale))
                                sprite_h = max(6,  int((char_cfg.height / 100.0) * base_h * scale))
                                sprite = load_custom_mouth_sprite(ann_cname, vis, pose["yaw"], sprite_w, sprite_h)
                                if sprite is not None:
                                    using_custom_sprite = True

                        # Mouth area handling
                        mouth_mask_poly = pose.get("mouth_mask_poly", [])
                        cx, cy = pose["mouth_center"]

                        # Calculate target dimensions first to use for custom sprite erase quad
                        target_w = max(10, int((char_cfg.width / 100.0) * base_w * scale))
                        tracked_h = 0.0
                        if len(mouth_mask_poly) >= 10:
                            tracked_h = float(np.linalg.norm(np.array(mouth_mask_poly[3]) - np.array(mouth_mask_poly[9])))
                        viseme_aperture = {'A': 1.0, 'B': 0.3, 'C': 0.8, 'D': 0.9, 'E': 0.6, 'F': 0.7, 'G': 0.5, 'H': 0.4, 'X': 0.1}
                        min_open_h = (char_cfg.height / 100.0) * base_h * scale * viseme_aperture.get(vis, 0.1)
                        target_h = max(6, int(max(tracked_h, min_open_h)))

                        # 1. Erase the mouth underlay first (always, to prevent ghosting)
                        skin_rgb = (255, 204, 153, 255)
                        try:
                            # Sample dynamic skin color
                            sample_poly = mouth_mask_poly if mouth_mask_poly else []
                            if not sample_poly:
                                rx = target_w / 2.0
                                ry = target_h / 2.0
                                sample_poly = [
                                    [cx - rx, cy - ry], [cx + rx, cy - ry],
                                    [cx + rx, cy + ry], [cx - rx, cy + ry]
                                ]
                            skin_rgb = sample_dynamic_skin_color(frame_bgr, sample_poly)
                        except Exception as e:
                            logger.error(f"Error sampling dynamic skin color: {e}")
                            try:
                                skin_rgb = ImageColor.getrgb(char_cfg.skin_color)
                            except:
                                pass

                        draw = ImageDraw.Draw(frame_img)
                        if using_custom_sprite:
                            # Erase a quad matching the custom mouth width and calibrated mouth height to cover the full original mouth line
                            theta = np.radians(pose["roll"])
                            cos_t = np.cos(theta)
                            sin_t = np.sin(theta)
                            erase_w = target_w * 1.10
                            calibrated_h = (char_cfg.height / 100.0) * base_h * scale
                            erase_h = max(8, int(calibrated_h * 1.25))
                            half_ew = erase_w / 2.0
                            half_eh = erase_h / 2.0
                            
                            erase_offsets = [
                                (-half_ew, -half_eh),
                                (half_ew, -half_eh),
                                (half_ew, half_eh),
                                (-half_ew, half_eh)
                            ]
                            erase_corners = []
                            for dx, dy in erase_offsets:
                                rx = dx * cos_t - dy * sin_t
                                ry = dx * sin_t + dy * cos_t
                                erase_corners.append((int(cx + rx), int(cy + ry)))
                            draw.polygon(erase_corners, fill=skin_rgb)
                        else:
                            if mouth_mask_poly:
                                poly_pts = np.array(mouth_mask_poly, dtype=np.float32)
                                centroid = np.mean(poly_pts, axis=0)
                                outline_width = float(char_cfg.outline_width) if hasattr(char_cfg, 'outline_width') else 2.0
                                expanded_pts = []
                                for P in poly_pts:
                                    diff = P - centroid
                                    dist = np.linalg.norm(diff)
                                    factor = 1.0 + (outline_width + 4.0) / (dist + 1e-5)
                                    P_expanded = centroid + diff * factor
                                    expanded_pts.append((int(P_expanded[0]), int(P_expanded[1])))
                                draw.polygon(expanded_pts, fill=skin_rgb)

                        # 2. Render and paste the mouth sprite
                        if using_custom_sprite:
                            # Convert sprite to NumPy array
                            sprite_np = np.array(sprite)
                            sh, sw = sprite_np.shape[:2]
                            
                            # Compute rotated box corners for rendering
                            theta = np.radians(pose["roll"])
                            cos_t = np.cos(theta)
                            sin_t = np.sin(theta)
                            half_w = target_w / 2.0
                            half_h = target_h / 2.0
                            
                            offsets = [
                                (-half_w, -half_h),
                                (half_w, -half_h),
                                (half_w, half_h),
                                (-half_w, half_h)
                            ]
                            
                            rotated_corners = []
                            for dx, dy in offsets:
                                rx = dx * cos_t - dy * sin_t
                                ry = dx * sin_t + dy * cos_t
                                rotated_corners.append([cx + rx, cy + ry])
                                
                            # Warp sprite using OpenCV
                            src_pts = np.array([[0, 0], [sw - 1, 0], [sw - 1, sh - 1], [0, sh - 1]], dtype=np.float32)
                            dst_pts = np.array(rotated_corners, dtype=np.float32)
                            
                            M = cv2.getPerspectiveTransform(src_pts, dst_pts)
                            frame_w, frame_h = frame_img.size
                            warped_sprite = cv2.warpPerspective(sprite_np, M, (frame_w, frame_h), flags=cv2.INTER_LANCZOS4, borderMode=cv2.BORDER_CONSTANT, borderValue=(0,0,0,0))
                            
                            warped_sprite_img = Image.fromarray(warped_sprite, 'RGBA')
                            frame_img.paste(warped_sprite_img, (0, 0), warped_sprite_img)
                        else:
                            # Procedural SVG path
                            if sprite is None:
                                sprite = draw_mouth_sprite(vis, frame_cfg, mw, mh)
                            if abs(pose["roll"]) > 0.01:
                                sprite = sprite.rotate(-pose["roll"], resample=Image.Resampling.BICUBIC, expand=True)
                            sw, sh = sprite.size
                            frame_img.paste(sprite, (int(cx - sw // 2), int(cy - sh // 2)), sprite)
                    
                    else:
                        # Static Lab / Non-Annotations Path
                        tc_idx = min(f, len(smoothed_centers_dict[lvl]) - 1)
                        frame_centers = smoothed_centers_dict[lvl][tc_idx]
                        
                        for c_i in range(len(chars)):
                            char_cfg = chars[c_i]
                            vis = active_visemes[c_i]
                            sprite = char_sprites_list[c_i][vis]
                            sw, sh = sprite.size
                            cx, cy = frame_centers[c_i]
                            
                            # Check if custom sprites are used
                            req_override = getattr(req, 'sprite_char_override', None)
                            cname = req_override if (req_override and c_i == 0) else (getattr(char_cfg, 'sprite_char_override', None) or (char_names[c_i] if char_names and c_i < len(char_names) else f"char{c_i+1}"))
                            custom_base_dir = STATIC_DIR / "uploads" / "custom_mouths" / cname
                            using_custom_sprite = (char_cfg.style.lower() in ['designed', 'custom'] or getattr(char_cfg, 'sprite_char_override', None) or (req_override and c_i == 0)) and custom_base_dir.exists()
                            
                            if using_custom_sprite:
                                # Sample dynamic skin color from background frame
                                rx = sw / 2.0
                                ry = sh / 2.0
                                sample_poly = [
                                    [cx - rx, cy - ry], [cx + rx, cy - ry],
                                    [cx + rx, cy + ry], [cx - rx, cy + ry]
                                ]
                                skin_rgb = (255, 204, 153, 255)
                                try:
                                    if not (is_video and video_frames):
                                        # For static image base, convert frame_img_base
                                        frame_bgr_sample = cv2.cvtColor(np.array(frame_img_base), cv2.COLOR_RGBA2BGR)
                                    else:
                                        frame_bgr_sample = frame_bgr
                                    skin_rgb = sample_dynamic_skin_color(frame_bgr_sample, sample_poly)
                                except Exception as e:
                                    logger.error(f"Error sampling skin color in static path: {e}")
                                    try:
                                        skin_rgb = ImageColor.getrgb(char_cfg.skin_color)
                                    except:
                                        pass
                                
                                # Erase the original mouth underlay with 1.25 height multiplier
                                draw = ImageDraw.Draw(frame_img)
                                erase_w = sw * 1.10
                                erase_h = sh * 1.25
                                half_ew = erase_w / 2.0
                                half_eh = erase_h / 2.0
                                draw.rectangle([cx - half_ew, cy - half_eh, cx + half_ew, cy + half_eh], fill=skin_rgb)
                                
                            frame_img.paste(sprite, (cx - sw // 2, cy - sh // 2), sprite)
                            
                    # Save Frame
                    frame_img.convert("RGBA").save(frames_dirs[lvl] / f"frame_{f:05d}.png")

            # Clean up base image to free RAM
            del frame_img_base

        # 2. Compile video(s) using FFmpeg
        video_urls = {}
        for lvl in render_levels:
            out_name = f"output_smooth_{lvl}.mp4" if req.render_all_smoothing else "output.mp4"
            final_mp4 = OUTPUT_DIR / out_name
            if final_mp4.exists():
                final_mp4.unlink()
                
            cmd = [
                str(FFMPEG_PATH),
                "-y",
                "-r", "25",
                "-i", str(frames_dirs[lvl] / "frame_%05d.png"),
                "-i", str(final_wav),
                "-vf", "scale=trunc(iw/2)*2:trunc(ih/2)*2",
                "-c:v", "libx264",
                "-pix_fmt", "yuv420p",
                "-movflags", "+faststart",
                "-c:a", "aac",
                "-b:a", "192k",
                "-shortest",
                str(final_mp4)
            ]
            
            logger.info(f"Running FFmpeg stitch cmd for level {lvl}: {' '.join(cmd)}")
            result = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
            if result.returncode != 0:
                err_msg = result.stderr or ""
                if "cannot allocate memory" in err_msg.lower() or "out of memory" in err_msg.lower():
                    raise HTTPException(
                        status_code=500,
                        detail="FFmpeg ran out of memory. Please close other apps or use Safe Mode."
                    )
                raise RuntimeError(f"FFmpeg render failed: {err_msg}")
                
            video_urls[str(lvl)] = f"/static/output/{out_name}"
            
        # Clean up temporary frames directories
        for lvl, path in frames_dirs.items():
            try:
                import shutil
                shutil.rmtree(path)
            except:
                pass
                
        logger.info("Video lipsync compilation complete!")
        if req.render_all_smoothing:
            return {
                "status": "ok",
                "video_url": f"/static/output/output_smooth_{active_smoothing}.mp4",
                "videos": video_urls
            }
        else:
            return {
                "status": "ok",
                "video_url": "/static/output/output.mp4"
            }
    except Exception as e:
        logger.error(f"Lip-sync generation failed: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))
        
def smooth_poses(poses: list, level: int) -> list:
    """
    Applies temporal moving average smoothing to pose variables:
    - level 1: Raw (no smoothing)
    - level 2: Light smoothing (window = 3)
    - level 3: Medium smoothing (window = 5)
    - level 4: Strong smoothing (window = 9)
    """
    if level == 1 or not poses:
        return poses
        
    import copy
    smoothed = copy.deepcopy(poses)
    n = len(poses)
    
    w = 3 if level == 2 else (5 if level == 3 else 9)
    half = w // 2
    
    for i in range(n):
        start_idx = max(0, i - half)
        end_idx = min(n - 1, i + half)
        window = poses[start_idx:end_idx + 1]
        k = len(window)
        
        # Average scale, roll, yaw, pitch
        avg_scale = sum(p.get("scale", 1.0) for p in window) / k
        avg_roll = sum(p.get("roll", 0.0) for p in window) / k
        avg_yaw = sum(p.get("yaw", 0.0) for p in window) / k
        avg_pitch = sum(p.get("pitch", 0.0) for p in window) / k
        
        # Average mouth center
        avg_cx = sum(p.get("mouth_center", [0.0, 0.0])[0] for p in window) / k
        avg_cy = sum(p.get("mouth_center", [0.0, 0.0])[1] for p in window) / k
        
        # Average mouth mask poly points
        avg_poly = []
        poly_len = len(poses[i].get("mouth_mask_poly", []))
        if poly_len > 0:
            for pt_idx in range(poly_len):
                sum_px = 0.0
                sum_py = 0.0
                valid_count = 0
                for p in window:
                    poly = p.get("mouth_mask_poly", [])
                    if len(poly) > pt_idx:
                        sum_px += poly[pt_idx][0]
                        sum_py += poly[pt_idx][1]
                        valid_count += 1
                if valid_count > 0:
                    avg_poly.append([sum_px / valid_count, sum_py / valid_count])
                else:
                    avg_poly.append(poses[i]["mouth_mask_poly"][pt_idx])
                    
        smoothed[i]["scale"] = avg_scale
        smoothed[i]["roll"] = avg_roll
        smoothed[i]["yaw"] = avg_yaw
        smoothed[i]["pitch"] = avg_pitch
        smoothed[i]["mouth_center"] = [avg_cx, avg_cy]
        if avg_poly:
            smoothed[i]["mouth_mask_poly"] = avg_poly
            
    return smoothed

def smooth_tracked_centers(centers: list, level: int) -> list:
    """
    Applies moving average to tracked centers array in Static Lab.
    """
    if level == 1 or not centers:
        return centers
        
    import copy
    smoothed = copy.deepcopy(centers)
    n = len(centers)
    num_chars = len(centers[0])
    
    w = 3 if level == 2 else (5 if level == 3 else 9)
    half = w // 2
    
    for i in range(n):
        start_idx = max(0, i - half)
        end_idx = min(n - 1, i + half)
        window = centers[start_idx:end_idx + 1]
        k = len(window)
        
        for c_i in range(num_chars):
            avg_cx = sum(win[c_i][0] for win in window) / k
            avg_cy = sum(win[c_i][1] for win in window) / k
            smoothed[i][c_i] = (int(avg_cx), int(avg_cy))
            
    return smoothed

class SelectSmoothingRequest(BaseModel):
    character_name: str
    session_id: str
    selected_smoothing: int

@app.post("/api/dataset/select-smoothing")
async def select_smoothing(req: SelectSmoothingRequest):
    char_dir = BASE_DIR.parent / "projects" / "characters" / req.character_name / "datasets" / req.session_id
    ann_path = char_dir / "annotations.json"
    if not ann_path.exists():
        raise HTTPException(status_code=404, detail="Dataset annotations not found")
        
    try:
        # Load and update annotations.json
        with open(ann_path, "r") as f:
            data = json.load(f)
            
        data["selected_smoothing"] = req.selected_smoothing
        
        with open(ann_path, "w") as f:
            json.dump(data, f, indent=2)
            
        # Delete redundant video files, leaving only the selected one renamed/copied to output.mp4
        for lvl in [1, 2, 3, 4]:
            video_file = OUTPUT_DIR / f"output_smooth_{lvl}.mp4"
            if lvl != req.selected_smoothing:
                if video_file.exists():
                    try:
                        video_file.unlink()
                    except Exception as err:
                        logger.warning(f"Failed to delete redundant video {video_file}: {err}")
            else:
                if video_file.exists():
                    import shutil
                    shutil.copy2(video_file, OUTPUT_DIR / "output.mp4")
                    
        logger.info(f"Saved selected smoothing {req.selected_smoothing} and cleaned up other levels.")
        return {"status": "ok", "message": f"Smoothing level {req.selected_smoothing} selected and saved."}
    except Exception as e:
        logger.error(f"Failed to confirm smoothing selection: {e}")
        raise HTTPException(status_code=500, detail=str(e))

class SaveDatasetRequest(BaseModel):
    character_name: str
    session_id: str
    video_path: str
    annotations: Dict[str, Any]

def crop_upper_body(image: Image.Image, landmarks: Dict[str, Any]) -> tuple[Image.Image, Dict[str, Any]]:
    w, h = image.size
    
    x_coords = []
    y_coords = []
    for lm in landmarks.values():
        x_coords.append(lm["x"])
        y_coords.append(lm["y"])
        
    if not x_coords or not y_coords:
        return image, landmarks
        
    min_x = min(x_coords)
    max_x = max(x_coords)
    min_y = min(y_coords)
    max_y = max(y_coords)
    
    box_w = max_x - min_x
    box_h = max_y - min_y
    
    pad_w = max(5.0, box_w * 0.1)
    pad_h = max(5.0, box_h * 0.1)
    
    crop_x0 = max(0.0, min_x - pad_w)
    crop_y0 = max(0.0, min_y - pad_h)
    crop_x1 = min(float(w), max_x + pad_w)
    crop_y1 = min(float(h), max_y + pad_h)
    
    curr_w = crop_x1 - crop_x0
    curr_h = crop_y1 - crop_y0
    target_aspect = 2.0 / 3.0
    
    if curr_h <= 0:
        curr_h = 1.0
    curr_aspect = curr_w / curr_h
    
    if curr_aspect > target_aspect:
        needed_h = curr_w / target_aspect
        diff_h = needed_h - curr_h
        crop_y0 = max(0.0, crop_y0 - diff_h / 2.0)
        crop_y1 = min(float(h), crop_y1 + diff_h / 2.0)
    else:
        diff_w = (curr_h * target_aspect) - curr_w
        crop_x0 = max(0.0, crop_x0 - diff_w / 2.0)
        crop_x1 = min(float(w), crop_x1 + diff_w / 2.0)
        
    crop_w = crop_x1 - crop_x0
    crop_h = crop_y1 - crop_y0
    
    cropped_img = image.crop((int(crop_x0), int(crop_y0), int(crop_x1), int(crop_y1)))
    
    new_landmarks = {}
    for name, lm in landmarks.items():
        new_landmarks[name] = {
            "x": (lm["x"] - crop_x0) / crop_w if crop_w > 0 else 0.0,
            "y": (lm["y"] - crop_y0) / crop_h if crop_h > 0 else 0.0,
            "visible": lm.get("visible", True),
            "status": lm.get("status", "auto")
        }
        
    return cropped_img, new_landmarks

class TrackVideoRequest(BaseModel):
    video_path: str
    landmarks_calib: Optional[List[Dict[str, float]]] = None
    sequence_fps: Optional[float] = None  # User-specified FPS for image folder sequences
    # Multi-character support: { "1": [calib_pts], "2": [calib_pts], ... }
    multi_char_calibs: Optional[Dict[str, List[Dict[str, float]]]] = None

@app.post("/api/video/track")
async def track_video(req: TrackVideoRequest):
    if not os.path.exists(req.video_path):
        raise HTTPException(status_code=404, detail="Video not found")
        
    try:
        import cv2
        from tracker_utils import HybridFaceTracker
        
        cap = FrameSequenceReader(req.video_path)
        if not cap.isOpened():
            raise RuntimeError(f"Could not open video/folder: {req.video_path}")
            
        # Use user-defined FPS if provided, else read from source (folders default to 25 fallback)
        if req.sequence_fps is not None and req.sequence_fps > 0:
            fps = float(req.sequence_fps)
        else:
            fps = float(cap.get(cv2.CAP_PROP_FPS))
            if fps <= 0:
                fps = 25.0  # Hard fallback
        
        video_frames = []
        while True:
            ret, frame = cap.read()
            if not ret:
                break
            video_frames.append(frame)
        cap.release()
        
        if not video_frames:
            raise RuntimeError("Video has no frames")
        
        model_dir = BASE_DIR.parent / "model_cache" / "models"

        def _default_calib(n):
            return [
                {"x": 50.0, "y": 25.0},
                {"x": 45.0, "y": 40.0},
                {"x": 55.0, "y": 40.0},
                {"x": 50.0, "y": 50.0},
                {"x": 50.0, "y": 68.0},
                {"x": 50.0, "y": 80.0}
            ]

        # ── Multi-character mode ────────────────────────────────────────────────
        if req.multi_char_calibs and len(req.multi_char_calibs) > 0:
            characters_result = {}
            for char_id, calib_points in req.multi_char_calibs.items():
                if not calib_points or len(calib_points) < 6:
                    calib_points = _default_calib(char_id)
                logger.info(f"Tracking character '{char_id}' with {len(calib_points)} calib points")
                tracker = HybridFaceTracker(calib_points, video_frames[0], model_dir)
                poses = []
                for idx, frame in enumerate(video_frames):
                    pose = tracker.track_frame(frame)
                    pose["frame_index"] = idx
                    pose["timestamp"] = idx / fps
                    poses.append(pose)
                characters_result[char_id] = {
                    "fps": fps,
                    "frame_count": len(video_frames),
                    "base_mw": float(tracker.base_mw),
                    "base_mh": float(tracker.base_mh),
                    "base_eye_dist": float(tracker.base_eye_dist),
                    "frames": poses
                }
            return {"fps": fps, "frame_count": len(video_frames), "characters": characters_result}

        # ── Legacy single-character mode ────────────────────────────────────────
        calib_points = req.landmarks_calib
        if not calib_points or len(calib_points) < 6:
            calib_points = _default_calib("1")
            
        tracker = HybridFaceTracker(calib_points, video_frames[0], model_dir)
        
        poses = []
        for idx, frame in enumerate(video_frames):
            pose = tracker.track_frame(frame)
            pose["frame_index"] = idx
            pose["timestamp"] = idx / fps
            poses.append(pose)
            
        return {
            "fps": fps,
            "frame_count": len(video_frames),
            "base_mw": float(tracker.base_mw),
            "base_mh": float(tracker.base_mh),
            "base_eye_dist": float(tracker.base_eye_dist),
            "frames": poses
        }
    except Exception as e:
        logger.error(f"Video tracking failed: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/video/frame")
async def get_video_frame(path: str, index: int):
    if not os.path.exists(path):
        raise HTTPException(status_code=404, detail="Video not found")
        
    try:
        import cv2
        from fastapi.responses import Response
        
        cap = FrameSequenceReader(path)
        cap.set(cv2.CAP_PROP_POS_FRAMES, index)
        ret, frame = cap.read()
        cap.release()
        
        if not ret:
            raise HTTPException(status_code=500, detail=f"Could not read frame {index}")
            
        ret_enc, buffer = cv2.imencode(".jpg", frame)
        if not ret_enc:
            raise HTTPException(status_code=500, detail="Could not encode frame")
            
        return Response(content=buffer.tobytes(), media_type="image/jpeg")
    except Exception as e:
        logger.error(f"Error getting video frame: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# Helper to convert input audio to 16kHz mono PCM WAV
def convert_to_16khz_mono_pcm(input_audio: Path, output_wav: Path):
    if output_wav.exists():
        output_wav.unlink()
    cmd = [
        str(FFMPEG_PATH), "-y", "-i", str(input_audio),
        "-ac", "1", "-ar", "16000", "-c:a", "pcm_s16le", str(output_wav)
    ]
    logger.info(f"Running pre-flight FFmpeg conversion: {' '.join(cmd)}")
    result = subprocess.run(cmd, capture_output=True)
    if result.returncode != 0:
        raise RuntimeError(f"FFmpeg failed: {result.stderr.decode(errors='replace')}")
    if not output_wav.exists() or output_wav.stat().st_size == 0:
        raise RuntimeError("FFmpeg produced empty output")

# Async Rhubarb run models & state
class RhubarbRunRequest(BaseModel):
    audio_path: str

RHUBARB_JOBS = {}

async def run_rhubarb_async_job(job_id: str, audio_path: Path, output_json: Path):
    try:
        converted_wav = audio_path.with_name(f"converted_{job_id}.wav")
        # Pre-flight audio conversion
        convert_to_16khz_mono_pcm(audio_path, converted_wav)
        
        cmd = [
            "-f", "json",
            str(converted_wav),
            "-o", str(output_json)
        ]
        logger.info(f"Invoking async rhubarb on: {converted_wav}")
        process = await asyncio.create_subprocess_exec(
            str(RHUBARB_PATH),
            *cmd,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE
        )
        RHUBARB_JOBS[job_id] = {"process": process, "status": "running", "output": output_json, "converted_wav": converted_wav}
        stdout, stderr = await process.communicate()
        
        if process.returncode == 0:
            RHUBARB_JOBS[job_id]["status"] = "done"
        else:
            logger.error(f"Rhubarb async job failed: {stderr.decode(errors='replace')}")
            RHUBARB_JOBS[job_id]["status"] = "failed"
    except Exception as e:
        logger.error(f"Error in async rhubarb job: {e}")
        RHUBARB_JOBS[job_id]["status"] = "failed"
    finally:
        # Clean up converted file
        if 'converted_wav' in locals() and converted_wav.exists():
            try:
                converted_wav.unlink()
            except:
                pass

@app.post("/api/rhubarb/run")
async def post_rhubarb_run(req: RhubarbRunRequest):
    audio_path = Path(req.audio_path)
    if not audio_path.exists():
        raise HTTPException(status_code=404, detail="Audio file not found")
        
    import uuid
    job_id = str(uuid.uuid4())
    output_json = audio_path.with_name(f"cues_{job_id}.json")
    
    # Start async task
    asyncio.create_task(run_rhubarb_async_job(job_id, audio_path, output_json))
    
    return {"job_id": job_id, "status": "running"}

@app.get("/api/rhubarb/status/{job_id}")
async def get_rhubarb_status(job_id: str):
    if job_id not in RHUBARB_JOBS:
        raise HTTPException(status_code=404, detail="Job not found")
        
    job = RHUBARB_JOBS[job_id]
    status = job["status"]
    
    if status == "done":
        try:
            with open(job["output"], "r", encoding="utf-8") as f:
                data = json.load(f)
            return {"status": "done", "cues": data.get("mouthCues", [])}
        except Exception as e:
            return {"status": "failed", "error": f"Failed to read cues: {str(e)}"}
    elif status == "failed":
        return {"status": "failed"}
    else:
        return {"status": "running"}

@app.post("/api/dataset/save")
async def save_dataset(req: SaveDatasetRequest):
    if not os.path.exists(req.video_path):
        raise HTTPException(status_code=404, detail=f"Source video path not found: {req.video_path}")
        
    try:
        import cv2
        
        char_dir   = PROJECT_ROOT / "projects" / "characters" / req.character_name
        session_dir = char_dir / "datasets" / req.session_id
        session_dir.mkdir(parents=True, exist_ok=True)

        cap = FrameSequenceReader(req.video_path)
        if not cap.isOpened():
            raise RuntimeError(f"Could not open source video/folder: {req.video_path}")

        ann_data   = req.annotations
        source_fps = float(cap.get(cv2.CAP_PROP_FPS)) or 25.0

        # ── Helper: process one character's frames list against video frames ──
        def _process_char_frames(char_ann, video_frames_list, char_frames_dir, char_thumbs_dir, fps):
            char_frames_dir.mkdir(parents=True, exist_ok=True)
            char_thumbs_dir.mkdir(parents=True, exist_ok=True)

            frames_in = char_ann.get("frames", [])
            frames_map = {}
            if isinstance(frames_in, list):
                for f in frames_in:
                    fi = f.get("frame_index")
                    if fi is not None:
                        frames_map[int(fi)] = f
            elif isinstance(frames_in, dict):
                for k, v in frames_in.items():
                    m = re.search(r"\d+", str(k))
                    frames_map[int(m.group()) if m else int(v.get("frame_index", 0))] = v

            saved = []
            for frame_idx, frame in enumerate(video_frames_list):
                if frame_idx not in frames_map:
                    continue
                frame_data = frames_map[frame_idx]
                frame_rgb  = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
                pil_img    = Image.fromarray(frame_rgb)

                raw_lms = frame_data.get("landmarks", {})
                lms_for_crop = {
                    name: ({"x": pt[0], "y": pt[1]} if isinstance(pt, list) else pt)
                    for name, pt in raw_lms.items()
                }
                cropped_img, normalized_lms = crop_upper_body(pil_img, lms_for_crop)

                crop_path  = char_frames_dir / f"frame_{frame_idx:05d}.jpg"
                thumb_path = char_thumbs_dir / f"frame_{frame_idx:05d}.jpg"
                cropped_img.save(crop_path, "JPEG", quality=95)
                cropped_img.resize((400, 600), Image.Resampling.LANCZOS).save(thumb_path, "JPEG", quality=70)

                saved.append({
                    "frame_index": frame_idx,
                    "timestamp":   float(frame_data.get("timestamp", frame_idx / fps)),
                    "confidence":  float(frame_data.get("confidence", 0.8)),
                    "landmarks":   {n: [float(lm["x"]), float(lm["y"])] for n, lm in normalized_lms.items()},
                    "orig_landmarks": {n: [float(lm["x"]), float(lm["y"])] for n, lm in lms_for_crop.items()}
                })
            saved.sort(key=lambda x: x["frame_index"])
            return saved

        # Load all raw video frames once
        all_video_frames = []
        while True:
            ret, frame = cap.read()
            if not ret:
                break
            all_video_frames.append(frame)
        cap.release()

        fps         = float(ann_data.get("fps", source_fps))
        frame_count = int(ann_data.get("frame_count", len(all_video_frames)))

        # ── Multi-character mode ──────────────────────────────────────────────
        if "characters" in ann_data:
            characters_out = {}
            for char_id, char_ann in ann_data["characters"].items():
                char_frames_dir = session_dir / f"char_{char_id}" / "frames"
                char_thumbs_dir = session_dir / f"char_{char_id}" / "thumbnails"
                saved = _process_char_frames(char_ann, all_video_frames, char_frames_dir, char_thumbs_dir, fps)
                characters_out[char_id] = {
                    "fps":          float(char_ann.get("fps", fps)),
                    "frame_count":  frame_count,
                    "base_mw":      float(char_ann.get("base_mw", 0.0)),
                    "base_mh":      float(char_ann.get("base_mh", 0.0)),
                    "base_eye_dist": float(char_ann.get("base_eye_dist", 0.0)),
                    "frames":       saved
                }
            final_json = {"video_path": req.video_path, "fps": fps,
                          "frame_count": frame_count, "characters": characters_out}

        # ── Legacy single-character mode ───────────────────────────────────────
        else:
            frames_dir     = session_dir / "frames"
            thumbnails_dir = session_dir / "thumbnails"
            saved = _process_char_frames(ann_data, all_video_frames, frames_dir, thumbnails_dir, fps)
            final_json = {
                "fps": fps, "frame_count": frame_count,
                "base_mw":      float(ann_data.get("base_mw", 0.0)),
                "base_mh":      float(ann_data.get("base_mh", 0.0)),
                "base_eye_dist": float(ann_data.get("base_eye_dist", 0.0)),
                "video_path":   req.video_path,
                "frames":       saved
            }

        json_path = session_dir / "annotations.json"
        with open(json_path, "w", encoding="utf-8") as f:
            json.dump(final_json, f, indent=2)

        logger.info(f"Dataset saved for '{req.character_name}' at: {session_dir}")
        return {"status": "ok", "message": "Dataset saved successfully", "path": str(session_dir)}
        
    except Exception as e:
        logger.error(f"Failed to save dataset: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/dataset/load")
async def load_dataset(character_name: str, session_id: str):
    char_dir    = PROJECT_ROOT / "projects" / "characters" / character_name
    session_dir = char_dir / "datasets" / session_id
    json_path   = session_dir / "annotations.json"
    
    if not json_path.exists():
        raise HTTPException(status_code=404, detail=f"Dataset annotations not found at projects/characters/{character_name}/datasets/{session_id}/annotations.json")
        
    try:
        with open(json_path, "r", encoding="utf-8") as f:
            data = json.load(f)

        # Auto-wrap legacy single-char datasets so the frontend always sees { characters: {...} }
        if "characters" not in data and "frames" in data:
            data = {
                "video_path":   data.get("video_path", ""),
                "fps":          data.get("fps", 25.0),
                "frame_count":  data.get("frame_count", len(data.get("frames", []))),
                "characters": {
                    "1": {
                        "fps":          data.get("fps", 25.0),
                        "frame_count":  data.get("frame_count", len(data.get("frames", []))),
                        "base_mw":      data.get("base_mw", 0.0),
                        "base_mh":      data.get("base_mh", 0.0),
                        "base_eye_dist": data.get("base_eye_dist", 0.0),
                        "frames":       data.get("frames", [])
                    }
                }
            }

        return {"status": "ok", "annotations": data}
    except Exception as e:
        logger.error(f"Failed to load dataset: {e}")
        raise HTTPException(status_code=500, detail=str(e))

class PropagateRequest(BaseModel):
    video_path: str
    start_frame: int
    corrected_landmarks: Dict[str, Any]  # Single-char: {name: [x,y]}
    all_annotations: Dict[str, Any]      # Single-char annotations (legacy)
    force_overwrite: Optional[bool] = False
    # Multi-character: { char_id: { name: [x,y] } }  &  { char_id: {fps, frames, ...} }
    multi_char_corrected: Optional[Dict[str, Dict[str, Any]]] = None
    multi_char_all_annotations: Optional[Dict[str, Dict[str, Any]]] = None

@app.post("/api/dataset/propagate")
async def propagate_dataset(req: PropagateRequest):
    if not os.path.exists(req.video_path):
        raise HTTPException(status_code=404, detail=f"Source video path not found: {req.video_path}")
        
    try:
        import cv2
        from tracker_utils import track_points_lk, LANDMARK_NAMES, solve_pose_geometrically

        cap = FrameSequenceReader(req.video_path)
        if not cap.isOpened():
            raise RuntimeError(f"Could not open source video/folder: {req.video_path}")
        
        # Load all video frames once — shared across all characters
        video_frames = []
        while True:
            ret, frame = cap.read()
            if not ret:
                break
            video_frames.append(frame)
        cap.release()
        
        if req.start_frame < 0 or req.start_frame >= len(video_frames):
            raise HTTPException(status_code=400, detail="Invalid start_frame index")

        def _extract_orig_frames(ann_obj):
            """Flatten frames from {fps, frames:[...]} or {idx: frame} or [...] into {int: frame}."""
            orig = {}
            if isinstance(ann_obj, dict):
                if "frames" in ann_obj:
                    frames_list = ann_obj["frames"]
                    if isinstance(frames_list, list):
                        for f in frames_list:
                            orig[int(f["frame_index"])] = f
                    else:
                        for k, v in frames_list.items():
                            orig[int(k)] = v
                else:
                    for k, v in ann_obj.items():
                        try:
                            orig[int(k)] = v
                        except (ValueError, TypeError):
                            pass
            elif isinstance(ann_obj, list):
                for f in ann_obj:
                    orig[int(f["frame_index"])] = f
            return orig

        def _pts_from_corrected(corrected_lms):
            """Build (N,2) float32 array from corrected_landmarks dict."""
            pts = np.zeros((len(LANDMARK_NAMES), 2), dtype=np.float32)
            for idx, name in enumerate(LANDMARK_NAMES):
                pt = corrected_lms.get(name)
                if pt is None:
                    raise HTTPException(status_code=400, detail=f"Missing corrected landmark: {name}")
                if isinstance(pt, list):
                    pts[idx] = pt
                else:
                    pts[idx] = [pt["x"], pt["y"]]
            return pts

        def _propagate_single(corrected_lms, ann_obj, force_overwrite):
            """Run LK propagation for one character. Returns {str(idx): frame_data}."""
            curr_pts = _pts_from_corrected(corrected_lms)
            orig_frames = _extract_orig_frames(ann_obj)

            for frame_idx in range(req.start_frame + 1, len(video_frames)):
                is_green = False
                if frame_idx in orig_frames:
                    f_data = orig_frames[frame_idx]
                    conf_tier = f_data.get("confidence_tier", "silver")
                    if conf_tier == "green" or f_data.get("confidence", 0.0) >= 0.65:
                        is_green = True
                if is_green and not force_overwrite:
                    logger.info(f"Propagation stopped at green frame {frame_idx}")
                    break

                prev_gray = cv2.cvtColor(video_frames[frame_idx - 1], cv2.COLOR_BGR2GRAY)
                curr_gray = cv2.cvtColor(video_frames[frame_idx], cv2.COLOR_BGR2GRAY)
                next_pts = track_points_lk(prev_gray, curr_gray, curr_pts)
                
                # Prevent body points drift by updating them geometrically using face points transform
                src_face = curr_pts[0:27].astype(np.float32)
                dst_face = next_pts[0:27].astype(np.float32)
                M, _ = cv2.estimateAffinePartial2D(src_face, dst_face)
                if M is not None:
                    for i in range(4):
                        pt = np.array([curr_pts[27 + i, 0], curr_pts[27 + i, 1], 1.0], dtype=np.float32)
                        next_pts[27 + i] = np.dot(M, pt)

                landmarks_dict = {
                    name: {"x": float(next_pts[i, 0]), "y": float(next_pts[i, 1]),
                           "visible": True, "status": "auto"}
                    for i, name in enumerate(LANDMARK_NAMES)
                }

                calib_pts = curr_pts
                if 0 in orig_frames:
                    calib_lms = orig_frames[0]["landmarks"]
                    calib_arr = np.zeros((len(LANDMARK_NAMES), 2), dtype=np.float32)
                    for i, name in enumerate(LANDMARK_NAMES):
                        pv = calib_lms.get(name, [0, 0])
                        calib_arr[i] = pv if isinstance(pv, list) else [pv["x"], pv["y"]]
                    calib_pts = calib_arr

                pose = solve_pose_geometrically(next_pts, calib_pts)
                mouth_mask_poly = next_pts[12:24].tolist()

                if frame_idx not in orig_frames:
                    orig_frames[frame_idx] = {}
                orig_frames[frame_idx].update({
                    "landmarks": landmarks_dict,
                    "confidence_tier": "yellow",
                    "confidence": 0.5,
                    "scale": pose["scale"],
                    "roll": pose["roll"],
                    "yaw": pose["yaw"],
                    "pitch": pose["pitch"],
                    "mouth_center": pose["mouth_center"],
                    "mouth_mask_poly": mouth_mask_poly,
                    "pose": pose
                })
                curr_pts = next_pts.copy()

            ret_frames = {}
            for idx, f_data in orig_frames.items():
                f_data["frame_index"] = idx
                ret_frames[str(idx)] = f_data
            return ret_frames

        # ── Multi-character mode: propagate ALL chars simultaneously ───────────
        if req.multi_char_corrected and req.multi_char_all_annotations:
            characters_result = {}
            for char_id, corrected_lms in req.multi_char_corrected.items():
                ann_obj = req.multi_char_all_annotations.get(char_id, {})
                logger.info(f"Propagating character '{char_id}' from frame {req.start_frame}")
                characters_result[char_id] = _propagate_single(corrected_lms, ann_obj, req.force_overwrite)
            return {"status": "ok", "characters": characters_result}

        # ── Legacy single-character mode ─────────────────────────────────────
        ret_frames = _propagate_single(req.corrected_landmarks, req.all_annotations, req.force_overwrite)
        return {"status": "ok", "annotations": ret_frames}
        
    except Exception as e:
        logger.error(f"Propagation failed: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/character/upload-spritesheet")
async def upload_spritesheet(
    character_name: str = Form(...),
    angle: int = Form(...),
    file: UploadFile = File(...)
):
    try:
        contents = await file.read()
        import io
        img = Image.open(io.BytesIO(contents)).convert("RGBA")
        
        # 5x2 Grid Centers in 669x373 canvas coordinate reference space
        centers_x = [75, 205, 335, 465, 595]
        centers_y = [105, 280]
        cell_w = 120
        cell_h = 100
        
        # Dynamic scaling relative to uploaded PNG dimensions
        scale_x = img.width / 669.0
        scale_y = img.height / 373.0
        
        target_dir = STATIC_DIR / "uploads" / "custom_mouths" / character_name / str(angle)
        target_dir.mkdir(parents=True, exist_ok=True)
        
        visemes = ["A", "B", "C", "D", "E", "F", "G", "H", "X", "Neutral"]
        
        for r_idx, cy in enumerate(centers_y):
            for c_idx, cx in enumerate(centers_x):
                # Center/bounds scaled perfectly (NO text labels shift)
                cx_jpg = int(cx * scale_x)
                cy_jpg = int(cy * scale_y)
                w_jpg = int(cell_w * scale_x)
                h_jpg = int(cell_h * scale_y)
                
                left = max(0, cx_jpg - w_jpg // 2)
                top = max(0, cy_jpg - h_jpg // 2)
                right = min(img.width, cx_jpg + w_jpg // 2)
                bottom = min(img.height, cy_jpg + h_jpg // 2)
                
                crop = img.crop((left, top, right, bottom))
                vis_name = visemes[r_idx * 5 + c_idx]
                crop_path = target_dir / f"mouth_{vis_name}.png"
                crop.save(crop_path, "PNG")
                
        logger.info(f"Cropped spritesheet for {character_name} at angle {angle} in {target_dir}")
        return {"status": "ok", "message": f"Sprite sheet cropped and saved successfully for character '{character_name}' at angle {angle}°."}
    except Exception as e:
        logger.error(f"Failed to process sprite sheet: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to crop sprite sheet: {str(e)}")

@app.get("/api/character/list-custom-sprites")
async def list_custom_sprites():
    try:
        custom_base_dir = STATIC_DIR / "uploads" / "custom_mouths"
        if not custom_base_dir.exists():
            return {"characters": []}
        
        chars = []
        for d in custom_base_dir.iterdir():
            if d.is_dir():
                # Check if there is at least one subfolder with files in it
                has_files = False
                for sub in d.iterdir():
                    if sub.is_dir():
                        if any(f.is_file() and f.name.endswith('.png') for f in sub.iterdir()):
                            has_files = True
                            break
                if has_files:
                    chars.append(d.name)
        return {"characters": chars}
    except Exception as e:
        logger.error(f"Failed to list custom sprites: {e}")
        return {"characters": []}

if __name__ == "__main__":

    import uvicorn
    uvicorn.run("app:app", host="127.0.0.1", port=8001, reload=True)
