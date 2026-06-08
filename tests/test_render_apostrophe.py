"""
Quick smoke test: render clip 13 (which has "It's" in its voice script)
directly via FFmpeg using the new escape_drawtext function.
This reproduces the exact conditions that caused "No such filter: '0.000'"
"""
import sys, subprocess
from pathlib import Path
sys.path.insert(0, 'd:/Osama_mvp')
from app.core.stitcher import escape_drawtext, get_font_file, get_ffmpeg_path

font_arg = get_font_file("arial")
ffmpeg = get_ffmpeg_path()

# Test words from clip 13's voice script
test_words = [
    ("It's",    0.000, 0.425),
    ("the",     0.425, 0.744),
    ("Sunday",  0.744, 1.382),
    ("evening", 1.382, 2.126),
    ("that",    2.126, 2.551),
    ("feels",   2.551, 3.082),
    ("heavier", 3.082, 3.827),
    ("than",    3.827, 4.252),
    ("it",      4.252, 4.464),
    ("should.", 4.464, 5.208),
]

vf_parts = []
for word, start, end in test_words:
    escaped = escape_drawtext(word)
    part = (
        f"drawtext={font_arg}"
        f"text='{escaped}':enable='between(t,{start:.3f},{end:.3f})':"
        f"x=(w-tw)/2:y=h-th-80:fontcolor=yellow:fontsize=40"
        f":box=1:boxcolor=black@0.5:boxborderw=8"
    )
    vf_parts.append(part)

vf_parts.append("scale=trunc(iw/2)*2:trunc(ih/2)*2")
vf = ",".join(vf_parts)

# Use a 5-second color source instead of real video so the test runs standalone
output = Path("d:/Osama_mvp/output/test_apostrophe_clip.mp4")
output.parent.mkdir(parents=True, exist_ok=True)

cmd = [
    str(ffmpeg), "-y",
    "-f", "lavfi", "-i", "color=c=blue:size=1280x720:duration=5:rate=25",
    "-vf", vf,
    "-c:v", "libx264", "-pix_fmt", "yuv420p",
    "-t", "5.208",
    str(output)
]

print("Running FFmpeg smoke test for apostrophe escaping...")
print(f"VF filter length: {len(vf)} chars")
print()

result = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
if result.returncode == 0:
    print(f"SUCCESS! Output: {output}")
    print(f"File size: {output.stat().st_size:,} bytes")
else:
    print(f"FAILED (code {result.returncode})")
    print("STDERR (last 500):")
    print(result.stderr[-500:])
