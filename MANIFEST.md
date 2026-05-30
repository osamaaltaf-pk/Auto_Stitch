# MANIFEST.md — AutoStitch Manifest Schema & State Machine

The manifest is the single source of truth for all timeline state.
It lives in memory as Python dataclasses and is persisted to `manifest.json`
in the project directory on every change.

---

## Python dataclass schema (agent must implement in app/core/manifest.py)

```python
from __future__ import annotations
from dataclasses import dataclass, field
from enum import Enum
from pathlib import Path
from typing import Optional
import json

class BlockStatus(str, Enum):
    IDLE       = "idle"        # exists, not yet generated
    GENERATING = "generating"  # engine is running
    DONE       = "done"        # asset ready at file_path
    ERROR      = "error"       # generation failed
    PROVIDED   = "provided"    # user-provided file (no generation needed)

@dataclass
class VideoBlock:
    id: str                    # e.g. "v_01", "v_02"
    file_path: Path            # absolute path to .mp4
    filename: str              # display name
    duration_s: float          # seconds, from ffprobe
    thumbnail_path: Optional[Path] = None
    order: int = 0             # position in lane (0-indexed)

@dataclass
class SfxBlock:
    id: str                    # e.g. "sfx_01"
    prompt: str                # text prompt for Stable Audio
    order: int = 0             # position in lane
    status: BlockStatus = BlockStatus.IDLE
    file_path: Optional[Path] = None   # path to generated .wav
    duration_s: Optional[float] = None # target duration (default: match video slot)
    error_msg: Optional[str] = None

@dataclass
class VoiceBlock:
    id: str                    # e.g. "vo_01"
    order: int = 0
    status: BlockStatus = BlockStatus.IDLE
    # One of these will be set:
    prompt: Optional[str] = None       # TTS script text
    source_path: Optional[Path] = None # user-provided audio file
    file_path: Optional[Path] = None   # path to generated or copied .wav/.mp3
    duration_s: Optional[float] = None
    error_msg: Optional[str] = None

@dataclass
class Manifest:
    project_name: str = "Untitled"
    project_dir: Path = Path(".")
    video_blocks: list[VideoBlock] = field(default_factory=list)
    sfx_blocks: list[SfxBlock] = field(default_factory=list)
    voice_blocks: list[VoiceBlock] = field(default_factory=list)
    output_dir: Path = Path("output")
    render_complete: bool = False

    def to_json(self) -> str:
        """Serialise to JSON string. Paths become strings."""
        ...  # agent implements

    @classmethod
    def from_json(cls, data: str) -> Manifest:
        """Deserialise from JSON string."""
        ...  # agent implements

    def save(self) -> None:
        """Write manifest.json to project_dir."""
        ...

    def get_slot(self, order: int) -> tuple[Optional[VideoBlock], Optional[SfxBlock], Optional[VoiceBlock]]:
        """Return the video, sfx, voice blocks at a given order position."""
        ...
```

---

## State machine for SfxBlock and VoiceBlock

```
         [user adds block]
               │
               ▼
           ┌──────┐
           │ IDLE │ ◄─────────────────────────────────────┐
           └──────┘                                        │
               │ user clicks "generate"                    │ user clicks "reset"
               ▼                                           │
        ┌────────────┐                                     │
        │ GENERATING │                                     │
        └────────────┘                                     │
          │         │                                      │
     success      failure                                  │
          │         │                                      │
          ▼         ▼                                      │
       ┌──────┐  ┌───────┐                                 │
       │ DONE │  │ ERROR │ ────────────────────────────────┘
       └──────┘  └───────┘
          │
          │ user edits prompt text
          ▼
       ┌──────┐
       │ IDLE │  (edit resets to idle, file_path cleared)
       └──────┘

VoiceBlock with source_path (user file):
  → status = PROVIDED immediately, no generation needed
```

---

## Slot alignment rule

The manifest enforces that blocks are aligned by `order` index across lanes.
- `video_blocks[n]` covers the same time slot as `sfx_blocks[n]` and `voice_blocks[n]`
- When the user reorders Lane 1, the other lanes do NOT auto-reorder.
  The user must manually reorder SFX and Voice lanes independently.
- This is intentional: the user may want different SFX/voice timing than video order.
- Rendering uses `order` index to pair: video slot N gets sfx block at order N and voice block at order N.

---

## manifest.json on disk (example)

```json
{
  "project_name": "MyShort",
  "project_dir": "C:/Users/Deep/projects/MyShort",
  "output_dir": "C:/Users/Deep/projects/MyShort/output",
  "render_complete": false,
  "video_blocks": [
    {
      "id": "v_00",
      "file_path": "C:/clips/clip_01.mp4",
      "filename": "clip_01.mp4",
      "duration_s": 5.0,
      "thumbnail_path": "C:/Users/Deep/projects/MyShort/.thumbs/v_00.jpg",
      "order": 0
    }
  ],
  "sfx_blocks": [
    {
      "id": "sfx_00",
      "prompt": "thunder crack, deep cinematic boom",
      "order": 0,
      "status": "done",
      "file_path": "C:/Users/Deep/projects/MyShort/sfx/sfx_00.wav",
      "duration_s": 5.0,
      "error_msg": null
    }
  ],
  "voice_blocks": [
    {
      "id": "vo_00",
      "order": 0,
      "status": "provided",
      "prompt": null,
      "source_path": "C:/voiceovers/vo_01.mp3",
      "file_path": "C:/voiceovers/vo_01.mp3",
      "duration_s": 4.8,
      "error_msg": null
    }
  ]
}
```
