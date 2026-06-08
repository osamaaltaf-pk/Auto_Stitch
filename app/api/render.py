import logging
from fastapi import APIRouter, HTTPException, BackgroundTasks
from app.core.config import PROJECTS_DIR, copy_master_to_custom_dir
from app.state import active_renders
from app.core import db, stitcher
from app.core.manifest import Manifest
from app.models.schemas import RenderRequest

logger = logging.getLogger("autostitch.api.render")

router = APIRouter(prefix="/api/render", tags=["render"])

@router.post("")
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
                sfx_volume=req.sfx_volume if req.sfx_volume is not None else 0.5,
                music_volume=req.music_volume if req.music_volume is not None else 0.5
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

@router.get("/status/{project_name}")
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
