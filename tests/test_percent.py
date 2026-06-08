import subprocess
from pathlib import Path

ffmpeg = Path("d:/Osama_mvp/bin/ffmpeg.exe")
output = Path("d:/Osama_mvp/output/test_percent.mp4")

cases = [
    ("single percent", "50% off"),
    ("double percent", "50%% off"),
    ("escaped percent", "50\\% off"),
    ("no percent", "50 percent off")
]

for name, val in cases:
    cmd = [
        str(ffmpeg), "-y",
        "-f", "lavfi", "-i", "color=c=blue:size=1280x720:duration=1:rate=25",
        "-vf", f"drawtext=text='{val}':fontcolor=white:fontsize=40",
        "-t", "1",
        str(output)
    ]
    res = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
    if res.returncode == 0:
        print(f"{name} SUCCEEDED")
    else:
        print(f"{name} FAILED: code {res.returncode}")
        print("Last 100 chars of stderr:")
        print(res.stderr[-100:])
