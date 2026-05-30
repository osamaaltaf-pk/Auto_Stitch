import asyncio
import logging
import subprocess
from pathlib import Path
from typing import Optional, List, Callable
from app.core.manifest import Manifest, BlockStatus

logger = logging.getLogger("autostitch")

def get_ffmpeg_path() -> Path:
    """Gets the path to the bundled ffmpeg binary or fallback."""
    project_root = Path(__file__).resolve().parent.parent.parent
    local_path = project_root / "bin" / "ffmpeg.exe"
    if local_path.exists():
        return local_path
    return Path("ffmpeg")

def run_ffmpeg(cmd: List[str]) -> None:
    """
    Runs an FFmpeg command synchronously.
    """
    logger.info(f"Running ffmpeg command: {' '.join(cmd)}")
    result = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
    if result.returncode != 0:
        logger.error(f"FFmpeg failed. Stderr: {result.stderr[-1000:]}")
        raise RuntimeError(f"FFmpeg failed with code {result.returncode}: {result.stderr[-500:]}")
    logger.info("FFmpeg command finished successfully.")

def build_ffmpeg_cmd(
    video_path: Path,
    voice_path: Optional[Path],
    sfx_path: Optional[Path],
    output_path: Path
) -> List[str]:
    """
    Builds the exact FFmpeg arguments list based on which audio tracks are present.
    """
    ffmpeg = get_ffmpeg_path()
    output_path.parent.mkdir(parents=True, exist_ok=True)

    # Base inputs
    cmd = [str(ffmpeg), "-y", "-i", str(video_path)]

    if voice_path and sfx_path:
        # Case A: Video + Voice + SFX
        cmd.extend([
            "-i", str(voice_path),
            "-i", str(sfx_path),
            "-filter_complex",
            "[1:a]volume=1.0[voice];[2:a]volume=0.5[sfx];[voice][sfx]amix=inputs=2:duration=first[audio];[audio]loudnorm[outnorm]",
            "-map", "0:v",
            "-map", "[outnorm]",
            "-c:v", "copy",
            "-c:a", "aac",
            "-b:a", "192k",
            "-shortest"
        ])
    elif voice_path:
        # Case B: Video + Voice only
        cmd.extend([
            "-i", str(voice_path),
            "-filter_complex",
            "[1:a]loudnorm[outnorm]",
            "-map", "0:v",
            "-map", "[outnorm]",
            "-c:v", "copy",
            "-c:a", "aac",
            "-b:a", "192k",
            "-shortest"
        ])
    elif sfx_path:
        # Case C: Video + SFX only
        cmd.extend([
            "-i", str(sfx_path),
            "-filter_complex",
            "[1:a]volume=0.8,loudnorm[outnorm]",
            "-map", "0:v",
            "-map", "[outnorm]",
            "-c:v", "copy",
            "-c:a", "aac",
            "-b:a", "192k",
            "-shortest"
        ])
    else:
        # Case D: Video only
        cmd.extend([
            "-c:v", "copy",
            "-an"
        ])

    cmd.append(str(output_path))
    return cmd

async def render_all(
    manifest: Manifest,
    concat: bool = False,
    on_clip_done: Optional[Callable[[int, int], None]] = None
) -> Path:
    """
    Renders all clips. Returns path to master.mp4 (if concat=True) or output_dir.
    on_clip_done: optional callback(clips_processed, total_clips)
    """
    output_dir = Path(manifest.output_dir)
    output_dir.mkdir(parents=True, exist_ok=True)
    
    n = len(manifest.video_blocks)
    logger.info(f"Starting render_all for {n} clips...")

    for i in range(n):
        v_block, sfx_block, vo_block = manifest.get_slot(i)
        if not v_block:
            continue

        output_path = output_dir / f"clip_{i:02d}_final.mp4"
        
        # Determine actual file paths if available
        v_path = Path(v_block.file_path)
        
        s_path = None
        if sfx_block and sfx_block.status == BlockStatus.DONE and sfx_block.file_path:
            s_path = Path(sfx_block.file_path)
            
        vo_path = None
        if vo_block and vo_block.file_path:
            if vo_block.status in (BlockStatus.DONE, BlockStatus.PROVIDED):
                vo_path = Path(vo_block.file_path)

        cmd = build_ffmpeg_cmd(
            video_path=v_path,
            voice_path=vo_path,
            sfx_path=s_path,
            output_path=output_path
        )
        
        logger.info(f"Rendering slot {i}...")
        await asyncio.get_event_loop().run_in_executor(None, run_ffmpeg, cmd)
        
        if on_clip_done:
            on_clip_done(i + 1, n)

    if concat and n > 0:
        logger.info("Concatenating all clips...")
        master_path = await concat_clips(manifest, output_dir)
        return master_path

    return output_dir

async def concat_clips(manifest: Manifest, output_dir: Path) -> Path:
    """
    Concatenates all rendered final clips into master.mp4.
    """
    ffmpeg = get_ffmpeg_path()
    concat_file = output_dir / "concat_list.txt"
    num_clips = len(manifest.video_blocks)
    
    with open(concat_file, "w", encoding="utf-8") as f:
        for i in range(num_clips):
            f.write(f"file 'clip_{i:02d}_final.mp4'\n")
            
    master_path = output_dir / "master.mp4"
    cmd = [
        str(ffmpeg), "-y",
        "-f", "concat",
        "-safe", "0",
        "-i", str(concat_file),
        "-c", "copy",
        str(master_path)
    ]
    
    await asyncio.get_event_loop().run_in_executor(None, run_ffmpeg, cmd)
    return master_path
