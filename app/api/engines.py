import httpx
import asyncio
import logging
import subprocess
import ctypes
from fastapi import APIRouter, HTTPException
from app.core.config import BASE_DIR, WORKSPACE_DIR, load_settings, save_settings
from app.state import running_processes, background_subprocesses
from app.models.schemas import EngineToggleRequest
from app.core import stitcher

logger = logging.getLogger("autostitch.api.engines")

router = APIRouter(prefix="/api/engines", tags=["engines"])

def get_system_ram_gb() -> float:
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

@router.get("/status")
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
    # Note: stitcher is imported from app.core.stitcher which we'll configure
    ffmpeg_ok = ffmpeg_bin.exists() or subprocess.run("where ffmpeg", shell=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE).returncode == 0
    
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

@router.post("/toggle")
async def toggle_engine(req: EngineToggleRequest):
    settings = load_settings()
    
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
            tts_python = BASE_DIR / "pocket_tts" / "venv" / "Scripts" / "python.exe"
            tts_script = BASE_DIR / "pocket_tts" / "server.py"
            if not tts_python.exists() or not tts_script.exists():
                raise HTTPException(status_code=400, detail=f"PocketTTS files not found at {tts_python}.")
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
                    cwd=str(BASE_DIR / "pocket_tts"),
                    creationflags=subprocess.CREATE_NEW_CONSOLE
                )
                running_processes["tts"] = proc
                background_subprocesses.append(proc)
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
            sfx_python = BASE_DIR / "stable_audio_local_cpu" / "venv" / "Scripts" / "python.exe"
            sfx_script = BASE_DIR / "stable_audio_local_cpu" / "server.py"
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
                    cwd=str(BASE_DIR / "stable_audio_local_cpu"),
                    creationflags=subprocess.CREATE_NEW_CONSOLE
                )
                running_processes["stable_audio"] = proc
                background_subprocesses.append(proc)
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
                sfx_python = BASE_DIR / "stable_audio_local_cpu" / "venv" / "Scripts" / "python.exe"
                sfx_script = BASE_DIR / "stable_audio_local_cpu" / "server.py"
                if not sfx_python.exists() or not sfx_script.exists():
                    raise HTTPException(status_code=400, detail="Stable Audio files not found.")
                try:
                    proc = subprocess.Popen(
                        [str(sfx_python), str(sfx_script)],
                        cwd=str(BASE_DIR / "stable_audio_local_cpu"),
                        creationflags=subprocess.CREATE_NEW_CONSOLE
                    )
                    running_processes["stable_audio"] = proc
                    background_subprocesses.append(proc)
                    
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
                
                # Fire non-blocking model switch request
                try:
                    async with httpx.AsyncClient(trust_env=False) as client:
                        switch_resp = await client.post(
                            f"{local_url}/api/model/switch",
                            json={"model": model_name},
                            timeout=15.0
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
                        for _ in range(MAX_POLL_SECONDS * 2):
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
