import sys
sys.path.insert(0, 'd:/Osama_mvp')
from app.core.stitcher import escape_drawtext

words = ["don't", "it's", "won't", "2:30", "you're", "I'm", "can't", "what's", "50% off", "go,go"]
print(f"{'Word':<15} {'Escaped'}")
print('-' * 50)
for w in words:
    print(f"{w:<15} {escape_drawtext(w)}")

print()
print("=== Verification: apostrophe test ===")
e = escape_drawtext("don't")
print(f"don't  -> {repr(e)}")
expected = "don\\'t"
print(f"Expected repr: {repr(expected)}")
print(f"Match: {e == expected}")
