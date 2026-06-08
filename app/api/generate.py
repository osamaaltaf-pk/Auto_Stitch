import logging
import httpx
import asyncio
from fastapi import APIRouter, HTTPException
from app.core.config import PROJECTS_DIR, load_settings
from app.state import tts_queue, sfx_queue
from app.core import db
from app.core.manifest import Manifest, BlockStatus
from app.utils import ffprobe
from app.models.schemas import TtsGenerateRequest, SfxGenerateRequest

logger = logging.getLogger("autostitch.api.generate")

router = APIRouter(prefix="/api/generate", tags=["generate"])

# --- TTS GENERATION ---
@router.post("/tts")
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
                
                # Load manifest freshly again to get user modifications that occurred during the API call
                with open(manifest_path, "r", encoding="utf-8") as f_fresh2:
                    fresh_manifest2 = Manifest.from_json(f_fresh2.read())
                fresh_block2 = next((b for b in fresh_manifest2.voice_blocks if b.id == req.block_id), None)
                
                if resp.status_code == 200:
                    with open(out_wav, "wb") as w_file:
                        w_file.write(resp.content)
                    if fresh_block2:
                        fresh_block2.status = BlockStatus.DONE
                        fresh_block2.file_path = str(out_wav)
                        # Deduce duration using ffprobe
                        meta = ffprobe.get_video_metadata(out_wav)
                        fresh_block2.duration_s = meta["duration_s"]
                        fresh_block2.error_msg = None
                    logger.info(f"TTS Synthesized successfully → {out_wav}")
                    db.log_generation(req.project_name, req.block_id, "voice", req.text, str(out_wav), "success")
                else:
                    try:
                        detail = resp.json().get("detail", f"HTTP {resp.status_code}")
                    except Exception:
                        detail = f"TTS Server returned status {resp.status_code}: {resp.text[:120]}"
                    if fresh_block2:
                        fresh_block2.status = BlockStatus.ERROR
                        fresh_block2.error_msg = detail
                    logger.error(f"TTS Server failed: {detail}")
                    db.log_generation(req.project_name, req.block_id, "voice", req.text, None, "failed")
                
                fresh_manifest2.save()
                db.save_project(req.project_name, fresh_manifest2.to_dict())
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
            
    # Put the generation task in the sequential queue so we execute one at a time
    await tts_queue.put(run_tts)
    return {"status": "generating", "manifest": manifest.to_dict()}

# --- SFX GENERATION ---
@router.post("/sfx")
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
                    
                    with open(manifest_path, "r", encoding="utf-8") as f_fresh2:
                        fresh_manifest2 = Manifest.from_json(f_fresh2.read())
                    fresh_block2 = next((b for b in fresh_manifest2.sfx_blocks if b.id == req.block_id), None)
                    if fresh_block2:
                        fresh_block2.status = BlockStatus.ERROR
                        fresh_block2.error_msg = err
                    fresh_manifest2.save()
                    db.save_project(req.project_name, fresh_manifest2.to_dict())
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
                            err_msg = status_data.get("error", "Unknown model error")
                            with open(manifest_path, "r", encoding="utf-8") as f_fresh2:
                                fresh_manifest2 = Manifest.from_json(f_fresh2.read())
                            fresh_block2 = next((b for b in fresh_manifest2.sfx_blocks if b.id == req.block_id), None)
                            if fresh_block2:
                                fresh_block2.status = BlockStatus.ERROR
                                fresh_block2.error_msg = err_msg
                            fresh_manifest2.save()
                            db.save_project(req.project_name, fresh_manifest2.to_dict())
                            db.log_generation(req.project_name, req.block_id, "sfx", req.prompt, None, "failed")
                            return
                    else:
                        logger.warning(f"Failed pulling job {job_id} status.")
                        
                if not job_done:
                    with open(manifest_path, "r", encoding="utf-8") as f_fresh2:
                        fresh_manifest2 = Manifest.from_json(f_fresh2.read())
                    fresh_block2 = next((b for b in fresh_manifest2.sfx_blocks if b.id == req.block_id), None)
                    if fresh_block2:
                        fresh_block2.status = BlockStatus.ERROR
                        fresh_block2.error_msg = "Model generation timed out"
                    fresh_manifest2.save()
                    db.save_project(req.project_name, fresh_manifest2.to_dict())
                    db.log_generation(req.project_name, req.block_id, "sfx", req.prompt, None, "failed")
                    return
                    
                # Download WAV
                dl_resp = await client.get(
                    f"{sfx_url}/api/download/{job_id}",
                    headers={"bypass-tunnel-reminder": "true"},
                    timeout=60.0
                )
                
                with open(manifest_path, "r", encoding="utf-8") as f_fresh2:
                    fresh_manifest2 = Manifest.from_json(f_fresh2.read())
                fresh_block2 = next((b for b in fresh_manifest2.sfx_blocks if b.id == req.block_id), None)
                
                if dl_resp.status_code == 200:
                    with open(out_wav, "wb") as w_file:
                        w_file.write(dl_resp.content)
                    if fresh_block2:
                        fresh_block2.status = BlockStatus.DONE
                        fresh_block2.file_path = str(out_wav)
                        meta = ffprobe.get_video_metadata(out_wav)
                        fresh_block2.duration_s = meta["duration_s"]
                        fresh_block2.error_msg = None
                    logger.info(f"SFX file downloaded successfully → {out_wav}")
                    db.log_generation(req.project_name, req.block_id, "sfx", req.prompt, str(out_wav), "success")
                else:
                    if fresh_block2:
                        fresh_block2.status = BlockStatus.ERROR
                        fresh_block2.error_msg = "Failed downloading generated audio"
                    db.log_generation(req.project_name, req.block_id, "sfx", req.prompt, None, "failed")
                
                fresh_manifest2.save()
                db.save_project(req.project_name, fresh_manifest2.to_dict())
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
            
    # Put the generation task in the sequential queue so we execute one at a time
    await sfx_queue.put(run_sfx)
    return {"status": "generating", "manifest": manifest.to_dict()}

# --- MUSIC GENERATION ---
@router.post("/music")
async def generate_music(req: SfxGenerateRequest):
    settings = load_settings()
    p_dir = PROJECTS_DIR / req.project_name
    manifest_path = p_dir / "manifest.json"
    
    if not manifest_path.exists():
        raise HTTPException(status_code=404, detail="Project not found")
        
    with open(manifest_path, "r", encoding="utf-8") as f:
        manifest = Manifest.from_json(f.read())
        
    block = next((b for b in manifest.music_blocks if b.id == req.block_id), None)
    if not block:
        raise HTTPException(status_code=404, detail="Music block not found in project")
        
    music_dir = p_dir / "music"
    music_dir.mkdir(exist_ok=True)
    out_wav = music_dir / f"music_{block.order:02d}.wav"
    
    async def run_music():
        try:
            # Load manifest freshly at the start of task execution to avoid concurrent overwrites
            with open(manifest_path, "r", encoding="utf-8") as f_fresh:
                fresh_manifest = Manifest.from_json(f_fresh.read())
            
            fresh_block = next((b for b in fresh_manifest.music_blocks if b.id == req.block_id), None)
            if not fresh_block:
                logger.error(f"Music block {req.block_id} not found when starting queued task")
                return

            # Mark block as GENERATING in manifest inside the sequential worker queue
            fresh_block.status = BlockStatus.GENERATING
            fresh_block.prompt = req.prompt
            fresh_manifest.save()
            db.save_project(req.project_name, fresh_manifest.to_dict())

            if out_wav.exists():
                try:
                    out_wav.unlink()
                    logger.info(f"Deleted old version of Music file: {out_wav}")
                except Exception as e:
                    logger.warning(f"Failed deleting old Music file: {e}")
            async with httpx.AsyncClient(trust_env=False) as client:
                payload = {
                    "prompt": req.prompt,
                    "model": req.model or "small-music",
                    "duration": req.duration,
                    "steps": req.steps,
                    "seed": req.seed
                }
                
                sfx_url = settings["sfx_server_url"].rstrip("/")
                logger.info(f"Calling Stable Audio for Music at {sfx_url}/api/generate with: {payload}")
                
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
                        err = f"Stable Audio Server returned status {resp.status_code}: {resp.text[:120]}"
                    
                    with open(manifest_path, "r", encoding="utf-8") as f_fresh2:
                        fresh_manifest2 = Manifest.from_json(f_fresh2.read())
                    fresh_block2 = next((b for b in fresh_manifest2.music_blocks if b.id == req.block_id), None)
                    if fresh_block2:
                        fresh_block2.status = BlockStatus.ERROR
                        fresh_block2.error_msg = err
                    fresh_manifest2.save()
                    db.save_project(req.project_name, fresh_manifest2.to_dict())
                    db.log_generation(req.project_name, req.block_id, "music", req.prompt, None, "failed")
                    return
                    
                job_data = resp.json()
                job_id = job_data.get("job_id")
                logger.info(f"Music job launched successfully. Job ID: {job_id}. Starting polling...")
                
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
                        logger.info(f"Music Job {job_id} Status: {job_status}")
                        
                        if job_status == "done":
                            job_done = True
                            break
                        elif job_status == "error":
                            err_msg = status_data.get("error", "Unknown model error")
                            with open(manifest_path, "r", encoding="utf-8") as f_fresh2:
                                fresh_manifest2 = Manifest.from_json(f_fresh2.read())
                            fresh_block2 = next((b for b in fresh_manifest2.music_blocks if b.id == req.block_id), None)
                            if fresh_block2:
                                fresh_block2.status = BlockStatus.ERROR
                                fresh_block2.error_msg = err_msg
                            fresh_manifest2.save()
                            db.save_project(req.project_name, fresh_manifest2.to_dict())
                            db.log_generation(req.project_name, req.block_id, "music", req.prompt, None, "failed")
                            return
                    else:
                        logger.warning(f"Failed pulling job {job_id} status.")
                        
                if not job_done:
                    with open(manifest_path, "r", encoding="utf-8") as f_fresh2:
                        fresh_manifest2 = Manifest.from_json(f_fresh2.read())
                    fresh_block2 = next((b for b in fresh_manifest2.music_blocks if b.id == req.block_id), None)
                    if fresh_block2:
                        fresh_block2.status = BlockStatus.ERROR
                        fresh_block2.error_msg = "Model generation timed out"
                    fresh_manifest2.save()
                    db.save_project(req.project_name, fresh_manifest2.to_dict())
                    db.log_generation(req.project_name, req.block_id, "music", req.prompt, None, "failed")
                    return
                    
                # Download WAV
                dl_resp = await client.get(
                    f"{sfx_url}/api/download/{job_id}",
                    headers={"bypass-tunnel-reminder": "true"},
                    timeout=60.0
                )
                
                with open(manifest_path, "r", encoding="utf-8") as f_fresh2:
                    fresh_manifest2 = Manifest.from_json(f_fresh2.read())
                fresh_block2 = next((b for b in fresh_manifest2.music_blocks if b.id == req.block_id), None)
                
                if dl_resp.status_code == 200:
                    with open(out_wav, "wb") as w_file:
                        w_file.write(dl_resp.content)
                    if fresh_block2:
                        fresh_block2.status = BlockStatus.DONE
                        fresh_block2.file_path = str(out_wav)
                        meta = ffprobe.get_video_metadata(out_wav)
                        fresh_block2.duration_s = meta["duration_s"]
                        fresh_block2.error_msg = None
                    logger.info(f"Music file downloaded successfully → {out_wav}")
                    db.log_generation(req.project_name, req.block_id, "music", req.prompt, str(out_wav), "success")
                else:
                    if fresh_block2:
                        fresh_block2.status = BlockStatus.ERROR
                        fresh_block2.error_msg = "Failed downloading generated audio"
                    db.log_generation(req.project_name, req.block_id, "music", req.prompt, None, "failed")
                
                fresh_manifest2.save()
                db.save_project(req.project_name, fresh_manifest2.to_dict())
        except Exception as e:
            logger.error(f"Error generating Music: {e}")
            try:
                with open(manifest_path, "r", encoding="utf-8") as f_fresh:
                    err_manifest = Manifest.from_json(f_fresh.read())
                err_block = next((b for b in err_manifest.music_blocks if b.id == req.block_id), None)
                if err_block:
                    err_block.status = BlockStatus.ERROR
                    err_block.error_msg = str(e)
                    err_manifest.save()
                    db.save_project(req.project_name, err_manifest.to_dict())
            except Exception as ex:
                logger.error(f"Failed saving error to manifest: {ex}")
            db.log_generation(req.project_name, req.block_id, "music", req.prompt, None, "failed")
            return

    # Put the generation task in the sequential queue so we execute one at a time
    await sfx_queue.put(run_music)
    return {"status": "generating", "manifest": manifest.to_dict()}
