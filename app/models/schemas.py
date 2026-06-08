from pydantic import BaseModel
from typing import Optional, Dict, Any, List

class LicenseActivateRequest(BaseModel):
    license_key: str
    gmail: str
    password: str

class SettingsModel(BaseModel):
    tts_server_url: str
    sfx_server_url: str
    output_dir: str
    projects_dir: str

class ProjectLoadRequest(BaseModel):
    project_name: str

class VideoScanRequest(BaseModel):
    project_name: str
    video_folder: str

class TtsGenerateRequest(BaseModel):
    project_name: str
    block_id: str
    text: str
    voice: str = "alba"

class SfxGenerateRequest(BaseModel):
    project_name: str
    block_id: str
    prompt: str
    model: str = "small-sfx"
    duration: float = 5.0
    steps: int = 8
    seed: int = -1

class RenderRequest(BaseModel):
    project_name: str
    concat: bool = True
    video_volume: Optional[float] = 1.0
    voice_volume: Optional[float] = 1.0
    sfx_volume: Optional[float] = 0.5
    music_volume: Optional[float] = 0.5

class EngineToggleRequest(BaseModel):
    engine: str  # "tts", "stable_audio", "sfx", "music"
    action: str  # "start", "stop"

class CharacterProfileModel(BaseModel):
    id: str
    name: str
    image_path: str
    chars: List[Dict[str, Any]]
