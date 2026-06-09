# Stable Audio 3 — Local CPU Studio
### Windows deployment for i5-4570 · 16GB RAM · No GPU

---

## What This Is

A local web server + polished UI to generate:
- 🎵 **Music** — full tracks, lo-fi beats, cinematic scores, ambience
- 🎸 **Stems** — isolated instruments, solo instrument recordings
- 💥 **SFX** — sound effects, one-shots, transitions, UI sounds
- ✂️ **Inpainting** — fix/replace/extend a section of existing audio
- 🔄 **Audio-to-Audio** — style/timbre transfer from existing audio

All royalty-free, on your own machine, no API costs.

---

## System Check

| Your Spec | Required | Status |
|---|---|---|
| i5-4570 @ 3.2GHz | Any CPU | ✅ |
| 16GB RAM | 4GB+ | ✅ |
| 64-bit Windows | 64-bit | ✅ |
| GPU | None needed for small- | ✅ |

**Expected generation time on your CPU:**
- 15s audio, steps=4 → ~1–2 min
- 30s audio, steps=8 → ~3–5 min  
- 60s audio, steps=8 → ~6–10 min

---

## One-Time Setup

### Step 1 — Install Python
Download Python 3.10 or 3.11 from https://www.python.org/downloads/  
**Check "Add Python to PATH"** during install.

### Step 2 — Accept Model Licenses on HuggingFace
You must create a free HuggingFace account and accept:
- https://huggingface.co/stabilityai/stable-audio-3-small-music
- https://huggingface.co/stabilityai/stable-audio-3-small-sfx

### Step 3 — Run Setup
Double-click `setup.bat` — it installs everything.

### Step 4 — Login to HuggingFace
After setup completes, in the terminal that opens:
```
huggingface-cli login
```
Paste your HuggingFace token (get it from https://huggingface.co/settings/tokens).

---

## Daily Use

1. Double-click **`start_server.bat`**
2. Open **http://localhost:5000** in your browser
3. Generate! The first generation loads the model (~1 min), after that it's cached.

---

## Tips for Speed on CPU

- Use **steps=4** for quick previews while testing prompts
- Keep **duration=15–30s** for most YouTube/TikTok content
- The model loads once and stays in RAM — don't close the terminal
- Run overnight for batch generation of multiple tracks
- Generated files are saved in the `outputs/` folder as WAV

---

## File Structure

```
stable_audio_server/
├── server.py          ← Flask backend
├── index.html         ← Browser UI  
├── setup.bat          ← One-time installer
├── start_server.bat   ← Daily launcher
├── outputs/           ← All generated WAV files (auto-created)
└── README.md
```

---

## API Endpoints (for advanced use)

```
POST /api/generate     → start async job, returns job_id
GET  /api/status/:id   → poll job status
GET  /api/download/:id → download finished WAV
POST /api/upload       → upload seed audio for inpaint/a2a
GET  /api/jobs         → list recent jobs
GET  /api/health       → server health check
```

---

## Troubleshooting

**"Module not found" errors** → Run setup.bat again; make sure venv is active  
**"Out of memory"** → Reduce duration, or close other heavy apps  
**Very slow generation** → Normal on CPU; use steps=4 and duration=15 for testing  
**Model won't download** → Check HuggingFace login and license acceptance  
**Port 5000 in use** → Edit server.py, change `port=5000` to `port=5001`  
