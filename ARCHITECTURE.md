# ARCHITECTURE.md — AutoStitch v1 System Architecture

## Overview

AutoStitch is a single-process Python application.
NiceGUI serves the UI on localhost:8080 and opens it automatically in the default browser.
Engine inference (SFX, TTS) runs in background threads managed by asyncio.
FFmpeg stitching runs in a subprocess.

```
┌─────────────────────────────────────────────────────────────┐
│  Browser (Chrome / Edge / default)  localhost:8080          │
│  ┌──────────┐  ┌──────────────────────────────────────────┐ │
│  │ Left     │  │  Timeline Canvas                         │ │
│  │ Panel    │  │  ┌──────────────────────────────────────┐│ │
│  │          │  │  │ Lane 1 — Video clips (mp4 tiles)     ││ │
│  │ /videos  │  │  ├──────────────────────────────────────┤│ │
│  │ /sfx     │  │  │ Lane 2 — SFX blocks (text prompts)   ││ │
│  │ /voice   │  │  ├──────────────────────────────────────┤│ │
│  │          │  │  │ Lane 3 — Voice (audio or TTS prompts)││ │
│  │          │  │  └──────────────────────────────────────┘│ │
│  └──────────┘  └──────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
        ↕  WebSocket (NiceGUI reactive binding)
┌─────────────────────────────────────────────────────────────┐
│  Python Process                                             │
│  ┌─────────────┐  ┌──────────────┐  ┌───────────────────┐  │
│  │ manifest.py │  │ engine_sfx   │  │ engine_tts        │  │
│  │ (state)     │←→│ Stable Audio │  │ PocketTTS         │  │
│  └─────────────┘  │ (thread)     │  │ (thread)          │  │
│         ↓         └──────────────┘  └───────────────────┘  │
│  ┌─────────────┐                                            │
│  │ stitcher.py │→ ffmpeg.exe subprocess                     │
│  └─────────────┘                                            │
└─────────────────────────────────────────────────────────────┘
```

---

## Data flow — loading media

1. User opens a video folder in the left panel.
2. `left_panel.py` scans the folder for `.mp4` files, sorted by filename.
3. Each file is registered in the manifest as a `VideoBlock`.
4. `timeline.py` re-renders Lane 1 from the manifest, displaying one tile per block.

## Data flow — SFX generation

1. User drops `sfx.txt` onto Lane 2.
2. `lanes.py` reads the file, splits by newline, creates one `SfxBlock` per non-empty line.
3. Each `SfxBlock` is written to the manifest with `status: "idle"`.
4. Lane 2 renders one text tile per `SfxBlock`.
5. User clicks a tile → `engine_sfx.py::generate()` is called as a background task.
6. Manifest status updates: `"idle"` → `"generating"` → `"done"` (or `"error"`).
7. Lane 2 tile updates colour reactively (NiceGUI binding).

## Data flow — render

1. User clicks Render.
2. `stitcher.py` reads the manifest; for each clip slot, it knows:
   - `video_path`: the `.mp4` for that slot
   - `sfx_path`: the generated SFX `.wav` (if any)
   - `voice_path`: the recorded or generated voice `.wav`/`.mp3` (if any)
3. Per clip: FFmpeg filter_complex mixes voice + sfx, attaches to video.
4. Output → `/output/clip_NN_final.mp4`
5. Optional: FFmpeg concat all clips into `/output/master.mp4`.

---

## Process startup sequence

```
installer.bat / run.bat
  └─ python main.py
        ├─ load config (config.json or defaults)
        ├─ resolve all paths relative to project root
        ├─ health_check: ffmpeg.exe present?
        ├─ start engine_sfx (load model into memory — async, non-blocking)
        ├─ start engine_tts (load model into memory — async, non-blocking)
        ├─ open last project or blank project
        └─ start NiceGUI on localhost:8080, open browser
```

---

## Config file (config.json, auto-created on first run)

```json
{
  "ffmpeg_path": "bin/ffmpeg.exe",
  "ffprobe_path": "bin/ffprobe.exe",
  "output_dir": "output",
  "projects_dir": "projects",
  "models_dir": "models",
  "sfx_model_dir": "models/stable_audio",
  "tts_model_dir": "models/pocket_tts",
  "default_video_fps": 30,
  "default_audio_samplerate": 44100,
  "ui_port": 8080,
  "ui_theme": "dark"
}
```

---

## Key design decisions and why

| Decision | Reason |
|---|---|
| NiceGUI over PyQt6 | Python-only, no C++ build toolchain needed on Windows, async-native |
| manifest as single source of truth | Prevents UI state drift; project save/load is just serialise manifest |
| Engines load at startup, not per-call | Models take 5–30s to load; load once, infer many times |
| FFmpeg via subprocess, not moviepy | FFmpeg is faster, more reliable, handles any codec; moviepy is a wrapper around it anyway |
| pathlib.Path everywhere | Handles Windows backslash vs forward slash transparently |
| Python 3.11 pinned | Stable Audio and PocketTTS may use torch features not yet stable in 3.12 |
