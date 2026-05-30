import os
import sys
import json
import logging
import asyncio
import httpx
from pathlib import Path
from typing import Optional, Dict, Any, List
from fastapi import FastAPI, HTTPException, BackgroundTasks, UploadFile, File
from fastapi.responses import HTMLResponse, FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

# Initialize logger
logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("autostitch")

# Make sure app path is in system path
sys.path.append(str(Path(__file__).resolve().parent))

from app.core.manifest import Manifest, BlockStatus, VideoBlock, SfxBlock, VoiceBlock
from app.utils import ffprobe
from app.core import stitcher

app = FastAPI(
    title="AutoStitch Unified Backend",
    description="Orchestrates projects, proxy requests, and runs FFmpeg rendering.",
    version="1.0.0"
)

# Enable CORS for local cross-origin request compatibility
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configuration & Paths
BASE_DIR = Path(__file__).resolve().parent
PROJECTS_DIR = BASE_DIR / "projects"
OUTPUT_DIR = BASE_DIR / "output"
STATIC_DIR = BASE_DIR / "static"
THUMBS_DIR = BASE_DIR / "static" / "thumbnails"

# Ensure essential folders exist
PROJECTS_DIR.mkdir(exist_ok=True)
OUTPUT_DIR.mkdir(exist_ok=True)
STATIC_DIR.mkdir(exist_ok=True)
THUMBS_DIR.mkdir(exist_ok=True)

# Settings persistence
SETTINGS_FILE = BASE_DIR / "settings.json"
DEFAULT_SETTINGS = {
    "tts_server_url": "http://127.0.0.1:8000",
    "sfx_server_url": "http://127.0.0.1:5001",  # Defaults to 5001 (GPU Colab)
    "output_dir": str(OUTPUT_DIR),
    "projects_dir": str(PROJECTS_DIR),
}

def load_settings() -> Dict[str, Any]:
    settings = DEFAULT_SETTINGS.copy()
    if SETTINGS_FILE.exists():
        try:
            with open(SETTINGS_FILE, "r", encoding="utf-8") as f:
                loaded = json.load(f)
                settings.update(loaded)
        except Exception as e:
            logger.error(f"Error reading settings: {e}")
            
    # Normalize URLs to strip trailing slashes and prevent double slashes
    if "tts_server_url" in settings and isinstance(settings["tts_server_url"], str):
        settings["tts_server_url"] = settings["tts_server_url"].rstrip("/")
    if "sfx_server_url" in settings and isinstance(settings["sfx_server_url"], str):
        settings["sfx_server_url"] = settings["sfx_server_url"].rstrip("/")
        
    return settings

def save_settings(settings: Dict[str, Any]) -> None:
    try:
        with open(SETTINGS_FILE, "w", encoding="utf-8") as f:
            json.dump(settings, f, indent=2)
    except Exception as e:
        logger.error(f"Error saving settings: {e}")

# Global state tracker for currently rendering projects
active_renders = {}  # project_name -> {"status": "idle"|"rendering"|"done"|"error", "progress": 0.0, "error": None}

# API Schemas
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

# --- API ENDPOINTS ---

@app.get("/api/health")
async def health_check():
    """Checks online status of all engines."""
    settings = load_settings()
    
    # 1. Check TTS Server (FastAPI)
    tts_online = False
    tts_model_loaded = False
    try:
        async with httpx.AsyncClient() as client:
            resp = await client.get(
                f"{settings['tts_server_url']}/api/health",
                headers={"bypass-tunnel-reminder": "true"},
                timeout=2.0
            )
            if resp.status_code == 200:
                tts_online = True
                tts_model_loaded = resp.json().get("model_loaded", False)
    except Exception:
        pass

    # 2. Check SFX Server (Flask)
    sfx_online = False
    sfx_device = "unknown"
    try:
        async with httpx.AsyncClient() as client:
            resp = await client.get(
                f"{settings['sfx_server_url']}/api/health",
                headers={"bypass-tunnel-reminder": "true"},
                timeout=2.0
            )
            if resp.status_code == 200:
                sfx_online = True
                sfx_device = resp.json().get("device", "cpu")
    except Exception:
        pass

    # 3. Check FFmpeg binary
    ffmpeg_bin = stitcher.get_ffmpeg_path()
    ffmpeg_ok = ffmpeg_bin.exists() or Path("ffmpeg").exists()

    return {
        "tts_server": {
            "online": tts_online,
            "url": settings["tts_server_url"],
            "model_loaded": tts_model_loaded
        },
        "sfx_server": {
            "online": sfx_online,
            "url": settings["sfx_server_url"],
            "device": sfx_device
        },
        "ffmpeg": {
            "ok": ffmpeg_ok,
            "path": str(ffmpeg_bin)
        }
    }

@app.get("/api/settings")
async def get_settings():
    return load_settings()

@app.post("/api/settings")
async def update_settings(model: SettingsModel):
    settings = model.dict()
    save_settings(settings)
    return {"status": "ok", "settings": settings}

@app.get("/api/voices")
async def list_available_voices():
    """Fetch the dynamic list of voices from the PocketTTS server, supporting both flat list and dictionary response styles."""
    settings = load_settings()
    tts_url = settings["tts_server_url"]
    default_voices = ["alba", "marius", "fantine", "cosette", "jean", "eponine"]
    try:
        async with httpx.AsyncClient() as client:
            resp = await client.get(
                f"{tts_url}/api/voices",
                headers={"bypass-tunnel-reminder": "true"},
                timeout=5.0
            )
            if resp.status_code == 200:
                raw_voices = resp.json().get("voices", [])
                server_voices = []
                for v in raw_voices:
                    if isinstance(v, dict) and "name" in v:
                        server_voices.append(v["name"])
                    elif isinstance(v, str):
                        server_voices.append(v)
                # Combine and remove duplicates cleanly
                return {"voices": sorted(list(set(default_voices + server_voices)))}
    except Exception as e:
        logger.warning(f"Failed contacting PocketTTS voices API: {e}")
    return {"voices": default_voices}

@app.delete("/api/voices/delete/{voice_name}")
async def proxy_delete_voice(voice_name: str):
    """Delete a dynamic cloned voice from the PocketTTS server."""
    settings = load_settings()
    tts_url = settings["tts_server_url"]
    try:
        async with httpx.AsyncClient() as client:
            resp = await client.post(
                f"{tts_url}/api/voices/delete?voice_name={voice_name}",
                headers={"bypass-tunnel-reminder": "true"},
                timeout=10.0
            )
            if resp.status_code == 200:
                return resp.json()
            else:
                raise HTTPException(status_code=resp.status_code, detail=resp.text)
    except Exception as e:
        logger.error(f"Failed deleting voice '{voice_name}': {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/voices/clone")
async def proxy_clone_voice(file: UploadFile = File(...)):
    """Upload custom voice sample to PocketTTS and register it as a dynamic cloned voice."""
    settings = load_settings()
    tts_url = settings["tts_server_url"]
    try:
        async with httpx.AsyncClient() as client:
            # Read file content and build dynamic upload multipart payload
            content = await file.read()
            files = {"file": (file.filename, content, file.content_type)}
            logger.info(f"Proxying voice upload for cloning to PocketTTS at: {tts_url}/api/upload-voice")
            
            resp = await client.post(
                f"{tts_url}/api/upload-voice",
                files=files,
                headers={"bypass-tunnel-reminder": "true"},
                timeout=45.0
            )
            if resp.status_code == 200:
                return resp.json()
            else:
                logger.error(f"TTS Server voice upload error: {resp.text}")
                raise HTTPException(status_code=resp.status_code, detail=resp.text)
    except Exception as e:
        logger.error(f"Proxy voice cloning failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/videos/select-folder")
async def select_local_folder():
    """Opens a native local directory selection dialog forced to topmost front with modern file-open style."""
    import subprocess
    
    def ask_folder():
        # Open modern Windows Explorer dialogue style (OpenFileDialog configured to select folders)
        cmd = [
            "powershell",
            "-NoProfile",
            "-Command",
            "Add-Type -AssemblyName System.Windows.Forms; $w = New-Object System.Windows.Forms.Form; $w.TopMost = $true; $d = New-Object System.Windows.Forms.OpenFileDialog; $d.Title = 'Select Videos Directory to Scan'; $d.Filter = 'Folders|`n'; $d.CheckFileExists = $false; $d.DereferenceLinks = $false; $d.FileName = 'Select Folder Here'; if ($d.ShowDialog($w) -eq 'OK') { [System.IO.Path]::GetDirectoryName($d.FileName) }"
        ]
        result = subprocess.run(
            cmd, 
            stdout=subprocess.PIPE, 
            stderr=subprocess.PIPE, 
            text=True, 
            creationflags=0x08000000
        )
        return result.stdout.strip()

    loop = asyncio.get_event_loop()
    folder_path = await loop.run_in_executor(None, ask_folder)
    
    if folder_path:
        normalized = os.path.normpath(folder_path)
        logger.info(f"User picked local video folder: {normalized}")
        return {"status": "ok", "folder": normalized}
    return {"status": "cancelled", "folder": ""}

@app.get("/api/videos/downloads-folder")
async def get_downloads_folder():
    """Returns the standard Windows Downloads folder for the current user."""
    try:
        downloads = Path.home() / "Downloads"
        if downloads.exists():
            return {"status": "ok", "folder": str(downloads)}
    except Exception as e:
        logger.error(f"Error locating downloads folder: {e}")
    return {"status": "error", "message": "Could not locate Downloads folder"}

@app.post("/api/project/load")
async def load_project(req: ProjectLoadRequest):
    project_name = req.project_name.strip()
    if not project_name:
        raise HTTPException(status_code=400, detail="Project name cannot be empty")
        
    p_dir = PROJECTS_DIR / project_name
    p_dir.mkdir(parents=True, exist_ok=True)
    manifest_path = p_dir / "manifest.json"
    
    if manifest_path.exists():
        try:
            with open(manifest_path, "r", encoding="utf-8") as f:
                content = f.read()
            manifest = Manifest.from_json(content)
            manifest.project_dir = str(p_dir)
            return manifest.to_dict()
        except Exception as e:
            logger.error(f"Error parsing manifest.json: {e}")
            raise HTTPException(status_code=500, detail=f"Failed loading manifest: {str(e)}")
            
    # Return fresh blank project
    manifest = Manifest(
        project_name=project_name,
        project_dir=str(p_dir),
        output_dir=str(OUTPUT_DIR)
    )
    manifest.save()
    return manifest.to_dict()

@app.post("/api/project/save")
async def save_project_api(data: Dict[str, Any]):
    try:
        manifest = Manifest.from_dict(data)
        # Force directory compliance
        p_dir = PROJECTS_DIR / manifest.project_name
        p_dir.mkdir(parents=True, exist_ok=True)
        manifest.project_dir = str(p_dir)
        manifest.save()
        return {"status": "ok"}
    except Exception as e:
        logger.error(f"Error saving project manifest: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/videos/load")
async def scan_video_folder(req: VideoScanRequest):
    """
    Scans a local directory for video clips, extracts durations/thumbnails,
    and updates the project's video blocks.
    """
    project_name = req.project_name
    folder_path = Path(req.video_folder.strip())
    
    if not folder_path.exists() or not folder_path.is_dir():
        raise HTTPException(status_code=400, detail="Video directory does not exist")
        
    p_dir = PROJECTS_DIR / project_name
    if not p_dir.exists():
        raise HTTPException(status_code=404, detail="Project not loaded")
        
    # Read current manifest
    manifest_path = p_dir / "manifest.json"
    with open(manifest_path, "r", encoding="utf-8") as f:
        manifest = Manifest.from_json(f.read())
        
    # Scan MP4 clips
    mp4_files = sorted(
        [p for p in folder_path.iterdir() if p.is_file() and p.suffix.lower() == ".mp4"],
        key=lambda x: x.name
    )
    
    if not mp4_files:
        return {"status": "ok", "message": "No MP4 videos found in this folder.", "blocks": []}
        
    logger.info(f"Scanning {len(mp4_files)} clips in {folder_path}...")
    
    # Process metadata & thumbnails
    video_blocks = []
    for idx, f_path in enumerate(mp4_files):
        meta = ffprobe.get_video_metadata(f_path)
        
        # Unique ID & thumb path
        v_id = f"v_{idx:02d}"
        thumb_name = f"{project_name}_{v_id}.jpg"
        thumb_path = THUMBS_DIR / thumb_name
        
        # Extract visual frame grab at 0s mark
        ffprobe.extract_thumbnail(f_path, thumb_path, time_s=0.0)
        
        block = VideoBlock(
            id=v_id,
            file_path=str(f_path),
            filename=f_path.name,
            duration_s=meta["duration_s"] if meta["duration_s"] > 0 else 5.0,
            thumbnail_path=f"/static/thumbnails/{thumb_name}",
            order=idx
        )
        video_blocks.append(block)
        
    # Align lanes if they are smaller
    manifest.video_blocks = video_blocks
    
    # Keep matching SFX & voice slots aligned
    # Expand SFX blocks to match
    while len(manifest.sfx_blocks) < len(video_blocks):
        new_idx = len(manifest.sfx_blocks)
        manifest.sfx_blocks.append(SfxBlock(id=f"sfx_{new_idx:02d}", prompt="", order=new_idx))
        
    # Expand Voice blocks to match
    while len(manifest.voice_blocks) < len(video_blocks):
        new_idx = len(manifest.voice_blocks)
        manifest.voice_blocks.append(VoiceBlock(id=f"vo_{new_idx:02d}", order=new_idx))
        
    # Clip extra items
    manifest.sfx_blocks = manifest.sfx_blocks[:len(video_blocks)]
    manifest.voice_blocks = manifest.voice_blocks[:len(video_blocks)]
    
    manifest.save()
    return {"status": "ok", "manifest": manifest.to_dict()}

# --- TTS GENERATION ---
@app.post("/api/generate/tts")
async def generate_tts(req: TtsGenerateRequest):
    settings = load_settings()
    p_dir = PROJECTS_DIR / req.project_name
    manifest_path = p_dir / "manifest.json"
    
    if not manifest_path.exists():
        raise HTTPException(status_code=404, detail="Project not found")
        
    # Read manifest
    with open(manifest_path, "r", encoding="utf-8") as f:
        manifest = Manifest.from_json(f.read())
        
    block = next((b for b in manifest.voice_blocks if b.id == req.block_id), None)
    if not block:
      raise HTTPException(status_code=404, detail="Voice block not found in project")
        
    block.status = BlockStatus.GENERATING
    block.prompt = req.text
    block.voice = req.voice
    manifest.save()
    
    # Run async TTS fetcher
    voice_dir = p_dir / "voice"
    voice_dir.mkdir(exist_ok=True)
    out_wav = voice_dir / f"vo_{block.order:02d}.wav"
    
    async def run_tts():
        try:
            async with httpx.AsyncClient() as client:
                payload = {
                    "text": req.text,
                    "voice": req.voice,
                    "format": "wav"
                }
                logger.info(f"Calling PocketTTS at {settings['tts_server_url']}/api/generate with payload: {payload}")
                resp = await client.post(
                    f"{settings['tts_server_url']}/api/generate",
                    json=payload,
                    headers={"bypass-tunnel-reminder": "true"},
                    timeout=120.0
                )
                
                if resp.status_code == 200:
                    with open(out_wav, "wb") as w_file:
                        w_file.write(resp.content)
                    block.status = BlockStatus.DONE
                    block.file_path = str(out_wav)
                    # Deduce duration using ffprobe
                    meta = ffprobe.get_video_metadata(out_wav)
                    block.duration_s = meta["duration_s"]
                    block.error_msg = None
                    logger.info(f"TTS Synthesized successfully → {out_wav}")
                else:
                    try:
                        detail = resp.json().get("detail", f"HTTP {resp.status_code}")
                    except Exception:
                        detail = f"TTS Server returned status {resp.status_code}: {resp.text[:120]}"
                    block.status = BlockStatus.ERROR
                    block.error_msg = detail
                    logger.error(f"TTS Server failed: {detail}")
        except Exception as e:
            block.status = BlockStatus.ERROR
            block.error_msg = str(e)
            logger.error(f"Connection failed to PocketTTS server: {e}")
        finally:
            manifest.save()
            
    # Trigger generation task in background so we respond immediately with "generating" status
    asyncio.create_task(run_tts())
    return {"status": "generating", "manifest": manifest.to_dict()}

# --- SFX GENERATION ---
@app.post("/api/generate/sfx")
async def generate_sfx(req: SfxGenerateRequest):
    settings = load_settings()
    p_dir = PROJECTS_DIR / req.project_name
    manifest_path = p_dir / "manifest.json"
    
    if not manifest_path.exists():
        raise HTTPException(status_code=404, detail="Project not found")
        
    with open(manifest_path, "r", encoding="utf-8") as f:
        manifest = Manifest.from_json(f.read())
        
    block = next((b for b in manifest.sfx_blocks if b.id == req.block_id), None)
    if not block:
        raise HTTPException(status_code=404, detail="SFX block not found in project")
        
    block.status = BlockStatus.GENERATING
    block.prompt = req.prompt
    manifest.save()
    
    sfx_dir = p_dir / "sfx"
    sfx_dir.mkdir(exist_ok=True)
    out_wav = sfx_dir / f"sfx_{block.order:02d}.wav"
    
    async def run_sfx():
        try:
            async with httpx.AsyncClient() as client:
                payload = {
                    "prompt": req.prompt,
                    "model": req.model,
                    "duration": req.duration,
                    "steps": req.steps,
                    "seed": req.seed
                }
                
                # Check for dynamic Colab or local API URL
                sfx_url = settings["sfx_server_url"]
                logger.info(f"Calling Stable Audio at {sfx_url}/api/generate with: {payload}")
                
                # Trigger async generation job
                resp = await client.post(
                    f"{sfx_url}/api/generate",
                    json=payload,
                    headers={"bypass-tunnel-reminder": "true"},
                    timeout=60.0
                )
                if resp.status_code != 200:
                    try:
                        err = resp.json().get("error", f"HTTP {resp.status_code}")
                    except Exception:
                        err = f"SFX Server returned status {resp.status_code}: {resp.text[:120]}"
                    block.status = BlockStatus.ERROR
                    block.error_msg = err
                    manifest.save()
                    return
                    
                job_data = resp.json()
                job_id = job_data.get("job_id")
                logger.info(f"SFX job launched successfully. Job ID: {job_id}. Starting polling...")
                
                # Poll status
                elapsed = 0
                max_wait = 240 # 4 minutes max
                job_done = False
                
                while elapsed < max_wait:
                    await asyncio.sleep(2.0)
                    elapsed += 2
                    
                    status_resp = await client.get(
                        f"{sfx_url}/api/status/{job_id}",
                        headers={"bypass-tunnel-reminder": "true"},
                        timeout=10.0
                    )
                    if status_resp.status_code == 200:
                        status_data = status_resp.json()
                        job_status = status_data.get("status")
                        logger.info(f"Job {job_id} Status: {job_status}")
                        
                        if job_status == "done":
                            job_done = True
                            break
                        elif job_status == "error":
                            block.status = BlockStatus.ERROR
                            block.error_msg = status_data.get("error", "Unknown model error")
                            manifest.save()
                            return
                    else:
                        logger.warning(f"Failed pulling job {job_id} status.")
                        
                if not job_done:
                    block.status = BlockStatus.ERROR
                    block.error_msg = "Model generation timed out"
                    manifest.save()
                    return
                    
                # Download WAV
                dl_resp = await client.get(
                    f"{sfx_url}/api/download/{job_id}",
                    headers={"bypass-tunnel-reminder": "true"},
                    timeout=60.0
                )
                if dl_resp.status_code == 200:
                    with open(out_wav, "wb") as w_file:
                        w_file.write(dl_resp.content)
                    block.status = BlockStatus.DONE
                    block.file_path = str(out_wav)
                    meta = ffprobe.get_video_metadata(out_wav)
                    block.duration_s = meta["duration_s"]
                    block.error_msg = None
                    logger.info(f"SFX file downloaded successfully → {out_wav}")
                else:
                    block.status = BlockStatus.ERROR
                    block.error_msg = "Failed downloading generated audio"
        except Exception as e:
            block.status = BlockStatus.ERROR
            block.error_msg = str(e)
            logger.error(f"Error generating SFX: {e}")
        finally:
            manifest.save()
            
    asyncio.create_task(run_sfx())
    return {"status": "generating", "manifest": manifest.to_dict()}

# --- RENDERING ENGINE ---
@app.post("/api/render")
async def trigger_render(req: RenderRequest, background_tasks: BackgroundTasks):
    project_name = req.project_name
    p_dir = PROJECTS_DIR / project_name
    manifest_path = p_dir / "manifest.json"
    
    if not manifest_path.exists():
        raise HTTPException(status_code=404, detail="Project not loaded")
        
    with open(manifest_path, "r", encoding="utf-8") as f:
        manifest = Manifest.from_json(f.read())
        
    if project_name in active_renders and active_renders[project_name]["status"] == "rendering":
        return {"status": "rendering", "message": "Render already in progress"}
        
    # Setup rendering status tracker
    active_renders[project_name] = {
        "status": "rendering",
        "progress": 0.0,
        "error": None
    }
    
    def on_clip_progress(done_clips: int, total_clips: int):
        progress = float(done_clips) / float(total_clips) * 100.0
        active_renders[project_name]["progress"] = round(progress, 1)
        logger.info(f"Render progress for {project_name}: {progress}%")

    async def render_task():
        try:
            logger.info(f"Launching render job for project '{project_name}'...")
            output_path = await stitcher.render_all(
                manifest=manifest,
                concat=req.concat,
                on_clip_done=on_clip_progress
            )
            active_renders[project_name]["status"] = "done"
            active_renders[project_name]["progress"] = 100.0
            
            # Save render completion status
            manifest.render_complete = True
            manifest.save()
            logger.info(f"Render completed successfully for {project_name}! Output: {output_path}")
        except Exception as e:
            active_renders[project_name]["status"] = "error"
            active_renders[project_name]["error"] = str(e)
            logger.error(f"Render task failed: {e}")
            
    background_tasks.add_task(render_task)
    return {"status": "rendering", "message": "Render task scheduled"}

@app.get("/api/render/status/{project_name}")
async def get_render_status(project_name: str):
    if project_name not in active_renders:
        # Check if project manifest already has render_complete
        p_dir = PROJECTS_DIR / project_name
        manifest_path = p_dir / "manifest.json"
        if manifest_path.exists():
            try:
                with open(manifest_path, "r", encoding="utf-8") as f:
                    manifest = Manifest.from_json(f.read())
                if manifest.render_complete:
                    return {"status": "done", "progress": 100.0, "error": None}
            except Exception:
                pass
        return {"status": "idle", "progress": 0.0, "error": None}
    return active_renders[project_name]

# --- CUSTOM MANUAL FILE UPLOADS & MEDIA CLEARING ---

@app.post("/api/upload/video")
async def upload_custom_video(project_name: str, index: int, file: UploadFile = File(...)):
    p_dir = PROJECTS_DIR / project_name
    manifest_path = p_dir / "manifest.json"
    if not manifest_path.exists():
        raise HTTPException(status_code=404, detail="Project not found")
        
    with open(manifest_path, "r", encoding="utf-8") as f:
        manifest = Manifest.from_json(f.read())
        
    if index < 0 or index >= len(manifest.video_blocks):
        raise HTTPException(status_code=400, detail="Invalid slot index")
        
    custom_video_dir = p_dir / "videos"
    custom_video_dir.mkdir(exist_ok=True)
    
    file_extension = Path(file.filename).suffix.lower()
    if not file_extension:
        file_extension = ".mp4"
    out_file_path = custom_video_dir / f"custom_v_{index:02d}{file_extension}"
    
    content = await file.read()
    with open(out_file_path, "wb") as f_out:
        f_out.write(content)
        
    meta = ffprobe.get_video_metadata(out_file_path)
    v_id = manifest.video_blocks[index].id
    thumb_name = f"{project_name}_{v_id}_custom.jpg"
    thumb_path = THUMBS_DIR / thumb_name
    ffprobe.extract_thumbnail(out_file_path, thumb_path, time_s=0.0)
    
    block = manifest.video_blocks[index]
    block.file_path = str(out_file_path)
    block.filename = file.filename
    block.duration_s = meta["duration_s"] if meta["duration_s"] > 0 else 5.0
    block.thumbnail_path = f"/static/thumbnails/{thumb_name}"
    
    manifest.save()
    return {"status": "ok", "block": block.to_dict(), "manifest": manifest.to_dict()}

@app.post("/api/upload/voice")
async def upload_custom_voice(project_name: str, index: int, file: UploadFile = File(...)):
    p_dir = PROJECTS_DIR / project_name
    manifest_path = p_dir / "manifest.json"
    if not manifest_path.exists():
        raise HTTPException(status_code=404, detail="Project not found")
        
    with open(manifest_path, "r", encoding="utf-8") as f:
        manifest = Manifest.from_json(f.read())
        
    if index < 0 or index >= len(manifest.voice_blocks):
        raise HTTPException(status_code=400, detail="Invalid slot index")
        
    voice_dir = p_dir / "voice"
    voice_dir.mkdir(exist_ok=True)
    
    out_wav = voice_dir / f"vo_{index:02d}.wav"
    
    content = await file.read()
    with open(out_wav, "wb") as f_out:
        f_out.write(content)
        
    meta = ffprobe.get_video_metadata(out_wav)
    
    block = manifest.voice_blocks[index]
    block.status = BlockStatus.PROVIDED
    block.file_path = str(out_wav)
    block.duration_s = meta["duration_s"] if meta["duration_s"] > 0 else 5.0
    block.prompt = f"[Uploaded Audio: {file.filename}]"
    block.error_msg = None
    
    manifest.save()
    return {"status": "ok", "block": block.to_dict(), "manifest": manifest.to_dict()}

@app.post("/api/upload/sfx")
async def upload_custom_sfx(project_name: str, index: int, file: UploadFile = File(...)):
    p_dir = PROJECTS_DIR / project_name
    manifest_path = p_dir / "manifest.json"
    if not manifest_path.exists():
        raise HTTPException(status_code=404, detail="Project not found")
        
    with open(manifest_path, "r", encoding="utf-8") as f:
        manifest = Manifest.from_json(f.read())
        
    if index < 0 or index >= len(manifest.sfx_blocks):
        raise HTTPException(status_code=400, detail="Invalid slot index")
        
    sfx_dir = p_dir / "sfx"
    sfx_dir.mkdir(exist_ok=True)
    
    out_wav = sfx_dir / f"sfx_{index:02d}.wav"
    
    content = await file.read()
    with open(out_wav, "wb") as f_out:
        f_out.write(content)
        
    meta = ffprobe.get_video_metadata(out_wav)
    
    block = manifest.sfx_blocks[index]
    block.status = BlockStatus.DONE
    block.file_path = str(out_wav)
    block.duration_s = meta["duration_s"] if meta["duration_s"] > 0 else 5.0
    block.prompt = f"[Uploaded Audio: {file.filename}]"
    block.error_msg = None
    
    manifest.save()
    return {"status": "ok", "block": block.to_dict(), "manifest": manifest.to_dict()}

@app.post("/api/clear/block")
async def clear_block_media(project_name: str, lane: str, index: int):
    p_dir = PROJECTS_DIR / project_name
    manifest_path = p_dir / "manifest.json"
    if not manifest_path.exists():
        raise HTTPException(status_code=404, detail="Project not found")
        
    with open(manifest_path, "r", encoding="utf-8") as f:
        manifest = Manifest.from_json(f.read())
        
    if lane == "video":
        if index < 0 or index >= len(manifest.video_blocks):
            raise HTTPException(status_code=400, detail="Invalid index")
        block = manifest.video_blocks[index]
        block.file_path = ""
        block.filename = "Blank_Clip.mp4"
        block.duration_s = 5.0
        block.thumbnail_path = "/static/thumbnails/placeholder.jpg"
    elif lane == "voice":
        if index < 0 or index >= len(manifest.voice_blocks):
            raise HTTPException(status_code=400, detail="Invalid index")
        block = manifest.voice_blocks[index]
        block.file_path = None
        block.prompt = ""
        block.status = BlockStatus.IDLE
        block.duration_s = 0.0
    elif lane == "sfx":
        if index < 0 or index >= len(manifest.sfx_blocks):
            raise HTTPException(status_code=400, detail="Invalid index")
        block = manifest.sfx_blocks[index]
        block.file_path = None
        block.prompt = ""
        block.status = BlockStatus.IDLE
        block.duration_s = 0.0
    else:
        raise HTTPException(status_code=400, detail="Invalid lane")
        
    manifest.save()
    return {"status": "ok", "manifest": manifest.to_dict()}

# --- STATIC CONTENT & SPA SERVING ---

# Expose thumbnails as a static route so browser React can render them
app.mount("/static", StaticFiles(directory=str(STATIC_DIR)), name="static")
app.mount("/projects", StaticFiles(directory=str(PROJECTS_DIR)), name="projects")
app.mount("/output", StaticFiles(directory=str(OUTPUT_DIR)), name="output")

@app.get("/api/video/serve")
async def serve_video(path: str):
    import os
    if not path or not os.path.exists(path):
        raise HTTPException(status_code=404, detail=f"Video file not found: {path}")
    return FileResponse(path)

@app.get("/")
async def serve_index():
    index_path = STATIC_DIR / "index.html"
    if index_path.exists():
        return FileResponse(index_path)
    else:
        return HTMLResponse("<h2>AutoStitch Studio UI placeholder. Serve static files index.html to show full SPA editor.</h2>")

if __name__ == "__main__":
    import uvicorn
    # Start the server on port 8080
    logger.info("Starting AutoStitch Studio backend server...")
    uvicorn.run("main:app", host="0.0.0.0", port=8080, reload=False)
