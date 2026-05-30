# AGENT.md — AutoStitch v1 MVP
## Master Instruction File for AI Coding Agents

Read this file completely before writing a single line of code.
Then read every file listed in the REQUIRED READING section.
Then and only then begin implementation.

---

## What this software is

AutoStitch is a locally-run Windows desktop video composition tool.
It has a multi-lane timeline interface (built in NiceGUI) where:

- **Lane 1 (Video)** — user opens a folder of pre-rendered 5-second `.mp4` clips;
  they appear left-to-right in the timeline as draggable, selectable tiles.
- **Lane 2 (SFX)** — user drops a `.txt` file of sound-effect prompts;
  each line of text appears as a draggable text block aligned under the video lane.
  Clicking any SFX block triggers generation via the local Stable Audio engine.
- **Lane 3 (Voice)** — user opens a folder of pre-recorded `.mp3`/`.wav` voiceovers
  OR drops a `.txt` file of TTS scripts; each item aligns under its video clip.
  Clicking a TTS text block triggers generation via the local PocketTTS engine.

All three lanes support: drag-to-reorder, click-to-select, edit text in place,
merge adjacent blocks, split a block at a point, and delete.

When the user clicks **Render**, the stitcher mixes all lanes via FFmpeg into
per-clip final `.mp4` files, then optionally concatenates them into one master file.

---

## REQUIRED READING (read in this order)

1. `AGENT.md`            — this file
2. `ARCHITECTURE.md`     — full system architecture, file layout, data flow
3. `UI_SPEC.md`          — NiceGUI layout specification, component map, interactions
4. `LANES.md`            — lane system: data model, drag/drop, edit/split/merge rules
5. `ENGINES.md`          — SFX engine (Stable Audio) + TTS engine (PocketTTS) integration
6. `STITCHER.md`         — FFmpeg stitching pipeline, audio mixing, render spec
7. `INSTALLER.md`        — warmup.bat, installer.bat, Windows packaging rules
8. `MANIFEST.md`         — manifest.json schema, state machine, persistence
9. `CONSTRAINTS.md`      — hard rules the agent must never violate

---

## Project identity

- **Name:** AutoStitch
- **Version:** v1 MVP
- **Platform:** Windows 10/11 x64 only
- **Python version:** 3.11 (pinned — do not use 3.12+, model repos may not support it)
- **UI framework:** NiceGUI 1.4.x (browser-based, served on localhost:8080)
- **Video/audio processing:** FFmpeg (bundled in `/bin/ffmpeg.exe`)
- **SFX engine:** Stable Audio (repo provided separately — see ENGINES.md)
- **TTS engine:** PocketTTS (repo provided separately — see ENGINES.md)
- **Package manager:** pip + venv (no conda, no poetry)

---

## Repository layout (agent must create exactly this)

```
autostitch/
├── AGENT.md                  ← this file (do not modify during coding)
├── ARCHITECTURE.md
├── UI_SPEC.md
├── LANES.md
├── ENGINES.md
├── STITCHER.md
├── INSTALLER.md
├── MANIFEST.md
├── CONSTRAINTS.md
│
├── main.py                   ← entry point; starts NiceGUI app
├── app/
│   ├── __init__.py
│   ├── ui/
│   │   ├── __init__.py
│   │   ├── timeline.py       ← timeline canvas component
│   │   ├── lanes.py          ← lane rendering + interaction logic
│   │   ├── left_panel.py     ← media browser (left sidebar)
│   │   ├── toolbar.py        ← top toolbar (render button, settings)
│   │   └── styles.css        ← custom CSS injected into NiceGUI
│   ├── core/
│   │   ├── __init__.py
│   │   ├── manifest.py       ← manifest.json read/write/state machine
│   │   ├── engine_sfx.py     ← Stable Audio engine wrapper
│   │   ├── engine_tts.py     ← PocketTTS engine wrapper
│   │   ├── stitcher.py       ← FFmpeg stitching logic
│   │   └── project.py        ← project save/load (.autostitch project files)
│   └── utils/
│       ├── __init__.py
│       ├── ffprobe.py        ← ffprobe wrapper (get duration, resolution)
│       ├── file_watcher.py   ← watch input folders for new files
│       └── logger.py         ← structured logging to logs/autostitch.log
│
├── engines/
│   ├── stable_audio/         ← cloned from user's Stable Audio repo
│   └── pocket_tts/           ← cloned from user's PocketTTS repo
│
├── bin/
│   └── ffmpeg.exe            ← bundled FFmpeg binary (downloaded by warmup.bat)
│
├── models/
│   ├── stable_audio/         ← model weights downloaded by warmup.bat
│   └── pocket_tts/           ← model weights downloaded by warmup.bat
│
├── projects/                 ← user project files saved here
├── output/                   ← rendered final videos land here
├── logs/
│   └── autostitch.log
│
├── requirements.txt
├── warmup.bat                ← downloads all models + ffmpeg on first run
├── installer.bat             ← creates venv, installs deps, launches app
└── run.bat                   ← shortcut to launch after install
```

---

## Coding rules the agent must always follow

1. **One concern per file.** Never put UI code and engine logic in the same module.
2. **No global mutable state.** All shared state lives in `manifest.py` as a
   typed dataclass; UI reads from it, engines write to it.
3. **All engine calls are async.** Use `asyncio` for SFX and TTS generation so
   the UI never freezes. NiceGUI's `run.io_bound` / `run.cpu_bound` are the
   correct wrappers for blocking model inference.
4. **All file paths use `pathlib.Path`.** Never raw strings for paths.
5. **FFmpeg is called via `subprocess.run` with explicit arg lists.** Never
   shell=True. Never string concatenation to build FFmpeg commands.
6. **Never hardcode paths.** Everything is relative to the project root,
   resolved at startup in `main.py` and passed as config.
7. **Write a docstring for every public function and class.**
8. **Every engine wrapper must have a `health_check() -> bool` method** that
   verifies the model is loaded and returns True/False without raising.
9. **Errors in engine calls must not crash the UI.** Catch, log to
   `autostitch.log`, update the manifest block status to `"error"`, and
   show a toast notification in the UI.
10. **The manifest is the single source of truth.** UI state is derived from
    the manifest. Never store timeline position, clip order, or generation
    status anywhere else.

---

## MVP scope (what to build in v1)

### In scope
- Video lane: open folder, display clips in order, drag to reorder
- SFX lane: drop `.txt` file to populate blocks, drag/reorder/edit/split/merge,
  click-to-generate via Stable Audio engine
- Voice lane: open folder (pre-recorded audio) OR drop `.txt` for TTS generation
  via PocketTTS, drag/reorder/edit/split/merge, click-to-generate
- Left panel: file browser showing video folder and audio folders
- Render button: FFmpeg stitches all lanes, outputs per-clip `.mp4` to `/output`
- Optional concat: checkbox to also produce one master `.mp4`
- Project save/load: `.autostitch` JSON file
- `warmup.bat` and `installer.bat`

### Out of scope for v1 (do NOT implement)
- Cloud API generation (Veo, ElevenLabs, Imagen — that is v2)
- Video preview playback inside the timeline
- Color grading, transitions, effects
- Export to OTIO / Kdenlive
- Multi-project tabs
- Undo/redo history (nice to have for v2)
- Real-time waveform display

---

## How to read the engine repos

When the Stable Audio and PocketTTS repos are provided to you:

1. Read their `README.md` first.
2. Find their inference entry point (usually `generate.py` or `infer.py`
   or a function called `generate` / `synthesize` in their main module).
3. Do NOT refactor or modify the engine repo code.
4. Write a thin wrapper in `app/core/engine_sfx.py` and `app/core/engine_tts.py`
   that imports from the engine repo and exposes exactly two functions:
   - `async def generate(prompt: str, output_path: Path) -> Path`
   - `def health_check() -> bool`
5. The wrapper handles: model loading (once, at startup), error catching,
   path management, and progress callbacks to the manifest.

---

## Questions the agent must answer before starting implementation

Before writing any code, the agent must confirm:

- [ ] Have you read all 9 docs in the REQUIRED READING list?
- [ ] Have you read the Stable Audio repo README and found the inference entry point?
- [ ] Have you read the PocketTTS repo README and found the inference entry point?
- [ ] Do you understand the manifest state machine in MANIFEST.md?
- [ ] Do you understand the lane drag/drop data model in LANES.md?

If any answer is no — stop and read the missing document first.
