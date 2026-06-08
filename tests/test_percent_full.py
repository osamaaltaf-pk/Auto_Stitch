import subprocess
from pathlib import Path

ffmpeg = Path("d:/Osama_mvp/bin/ffmpeg.exe")
output = Path("d:/Osama_mvp/output/test_percent_full.mp4")

cmd = [
    str(ffmpeg), "-y",
    "-f", "lavfi", "-i", "color=c=blue:size=1280x720:duration=1:rate=25",
    "-vf", "drawtext=text='':expansion=none:fontcolor=white:fontsize=40",
    "-t", "1",
    str(output)
]
res = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
print("Return code:", res.returncode)
print("FULL STDERR:")
print(res.stderr)
