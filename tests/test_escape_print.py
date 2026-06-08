import sys
sys.path.insert(0, 'd:/Osama_mvp')
from app.core.stitcher import escape_drawtext

words = ["It's", "don't", "ask:", "50% off", "hello", "won't"]
for w in words:
    e = escape_drawtext(w)
    frag = "text='" + e + "':enable='between(t,0.000,0.425)'"
    print(f"Input: {w!r}")
    print(f"  Escaped: {e!r}")
    print(f"  Fragment: {frag}")
    print()
