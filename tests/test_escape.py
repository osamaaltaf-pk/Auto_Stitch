import re

def current_escape(text):
    """Current broken escaping in stitcher.py"""
    return text.replace("'", "'\\\\\\'").replace(":", "\\\\:")

def correct_escape(text):
    """Correct FFmpeg drawtext escaping"""
    # Order matters: backslash first, then special chars
    text = text.replace("\\", "\\\\")      # backslash -> double backslash
    text = text.replace("'", "\\'")         # apostrophe -> escaped apostrophe  
    text = text.replace(":", "\\:")         # colon -> escaped colon
    text = text.replace(",", "\\,")         # comma -> escaped comma (filter separator)
    text = text.replace("%", "%%")          # percent sign
    return text

# Test words that commonly appear in TTS output
test_words = ["don't", "it's", "won't", "2:30", "you're", "I'm", "can't", "what's", "he'd", "we'll"]

print("=== Current escaping vs Correct escaping ===")
print(f"{'Word':<15} {'Current':<25} {'Correct':<25} {'Same?'}")
print("-" * 80)
for w in test_words:
    cur = current_escape(w)
    cor = correct_escape(w)
    print(f"{w:<15} {cur:<25} {cor:<25} {cur == cor}")

print()
print("=== Root cause ===")
print("The current escaping: .replace(\"'\", \"'\\\\\\\\\\\\'\")  ")
print("This produces:  '\\\\\\' which in the shell becomes '\\' -- BROKEN on Windows!")
print("Correct: .replace(\"'\", \"\\\\'\")  which produces: \\'  ")
print()
print("Also missing: comma escaping (breaks filter chain), percent escaping")
