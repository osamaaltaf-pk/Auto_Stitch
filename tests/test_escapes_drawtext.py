import subprocess
from pathlib import Path

ffmpeg = Path("d:/Osama_mvp/bin/ffmpeg.exe")
output = Path("d:/Osama_mvp/output/test_chars.mp4")

test_cases = {
    "backslash": "C:\\path",
    "comma": "hello, world",
    "percent": "50% off",
    "quotes": "It's",
    "colon_comma": "ask: go,go"
}

for name, val in test_cases.items():
    escaped = val
    # 1. Backslash -> \\\\ (so it is a single backslash inside the single-quoted value)
    escaped = escaped.replace("\\", "\\\\")
    
    # 2. Single quote -> '\''
    escaped = escaped.replace("'", "'\\''")
    
    # 3. Colon -> \\:
    escaped = escaped.replace(":", "\\:")
    
    # 4. Comma -> \\,
    escaped = escaped.replace(",", "\\,")

    cmd = [
        str(ffmpeg), "-y",
        "-f", "lavfi", "-i", "color=c=blue:size=1280x720:duration=1:rate=25",
        "-vf", f"drawtext=text='{escaped}':expansion=none:fontcolor=white:fontsize=40",
        "-t", "1",
        str(output)
    ]
    res = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
    if res.returncode == 0:
        print(f"Test {name} (val: {repr(val)} -> escaped: {repr(escaped)}) SUCCEEDED")
    else:
        print(f"Test {name} (val: {repr(val)} -> escaped: {repr(escaped)}) FAILED")
        print(res.stderr[-400:])
