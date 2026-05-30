import json
import logging
import subprocess
from pathlib import Path
from typing import Optional, Dict, Any

logger = logging.getLogger("autostitch")

def get_bin_path(name: str) -> Path:
    """Gets the path to the bundled binary or fallback to system path."""
    project_root = Path(__file__).resolve().parent.parent.parent
    local_path = project_root / "bin" / f"{name}.exe"
    if local_path.exists():
        return local_path
    # Fallback to system name
    return Path(name)

def get_video_metadata(video_path: Path) -> Dict[str, Any]:
    """
    Runs ffprobe on the given video path to extract metadata:
    duration, width, height, fps.
    """
    ffprobe_path = get_bin_path("ffprobe")
    cmd = [
        str(ffprobe_path),
        "-v", "error",
        "-show_entries", "format=duration:stream=width,height,avg_frame_rate",
        "-of", "json",
        str(video_path)
    ]
    
    try:
        logger.info(f"Running ffprobe: {' '.join(cmd)}")
        result = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True, check=True)
        data = json.loads(result.stdout)
        
        streams = data.get("streams", [])
        fmt = data.get("format", {})
        
        duration = float(fmt.get("duration", 0.0))
        width = 0
        height = 0
        fps = 30.0
        
        if streams:
            stream = streams[0]
            width = int(stream.get("width", 0))
            height = int(stream.get("height", 0))
            avg_frame_rate = stream.get("avg_frame_rate", "30/1")
            if "/" in avg_frame_rate:
                try:
                    num, den = avg_frame_rate.split("/")
                    if float(den) > 0:
                        fps = float(num) / float(den)
                except Exception:
                    fps = 30.0
                    
        return {
            "duration_s": duration,
            "width": width,
            "height": height,
            "fps": fps
        }
    except Exception as e:
        logger.error(f"Failed running ffprobe on {video_path}: {e}")
        return {
            "duration_s": 0.0,
            "width": 0,
            "height": 0,
            "fps": 30.0
        }

def extract_thumbnail(video_path: Path, output_thumbnail_path: Path, time_s: float = 0.0) -> bool:
    """
    Extracts a frame from the video at time_s and saves it as a JPEG file.
    """
    ffmpeg_path = get_bin_path("ffmpeg")
    output_thumbnail_path.parent.mkdir(parents=True, exist_ok=True)
    
    # ffmpeg args to extract 1 frame quickly
    cmd = [
        str(ffmpeg_path),
        "-y",
        "-ss", str(time_s),
        "-i", str(video_path),
        "-vframes", "1",
        "-q:v", "2",
        str(output_thumbnail_path)
    ]
    
    try:
        logger.info(f"Running ffmpeg thumbnail: {' '.join(cmd)}")
        subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, check=True)
        return output_thumbnail_path.exists()
    except Exception as e:
        logger.error(f"Failed extracting thumbnail from {video_path}: {e}")
        return False
