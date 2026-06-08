import json
import logging
from pathlib import Path
from typing import Any, Dict

logger = logging.getLogger("autostitch.config")

# Paths
BASE_DIR = Path(__file__).resolve().parent.parent.parent
WORKSPACE_DIR = BASE_DIR.parent
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
