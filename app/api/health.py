import httpx
from pathlib import Path
from fastapi import APIRouter
from app.core.config import load_settings
from app.core import stitcher

router = APIRouter(prefix="/api/health", tags=["health"])

@router.get("")
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
