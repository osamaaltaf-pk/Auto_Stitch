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
from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.responses import FileResponse, HTMLResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
from PIL import Image, ImageDraw, ImageColor

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

class CharacterConfig(BaseModel):
  x: float
  y: float
  width: float
  height: float
  style: str
  skin_color: str
  line_color: str
  rotation: float = 0.0
  perspective: float = 1.0
  face_angle: float = 0.0   # -90=full left profile, 0=front, +90=full right profile

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
    
    if ext in video_extensions:
        import cv2
        from fastapi.responses import Response
        cap = cv2.VideoCapture(path)
        if not cap.isOpened():
            raise HTTPException(status_code=500, detail="Could not open video file")
        ret, frame = cap.read()
        cap.release()
        if not ret:
            raise HTTPException(status_code=500, detail="Could not read first frame of video")
        ret_enc, buffer = cv2.imencode(".jpg", frame)
        if not ret_enc:
            raise HTTPException(status_code=500, detail="Could not encode frame as jpeg")
        return Response(content=buffer.tobytes(), media_type="image/jpeg")
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

# Color Sampling Endpoint
@app.post("/api/character/sample-color")
async def sample_character_color(req: ColorSampleRequest):
    if not os.path.exists(req.image_path):
        raise HTTPException(status_code=404, detail="Character base image not found")
    
    try:
        ext = os.path.splitext(req.image_path)[1].lower()
        video_extensions = {".mp4", ".avi", ".mov", ".mkv", ".webm"}
        if ext in video_extensions:
            import cv2
            cap = cv2.VideoCapture(req.image_path)
            if not cap.isOpened():
                raise HTTPException(status_code=500, detail="Could not open character video file")
            ret, frame = cap.read()
            cap.release()
            if not ret:
                raise HTTPException(status_code=500, detail="Could not read first frame of video")
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
                
                cmd = [
                    str(FFMPEG_PATH),
                    "-y",
                    "-i", str(temp_path),
                    "-c:a", "pcm_s16le",
                    str(out_path)
                ]
                logger.info(f"Converting raw TTS to 16-bit PCM wav: {' '.join(cmd)}")
                subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
                
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

def draw_mouth_sprite(viseme: str, cfg: CharacterConfig, w: int, h: int) -> Image.Image:
    """Route to the correct zone renderer based on cfg.face_angle."""
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
    thickness    = max(1, min(w, h) // 14)
    angle        = getattr(cfg, 'face_angle', 0.0)
    abs_angle    = abs(angle)
    side         = 1 if angle >= 0 else -1   # +1=facing right, -1=facing left

    # 1. Always draw skin backplate (ONLY for front and 3/4 views!)
    if abs_angle < 65.0:
        draw_base_shape(draw, [0, 0, w, h], fill=skin_color, style=cfg.style)

    if abs_angle < 20.0:
        # ── FRONT ZONE ──────────────────────────────────────────
        draw_front_mouth(draw, viseme, w, h, skin_color, lip_color,
                         cavity_color, teeth_color, tongue_color, cfg.style, thickness)

    elif abs_angle < 65.0:
        # ── 3/4 VIEW ZONE ───────────────────────────────────────
        # t=0 at 20°, t=1 at 65°
        t = (abs_angle - 20.0) / 45.0
        draw_three_quarter_mouth(draw, viseme, w, h, skin_color, lip_color,
                                 cavity_color, teeth_color, tongue_color,
                                 cfg.style, thickness, t, side)

    else:
        # ── PROFILE ZONE ────────────────────────────────────────
        draw_profile_mouth(draw, viseme, w, h, skin_color, lip_color,
                           cavity_color, teeth_color, tongue_color,
                           cfg.style, thickness, side)

    return mouth_img


# Compile and cache all character mouths with tilt rotations & perspective flips/compressions
def generate_character_mouth_set(cfg: CharacterConfig, char_name: str, base_w: int, base_h: int) -> Path:
    char_dir = GENERATED_DIR / char_name
    char_dir.mkdir(parents=True, exist_ok=True)

    mw = max(10, int((cfg.width / 100.0) * base_w))
    mh = max(6,  int((cfg.height / 100.0) * base_h))

    visemes = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'X']
    for v in visemes:
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
            
            # Open video to read frames
            cap = cv2.VideoCapture(req.video_path)
            if not cap.isOpened():
                raise RuntimeError(f"Could not open input video: {req.video_path}")
                
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
                
            # Initialize calibration points
            # Expected order: forehead, eye_left, eye_right, nose, mouth, chin
            calib_points = req.landmarks_calib
            if not calib_points or len(calib_points) < 6:
                logger.warning("No landmarks calibration or incomplete points provided. Falling back to default layout.")
                calib_points = [
                    {"x": 50.0, "y": 25.0},  # forehead
                    {"x": 45.0, "y": 40.0},  # eye_left
                    {"x": 55.0, "y": 40.0},  # eye_right
                    {"x": 50.0, "y": 50.0},  # nose
                    {"x": 50.0, "y": 68.0},  # mouth
                    {"x": 50.0, "y": 80.0}   # chin
                ]
                
            # Initialize hybrid tracker
            model_dir = BASE_DIR.parent / "model_cache" / "models"
            tracker = HybridFaceTracker(calib_points, video_frames[0], model_dir)
            
            # Run tracker over all video frames and store poses
            poses = []
            for idx, frame in enumerate(video_frames):
                pose = tracker.track_frame(frame)
                poses.append(pose)
                
            # Overlay and compile frames
            total_frames = int(current_time * 25.0)
            logger.info(f"Generating {total_frames} frames for video lip-sync overlay...")
            
            frames_dir = OUTPUT_DIR / "frames"
            if frames_dir.exists():
                import shutil
                shutil.rmtree(frames_dir)
            frames_dir.mkdir(parents=True, exist_ok=True)
            
            # Get primary character config for mouth style and colors
            char_cfg = chars[0] if chars else CharacterConfig(
                x=50.0, y=68.0, width=10.0, height=10.0,
                style="rounded", skin_color="#ffcc99", line_color="#000000"
            )
            
            base_mw = max(10, int((char_cfg.width / 100.0) * base_w))
            base_mh = max(6,  int((char_cfg.height / 100.0) * base_h))
            
            for f in range(total_frames):
                t = f * 0.04
                
                # Determine active viseme
                vis = 'X'
                for cue in global_timeline:
                    if cue["char_idx"] == 1 and cue["start"] <= t <= cue["end"]:
                        vis = cue["viseme"]
                        break
                
                # Retrieve frame pose (freeze last pose if audio is longer than video)
                frame_idx = min(f, num_video_frames - 1)
                pose = poses[frame_idx]
                
                # Retrieve frame image (freeze last frame if audio is longer than video)
                frame_bgr = video_frames[frame_idx]
                # Convert BGR to RGBA for PIL
                frame_img = Image.fromarray(cv2.cvtColor(frame_bgr, cv2.COLOR_BGR2RGBA))
                
                # Generate dynamic mouth sprite
                scale = pose["scale"]
                mw = max(10, int(base_mw * scale))
                mh = max(6,  int(base_mh * scale))
                
                # Build frame configuration using character config template and frame yaw
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
                
                # Draw dynamic mouth
                sprite = draw_mouth_sprite(vis, frame_cfg, mw, mh)
                
                # Apply roll rotation
                if abs(pose["roll"]) > 0.01:
                    sprite = sprite.rotate(-pose["roll"], resample=Image.Resampling.BICUBIC, expand=True)
                
                # Paste mouth at tracked center
                cx, cy = pose["mouth_center"]
                sw, sh = sprite.size
                frame_img.paste(sprite, (int(cx - sw // 2), int(cy - sh // 2)), sprite)
                
                # Save frame
                frame_img.convert("RGBA").save(frames_dir / f"frame_{f:05d}.png")
        else:
            # 4. Generate and cache mouth sprite assets for all characters (Static Image Mode)
            char_mouth_dirs = []
            char_sprites_list = []
            for c_i, char_cfg in enumerate(chars):
                cname = f"char{c_i+1}"
                mouth_dir = generate_character_mouth_set(char_cfg, cname, base_w, base_h)
                char_mouth_dirs.append(mouth_dir)
                sprites = {v: Image.open(mouth_dir / f"mouth_{v}.png") for v in ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'X']}
                char_sprites_list.append(sprites)
            
            # 5. Overlay and compile frames
            total_frames = int(current_time * 25.0)
            logger.info(f"Generating {total_frames} frames for video overlay...")
            
            frames_dir = OUTPUT_DIR / "frames"
            if frames_dir.exists():
                import shutil
                shutil.rmtree(frames_dir)
            frames_dir.mkdir(parents=True, exist_ok=True)
            
            # Character mouth coordinate pixel centers for all characters
            char_centers = []
            for char_cfg in chars:
                cx = int((char_cfg.x / 100.0) * base_w)
                cy = int((char_cfg.y / 100.0) * base_h)
                char_centers.append((cx, cy))
            
            for f in range(total_frames):
                t = f * 0.04
                
                # Find active visemes for all characters at time t
                active_visemes = ['X'] * len(chars)
                for cue in global_timeline:
                    if cue["start"] <= t <= cue["end"]:
                        c_idx = cue["char_idx"] - 1
                        if 0 <= c_idx < len(chars):
                            active_visemes[c_idx] = cue["viseme"]
                            
                # Create copy of base image
                frame_img = base_img.copy()
                
                # Draw all mouth overlays
                for c_i in range(len(chars)):
                    vis = active_visemes[c_i]
                    sprite = char_sprites_list[c_i][vis]
                    sw, sh = sprite.size
                    cx, cy = char_centers[c_i]
                    frame_img.paste(sprite, (cx - sw // 2, cy - sh // 2), sprite)
                    
                # Save frame
                frame_img.save(frames_dir / f"frame_{f:05d}.png")
            
        # 6. Stitch frames and audio using FFmpeg
        final_mp4 = OUTPUT_DIR / "output.mp4"
        if final_mp4.exists():
            final_mp4.unlink()
            
        cmd = [
            str(FFMPEG_PATH),
            "-y",
            "-r", "25",
            "-i", str(frames_dir / "frame_%05d.png"),
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
        
        logger.info(f"Running ffmpeg stitch cmd: {' '.join(cmd)}")
        result = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
        if result.returncode != 0:
            err_msg = result.stderr or ""
            if "cannot allocate memory" in err_msg.lower() or "out of memory" in err_msg.lower() or "error allocating" in err_msg.lower():
                raise HTTPException(
                    status_code=500,
                    detail="FFmpeg ran out of memory (RAM error). Please free up some RAM by closing other applications, or check 'Safe Mode (Downscale)' below to render at a lower resolution."
                )
            raise RuntimeError(f"FFmpeg render failed: {err_msg}")
            
        logger.info("Video lipsync compilation complete!")
        return {
            "status": "ok",
            "video_url": "/static/output/output.mp4"
        }
        
    except HTTPException as he:
        raise he
    except Exception as e:
        logger.error(f"Render pipeline failed: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app:app", host="127.0.0.1", port=8001, reload=True)
