import logging
from pathlib import Path
from fastapi import APIRouter, HTTPException, UploadFile, File
from app.core.config import PROJECTS_DIR, THUMBS_DIR
from app.core import db
from app.core.manifest import Manifest, BlockStatus
from app.utils import ffprobe

logger = logging.getLogger("autostitch.api.upload")

router = APIRouter(tags=["upload"])

@router.post("/api/upload/video")
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

@router.post("/api/upload/voice")
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

@router.post("/api/upload/sfx")
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

@router.post("/api/upload/music")
async def upload_custom_music(project_name: str, index: int, file: UploadFile = File(...)):
    p_dir = PROJECTS_DIR / project_name
    manifest_path = p_dir / "manifest.json"
    if not manifest_path.exists():
        raise HTTPException(status_code=404, detail="Project not found")
        
    with open(manifest_path, "r", encoding="utf-8") as f:
        manifest = Manifest.from_json(f.read())
        
    if index < 0 or index >= len(manifest.music_blocks):
        raise HTTPException(status_code=400, detail="Invalid slot index")
        
    for idx, b in enumerate(manifest.music_blocks):
        if idx != index and b.file_path and Path(b.file_path).name.lower() == file.filename.lower():
            raise HTTPException(status_code=400, detail=f"The file '{file.filename}' is already used in slot {idx}. Duplications are not allowed.")
        
    music_dir = p_dir / "music"
    music_dir.mkdir(exist_ok=True)
    
    out_wav = music_dir / f"music_{index:02d}.wav"
    
    content = await file.read()
    with open(out_wav, "wb") as f_out:
        f_out.write(content)
        
    meta = ffprobe.get_video_metadata(out_wav)
    
    block = manifest.music_blocks[index]
    block.status = BlockStatus.DONE
    block.file_path = str(out_wav)
    block.duration_s = meta["duration_s"] if meta["duration_s"] > 0 else 5.0
    block.prompt = f"[Uploaded Audio: {file.filename}]"
    block.error_msg = None
    
    manifest.save()
    db.save_project(project_name, manifest.to_dict())
    return {"status": "ok", "block": block.to_dict(), "manifest": manifest.to_dict()}

@router.post("/api/clear/block")
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
    elif lane == "music":
        if index < 0 or index >= len(manifest.music_blocks):
            raise HTTPException(status_code=400, detail="Invalid index")
        block = manifest.music_blocks[index]
        if block.file_path:
            try:
                p = Path(block.file_path)
                if p.exists():
                    p.unlink()
                    logger.info(f"Deleted physical Music file on clear: {p}")
            except Exception as e:
                logger.warning(f"Failed to delete Music file: {e}")
        block.file_path = None
        block.prompt = ""
        block.status = BlockStatus.IDLE
        block.duration_s = 0.0
    else:
        raise HTTPException(status_code=400, detail="Invalid lane")
        
    manifest.save()
    db.save_project(project_name, manifest.to_dict())
    return {"status": "ok", "manifest": manifest.to_dict()}
