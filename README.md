# AutoStitch v1

> Local Windows desktop tool for AI-assisted video composition.
> Multi-lane timeline: video clips + AI sound effects + AI voiceover → stitched final video.
> Runs 100% offline. No cloud APIs required.

---

## Standalone Licensing Server Backend

The online, hardware-locked licensing server and key generator dashboard for AutoStitch Studio is maintained in its own dedicated repository:
👉 **[auto_Stitch_backend](https://github.com/osamaaltaf-pk/auto_Stitch_backend)**

Deploy this backend repository directly to Vercel for the license activation and key generation management system.

---

## What it does

AutoStitch gives you a three-lane timeline:

| Lane | Content | How |
|---|---|---|
| **Video** | Your pre-rendered `.mp4` clips | Load from folder |
| **SFX** | Sound effect prompts → generated `.wav` | Local Stable Audio engine |
| **Voice** | Voiceover scripts → generated speech | Local PocketTTS engine |

You arrange clips and prompts, click generate on each SFX/voice block,
then hit **Render** to stitch everything into per-clip final `.mp4` files
(optionally concatenated into one master file via FFmpeg).

---

## Requirements

- Windows 10 or 11 (x64)
- Python 3.11 ([download](https://python.org/downloads/))
- Git ([download](https://git-scm.com/download/win))
- ~20GB free disk space (for model weights)
- NVIDIA GPU recommended (CUDA 12.x); CPU fallback available

---

## Setup (first time)

```batch
# Step 1: Download models and FFmpeg
warmup.bat

# Step 2: Create venv, install deps, launch
installer.bat
```

After first setup:
```batch
# Launch any time
run.bat
```

The app opens automatically at `http://localhost:8080`.

---

## Usage

1. **Load videos** — Click "Open Folder" in the left panel Videos section.
   Your `.mp4` clips appear in Lane 1, sorted by filename.

2. **Add SFX prompts** — Click "Load .txt" in the SFX section.
   One line per prompt. Each line becomes a block in Lane 2, aligned under its video clip.
   Click any block to generate the sound effect.

3. **Add voice** — Either "Open Folder" for pre-recorded `.mp3`/`.wav` files,
   or "Load TTS .txt" for scripts to be synthesised. Click to generate.

4. **Edit lanes** — Drag to reorder, double-click to edit text, right-click to split/merge/delete.

5. **Render** — Click **▶ Render** in the toolbar. Choose whether to concat all clips.
   Output lands in the `output/` folder.

---

## Project structure

```
autostitch/
├── main.py              ← entry point
├── app/
│   ├── ui/              ← NiceGUI interface
│   └── core/            ← manifest, engines, stitcher
├── engines/
│   ├── stable_audio/    ← SFX engine (provided separately)
│   └── pocket_tts/      ← TTS engine (provided separately)
├── bin/                 ← FFmpeg binaries (downloaded by warmup.bat)
├── models/              ← model weights (downloaded by warmup.bat)
├── output/              ← rendered videos land here
├── warmup.bat           ← first-time setup
├── installer.bat        ← install + launch
└── run.bat              ← quick launch
```

---

## For AI coding agents

Read the docs in this order before writing any code:

1. `AGENT.md` — master instructions
2. `ARCHITECTURE.md` — system design
3. `CONTEXT.md` — current phase and progress
4. `MEMORY.md` — feature completion checklist
5. `DIFF_MEMORY.md` — per-session history
6. `REVIEW.md` — open issues
7. `STACK.md` — tech stack and versions
8. `MANIFEST.md` — data model
9. `UI_SPEC.md` — UI layout
10. `LANES.md` — lane interactions
11. `ENGINES.md` — engine wrappers
12. `STITCHER.md` — FFmpeg pipeline
13. `INSTALLER.md` — batch files
14. `CONSTRAINTS.md` — rules

---

## Version

v1 MVP — local offline composition only.
v2 will add cloud generation APIs (Veo 3.1, ElevenLabs, Imagen 4).
