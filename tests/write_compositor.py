import ast

with open("lip_sync_standalone/app.py", "r", encoding="utf-8") as f:
    code = f.read()

node = ast.parse(code)
lines = code.split("\n")
extracted = {}

target_functions = [
    "parse_dialogue",
    "create_silent_wav",
    "run_rhubarb",
    "run_procedural_viseme_analyzer",
    "generate_pacing_cues",
    "draw_base_shape",
    "_approx_bezier_polygon",
    "draw_smile_teeth_grid",
    "draw_front_mouth",
    "draw_three_quarter_mouth",
    "draw_profile_mouth",
    "render_single_mode",
    "draw_mouth_sprite",
    "sample_dynamic_skin_color",
    "load_custom_mouth_sprite",
    "generate_character_mouth_set",
    "concat_audio_clips",
    "smooth_poses",
    "smooth_tracked_centers",
    "interpolate_mouth_points_if_needed",
    "crop_upper_body",
    "convert_to_16khz_mono_pcm"
]

for item in node.body:
    if isinstance(item, ast.FunctionDef) and item.name in target_functions:
        start = item.lineno - 1
        end = getattr(item, "end_lineno", start + 1)
        src = "\n".join(lines[start:end])
        extracted[item.name] = src

# Write compositor.py with imports, logging, paths
out_path = "lip_sync_standalone/app/core/compositor.py"
with open(out_path, "w", encoding="utf-8") as out:
    out.write("""import os
import re
import sys
import json
import wave
import httpx
import cv2
import asyncio
import logging
import subprocess
from pathlib import Path
from typing import List, Dict, Any, Optional
from PIL import Image, ImageDraw, ImageColor
import numpy as np

logger = logging.getLogger("lip-sync-standalone.compositor")

# Setup Directory Paths relative to this file
BASE_DIR = Path(__file__).resolve().parent.parent.parent
STATIC_DIR = BASE_DIR / "static"
UPLOADS_DIR = STATIC_DIR / "uploads"
GENERATED_DIR = STATIC_DIR / "generated_mouths"
OUTPUT_DIR = STATIC_DIR / "output"

PROJECT_ROOT = BASE_DIR

FFMPEG_PATH = BASE_DIR / "bin" / "ffmpeg.exe"
if not FFMPEG_PATH.exists():
    FFMPEG_PATH = BASE_DIR.parent / "bin" / "ffmpeg.exe"
if not FFMPEG_PATH.exists():
    FFMPEG_PATH = Path("ffmpeg")

RHUBARB_PATH = BASE_DIR / "bin" / "rhubarb.exe"
if not RHUBARB_PATH.exists():
    RHUBARB_PATH = BASE_DIR.parent / "bin" / "rhubarb.exe"

# Import schemas
from ..models.schemas import CharacterConfig

# Add current core directory to sys.path for tracker absolute imports fallback
sys.path.append(str(Path(__file__).resolve().parent))
""")
    out.write("\n\n")
    for name in target_functions:
        if name in extracted:
            out.write(extracted[name])
            out.write("\n\n")
        else:
            print(f"Warning: {name} not found in app.py")

print("compositor.py written successfully.")
