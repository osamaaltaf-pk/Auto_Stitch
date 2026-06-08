import sys
import subprocess
from pathlib import Path

# Add project root to path
project_root = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(project_root))

from app.core.stitcher import build_ffmpeg_cmd, get_ffmpeg_path

# Simulate a full clip compilation with difficult words
word_timings = [
    {"word": "It's", "start": 0.0, "end": 0.5},
    {"word": "ask:", "start": 0.5, "end": 1.0},
    {"word": "50% off,", "start": 1.0, "end": 2.0},
    {"word": "C:\\path", "start": 2.0, "end": 3.0}
]

output_path = Path("d:/Osama_mvp/output/test_drawtext_full_robustness.mp4")
output_path.parent.mkdir(parents=True, exist_ok=True)

# We will build command using a virtual lavfi color source so it runs standalone
ffmpeg = get_ffmpeg_path()
cmd = [
    str(ffmpeg), "-y",
    "-f", "lavfi", "-i", "color=c=blue:size=1280x720:duration=3:rate=25"
]

# Get the -vf filters list from build_ffmpeg_cmd
full_cmd = build_ffmpeg_cmd(
    video_path=Path("dummy.mp4"),
    voice_path=None,
    sfx_path=None,
    music_path=None,
    output_path=Path("dummy_out.mp4"),
    word_timings=word_timings,
    captions_enabled=True,
    caption_mode="word_by_word"
)

# Extract the -vf filter chain
vf_val = None
for idx, arg in enumerate(full_cmd):
    if arg == "-vf":
        vf_val = full_cmd[idx + 1]
        break

if not vf_val:
    print("Error: Could not find -vf argument in build_ffmpeg_cmd output!")
    sys.exit(1)

print("Generated -vf filter string:")
print(vf_val)
print()

cmd.extend(["-vf", vf_val])
cmd.extend(["-t", "3.0", str(output_path)])

print("Running FFmpeg with the generated filter string...")
res = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)

if res.returncode == 0:
    print("SUCCESS: FFmpeg completed successfully with zero return code!")
    print(f"Output file size: {output_path.stat().st_size:,} bytes")
    sys.exit(0)
else:
    print(f"FAIL: FFmpeg failed with return code {res.returncode}")
    print("FULL STDERR:")
    print(res.stderr)
    sys.exit(1)
