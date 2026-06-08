import logging
from fastapi import APIRouter
from app.core.config import load_settings, save_settings, copy_master_to_custom_dir
from app.models.schemas import SettingsModel

logger = logging.getLogger("autostitch.api.settings")

router = APIRouter(prefix="/api/settings", tags=["settings"])

@router.get("")
async def get_settings():
    return load_settings()

@router.post("")
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
