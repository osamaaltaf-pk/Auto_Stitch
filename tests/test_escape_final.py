import sys
sys.path.insert(0, 'd:/Osama_mvp')
from app.core.stitcher import escape_drawtext

# All the problem cases from real render logs
test_cases = [
    ("It's",         "It'\\''s"),
    ("don't",        "don'\\''t"),
    ("can't",        "can'\\''t"),
    ("won't",        "won'\\''t"),
    ("what's",       "what'\\''s"),
    ("you're",       "you'\\''re"),
    ("ask:",         "ask\\:"),       # colon escaped
    ("50% off",      "50% off"),      # percent unchanged since expansion=none is used
    ("go,go",        "go\\,go"),      # comma escaped
    ("C:\\path",     "C\\:\\\\path"), # colon and backslash escaped
    ("hello",        "hello"),        # plain word unchanged
    ("\ufeffword",   "word"),         # BOM stripped
    ("word\u200b",   "word"),         # zero-width stripped
]

print(f"{'Input':<18} {'Escaped':<20} {'Expected':<20} {'OK?'}")
print("-" * 70)
all_ok = True
for inp, expected in test_cases:
    result = escape_drawtext(inp)
    ok = result == expected
    if not ok:
        all_ok = False
    print(f"{repr(inp):<18} {repr(result):<20} {repr(expected):<20} {'OK' if ok else 'FAIL'}")

print()
# Show what the actual filter fragment looks like for 'It's'
word = "It's"
escaped = escape_drawtext(word)
filter_frag = f"drawtext=fontfile='C\\:/Windows/Fonts/arial.ttf':text='{escaped}':enable='between(t,0.000,0.425)':x=(w-tw)/2:y=h-th-80:fontcolor=yellow:fontsize=40"
print("=== Filter fragment for \"It's\" ===")
print(filter_frag)
print()
print(f"ALL TESTS PASSED: {all_ok}")
