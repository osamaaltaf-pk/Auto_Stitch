# ENGINES.md — SFX + TTS Engine Integration Spec

---

## Engine wrapper contract (BOTH engines must implement this)

Each engine wrapper lives in `app/core/engine_sfx.py` and `app/core/engine_tts.py`.
Each wrapper must expose EXACTLY these two public functions and nothing else
to the rest of the application:

```python
async def generate(prompt: str, output_path: Path, duration_s: float = 5.0) -> Path:
    """
    Generate audio from prompt. Save to output_path.
    Returns output_path on success.
    Raises EngineError on failure.
    Updates manifest block status via callback (see below).
    """

def health_check() -> bool:
    """
    Returns True if the model is loaded and ready.
    Returns False if model is not loaded or inference will fail.
    Must NOT raise exceptions.
    """
```

---

## Engine error type

```python
class EngineError(Exception):
    """Raised by engine wrappers on generation failure."""
    def __init__(self, engine: str, prompt: str, reason: str):
        self.engine = engine   # "sfx" or "tts"
        self.prompt = prompt
        self.reason = reason
        super().__init__(f"[{engine}] generation failed: {reason}")
```

---

## Model loading

Both engines load their models ONCE at app startup, not per-call.
Loading happens in a background thread so the UI doesn't freeze.

```python
# In engine_sfx.py
_model = None  # module-level singleton

def load_model(model_dir: Path) -> None:
    """Called once at startup. Blocks until model is in memory."""
    global _model
    # import from engines/stable_audio/
    # load weights from model_dir
    # assign to _model
    ...

def health_check() -> bool:
    return _model is not None
```

In `main.py`:
```python
import asyncio
from app.core import engine_sfx, engine_tts
from app.utils.logger import log

async def startup():
    log.info("Loading SFX engine...")
    await asyncio.get_event_loop().run_in_executor(None, engine_sfx.load_model, config.sfx_model_dir)
    log.info("SFX engine ready" if engine_sfx.health_check() else "SFX engine FAILED to load")

    log.info("Loading TTS engine...")
    await asyncio.get_event_loop().run_in_executor(None, engine_tts.load_model, config.tts_model_dir)
    log.info("TTS engine ready" if engine_tts.health_check() else "TTS engine FAILED to load")
```

---

## engine_sfx.py — Stable Audio wrapper

### What agent must do when Stable Audio repo is provided:
1. Read `engines/stable_audio/README.md`
2. Find the inference function (likely `generate(prompt, duration, output_path)` or similar)
3. Note the exact import path
4. Note the output format (wav? what samplerate?)
5. Fill in the implementation below

### Template (agent fills in the `# FILL IN` sections):
```python
# app/core/engine_sfx.py
from __future__ import annotations
import asyncio
from pathlib import Path
from app.core.manifest import BlockStatus

_model = None

def load_model(model_dir: Path) -> None:
    global _model
    # FILL IN: import from engines/stable_audio and load
    # Example (agent must adjust to actual repo API):
    # import sys; sys.path.insert(0, "engines/stable_audio")
    # from stable_audio import StableAudioModel
    # _model = StableAudioModel.from_pretrained(model_dir)
    pass

def health_check() -> bool:
    return _model is not None

async def generate(prompt: str, output_path: Path, duration_s: float = 5.0) -> Path:
    if not health_check():
        raise EngineError("sfx", prompt, "Model not loaded")
    output_path.parent.mkdir(parents=True, exist_ok=True)
    loop = asyncio.get_event_loop()
    await loop.run_in_executor(None, _run_inference, prompt, output_path, duration_s)
    return output_path

def _run_inference(prompt: str, output_path: Path, duration_s: float) -> None:
    # FILL IN: call the actual Stable Audio inference
    # Example:
    # audio = _model.generate(prompt=prompt, duration=duration_s)
    # audio.save(str(output_path))
    pass
```

---

## engine_tts.py — PocketTTS wrapper

### What agent must do when PocketTTS repo is provided:
1. Read `engines/pocket_tts/README.md`
2. Find the synthesis function
3. Note the voice selection mechanism (voice_id? reference audio path?)
4. Note the output format

### Template:
```python
# app/core/engine_tts.py
from __future__ import annotations
import asyncio
from pathlib import Path

_model = None
DEFAULT_VOICE = "default"  # FILL IN: actual voice ID from PocketTTS

def load_model(model_dir: Path) -> None:
    global _model
    # FILL IN: import from engines/pocket_tts and load
    pass

def health_check() -> bool:
    return _model is not None

async def generate(prompt: str, output_path: Path, duration_s: float = 5.0,
                   voice: str = DEFAULT_VOICE) -> Path:
    if not health_check():
        raise EngineError("tts", prompt, "Model not loaded")
    output_path.parent.mkdir(parents=True, exist_ok=True)
    loop = asyncio.get_event_loop()
    await loop.run_in_executor(None, _run_inference, prompt, output_path, voice)
    return output_path

def _run_inference(prompt: str, output_path: Path, voice: str) -> None:
    # FILL IN: call PocketTTS synthesis
    pass
```

---

## Generated file naming convention

SFX outputs:  `{project_dir}/sfx/sfx_{order:02d}.wav`
TTS outputs:  `{project_dir}/voice/vo_{order:02d}.wav`

The engine wrapper receives the full `output_path` — it does NOT construct paths itself.
Paths are constructed by the caller (`lanes.py` or the generation trigger in `timeline.py`).

---

## Calling generate from the UI

```python
# In lanes.py, when user clicks Generate on an SFX block:
async def on_generate_sfx(block: SfxBlock):
    block.status = BlockStatus.GENERATING
    manifest.save()
    sfx_lane.refresh()  # UI updates to show yellow/pulsing

    output_path = manifest.project_dir / "sfx" / f"sfx_{block.order:02d}.wav"
    try:
        await engine_sfx.generate(block.prompt, output_path, duration_s=5.0)
        block.status = BlockStatus.DONE
        block.file_path = output_path
    except EngineError as e:
        block.status = BlockStatus.ERROR
        block.error_msg = str(e)
        ui.notify(f"SFX generation failed: {e.reason}", type="negative")
        logger.error("sfx_generation_failed", block_id=block.id, reason=e.reason)
    finally:
        manifest.save()
        sfx_lane.refresh()
```
