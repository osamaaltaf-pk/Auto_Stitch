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
class CharacterConfig:
    x: float
    y: float
    width: float
    height: float
    style: str
    skin_color: str
    line_color: str
    rotation: float = 0.0
    perspective: float = 1.0
    face_angle: float = 0.0
    landmarks_calib: Optional[List[Dict[str, float]]] = None

    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)

    @classmethod
    def from_dict(cls, d: Dict[str, Any]) -> CharacterConfig:
        return cls(
            x=float(d["x"]),
            y=float(d["y"]),
            width=float(d["width"]),
            height=float(d["height"]),
            style=d["style"],
            skin_color=d["skin_color"],
            line_color=d["line_color"],
            rotation=float(d.get("rotation", 0.0)),
            perspective=float(d.get("perspective", 1.0)),
            face_angle=float(d.get("face_angle", 0.0)),
            landmarks_calib=d.get("landmarks_calib")
        )

@dataclass
class CharacterProfile:
    id: str
    name: str
    image_path: str
    chars: List[CharacterConfig] = field(default_factory=list)

    def to_dict(self) -> Dict[str, Any]:
        return {
            "id": self.id,
            "name": self.name,
            "image_path": self.image_path,
            "chars": [c.to_dict() for c in self.chars]
        }

    @classmethod
    def from_dict(cls, d: Dict[str, Any]) -> CharacterProfile:
        return cls(
            id=d["id"],
            name=d["name"],
            image_path=d["image_path"],
            chars=[CharacterConfig.from_dict(c) for c in d.get("chars", [])]
        )

@dataclass
class VideoBlock:
    id: str                    # e.g. "v_01", "v_02"
    file_path: str             # absolute path as string
    filename: str              # display name
    duration_s: float          # seconds, from ffprobe
    thumbnail_path: Optional[str] = None
    order: int = 0             # position in lane (0-indexed)
    media_type: str = "video"  # "video" or "image"
    volume: float = 1.0
    transition: str = "none"
    lip_sync_enabled: bool = False
    lip_sync_character_profile_id: Optional[str] = None
    overlay_effect: str = "none"
    canvas_fit_mode: str = "letterbox"
    color_grading: str = "none"

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
            order=int(d.get("order", 0)),
            media_type=d.get("media_type", "video"),
            volume=float(d.get("volume", 1.0)),
            transition=d.get("transition", "none"),
            lip_sync_enabled=bool(d.get("lip_sync_enabled", False)),
            lip_sync_character_profile_id=d.get("lip_sync_character_profile_id"),
            overlay_effect=d.get("overlay_effect", "none"),
            canvas_fit_mode=d.get("canvas_fit_mode", "letterbox"),
            color_grading=d.get("color_grading", "none")
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
    volume: float = 1.0

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
            error_msg=d.get("error_msg"),
            volume=float(d.get("volume", 1.0))
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
    volume: float = 1.0
    prompts: List[Dict[str, Any]] = field(default_factory=list)

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
            error_msg=d.get("error_msg"),
            volume=float(d.get("volume", 1.0)),
            prompts=d.get("prompts", [])
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
    canvas: str = "16:9"
    canvas_width: int = 1920
    canvas_height: int = 1080
    global_transition: str = "none"
    global_overlay: str = "none"
    captions_enabled: bool = True
    caption_style: str = "karaoke"
    caption_mode: str = "word_by_word"
    caption_font_color: str = "yellow"
    caption_font_size: int = 40
    caption_font_style: str = "arial"
    caption_placement: str = "bottom"
    caption_box_enabled: bool = True
    caption_box_color: str = "black@0.5"
    caption_outline_color: str = "black"
    caption_outline_width: int = 0
    global_color_grading: str = "none"
    sfx_captions_enabled: bool = True
    character_profiles: List[CharacterProfile] = field(default_factory=list)

    def to_dict(self) -> Dict[str, Any]:
        """Convert manifest to dict."""
        return {
            "project_name": self.project_name,
            "project_dir": self.project_dir,
            "video_blocks": [asdict(b) for b in self.video_blocks],
            "sfx_blocks": [asdict(b) for b in self.sfx_blocks],
            "voice_blocks": [asdict(b) for b in self.voice_blocks],
            "output_dir": self.output_dir,
            "render_complete": self.render_complete,
            "canvas": self.canvas,
            "canvas_width": self.canvas_width,
            "canvas_height": self.canvas_height,
            "global_transition": self.global_transition,
            "global_overlay": self.global_overlay,
            "captions_enabled": self.captions_enabled,
            "caption_style": self.caption_style,
            "caption_mode": self.caption_mode,
            "caption_font_color": self.caption_font_color,
            "caption_font_size": self.caption_font_size,
            "caption_font_style": self.caption_font_style,
            "caption_placement": self.caption_placement,
            "caption_box_enabled": self.caption_box_enabled,
            "caption_box_color": self.caption_box_color,
            "caption_outline_color": self.caption_outline_color,
            "caption_outline_width": self.caption_outline_width,
            "global_color_grading": self.global_color_grading,
            "sfx_captions_enabled": self.sfx_captions_enabled,
            "character_profiles": [p.to_dict() for p in self.character_profiles]
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
        character_profiles = [CharacterProfile.from_dict(p) for p in d.get("character_profiles", [])]

        return cls(
            project_name=d.get("project_name", "Untitled"),
            project_dir=d.get("project_dir", "."),
            video_blocks=video_blocks,
            sfx_blocks=sfx_blocks,
            voice_blocks=voice_blocks,
            output_dir=d.get("output_dir", "output"),
            render_complete=bool(d.get("render_complete", False)),
            canvas=d.get("canvas", "16:9"),
            canvas_width=int(d.get("canvas_width", 1920)),
            canvas_height=int(d.get("canvas_height", 1080)),
            global_transition=d.get("global_transition", "none"),
            global_overlay=d.get("global_overlay", "none"),
            captions_enabled=bool(d.get("captions_enabled", True)),
            caption_style=d.get("caption_style", "karaoke"),
            caption_mode=d.get("caption_mode", "word_by_word"),
            caption_font_color=d.get("caption_font_color", "yellow"),
            caption_font_size=int(d.get("caption_font_size", 40)),
            caption_font_style=d.get("caption_font_style", "arial"),
            caption_placement=d.get("caption_placement", "bottom"),
            caption_box_enabled=bool(d.get("caption_box_enabled", True)),
            caption_box_color=d.get("caption_box_color", "black@0.5"),
            caption_outline_color=d.get("caption_outline_color", "black"),
            caption_outline_width=int(d.get("caption_outline_width", 0)),
            global_color_grading=d.get("global_color_grading", "none"),
            sfx_captions_enabled=bool(d.get("sfx_captions_enabled", True)),
            character_profiles=character_profiles
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
