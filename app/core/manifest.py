from __future__ import annotations
import json
import logging
from dataclasses import dataclass, field, asdict
from enum import Enum
from pathlib import Path
from typing import Optional, List, Dict, Any

logger = logging.getLogger("autostitch")

class BlockStatus(str, Enum):
    IDLE       = "idle"        # exists, not yet generated
    GENERATING = "generating"  # engine is running
    DONE       = "done"        # asset ready at file_path
    ERROR      = "error"       # generation failed
    PROVIDED   = "provided"    # user-provided file (no generation needed)

@dataclass
class VideoBlock:
    id: str                    # e.g. "v_01", "v_02"
    file_path: str             # absolute path to .mp4 as string
    filename: str              # display name
    duration_s: float          # seconds, from ffprobe
    thumbnail_path: Optional[str] = None
    order: int = 0             # position in lane (0-indexed)

    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)

    @classmethod
    def from_dict(cls, d: Dict[str, Any]) -> VideoBlock:
        return cls(
            id=d["id"],
            file_path=d["file_path"],
            filename=d["filename"],
            duration_s=float(d["duration_s"]),
            thumbnail_path=d.get("thumbnail_path"),
            order=int(d.get("order", 0))
        )

@dataclass
class SfxBlock:
    id: str                    # e.g. "sfx_01"
    prompt: str                # text prompt for Stable Audio
    order: int = 0             # position in lane
    status: BlockStatus = BlockStatus.IDLE
    file_path: Optional[str] = None   # path to generated .wav
    duration_s: Optional[float] = None # target duration (default: match video slot)
    error_msg: Optional[str] = None

    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)

    @classmethod
    def from_dict(cls, d: Dict[str, Any]) -> SfxBlock:
        return cls(
            id=d["id"],
            prompt=d["prompt"],
            order=int(d.get("order", 0)),
            status=BlockStatus(d.get("status", BlockStatus.IDLE)),
            file_path=d.get("file_path"),
            duration_s=float(d["duration_s"]) if d.get("duration_s") is not None else None,
            error_msg=d.get("error_msg")
        )

@dataclass
class VoiceBlock:
    id: str                    # e.g. "vo_01"
    order: int = 0
    status: BlockStatus = BlockStatus.IDLE
    prompt: Optional[str] = None       # TTS script text
    voice: str = "alba"                # Selected voice for TTS
    source_path: Optional[str] = None # user-provided audio file
    file_path: Optional[str] = None   # path to generated or copied .wav/.mp3
    duration_s: Optional[float] = None
    error_msg: Optional[str] = None

    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)

    @classmethod
    def from_dict(cls, d: Dict[str, Any]) -> VoiceBlock:
        return cls(
            id=d["id"],
            order=int(d.get("order", 0)),
            status=BlockStatus(d.get("status", BlockStatus.IDLE)),
            prompt=d.get("prompt"),
            voice=d.get("voice", "alba"),
            source_path=d.get("source_path"),
            file_path=d.get("file_path"),
            duration_s=float(d["duration_s"]) if d.get("duration_s") is not None else None,
            error_msg=d.get("error_msg")
        )

@dataclass
class Manifest:
    project_name: str = "Untitled"
    project_dir: str = "."
    video_blocks: List[VideoBlock] = field(default_factory=list)
    sfx_blocks: List[SfxBlock] = field(default_factory=list)
    voice_blocks: List[VoiceBlock] = field(default_factory=list)
    output_dir: str = "output"
    render_complete: bool = False

    def to_dict(self) -> Dict[str, Any]:
        """Convert manifest to dict."""
        return {
            "project_name": self.project_name,
            "project_dir": self.project_dir,
            "video_blocks": [asdict(b) for b in self.video_blocks],
            "sfx_blocks": [asdict(b) for b in self.sfx_blocks],
            "voice_blocks": [asdict(b) for b in self.voice_blocks],
            "output_dir": self.output_dir,
            "render_complete": self.render_complete
        }

    def to_json(self) -> str:
        """Serialise to JSON string."""
        return json.dumps(self.to_dict(), indent=2)

    @classmethod
    def from_dict(cls, d: Dict[str, Any]) -> Manifest:
        """Create Manifest from dict."""
        video_blocks = [VideoBlock.from_dict(b) for b in d.get("video_blocks", [])]
        sfx_blocks = [SfxBlock.from_dict(b) for b in d.get("sfx_blocks", [])]
        voice_blocks = [VoiceBlock.from_dict(b) for b in d.get("voice_blocks", [])]

        return cls(
            project_name=d.get("project_name", "Untitled"),
            project_dir=d.get("project_dir", "."),
            video_blocks=video_blocks,
            sfx_blocks=sfx_blocks,
            voice_blocks=voice_blocks,
            output_dir=d.get("output_dir", "output"),
            render_complete=bool(d.get("render_complete", False))
        )

    @classmethod
    def from_json(cls, data_str: str) -> Manifest:
        """Deserialise from JSON string."""
        return cls.from_dict(json.loads(data_str))

    def save(self) -> None:
        """Write manifest.json to project_dir."""
        p_dir = Path(self.project_dir)
        p_dir.mkdir(parents=True, exist_ok=True)
        manifest_path = p_dir / "manifest.json"
        try:
            with open(manifest_path, "w", encoding="utf-8") as f:
                f.write(self.to_json())
            logger.info(f"Manifest saved to {manifest_path}")
        except Exception as e:
            logger.error(f"Failed to save manifest to {manifest_path}: {e}")

    def get_slot(self, order: int) -> tuple[Optional[VideoBlock], Optional[SfxBlock], Optional[VoiceBlock]]:
        """Return the video, sfx, voice blocks at a given order position."""
        v = next((b for b in self.video_blocks if b.order == order), None)
        s = next((b for b in self.sfx_blocks if b.order == order), None)
        vo = next((b for b in self.voice_blocks if b.order == order), None)
        return v, s, vo
