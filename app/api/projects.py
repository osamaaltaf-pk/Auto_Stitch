import os
import re
import logging
import asyncio
from pathlib import Path
from typing import Any, Dict
from fastapi import APIRouter, HTTPException
from app.core.config import PROJECTS_DIR, OUTPUT_DIR, THUMBS_DIR
from app.state import HEALED_PROJECTS
from app.core import db
from app.core.manifest import Manifest, BlockStatus, VideoBlock, SfxBlock, VoiceBlock
from app.utils import ffprobe
from app.models.schemas import ProjectLoadRequest, VideoScanRequest

logger = logging.getLogger("autostitch.api.projects")

router = APIRouter(tags=["projects"])

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
                
    # Check music blocks
    if "music_blocks" in data:
        for block in data["music_blocks"]:
            # Rule 1: Reset stuck 'generating' state
            if is_startup and block.get("status") == "generating":
                block["status"] = "idle"
                block["error_msg"] = "Interrupted in previous session (reset to idle)"
                changed = True
            # Rule 2: Reset if marked completed but physical file is missing from disk
            elif block.get("status") == "done" and block.get("file_path"):
                p = Path(block["file_path"])
                if not p.exists():
                    logger.info(f"Self-healing: Music block file {p} is missing on disk. Resetting status to idle.")
                    block["status"] = "idle"
                    block["file_path"] = None
                    block["duration_s"] = 0.0
                    changed = True
                
    return data, changed

@router.post("/api/project/load")
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

@router.post("/api/project/save")
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

@router.get("/api/db/history")
async def get_synthesis_history(limit: int = 100):
    """Retrieve local SQLite history logs of all AI generations (prompts/scripts)."""
    return {"history": db.get_generation_history(limit)}

@router.get("/api/db/renders")
async def get_video_renders_history(limit: int = 50):
    """Retrieve local SQLite history logs of all video stitches."""
    return {"renders": db.get_render_history(limit)}

@router.get("/api/db/projects")
async def get_local_projects_list():
    """Retrieve lists of all saved projects in local SQLite."""
    return {"projects": db.list_projects()}

@router.post("/api/videos/select-folder")
async def select_local_folder():
    """Opens a native local directory selection dialog forced to topmost front with modern file-open style."""
    import subprocess
    
    def ask_folder():
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

@router.get("/api/videos/downloads-folder")
async def get_downloads_folder():
    """Returns the standard Windows Downloads folder for the current user."""
    try:
        downloads = Path.home() / "Downloads"
        if downloads.exists():
            return {"status": "ok", "folder": str(downloads)}
    except Exception as e:
        logger.error(f"Error locating downloads folder: {e}")
    return {"status": "error", "message": "Could not locate Downloads folder"}

@router.post("/api/videos/load")
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
