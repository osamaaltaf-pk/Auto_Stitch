import subprocess
from pathlib import Path

ffmpeg = Path("d:/Osama_mvp/bin/ffmpeg.exe")
output = Path("d:/Osama_mvp/output/test_colon.mp4")

# Test 1: with unescaped colon inside single quotes
cmd1 = [
    str(ffmpeg), "-y",
    "-f", "lavfi", "-i", "color=c=blue:size=1280x720:duration=1:rate=25",
    "-vf", "drawtext=text='ask:':fontcolor=white:fontsize=40",
    "-t", "1",
    str(output)
]

print("Running Test 1 (unescaped colon):")
res1 = subprocess.run(cmd1, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
if res1.returncode == 0:
    print("Test 1 Succeeded")
else:
    print("Test 1 Failed!")
    print("Stderr snippet:")
    print(res1.stderr[-400:])

# Test 2: with escaped colon
cmd2 = [
    str(ffmpeg), "-y",
    "-f", "lavfi", "-i", "color=c=blue:size=1280x720:duration=1:rate=25",
    "-vf", "drawtext=text='ask\\:':fontcolor=white:fontsize=40",
    "-t", "1",
    str(output)
]

print("\nRunning Test 2 (escaped colon):")
res2 = subprocess.run(cmd2, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
if res2.returncode == 0:
    print("Test 2 Succeeded")
else:
    print("Test 2 Failed!")
    print("Stderr snippet:")
    print(res2.stderr[-400:])
