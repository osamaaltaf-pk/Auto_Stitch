# AutoStitch Studio

### AI-Powered Video Composition Tool for Windows

A locally-run, offline-first Windows desktop application that automates voiceover generation, sound effect creation, and multi-lane video stitching — all without any cloud dependency.

> No cloud. No subscriptions. Everything runs on your machine.

---

## What It Does

AutoStitch Studio gives content creators a **3-lane timeline** to compose videos:

| Lane | Input | Engine |
|---|---|---|
| **Video** | Folder of `.mp4` clips | FFmpeg |
| **Voice** | TTS script (`.txt`) or pre-recorded `.mp3`/`.wav` | TTS Engine (local CPU) |
| **SFX** | Sound effect prompts (`.txt`) | SFX Engine (local CPU) |

When you click **Render**, FFmpeg mixes all lanes into per-clip final MP4 files, then optionally concatenates them into one master video — with word-by-word captions burned in.

---

## Features

- 🎬 **Multi-lane timeline** — drag, reorder, split, merge, and edit clips across 3 lanes
- 🎙️ **Local TTS** — TTS engine generates realistic voiceovers from text, entirely offline
- 🔊 **Local SFX** — SFX engine generates sound effects from text prompts on CPU
- 🎵 **Background music** — mix music tracks with adjustable volume into the final render
- 📝 **Auto-captions** — word-by-word caption overlay burned into video via FFmpeg drawtext
- ✏️ **Apostrophe-safe escaping** — robust FFmpeg filter string escaping for any text
- ⚡ **Sequential generation** — queue-based TTS and SFX generation (no OOM crashes)
- 🖥️ **Browser UI** — clean, modern web interface at `http://localhost:8080`
- 🗄️ **SQLite persistence** — all projects, settings, and state stored locally

---

## System Requirements

| Component | Requirement |
|---|---|
| OS | Windows 10 / 11 (64-bit) |
| Python | 3.11 or 3.12 |
| RAM | 8 GB minimum (16 GB for SFX & Music) |
| Storage | ~2 GB (app + engines + models) |
| GPU | Not required — CPU only |

---

## Quick Start

### 1. Install
```bat
setup.bat
```
Presents a component selection menu:
- **Complete** — AutoStitch + TTS + SFX & Music
- **Lightweight** — AutoStitch + TTS only
- **Core Only** — Backend only (no AI engines)

Creates isolated virtual environments for each engine automatically.

### 2. Run
```bat
run.bat
```
- Checks system RAM (warns if < 16 GB for SFX & Music)
- Launches the backend at `http://localhost:8080`
- Opens your browser automatically
- Local TTS and SFX engines start in the background

---

## Project Structure

```
auto_stitch/
├── app/
│   ├── api/           ← FastAPI routes (project, render, engines, voices, settings)
│   ├── core/
│   │   └── stitcher.py   ← FFmpeg pipeline, caption escaping, audio mixing
│   ├── models/        ← Pydantic schemas
│   └── main.py        ← App entry point, engine auto-launch, RAM check
├── text_to_speech_server/  ← Text-to-Speech engine (local CPU TTS)
├── sfx_and_music_server/   ← SFX & Music engine (local CPU SFX/Music)
├── bin/               ← FFmpeg + FFprobe binaries (Windows)
├── static/            ← Frontend HTML/CSS/JS
├── projects/          ← User project manifests (JSON)
├── output/            ← Rendered video output
├── tests/             ← Unit + integration tests
├── venv/              ← Main app virtual environment
├── autostitch.db      ← SQLite database
├── settings.json      ← User settings
├── setup.bat          ← One-click installer
└── run.bat            ← One-click launcher
```

---

## How It Works

```
User Input
    │
    ├── Video clips (.mp4)  ──────────────────────┐
    ├── TTS script (.txt)  → TTS Engine → .wav ───┤
    └── SFX prompts (.txt) → SFX Engine → .wav ───┤
                                                   ▼
                                         FFmpeg Stitcher
                                               │
                          ┌────────────────────┤
                          │  - Mix audio lanes  │
                          │  - Burn captions    │
                          │  - Scale/pad video  │
                          └────────────────────┘
                                               │
                                               ▼
                                    Final .mp4 per clip
                                               │
                                               ▼
                                    Master concatenated .mp4
```

---

## Engine Architecture

AutoStitch uses a **hub-and-spoke** model — the main FastAPI backend manages two sub-engines as background subprocesses, each in its own isolated virtual environment:

```
auto_stitch/
├── venv/                    ← Main app (port 8080)
├── text_to_speech_server/
│   └── venv/                ← TTS server (port 8000)
└── sfx_and_music_server/
│   └── venv/                ← SFX & Music server (port 5000)
```

The main app auto-launches both engines on startup and proxies generation requests to them. If a system has < 16 GB RAM, the SFX & Music server launch is automatically skipped locally to prevent crashes.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Backend | Python 3.11+, FastAPI, Uvicorn |
| TTS Engine | PocketTTS (local, CPU) |
| SFX Engine | Stable Audio (local, CPU) |
| Video Processing | FFmpeg (bundled binary) |
| Database | SQLite (via aiosqlite) |
| Frontend | Vanilla HTML/CSS/JS |
| Testing | pytest |

---

## Related Repositories

| Repo | Description |
|---|---|
| [auto_Stitch_backend](https://github.com/osamaaltaf-pk/auto_Stitch_backend) | Vercel + Supabase licensing server |
| [Omni Lip Sync](https://github.com/osamaaltaf-pk/Omni-Lip-Sync) | Standalone 2D lip-sync animation studio |

---

*Built by [Osama Altaf](https://linkedin.com/in/osamaaltafpk)*
