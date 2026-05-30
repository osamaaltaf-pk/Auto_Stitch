# STACK.md — AutoStitch v1 Technology Stack

## Pinned versions — do not change without updating this file and REVIEW.md

| Component | Package / Tool | Version | Why pinned |
|---|---|---|---|
| Language | Python | 3.11.x | Torch compat; engine repos may break on 3.12 |
| UI framework | nicegui | 1.4.x | Async-native, browser-based, no C++ toolchain |
| UI JS (internal) | SortableJS | (bundled with nicegui) | Drag-and-drop for lanes |
| Video/audio | FFmpeg | 7.x (bundled) | Industry standard; handles all codecs |
| Async HTTP | aiohttp | 3.9.x | For any future API calls in v2 |
| Data validation | pydantic | 2.x | Manifest dataclass validation + JSON schema |
| File watching | watchdog | 3.x | Watch input folders for new files |
| Image (thumbnails) | Pillow | 10.x | Generate video thumbnail from ffmpeg frame grab |
| Logging | structlog | 23.x | Structured JSON logging to autostitch.log |
| Testing | pytest | 7.x | Unit tests for manifest + stitcher logic |
| Linting | ruff | latest | Fast, zero-config linter |
| Type checking | mypy | 1.x | Strict mode on core/ modules |

---

## Engine dependencies (managed separately in engine repos)

| Engine | Framework | Notes |
|---|---|---|
| Stable Audio | PyTorch (version from repo) | Do not pin torch here; match engine repo requirements |
| PocketTTS | PyTorch (version from repo) | Same — let engine repo requirements.txt drive torch version |

**Important:** `requirements.txt` in AutoStitch root must NOT pin torch.
Engine repos have their own requirements. Install them with:
```
pip install -r engines/stable_audio/requirements.txt
pip install -r engines/pocket_tts/requirements.txt
pip install -r requirements.txt
```
in that order, so engine torch versions win over any autostitch torch pin.

---

## Runtime dependencies (system-level, not pip)

| Tool | Version | How provided |
|---|---|---|
| FFmpeg | 7.x | Downloaded by warmup.bat to /bin/ffmpeg.exe |
| FFprobe | 7.x | Downloaded by warmup.bat to /bin/ffprobe.exe (same zip as FFmpeg) |
| CUDA | 12.x (optional) | User's system; GPU optional, CPU fallback exists |
| Git | Any | Required for warmup.bat to clone engine repos |

---

## Frontend (NiceGUI internal)

NiceGUI renders Vue 3 components server-side in Python and pushes updates
via WebSocket. The agent writes Python only — no JavaScript, no Vue templates.

Custom CSS is injected via `ui.add_css()` from `app/ui/styles.css`.
Custom JS (if needed for SortableJS hooks) via `ui.add_body_html()`.

---

## File formats the app handles

| Format | Lane | Read/Write | Notes |
|---|---|---|---|
| .mp4 | Video (Lane 1) | Read | H.264/H.265; any resolution |
| .txt | SFX + Voice lanes | Read | UTF-8, one prompt per line |
| .wav | Voice (Lane 3), SFX output | Read + Write | 44100 Hz, 16-bit or 32-bit float |
| .mp3 | Voice (Lane 3) | Read | User-provided voiceovers |
| .json | Manifest, config | Read + Write | UTF-8 |
| .autostitch | Project files | Read + Write | JSON with .autostitch extension |

---

## requirements.txt (autostitch root — agent must create this file)

```
nicegui>=1.4.0,<2.0.0
pydantic>=2.0.0,<3.0.0
aiohttp>=3.9.0,<4.0.0
watchdog>=3.0.0,<4.0.0
Pillow>=10.0.0,<11.0.0
structlog>=23.0.0,<25.0.0
pytest>=7.0.0,<8.0.0
ruff>=0.1.0
mypy>=1.0.0,<2.0.0
```

Do NOT add torch, torchaudio, or any ML framework here.
Those come from the engine repos' own requirements files.

---

## .env file (create at project root, never commit to git)

```env
# AutoStitch local config overrides
# These override config.json values
AUTOSTITCH_UI_PORT=8080
AUTOSTITCH_THEME=dark
# Optional: override model dirs if you have models elsewhere
# AUTOSTITCH_SFX_MODEL_DIR=D:/models/stable_audio
# AUTOSTITCH_TTS_MODEL_DIR=D:/models/pocket_tts
```

---

## .gitignore additions required

```
.venv/
__pycache__/
*.pyc
models/
bin/
output/
logs/
projects/
.env
config.json
engines/stable_audio/
engines/pocket_tts/
```

Engine repos are gitignored because they are separate repos with their own git history.
Models are gitignored because they are large binary files.
