import sys
from pathlib import Path

# Add project root to path
project_root = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(project_root))

from app.core.stitcher import build_ffmpeg_cmd, escape_drawtext

print("Testing escape_drawtext on stripped words/punctuation:")
test_words = ["—", "   ", "\ufeff", "\u200b", "hello", "world"]
for w in test_words:
    escaped = escape_drawtext(w)
    print(f"  {repr(w)} -> {repr(escaped)}")

print("\nSimulating word timing list containing a stripped punctuation word:")
word_timings = [
    {"word": "Hello", "start": 0.0, "end": 1.0},
    {"word": "—", "start": 1.0, "end": 1.5},
    {"word": "world!", "start": 1.5, "end": 2.5}
]

cmd = build_ffmpeg_cmd(
    video_path=Path("dummy_in.mp4"),
    voice_path=None,
    sfx_path=None,
    music_path=None,
    output_path=Path("dummy_out.mp4"),
    word_timings=word_timings,
    captions_enabled=True,
    caption_mode="word_by_word"
)

# Look for any drawtext filter in the cmd list
drawtext_filters = []
for arg in cmd:
    if "drawtext" in arg:
        # Split by comma to see individual drawtext instances
        parts = arg.split(",")
        for part in parts:
            if "drawtext" in part:
                drawtext_filters.append(part)

print("\nGenerated drawtext filters:")
for f in drawtext_filters:
    print(f"  {f}")

# Assertions
has_empty = any("text=''" in f or "text=:" in f for f in drawtext_filters)
print(f"\nHas empty text filter? {has_empty}")
if has_empty:
    print("FAIL: Found empty text drawtext filter!")
    sys.exit(1)
else:
    print("SUCCESS: No empty text drawtext filters generated!")
    sys.exit(0)
