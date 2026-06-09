import os
import sys
import logging
import asyncio
import subprocess
from pathlib import Path
from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware

# Initialize logger
logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("autostitch")

# Make sure both the app and package root are in python search path
app_dir = Path(__file__).resolve().parent
package_root = app_dir.parent
sys.path.append(str(app_dir))
sys.path.append(str(package_root))

from app.core.config import BASE_DIR, WORKSPACE_DIR, load_settings, PROJECTS_DIR, STATIC_DIR
from app.core import db
from app.state import (
    background_subprocesses,
    running_processes,
    tts_queue_worker,
    sfx_queue_worker
)
from app.api.license import check_license_validity
from app.api import (
    license_router,
    engines_router,
    health_router,
    settings_router,
    voices_router,
    projects_router,
    generate_router,
    render_router,
    upload_router,
    media_router
)

# Load HF_TOKEN from .env if it exists in base_dir or workspace_dir
hf_token_val = os.environ.get("HF_TOKEN")
for check_path in [BASE_DIR / ".env", WORKSPACE_DIR / ".env"]:
    if check_path.exists():
        with open(check_path, "r", encoding="utf-8") as f:
            for line in f:
                if "=" in line:
                    k, v = line.split("=", 1)
                    k = k.strip()
                    v = v.strip().strip("'").strip('"')
                    if k == "HF_TOKEN":
                        hf_token_val = v
                        os.environ["HF_TOKEN"] = v
                        logger.info(f"Exposed HF_TOKEN from {check_path.name} file to child processes.")

app = FastAPI(
    title="AutoStitch Unified Backend",
    description="Orchestrates projects, proxy requests, and runs FFmpeg rendering.",
    version="1.0.0"
)

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
    
    # 1. Text-to-Speech Server
    is_tts_local = "127.0.0.1" in tts_url or "localhost" in tts_url
    if is_tts_local:
        tts_python = BASE_DIR / "text_to_speech_server" / "venv" / "Scripts" / "python.exe"
        tts_script = BASE_DIR / "text_to_speech_server" / "server.py"
        if tts_python.exists() and tts_script.exists():
            logger.info("Starting local TTS server in background...")
            try:
                proc = subprocess.Popen(
                    [str(tts_python), str(tts_script)],
                    cwd=str(BASE_DIR / "text_to_speech_server"),
                    creationflags=subprocess.CREATE_NEW_CONSOLE
                )
                background_subprocesses.append(proc)
                running_processes["tts"] = proc
                logger.info(f"TTS server subprocess started (PID: {proc.pid})")
            except Exception as e:
                logger.error(f"Failed to start local TTS server: {e}")
        else:
            logger.warning(f"TTS local files not found at {tts_python} or {tts_script}")
            
    # 2. Sound Effects and Music CPU Server
    is_sfx_local = "127.0.0.1" in sfx_url or "localhost" in sfx_url
    if is_sfx_local:
        ram_gb = get_system_ram_gb()
        logger.info(f"Detected {ram_gb:.1f} GB of system RAM.")
        if ram_gb >= 16.0:
            sfx_python = BASE_DIR / "sfx_and_music_server" / "venv" / "Scripts" / "python.exe"
            sfx_script = BASE_DIR / "sfx_and_music_server" / "server.py"
            if sfx_python.exists() and sfx_script.exists():
                logger.info("System has >= 16GB RAM. Starting local SFX & Music CPU server in background...")
                try:
                    proc = subprocess.Popen(
                        [str(sfx_python), str(sfx_script)],
                        cwd=str(BASE_DIR / "sfx_and_music_server"),
                        creationflags=subprocess.CREATE_NEW_CONSOLE
                    )
                    background_subprocesses.append(proc)
                    running_processes["stable_audio"] = proc
                    logger.info(f"SFX & Music CPU server subprocess started (PID: {proc.pid})")
                except Exception as e:
                    logger.error(f"Failed to start local SFX & Music CPU server: {e}")
            else:
                logger.warning(f"SFX & Music local files not found at {sfx_python} or {sfx_script}")
        else:
            logger.warning(
                f"Local SFX & Music server is configured, but system RAM is only {ram_gb:.1f} GB (required: >= 16 GB). "
                "Skipping local SFX & Music launch to prevent system instability. "
                "Please run on a system with more RAM, or set 'sfx_server_url' to a remote server URL in settings."
            )

@app.on_event("shutdown")
async def shutdown_event():
    logger.info("Gracefully shutting down background AI servers...")
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

# FastAPI Middleware to intercept and block API calls when locked
@app.middleware("http")
async def license_middleware(request: Request, call_next):
    path = request.url.path
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

# Expose thumbnails and projects as static route so browser React can render them
app.mount("/static", StaticFiles(directory=str(STATIC_DIR)), name="static")
app.mount("/projects", StaticFiles(directory=str(PROJECTS_DIR)), name="projects")

# Register Routers
app.include_router(license_router)
app.include_router(engines_router)
app.include_router(health_router)
app.include_router(settings_router)
app.include_router(voices_router)
app.include_router(projects_router)
app.include_router(generate_router)
app.include_router(render_router)
app.include_router(upload_router)
app.include_router(media_router)

if __name__ == "__main__":
    import uvicorn
    # Start the server on localhost port 8080
    logger.info("Starting AutoStitch Studio backend server...")
    
    print("\n" + "="*60)
    print("  AUTOSTITCH STUDIO -- SUCCESSFUL LAUNCH")
    print("  Click to open: http://localhost:8080")
    print("="*60 + "\n")
    
    uvicorn.run("app.main:app", host="127.0.0.1", port=8080, reload=False)
