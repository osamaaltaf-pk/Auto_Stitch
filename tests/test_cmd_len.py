text = 'actually want to know what you actually want'
words = (text.split()) * 10  # simulate a 40-word clip
parts = []
for i, w in enumerate(words[:40]):
    start = i * 0.3
    end = start + 0.3
    parts.append(
        f"drawtext=fontfile='C\\:/Windows/Fonts/arial.ttf':text='{w}'"
        f":enable='between(t,{start:.3f},{end:.3f})'"
        f":x=(w-tw)/2:y=h-th-80:fontcolor=yellow:fontsize=40"
        f":box=1:boxcolor=black@0.5:boxborderw=8"
    )
vf = ','.join(parts)
print(f"Filter length with 40 words: {len(vf)} chars")

# Simulate a full ffmpeg command with this filter
full_cmd_len = 500 + len(vf)  # rough estimate of the rest of the cmd
print(f"Estimated full cmd length: {full_cmd_len} chars")
print(f"Windows CreateProcess limit: 32767 chars")
print(f"Exceeds limit: {full_cmd_len > 32767}")

# How many words before we hit the limit?
per_word = len(vf) / 40
words_til_limit = int((32767 - 500) / per_word)
print(f"Approx words before limit: {words_til_limit}")
