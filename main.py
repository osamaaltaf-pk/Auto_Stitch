import os
import sys
import re
import json
import logging
import asyncio
import httpx
import datetime
import hashlib
from pathlib import Path
from typing import Optional, Dict, Any, List
from fastapi import FastAPI, HTTPException, BackgroundTasks, UploadFile, File, Request
from fastapi.responses import HTMLResponse, FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

# Initialize logger
logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("autostitch")

# Load HF_TOKEN from .env if it exists
hf_token_val = os.environ.get("HF_TOKEN")
env_path = Path(__file__).resolve().parent / ".env"
if env_path.exists():
    with open(env_path, "r", encoding="utf-8") as f:
        for line in f:
            if "=" in line:
                k, v = line.split("=", 1)
                k = k.strip()
                v = v.strip().strip("'").strip('"')
                if k == "HF_TOKEN":
                    hf_token_val = v
                    os.environ["HF_TOKEN"] = v
                    logger.info("Exposed HF_TOKEN from .env file to child processes.")

# Make sure app path is in system path
sys.path.append(str(Path(__file__).resolve().parent))

from app.core.manifest import Manifest, BlockStatus, VideoBlock, SfxBlock, VoiceBlock
from app.utils import ffprobe
from app.core import stitcher
from app.core import db

app = FastAPI(
    title="AutoStitch Unified Backend",
    description="Orchestrates projects, proxy requests, and runs FFmpeg rendering.",
    version="1.0.0"
)

# Keep track of background server subprocesses
background_subprocesses = []
running_processes = {
    "tts": None,
    "stable_audio": None
}

# Keep track of project names that have been self-healed since startup
HEALED_PROJECTS = set()

# Sequential queues for TTS and SFX to prevent resource thrashing and manifest race conditions
tts_queue = asyncio.Queue()
sfx_queue = asyncio.Queue()

async def tts_queue_worker():
    logger.info("Starting sequential TTS queue worker...")
    while True:
        try:
            task_func = await tts_queue.get()
            await task_func()
        except Exception as e:
            logger.error(f"Error in TTS queue worker: {e}")
        finally:
            tts_queue.task_done()

async def sfx_queue_worker():
    logger.info("Starting sequential SFX queue worker...")
    while True:
        try:
            task_func = await sfx_queue.get()
            await task_func()
        except Exception as e:
            logger.error(f"Error in SFX queue worker: {e}")
        finally:
            sfx_queue.task_done()

def get_system_ram_gb() -> float:
    import ctypes
    class MEMORYSTATUSEX(ctypes.Structure):
        _fields_ = [
            ("dwLength", ctypes.c_ulong),
            ("dwMemoryLoad", ctypes.c_ulong),
            ("ullTotalPhys", ctypes.c_ulonglong),
            ("ullAvailPhys", ctypes.c_ulonglong),
            ("ullTotalPageFile", ctypes.c_ulonglong),
            ("ullAvailPageFile", ctypes.c_ulonglong),
            ("ullTotalVirtual", ctypes.c_ulonglong),
            ("ullAvailVirtual", ctypes.c_ulonglong),
            ("ullAvailExtendedVirtual", ctypes.c_ulonglong),
        ]
    try:
        stat = MEMORYSTATUSEX()
        stat.dwLength = ctypes.sizeof(stat)
        if ctypes.windll.kernel32.GlobalMemoryStatusEx(ctypes.byref(stat)):
            return stat.ullTotalPhys / (1024**3)
    except Exception as e:
        logger.warning(f"Could not read RAM via GlobalMemoryStatusEx: {e}")
    return 16.0  # fallback

@app.on_event("startup")
async def startup_event():
    logger.info("Initializing local SQLite production database...")
    db.init_db()
    
    # Start background sequential queue workers
    asyncio.create_task(tts_queue_worker())
    asyncio.create_task(sfx_queue_worker())
    
    # Auto-launch background servers if configured to run locally
    settings = load_settings()
    tts_url = settings.get("tts_server_url", "http://127.0.0.1:8000")
    sfx_url = settings.get("sfx_server_url", "http://127.0.0.1:5000")
    
    import subprocess
    
    # 1. PocketTTS Server
    is_tts_local = "127.0.0.1" in tts_url or "localhost" in tts_url
    if is_tts_local:
        tts_python = BASE_DIR / "Pocket_tts" / "venv" / "Scripts" / "python.exe"
        tts_script = BASE_DIR / "Pocket_tts" / "server.py"
        if tts_python.exists() and tts_script.exists():
            logger.info("Starting local PocketTTS server in background...")
            try:
                proc = subprocess.Popen(
                    [str(tts_python), str(tts_script)],
                    cwd=str(BASE_DIR / "Pocket_tts"),
                    creationflags=subprocess.CREATE_NEW_CONSOLE
                )
                background_subprocesses.append(proc)
                running_processes["tts"] = proc
                logger.info(f"PocketTTS server subprocess started (PID: {proc.pid})")
            except Exception as e:
                logger.error(f"Failed to start local PocketTTS server: {e}")
        else:
            logger.warning(f"PocketTTS local files not found at {tts_python} or {tts_script}")
            
    # 2. Stable Audio CPU Server
    is_sfx_local = "127.0.0.1" in sfx_url or "localhost" in sfx_url
    if is_sfx_local:
        ram_gb = get_system_ram_gb()
        logger.info(f"Detected {ram_gb:.1f} GB of system RAM.")
        if ram_gb >= 16.0:
            sfx_python = BASE_DIR / "Stable audio LOcal CPU" / "venv" / "Scripts" / "python.exe"
            sfx_script = BASE_DIR / "Stable audio LOcal CPU" / "server.py"
            if sfx_python.exists() and sfx_script.exists():
                logger.info("System has >= 16GB RAM. Starting local Stable Audio CPU server in background...")
                try:
                    proc = subprocess.Popen(
                        [str(sfx_python), str(sfx_script)],
                        cwd=str(BASE_DIR / "Stable audio LOcal CPU"),
                        creationflags=subprocess.CREATE_NEW_CONSOLE
                    )
                    background_subprocesses.append(proc)
                    running_processes["stable_audio"] = proc
                    logger.info(f"Stable Audio CPU server subprocess started (PID: {proc.pid})")
                except Exception as e:
                    logger.error(f"Failed to start local Stable Audio CPU server: {e}")
            else:
                logger.warning(f"Stable Audio local files not found at {sfx_python} or {sfx_script}")
        else:
            logger.warning(
                f"Local Stable Audio is configured, but system RAM is only {ram_gb:.1f} GB (required: >= 16 GB). "
                "Skipping local Stable Audio launch to prevent system instability. "
                "Please run on a system with more RAM, or set 'sfx_server_url' to a remote Colab tunnel URL in settings."
            )
            
    # 3. Lip-Sync Standalone Server
    lipsync_script = BASE_DIR / "lip_sync_standalone" / "app.py"
    if lipsync_script.exists():
        logger.info("Starting local Lip-Sync standalone server on port 8001...")
        try:
            proc = subprocess.Popen(
                [sys.executable, str(lipsync_script)],
                cwd=str(BASE_DIR / "lip_sync_standalone"),
                creationflags=subprocess.CREATE_NEW_CONSOLE
            )
            background_subprocesses.append(proc)
            logger.info(f"Lip-Sync server started (PID: {proc.pid})")
        except Exception as e:
            logger.error(f"Failed to start local Lip-Sync server: {e}")

@app.on_event("shutdown")
async def shutdown_event():
    logger.info("Gracefully shutting down background AI servers...")
    import subprocess
    for proc in background_subprocesses:
        try:
            logger.info(f"Terminating subprocess PID {proc.pid}...")
            proc.terminate()
            try:
                proc.wait(timeout=3.0)
            except subprocess.TimeoutExpired:
                logger.warning(f"Process PID {proc.pid} did not exit gracefully, killing...")
                proc.kill()
        except Exception as e:
            logger.error(f"Error terminating background subprocess: {e}")
    logger.info("Background servers shutdown sequence completed.")

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
    "sfx_server_url": "http://127.0.0.1:5000",  # Defaults to 5000 (Local CPU or Colab Tunnel)
    "license_server_url": "https://omni-automator.vercel.app",  # Default Vercel server URL
    "output_dir": str(OUTPUT_DIR),
    "projects_dir": str(PROJECTS_DIR),
}

SECURE_SALT = "OMNI_STITCH_SECURE_SALT_2026"
DEVELOPER_BYPASS_KEY = "Osama@1232£-80£viu%*ajoy/(592@!(/@0862hkhakowpnbtaownyekn69vhwilwn"

def generate_local_signature(key: str, gmail: str, machine_id: str, expiry: str) -> str:
    """Generates a secure cryptographic signature to prevent tampering of license.json."""
    raw = f"{key}||{gmail}||{machine_id}||{expiry}||{SECURE_SALT}"
    return hashlib.sha256(raw.encode()).hexdigest()

async def check_license_validity() -> tuple[bool, str]:
    """Offline and online license checker with 12-hour grace period enforcement."""
    license_path = BASE_DIR / "license.json"
    if not license_path.exists():
        return False, "Activation credentials missing! Run setup_all.bat to activate."

    try:
        with open(license_path, "r", encoding="utf-8") as f:
            data = json.load(f)
    except Exception:
        return False, "Corrupted license configuration."

    key = data.get("license_key", "")
    gmail = data.get("gmail", "")
    machine_id = data.get("machine_id", "")
    expiry = data.get("expiry_date", "")
    last_check_str = data.get("last_online_check", "")
    sig = data.get("signature", "")

    # 1. Developer Bypass Key
    if key == DEVELOPER_BYPASS_KEY:
        return True, "Lifetime Developer Bypass Unlocked"

    # 2. Check local signature integrity
    computed_sig = generate_local_signature(key, gmail, machine_id, expiry)
    if computed_sig != sig:
        return False, "Tampered license key detected!"

    # 3. Check expiration date locally
    try:
        # Strip trailing Z if exists for fromisoformat compatibility in older python
        expiry_clean = expiry.rstrip("Z")
        expiry_dt = datetime.datetime.fromisoformat(expiry_clean)
    except Exception as e:
        return False, f"Invalid expiry timestamp format: {e}"

    now = datetime.datetime.now()
    if now > expiry_dt:
        return False, f"Your license expired on {expiry_dt.date().isoformat()}."

    # 4. Attempt online real-time verification with Vercel server
    settings = load_settings()
    server_url = settings.get("license_server_url", "https://omni-automator.vercel.app").rstrip("/")
    url = f"{server_url}/api/verify"

    try:
        async with httpx.AsyncClient(trust_env=False) as client:
            resp = await client.post(
                url,
                json={"license_key": key, "machine_id": machine_id},
                headers={"Content-Type": "application/json"},
                timeout=3.0
            )
            if resp.status_code == 200:
                res_data = resp.json()
                if res_data.get("status") == "success":
                    # Update last online check timestamp and write back
                    data["last_online_check"] = datetime.datetime.now().isoformat() + "Z"
                    data["signature"] = generate_local_signature(key, gmail, machine_id, expiry)
                    with open(license_path, "w", encoding="utf-8") as f:
                        json.dump(data, f, indent=2)
                    return True, "License validated successfully online."
                else:
                    return False, res_data.get("message", "License validation rejected by Vercel server.")
            elif resp.status_code in (401, 403, 404):
                return False, resp.json().get("message", "License has expired or is invalid.")
    except Exception as e:
        logger.warning(f"Online license verification failed (operating in offline mode): {e}")

    # 5. Offline fallback: Enforce 12-hour grace period
    if not last_check_str:
        return False, "First-time verification requires an active internet connection."

    try:
        last_check_clean = last_check_str.rstrip("Z")
        last_check_dt = datetime.datetime.fromisoformat(last_check_clean)
    except Exception:
        return False, "Invalid offline timestamp configuration."

    elapsed = now - last_check_dt
    elapsed_hours = elapsed.total_seconds() / 3600.0

    if elapsed_hours <= 12.0:
        left = 12.0 - elapsed_hours
        return True, f"Offline Mode (12-hour grace period active. Time left: {left:.1f} hours)"
    else:
        return False, "12-Hour Offline Limit Reached. Please connect to the internet to verify your license."

# FastAPI Middleware to intercept and block API calls when locked
@app.middleware("http")
async def license_middleware(request: Request, call_next):
    path = request.url.path
    # Intercept all core operations endpoints (exclude static pages and license checkers)
    if path.startswith("/api/"):
        excluded_endpoints = [
            "/api/license/status", 
            "/api/license/activate", 
            "/api/settings"
        ]
        if path not in excluded_endpoints:
            ok, msg = await check_license_validity()
            if not ok:
                return JSONResponse(
                    status_code=403,
                    content={"detail": f"License Blocked: {msg}"}
                )
    response = await call_next(request)
    return response

# API Endpoint models & routes
class LicenseActivateRequest(BaseModel):
    license_key: str
    gmail: str
    password: str

@app.get("/api/license/status")
async def get_license_status():
    """Retrieve detailed activation state and expiry parameters."""
    ok, msg = await check_license_validity()
    
    gmail = ""
    expiry = ""
    key = ""
    license_path = BASE_DIR / "license.json"
    if license_path.exists():
        try:
            with open(license_path, "r", encoding="utf-8") as f:
                data = json.load(f)
                gmail = data.get("gmail", "")
                expiry = data.get("expiry_date", "")
                key = data.get("license_key", "")
        except Exception:
            pass
            
    return {
        "valid": ok,
        "message": msg,
        "gmail": gmail,
        "expiry_date": expiry,
        "license_key": key
    }

@app.post("/api/license/activate")
async def activate_license_endpoint(req: LicenseActivateRequest):
    """Enables users to activate their product directly from the React UI."""
    import activate
    settings = load_settings()
    server_url = settings.get("license_server_url", "https://omni-automator.vercel.app")
    
    success = activate.activate_license(req.license_key, req.gmail, req.password, server_url)
    if success:
        return {"status": "success", "message": "License activated successfully!"}
    else:
        raise HTTPException(
            status_code=403,
            detail="Activation failed! Check credentials, Vercel endpoints, or device limits."
        )

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

def copy_master_to_custom_dir(project_name: str = None) -> None:
    settings = load_settings()
    custom_dir = settings.get("output_dir")
    if not custom_dir:
        return
    try:
        custom_path = Path(custom_dir)
        custom_path.mkdir(parents=True, exist_ok=True)
        src_file = OUTPUT_DIR / "master.mp4"
        if src_file.exists():
            import shutil
            name = project_name or "master"
            dest_file = custom_path / f"{name}.mp4"
            shutil.copy2(src_file, dest_file)
            logger.info(f"Successfully copied compiled master to custom output directory: {dest_file}")
    except Exception as e:
        logger.error(f"Error copying master to custom output directory '{custom_dir}': {e}")

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
    video_volume: Optional[float] = 1.0
    voice_volume: Optional[float] = 1.0
    sfx_volume: Optional[float] = 0.5

# --- API ENDPOINTS ---

class EngineToggleRequest(BaseModel):
    engine: str # "tts", "stable_audio", "sfx", "music"
    action: str # "start", "stop"

class CharacterProfileModel(BaseModel):
    id: str
    name: str
    image_path: str
    chars: List[Dict[str, Any]]

@app.get("/api/engines/status")
async def get_engines_status():
    settings = load_settings()
    
    # 1. TTS Server Status
    tts_online = False
    try:
        async with httpx.AsyncClient(trust_env=False) as client:
            resp = await client.get(f"{settings['tts_server_url']}/api/health", timeout=1.5)
            if resp.status_code == 200:
                tts_online = True
    except Exception:
        pass
        
    # 2. Stable Audio Server Status (for SFX and MUSIC)
    sfx_server_online = False
    loaded_models = []
    try:
        async with httpx.AsyncClient(trust_env=False) as client:
            resp = await client.get(f"{settings['sfx_server_url']}/api/health", timeout=1.5)
            if resp.status_code == 200:
                sfx_server_online = True
                loaded_models = resp.json().get("loaded_models", [])
    except Exception:
        pass
        
    # 3. FFmpeg Status
    ffmpeg_bin = stitcher.get_ffmpeg_path()
    ffmpeg_ok = ffmpeg_bin.exists() or Path("ffmpeg").exists()
    
    return {
        "tts": {
            "online": tts_online,
            "running": running_processes.get("tts") is not None or tts_online
        },
        "sfx": {
            "online": sfx_server_online and "small-sfx" in loaded_models,
            "running": sfx_server_online
        },
        "music": {
            "online": sfx_server_online and "small-music" in loaded_models,
            "running": sfx_server_online
        },
        "ffmpeg": {
            "online": ffmpeg_ok
        }
    }

@app.post("/api/engines/toggle")
async def toggle_engine(req: EngineToggleRequest):
    settings = load_settings()
    import subprocess
    
    if req.engine == "tts":
        if req.action == "stop":
            proc = running_processes.get("tts")
            if proc:
                try:
                    proc.terminate()
                    proc.wait(timeout=2.0)
                except Exception:
                    try:
                        proc.kill()
                    except Exception:
                        pass
                running_processes["tts"] = None
            try:
                subprocess.run("taskkill /F /FI \"WINDOWTITLE eq PocketTTS*\"", shell=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
            except Exception:
                pass
            return {"status": "ok", "message": "PocketTTS server stopped."}
            
        elif req.action == "start":
            tts_python = BASE_DIR / "Pocket_tts" / "venv" / "Scripts" / "python.exe"
            tts_script = BASE_DIR / "Pocket_tts" / "server.py"
            if not tts_python.exists() or not tts_script.exists():
                raise HTTPException(status_code=400, detail="PocketTTS files not found.")
            tts_online = False
            try:
                async with httpx.AsyncClient(trust_env=False) as client:
                    resp = await client.get(f"{settings['tts_server_url']}/api/health", timeout=1.0)
                    if resp.status_code == 200:
                        tts_online = True
            except Exception:
                pass
            if tts_online:
                return {"status": "ok", "message": "PocketTTS is already running."}
            try:
                proc = subprocess.Popen(
                    [str(tts_python), str(tts_script)],
                    cwd=str(BASE_DIR / "Pocket_tts"),
                    creationflags=subprocess.CREATE_NEW_CONSOLE
                )
                running_processes["tts"] = proc
                return {"status": "ok", "message": "PocketTTS server started."}
            except Exception as e:
                raise HTTPException(status_code=500, detail=f"Failed to start PocketTTS: {e}")

    elif req.engine == "stable_audio":
        if req.action == "stop":
            proc = running_processes.get("stable_audio")
            if proc:
                try:
                    proc.terminate()
                    proc.wait(timeout=2.0)
                except Exception:
                    try:
                        proc.kill()
                    except Exception:
                        pass
                running_processes["stable_audio"] = None
            try:
                subprocess.run("taskkill /F /FI \"WINDOWTITLE eq Stable Audio*\"", shell=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
            except Exception:
                pass
            return {"status": "ok", "message": "Stable Audio server stopped."}
            
        elif req.action == "start":
            sfx_python = BASE_DIR / "Stable audio LOcal CPU" / "venv" / "Scripts" / "python.exe"
            sfx_script = BASE_DIR / "Stable audio LOcal CPU" / "server.py"
            if not sfx_python.exists() or not sfx_script.exists():
                raise HTTPException(status_code=400, detail="Stable Audio files not found.")
            sfx_online = False
            try:
                async with httpx.AsyncClient(trust_env=False) as client:
                    resp = await client.get(f"{settings['sfx_server_url']}/api/health", timeout=1.0)
                    if resp.status_code == 200:
                        sfx_online = True
            except Exception:
                pass
            if sfx_online:
                return {"status": "ok", "message": "Stable Audio is already running."}
            try:
                proc = subprocess.Popen(
                    [str(sfx_python), str(sfx_script)],
                    cwd=str(BASE_DIR / "Stable audio LOcal CPU"),
                    creationflags=subprocess.CREATE_NEW_CONSOLE
                )
                running_processes["stable_audio"] = proc
                return {"status": "ok", "message": "Stable Audio server started."}
            except Exception as e:
                raise HTTPException(status_code=500, detail=f"Failed to start Stable Audio: {e}")

    elif req.engine in ("sfx", "music"):
        model_name = "small-sfx" if req.engine == "sfx" else "small-music"
        if req.action == "stop":
            try:
                async with httpx.AsyncClient(trust_env=False) as client:
                    resp = await client.post(f"{settings['sfx_server_url']}/api/model/switch", json={"model": "none"}, timeout=5.0)
                    if resp.status_code == 200:
                        return {"status": "ok", "message": f"{req.engine.upper()} model unloaded."}
            except Exception as e:
                logger.error(f"Failed to unload model via switch endpoint: {e}")
            return {"status": "error", "message": "Stable Audio server is not responding."}
            
        elif req.action == "start":
            sfx_online = False
            local_url = "http://127.0.0.1:5000"
            
            # 1. Check if server is already running locally on port 5000
            try:
                async with httpx.AsyncClient(trust_env=False) as client:
                    resp = await client.get(f"{local_url}/api/health", timeout=1.0)
                    if resp.status_code == 200:
                        sfx_online = True
            except Exception:
                pass
                
            # 2. Check if the currently configured URL in settings is online
            if not sfx_online:
                try:
                    async with httpx.AsyncClient(trust_env=False) as client:
                        resp = await client.get(f"{settings['sfx_server_url']}/api/health", timeout=1.0)
                        if resp.status_code == 200:
                            local_url = settings['sfx_server_url']
                            sfx_online = True
                except Exception:
                    pass
            
            # 3. If still offline, launch the local Stable Audio CPU server process
            if not sfx_online:
                sfx_python = BASE_DIR / "Stable audio LOcal CPU" / "venv" / "Scripts" / "python.exe"
                sfx_script = BASE_DIR / "Stable audio LOcal CPU" / "server.py"
                if not sfx_python.exists() or not sfx_script.exists():
                    raise HTTPException(status_code=400, detail="Stable Audio files not found.")
                try:
                    proc = subprocess.Popen(
                        [str(sfx_python), str(sfx_script)],
                        cwd=str(BASE_DIR / "Stable audio LOcal CPU"),
                        creationflags=subprocess.CREATE_NEW_CONSOLE
                    )
                    running_processes["stable_audio"] = proc
                    
                    # Poll local URL to verify startup (give it up to 10 seconds)
                    for _ in range(20):
                        await asyncio.sleep(0.5)
                        try:
                            async with httpx.AsyncClient(trust_env=False) as client:
                                resp = await client.get(f"{local_url}/api/health", timeout=0.5)
                                if resp.status_code == 200:
                                    sfx_online = True
                                    break
                        except Exception:
                            pass
                except Exception as e:
                    raise HTTPException(status_code=500, detail=f"Failed to start Stable Audio server: {e}")
            
            if sfx_online:
                # Update sfx_server_url to the working local URL so generations route correctly
                if local_url == "http://127.0.0.1:5000" and settings.get("sfx_server_url") != local_url:
                    settings["sfx_server_url"] = local_url
                    save_settings(settings)
                    logger.info("Updated sfx_server_url to http://127.0.0.1:5000 in settings.json")
                
                # Fire non-blocking model switch request — server loads weights in a background thread
                # and returns immediately with status='loading'. We then poll /api/health until
                # the model appears in loaded_models (CPU loading can take 5-10 min on low RAM).
                try:
                    async with httpx.AsyncClient(trust_env=False) as client:
                        switch_resp = await client.post(
                            f"{local_url}/api/model/switch",
                            json={"model": model_name},
                            timeout=15.0  # just enough for the fire-and-return call
                        )
                        if switch_resp.status_code not in (200,):
                            raise HTTPException(status_code=switch_resp.status_code, detail=f"Model switch rejected: {switch_resp.text}")
                        
                        switch_body = switch_resp.json()
                        # If already loaded, return immediately
                        if switch_body.get("status") == "success":
                            return {"status": "ok", "message": f"{req.engine.upper()} model already loaded and ready."}
                        
                        # Otherwise poll /api/health until model appears in loaded_models
                        logger.info(f"Model '{model_name}' is loading in background on Stable Audio server. Polling for up to 10 min...")
                        MAX_POLL_SECONDS = 600  # 10 minutes for slow CPU load
                        for _ in range(MAX_POLL_SECONDS * 2):  # check every 0.5s
                            await asyncio.sleep(0.5)
                            try:
                                async with httpx.AsyncClient(trust_env=False) as poll_client:
                                    h = await poll_client.get(f"{local_url}/api/health", timeout=2.0)
                                    if h.status_code == 200:
                                        loaded = h.json().get("loaded_models", [])
                                        if model_name in loaded:
                                            logger.info(f"Model '{model_name}' is now loaded and ready!")
                                            return {"status": "ok", "message": f"{req.engine.upper()} model loaded successfully."}
                            except Exception:
                                pass
                        
                        raise HTTPException(status_code=504, detail=f"Timed out waiting for {model_name} to load (>10 min). Check Stable Audio console for errors.")
                        
                except HTTPException:
                    raise
                except Exception as e:
                    raise HTTPException(status_code=500, detail=f"Stable Audio server error during model switch: {e}")
            else:
                raise HTTPException(status_code=503, detail="Stable Audio server failed to start or respond.")

    raise HTTPException(status_code=400, detail="Invalid engine specified.")

@app.post("/api/lipsync/generate")
async def proxy_lipsync_generate(req: Request):
    body = await req.json()
    async with httpx.AsyncClient(trust_env=False) as client:
        try:
            resp = await client.post("http://127.0.0.1:8001/api/generate/lip-sync", json=body, timeout=120.0)
            return JSONResponse(status_code=resp.status_code, content=resp.json())
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Lip-sync server not running or error: {str(e)}")

@app.post("/api/lipsync/sample-color")
async def proxy_lipsync_sample_color(req: Request):
    body = await req.json()
    async with httpx.AsyncClient(trust_env=False) as client:
        try:
            resp = await client.post("http://127.0.0.1:8001/api/character/sample-color", json=body, timeout=10.0)
            return JSONResponse(status_code=resp.status_code, content=resp.json())
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Lip-sync server not running or error: {str(e)}")

@app.get("/api/lipsync/serve-image")
async def proxy_lipsync_serve_image(path: str):
    async with httpx.AsyncClient(trust_env=False) as client:
        try:
            resp = await client.get(f"http://127.0.0.1:8001/api/serve-image?path={path}", timeout=10.0)
            if resp.status_code == 200:
                from fastapi.responses import Response
                return Response(content=resp.content, media_type=resp.headers.get("content-type"))
            return JSONResponse(status_code=resp.status_code, content=resp.json())
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Lip-sync server error: {str(e)}")

@app.get("/api/character-library")
async def get_characters():
    return {"characters": db.get_character_profiles()}

@app.post("/api/character-library")
async def add_update_character(profile: CharacterProfileModel):
    db.save_character_profile(profile.dict())
    return {"status": "ok"}

@app.delete("/api/character-library/{profile_id}")
async def delete_character(profile_id: str):
    db.delete_character_profile(profile_id)
    return {"status": "ok"}


@app.get("/api/health")
async def health_check():
    """Checks online status of all engines."""
    settings = load_settings()
    
    # 1. Check TTS Server (FastAPI)
    tts_online = False
    tts_model_loaded = False
    try:
        async with httpx.AsyncClient(trust_env=False) as client:
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
        async with httpx.AsyncClient(trust_env=False) as client:
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
    # Normalize: strip trailing slashes from server URLs so /api/... paths always work correctly
    settings["tts_server_url"] = settings.get("tts_server_url", "").rstrip("/")
    settings["sfx_server_url"] = settings.get("sfx_server_url", "").rstrip("/")
    save_settings(settings)
    try:
        copy_master_to_custom_dir()
    except Exception as e:
        logger.warning(f"Could not copy current master on settings change: {e}")
    return {"status": "ok", "settings": settings}

@app.get("/api/voices")
async def list_available_voices():
    """Fetch the dynamic list of voices from the PocketTTS server, supporting both flat list and dictionary response styles."""
    settings = load_settings()
    tts_url = settings["tts_server_url"]
    default_voices = ["alba", "marius", "fantine", "cosette", "jean", "eponine"]
    try:
        async with httpx.AsyncClient(trust_env=False) as client:
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
        async with httpx.AsyncClient(trust_env=False) as client:
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
        async with httpx.AsyncClient(trust_env=False) as client:
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

def heal_manifest_states(data: Dict[str, Any], is_startup: bool = False) -> tuple[Dict[str, Any], bool]:
    """
    Resets blocks that:
    1. Were left in the 'generating' state back to 'idle' (only if is_startup is True).
    2. Are marked 'done' or 'provided' but their physical WAV files do not exist on disk.
    """
    changed = False
    
    # Check voice blocks
    if "voice_blocks" in data:
        for block in data["voice_blocks"]:
            # Rule 1: Reset stuck 'generating' state
            if is_startup and block.get("status") == "generating":
                block["status"] = "idle"
                block["error_msg"] = "Interrupted in previous session (reset to idle)"
                changed = True
            # Rule 2: Reset if marked completed but physical file is missing from disk
            elif block.get("status") in ("done", "provided") and block.get("file_path"):
                p = Path(block["file_path"])
                if not p.exists():
                    logger.info(f"Self-healing: Voice block file {p} is missing on disk. Resetting status to idle.")
                    block["status"] = "idle"
                    block["file_path"] = None
                    block["duration_s"] = 0.0
                    changed = True
                
    # Check sfx blocks
    if "sfx_blocks" in data:
        for block in data["sfx_blocks"]:
            # Rule 1: Reset stuck 'generating' state
            if is_startup and block.get("status") == "generating":
                block["status"] = "idle"
                block["error_msg"] = "Interrupted in previous session (reset to idle)"
                changed = True
            # Rule 2: Reset if marked completed but physical file is missing from disk
            elif block.get("status") == "done" and block.get("file_path"):
                p = Path(block["file_path"])
                if not p.exists():
                    logger.info(f"Self-healing: SFX block file {p} is missing on disk. Resetting status to idle.")
                    block["status"] = "idle"
                    block["file_path"] = None
                    block["duration_s"] = 0.0
                    changed = True
                
    return data, changed

@app.post("/api/project/load")
async def load_project(req: ProjectLoadRequest):
    project_name = req.project_name.strip()
    if not project_name:
        raise HTTPException(status_code=400, detail="Project name cannot be empty")
        
    p_dir = PROJECTS_DIR / project_name
    p_dir.mkdir(parents=True, exist_ok=True)
    manifest_path = p_dir / "manifest.json"
    
    is_startup = project_name not in HEALED_PROJECTS
    if is_startup:
        HEALED_PROJECTS.add(project_name)
        logger.info(f"First load of project '{project_name}' since startup. Enabling startup self-healing.")

    # 1. Try loading from local SQLite database first
    db_manifest = db.get_project(project_name)
    if db_manifest:
        logger.info(f"Loaded project manifest '{project_name}' from local SQLite database.")
        db_manifest["project_dir"] = str(p_dir)
        db_manifest["output_dir"] = str(OUTPUT_DIR)
        
        # Self-heal stuck 'generating' blocks
        healed_manifest, changed = heal_manifest_states(db_manifest, is_startup=is_startup)
        if changed:
            logger.info("Self-healing stuck 'generating' blocks in SQLite database project manifest.")
            db.save_project(project_name, healed_manifest)
            try:
                manifest_obj = Manifest.from_dict(healed_manifest)
                manifest_obj.save()
            except Exception as e:
                logger.error(f"Failed to save healed manifest to disk: {e}")
        return healed_manifest
        
    # 2. Fallback to manifest.json on disk
    if manifest_path.exists():
        try:
            with open(manifest_path, "r", encoding="utf-8") as f:
                content = f.read()
            manifest = Manifest.from_json(content)
            manifest.project_dir = str(p_dir)
            manifest.output_dir = str(OUTPUT_DIR)
            
            # Self-heal stuck 'generating' blocks
            manifest_dict = manifest.to_dict()
            healed_manifest, changed = heal_manifest_states(manifest_dict, is_startup=is_startup)
            if changed:
                logger.info("Self-healing stuck 'generating' blocks in manifest.json file on disk.")
                manifest = Manifest.from_dict(healed_manifest)
                manifest.save()
            
            # Sync to SQLite
            db.save_project(project_name, manifest.to_dict())
            return manifest.to_dict()
        except Exception as e:
            logger.error(f"Error parsing manifest.json: {e}")
            raise HTTPException(status_code=500, detail=f"Failed loading manifest: {str(e)}")
            
    # 3. Return fresh blank project
    manifest = Manifest(
        project_name=project_name,
        project_dir=str(p_dir),
        output_dir=str(OUTPUT_DIR)
    )
    manifest.save()
    # Sync to SQLite
    db.save_project(project_name, manifest.to_dict())
    return manifest.to_dict()

@app.post("/api/project/save")
async def save_project_api(data: Dict[str, Any]):
    try:
        # Force manifest output_dir compliance
        data["output_dir"] = str(OUTPUT_DIR)
        manifest = Manifest.from_dict(data)
        # Force directory compliance
        p_dir = PROJECTS_DIR / manifest.project_name
        p_dir.mkdir(parents=True, exist_ok=True)
        manifest.project_dir = str(p_dir)
        # 1. Save to manifest.json on disk
        manifest.save()
        # 2. Save to SQLite local database
        db.save_project(manifest.project_name, manifest.to_dict())
        return {"status": "ok"}
    except Exception as e:
        logger.error(f"Error saving project manifest: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/db/history")
async def get_synthesis_history(limit: int = 100):
    """Retrieve local SQLite history logs of all AI generations (prompts/scripts)."""
    return {"history": db.get_generation_history(limit)}

@app.get("/api/db/renders")
async def get_video_renders_history(limit: int = 50):
    """Retrieve local SQLite history logs of all video stitches."""
    return {"renders": db.get_render_history(limit)}

@app.get("/api/db/projects")
async def get_local_projects_list():
    """Retrieve lists of all saved projects in local SQLite."""
    return {"projects": db.list_projects()}

@app.post("/api/videos/load")
async def scan_video_folder(req: VideoScanRequest):
    """
    Scans a local directory for video clips and images, extracts durations/thumbnails,
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
        
    # Scan MP4/MOV/AVI/MKV/WEBM clips and JPG/JPEG/PNG/WEBP/BMP images
    video_extensions = {".mp4", ".mov", ".avi", ".mkv", ".webm"}
    image_extensions = {".jpg", ".jpeg", ".png", ".webp", ".bmp"}
    
    def natural_sort_key(path):
        # Zero-pad all numeric segments so comparison is all-string (no int/str mix).
        # e.g. series1 → ['series', '0000000001', '.mp4']
        #      series10 → ['series', '0000000010', '.mp4']
        # This guarantees: series1 < series2 < series10 < series120
        parts = re.split(r'(\d+)', path.name.lower())
        return [p.zfill(10) if p.isdigit() else p for p in parts]
        
    media_files = sorted(
        [p for p in folder_path.iterdir() if p.is_file() and p.suffix.lower() in (video_extensions | image_extensions)],
        key=natural_sort_key
    )
    
    if not media_files:
        return {"status": "ok", "message": "No media files found in this folder.", "blocks": []}
        
    logger.info(f"Scanning {len(media_files)} clips/images in {folder_path}...")
    
    # Process metadata & thumbnails
    video_blocks = []
    for idx, f_path in enumerate(media_files):
        suffix = f_path.suffix.lower()
        is_image = suffix in image_extensions
        media_type = "image" if is_image else "video"
        
        # Unique ID & thumb path
        v_id = f"v_{idx:02d}"
        thumb_name = f"{project_name}_{v_id}.jpg"
        thumb_path = THUMBS_DIR / thumb_name
        
        if is_image:
            # Copy image directly as static thumbnail
            try:
                import shutil
                shutil.copy2(f_path, thumb_path)
            except Exception as e:
                logger.error(f"Error copying image thumbnail: {e}")
            duration_s = 5.0  # Default to 5.0 seconds
        else:
            # Extract visual frame grab at 0s mark
            ffprobe.extract_thumbnail(f_path, thumb_path, time_s=0.0)
            meta = ffprobe.get_video_metadata(f_path)
            duration_s = meta["duration_s"] if meta["duration_s"] > 0 else 5.0
            
        block = VideoBlock(
            id=v_id,
            file_path=str(f_path),
            filename=f_path.name,
            duration_s=duration_s,
            thumbnail_path=f"/static/thumbnails/{thumb_name}",
            order=idx,
            media_type=media_type
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
    db.save_project(project_name, manifest.to_dict())
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
        
    # Run async TTS fetcher
    voice_dir = p_dir / "voice"
    voice_dir.mkdir(exist_ok=True)
    out_wav = voice_dir / f"vo_{block.order:02d}.wav"
    
    async def run_tts():
        try:
            # Load manifest freshly at the start of task execution to avoid concurrent overwrites
            with open(manifest_path, "r", encoding="utf-8") as f_fresh:
                fresh_manifest = Manifest.from_json(f_fresh.read())
            
            fresh_block = next((b for b in fresh_manifest.voice_blocks if b.id == req.block_id), None)
            if not fresh_block:
                logger.error(f"Voice block {req.block_id} not found when starting queued task")
                return

            # Mark block as GENERATING in manifest inside the sequential worker queue
            fresh_block.status = BlockStatus.GENERATING
            fresh_block.prompt = req.text
            fresh_block.voice = req.voice
            fresh_manifest.save()
            db.save_project(req.project_name, fresh_manifest.to_dict())

            if out_wav.exists():
                try:
                    out_wav.unlink()
                    logger.info(f"Deleted old version of TTS file: {out_wav}")
                except Exception as e:
                    logger.warning(f"Failed deleting old TTS file: {e}")
            async with httpx.AsyncClient(trust_env=False) as client:
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
                    fresh_block.status = BlockStatus.DONE
                    fresh_block.file_path = str(out_wav)
                    # Deduce duration using ffprobe
                    meta = ffprobe.get_video_metadata(out_wav)
                    fresh_block.duration_s = meta["duration_s"]
                    fresh_block.error_msg = None
                    logger.info(f"TTS Synthesized successfully → {out_wav}")
                    db.log_generation(req.project_name, fresh_block.id, "voice", req.text, str(out_wav), "success")
                else:
                    try:
                        detail = resp.json().get("detail", f"HTTP {resp.status_code}")
                    except Exception:
                        detail = f"TTS Server returned status {resp.status_code}: {resp.text[:120]}"
                    fresh_block.status = BlockStatus.ERROR
                    fresh_block.error_msg = detail
                    logger.error(f"TTS Server failed: {detail}")
                    db.log_generation(req.project_name, fresh_block.id, "voice", req.text, None, "failed")
        except Exception as e:
            logger.error(f"Connection failed to PocketTTS server: {e}")
            try:
                with open(manifest_path, "r", encoding="utf-8") as f_fresh:
                    err_manifest = Manifest.from_json(f_fresh.read())
                err_block = next((b for b in err_manifest.voice_blocks if b.id == req.block_id), None)
                if err_block:
                    err_block.status = BlockStatus.ERROR
                    err_block.error_msg = str(e)
                    err_manifest.save()
                    db.save_project(req.project_name, err_manifest.to_dict())
            except Exception as ex:
                logger.error(f"Failed saving error to manifest: {ex}")
            db.log_generation(req.project_name, req.block_id, "voice", req.text, None, "failed")
            return
            
        fresh_manifest.save()
        db.save_project(req.project_name, fresh_manifest.to_dict())
            
    # Put the generation task in the sequential queue so we execute one at a time
    await tts_queue.put(run_tts)
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
        
    sfx_dir = p_dir / "sfx"
    sfx_dir.mkdir(exist_ok=True)
    out_wav = sfx_dir / f"sfx_{block.order:02d}.wav"
    
    async def run_sfx():
        try:
            # Load manifest freshly at the start of task execution to avoid concurrent overwrites
            with open(manifest_path, "r", encoding="utf-8") as f_fresh:
                fresh_manifest = Manifest.from_json(f_fresh.read())
            
            fresh_block = next((b for b in fresh_manifest.sfx_blocks if b.id == req.block_id), None)
            if not fresh_block:
                logger.error(f"SFX block {req.block_id} not found when starting queued task")
                return

            # Mark block as GENERATING in manifest inside the sequential worker queue
            fresh_block.status = BlockStatus.GENERATING
            fresh_block.prompt = req.prompt
            fresh_manifest.save()
            db.save_project(req.project_name, fresh_manifest.to_dict())

            if out_wav.exists():
                try:
                    out_wav.unlink()
                    logger.info(f"Deleted old version of SFX file: {out_wav}")
                except Exception as e:
                    logger.warning(f"Failed deleting old SFX file: {e}")
            async with httpx.AsyncClient(trust_env=False) as client:
                payload = {
                    "prompt": req.prompt,
                    "model": req.model,
                    "duration": req.duration,
                    "steps": req.steps,
                    "seed": req.seed
                }
                
                # Check for dynamic Colab or local API URL — strip trailing slash to avoid double-slash paths
                sfx_url = settings["sfx_server_url"].rstrip("/")
                logger.info(f"Calling Stable Audio at {sfx_url}/api/generate with: {payload}")
                
                # Trigger async generation job
                resp = await client.post(
                    f"{sfx_url}/api/generate",
                    json=payload,
                    headers={"bypass-tunnel-reminder": "true"},
                    timeout=90.0
                )
                if resp.status_code != 200:
                    try:
                        err = resp.json().get("error", f"HTTP {resp.status_code}")
                    except Exception:
                        err = f"SFX Server returned status {resp.status_code}: {resp.text[:120]}"
                    fresh_block.status = BlockStatus.ERROR
                    fresh_block.error_msg = err
                    fresh_manifest.save()
                    db.save_project(req.project_name, fresh_manifest.to_dict())
                    db.log_generation(req.project_name, req.block_id, "sfx", req.prompt, None, "failed")
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
                        timeout=15.0
                    )
                    if status_resp.status_code == 200:
                        status_data = status_resp.json()
                        job_status = status_data.get("status")
                        logger.info(f"Job {job_id} Status: {job_status}")
                        
                        if job_status == "done":
                            job_done = True
                            break
                        elif job_status == "error":
                            fresh_block.status = BlockStatus.ERROR
                            fresh_block.error_msg = status_data.get("error", "Unknown model error")
                            fresh_manifest.save()
                            db.save_project(req.project_name, fresh_manifest.to_dict())
                            db.log_generation(req.project_name, req.block_id, "sfx", req.prompt, None, "failed")
                            return
                    else:
                        logger.warning(f"Failed pulling job {job_id} status.")
                        
                if not job_done:
                    fresh_block.status = BlockStatus.ERROR
                    fresh_block.error_msg = "Model generation timed out"
                    fresh_manifest.save()
                    db.save_project(req.project_name, fresh_manifest.to_dict())
                    db.log_generation(req.project_name, req.block_id, "sfx", req.prompt, None, "failed")
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
                    fresh_block.status = BlockStatus.DONE
                    fresh_block.file_path = str(out_wav)
                    meta = ffprobe.get_video_metadata(out_wav)
                    fresh_block.duration_s = meta["duration_s"]
                    fresh_block.error_msg = None
                    logger.info(f"SFX file downloaded successfully → {out_wav}")
                    # Log successful generation
                    db.log_generation(req.project_name, req.block_id, "sfx", req.prompt, str(out_wav), "success")
                else:
                    fresh_block.status = BlockStatus.ERROR
                    fresh_block.error_msg = "Failed downloading generated audio"
                    db.log_generation(req.project_name, req.block_id, "sfx", req.prompt, None, "failed")
        except Exception as e:
            logger.error(f"Error generating SFX: {e}")
            try:
                with open(manifest_path, "r", encoding="utf-8") as f_fresh:
                    err_manifest = Manifest.from_json(f_fresh.read())
                err_block = next((b for b in err_manifest.sfx_blocks if b.id == req.block_id), None)
                if err_block:
                    err_block.status = BlockStatus.ERROR
                    err_block.error_msg = str(e)
                    err_manifest.save()
                    db.save_project(req.project_name, err_manifest.to_dict())
            except Exception as ex:
                logger.error(f"Failed saving SFX error to manifest: {ex}")
            db.log_generation(req.project_name, req.block_id, "sfx", req.prompt, None, "failed")
            return
            
        fresh_manifest.save()
        db.save_project(req.project_name, fresh_manifest.to_dict())
            
    # Put the generation task in the sequential queue so we execute one at a time
    await sfx_queue.put(run_sfx)
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
                on_clip_done=on_clip_progress,
                video_volume=req.video_volume if req.video_volume is not None else 1.0,
                voice_volume=req.voice_volume if req.voice_volume is not None else 1.0,
                sfx_volume=req.sfx_volume if req.sfx_volume is not None else 0.5
            )
            active_renders[project_name]["status"] = "done"
            active_renders[project_name]["progress"] = 100.0
            
            # Save render completion status
            manifest.render_complete = True
            manifest.save()
            # Sync to SQLite project manifest
            db.save_project(project_name, manifest.to_dict())
            logger.info(f"Render completed successfully for {project_name}! Output: {output_path}")
            # Log successful render to SQLite
            db.log_render(project_name, req.concat, str(output_path), "success")
            # Automatically copy compiled master to custom output directory
            copy_master_to_custom_dir(project_name)
        except Exception as e:
            active_renders[project_name]["status"] = "error"
            active_renders[project_name]["error"] = str(e)
            logger.error(f"Render task failed: {e}")
            # Log failed render to SQLite
            db.log_render(project_name, req.concat, "", "failed")
            
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
        
    for idx, b in enumerate(manifest.video_blocks):
        if (idx != index and 
            b.filename and 
            b.filename.lower() == file.filename.lower() and 
            b.filename.lower() != "blank_clip.mp4" and 
            not b.filename.lower().startswith("clip_")):
            raise HTTPException(status_code=400, detail=f"The file '{file.filename}' is already used in slot {idx}. Duplications are not allowed.")
        
    custom_video_dir = p_dir / "videos"
    custom_video_dir.mkdir(exist_ok=True)
    
    file_extension = Path(file.filename).suffix.lower()
    if not file_extension:
        file_extension = ".mp4"
    out_file_path = custom_video_dir / f"custom_v_{index:02d}{file_extension}"
    
    content = await file.read()
    with open(out_file_path, "wb") as f_out:
        f_out.write(content)
        
    image_extensions = {".jpg", ".jpeg", ".png", ".webp", ".bmp"}
    is_image = file_extension in image_extensions
    media_type = "image" if is_image else "video"
    
    v_id = manifest.video_blocks[index].id
    thumb_name = f"{project_name}_{v_id}_custom.jpg"
    thumb_path = THUMBS_DIR / thumb_name
    
    if is_image:
        try:
            import shutil
            shutil.copy2(out_file_path, thumb_path)
        except Exception as e:
            logger.error(f"Error copying image thumbnail: {e}")
        duration_s = 5.0
    else:
        ffprobe.extract_thumbnail(out_file_path, thumb_path, time_s=0.0)
        meta = ffprobe.get_video_metadata(out_file_path)
        duration_s = meta["duration_s"] if meta["duration_s"] > 0 else 5.0
        
    block = manifest.video_blocks[index]
    block.file_path = str(out_file_path)
    block.filename = file.filename
    block.duration_s = duration_s
    block.thumbnail_path = f"/static/thumbnails/{thumb_name}"
    block.media_type = media_type
    
    manifest.save()
    db.save_project(project_name, manifest.to_dict())
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
        
    for idx, b in enumerate(manifest.voice_blocks):
        if idx != index and b.file_path and Path(b.file_path).name.lower() == file.filename.lower():
            raise HTTPException(status_code=400, detail=f"The file '{file.filename}' is already used in slot {idx}. Duplications are not allowed.")
        
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
    db.save_project(project_name, manifest.to_dict())
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
        
    for idx, b in enumerate(manifest.sfx_blocks):
        if idx != index and b.file_path and Path(b.file_path).name.lower() == file.filename.lower():
            raise HTTPException(status_code=400, detail=f"The file '{file.filename}' is already used in slot {idx}. Duplications are not allowed.")
        
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
    db.save_project(project_name, manifest.to_dict())
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
        if block.file_path:
            try:
                p = Path(block.file_path)
                if p.exists():
                    p.unlink()
                    logger.info(f"Deleted physical voice file on clear: {p}")
            except Exception as e:
                logger.warning(f"Failed to delete voice file: {e}")
        block.file_path = None
        block.prompt = ""
        block.status = BlockStatus.IDLE
        block.duration_s = 0.0
    elif lane == "sfx":
        if index < 0 or index >= len(manifest.sfx_blocks):
            raise HTTPException(status_code=400, detail="Invalid index")
        block = manifest.sfx_blocks[index]
        if block.file_path:
            try:
                p = Path(block.file_path)
                if p.exists():
                    p.unlink()
                    logger.info(f"Deleted physical SFX file on clear: {p}")
            except Exception as e:
                logger.warning(f"Failed to delete SFX file: {e}")
        block.file_path = None
        block.prompt = ""
        block.status = BlockStatus.IDLE
        block.duration_s = 0.0
    else:
        raise HTTPException(status_code=400, detail="Invalid lane")
        
    manifest.save()
    db.save_project(project_name, manifest.to_dict())
    return {"status": "ok", "manifest": manifest.to_dict()}

# --- STATIC CONTENT & SPA SERVING ---

# Expose thumbnails as a static route so browser React can render them
app.mount("/static", StaticFiles(directory=str(STATIC_DIR)), name="static")
app.mount("/projects", StaticFiles(directory=str(PROJECTS_DIR)), name="projects")

@app.get("/output/master.mp4")
async def serve_master_video(request: Request, t: str = ""):
    """
    Dedicated master.mp4 streaming endpoint with proper video headers.
    The ?t= cache-buster is accepted but ignored server-side; the ETag handles caching.
    ConnectionResetError in logs when seeking is normal browser behaviour, not a bug.
    """
    master_path = OUTPUT_DIR / "master.mp4"
    if not master_path.exists():
        raise HTTPException(status_code=404, detail="Master video not yet rendered")
    
    stat = master_path.stat()
    etag = f'"{int(stat.st_mtime)}-{stat.st_size}"'
    
    # Return 304 if client already has this exact file
    if_none_match = request.headers.get("if-none-match", "")
    if if_none_match == etag:
        from fastapi.responses import Response
        return Response(status_code=304, headers={"ETag": etag})
    
    return FileResponse(
        path=str(master_path),
        media_type="video/mp4",
        headers={
            "Accept-Ranges": "bytes",
            "ETag": etag,
            "Cache-Control": "no-cache",   # revalidate but allow range requests
        }
    )

@app.get("/api/video/serve")
async def serve_video(path: str):
    import os
    import mimetypes
    if not path or not os.path.exists(path):
        raise HTTPException(status_code=404, detail=f"Video file not found: {path}")
    
    mime_type, _ = mimetypes.guess_type(path)
    if not mime_type:
        mime_type = "application/octet-stream"
        
    return FileResponse(
        path=path,
        media_type=mime_type,
        headers={
            "Accept-Ranges": "bytes"
        }
    )

@app.get("/")
async def serve_index():
    index_path = STATIC_DIR / "index.html"
    if index_path.exists():
        return FileResponse(
            index_path,
            headers={
                "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
                "Pragma": "no-cache",
                "Expires": "0",
            }
        )
    else:
        return HTMLResponse("<h2>AutoStitch Studio UI placeholder. Serve static files index.html to show full SPA editor.</h2>")

if __name__ == "__main__":
    import uvicorn
    # Start the server on localhost port 8080
    logger.info("Starting AutoStitch Studio backend server...")
    
    print("\n" + "="*60)
    print("  AUTOSTITCH STUDIO -- SUCCESSFUL LAUNCH")
    print("  Click to open: http://localhost:8080")
    print("="*60 + "\n")
    
    uvicorn.run("main:app", host="127.0.0.1", port=8080, reload=False)
