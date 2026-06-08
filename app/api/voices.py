import httpx
import logging
from pathlib import Path
from fastapi import APIRouter, HTTPException, UploadFile, File
from app.core.config import load_settings, BASE_DIR

logger = logging.getLogger("autostitch.api.voices")

router = APIRouter(prefix="/api/voices", tags=["voices"])

@router.get("")
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
    
    # Scanning local Pocket_tts/uploaded_voices folder as fallback
    try:
        uploaded_dir = BASE_DIR / "pocket_tts" / "uploaded_voices"
        local_custom_voices = []
        if uploaded_dir.exists():
            for f in uploaded_dir.glob("*"):
                if f.suffix.lower() in [".wav", ".mp3", ".flac", ".ogg", ".safetensors"]:
                    local_custom_voices.append(f.stem)
            # Combine and remove duplicates cleanly
            all_voices = sorted(list(set(default_voices + local_custom_voices)))
            return {"voices": all_voices}
    except Exception as local_err:
        logger.error(f"Error scanning local uploaded voices folder: {local_err}")
        
    return {"voices": default_voices}


@router.delete("/delete/{voice_name}")
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

@router.post("/clone")
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
