import subprocess
from pathlib import Path

ffmpeg = Path("D:/Osama_mvp/bin/ffmpeg.exe")
video_path = Path("C:/Users/Microsoft/Downloads/ChatGPT_Images/scene7.png")
voice_path = Path("D:/Osama_mvp/projects/hello/voice/vo_00.wav")
sfx_path = Path("D:/Osama_mvp/projects/hello/sfx/sfx_00.wav")
output_path = Path("D:/Osama_mvp/scratch/test_out.mp4")

# Test 1: Both voice and sfx (simulating voice.status == done)
cmd1 = [
    str(ffmpeg), "-y",
    "-loop", "1", "-t", "5.000", "-r", "25",
    "-i", str(video_path),
    "-i", str(voice_path),
    "-i", str(sfx_path),
    "-filter_complex", "[1:a]volume=1.00[voice_a];[2:a]volume=1.00[sfx_a];[voice_a][sfx_a]amix=inputs=2:duration=first[audio_mix];[audio_mix]loudnorm[outnorm]",
    "-vf", "scale=w='min(1920,iw*1080/ih)':h='min(1080,ih*1920/iw)',pad=w=1920:h=1080:x=(1920-iw)/2:y=(1080-ih)/2:color=black",
    "-c:v", "libx264", "-pix_fmt", "yuv420p",
    "-map", "0:v", "-map", "[outnorm]",
    "-c:a", "aac", "-b:a", "192k",
    "-t", "5.000",
    str(output_path)
]

print("--- RUNNING CMD 1 ---")
print(" ".join(cmd1))
res = subprocess.run(cmd1, capture_output=True, text=True)
print("RC:", res.returncode)
print("STDOUT:", res.stdout)
print("STDERR:")
print(res.stderr[-2000:])


# Test 2: Only sfx (simulating voice.status == idle/None)
cmd2 = [
    str(ffmpeg), "-y",
    "-loop", "1", "-t", "5.000", "-r", "25",
    "-i", str(video_path),
    "-i", str(sfx_path),
    "-filter_complex", "[1:a]volume=1.00[sfx_a];[sfx_a]loudnorm[outnorm]",
    "-vf", "scale=w='min(1920,iw*1080/ih)':h='min(1080,ih*1920/iw)',pad=w=1920:h=1080:x=(1920-iw)/2:y=(1080-ih)/2:color=black",
    "-c:v", "libx264", "-pix_fmt", "yuv420p",
    "-map", "0:v", "-map", "[outnorm]",
    "-c:a", "aac", "-b:a", "192k",
    "-t", "5.000",
    str(output_path)
]

print("\n--- RUNNING CMD 2 ---")
print(" ".join(cmd2))
res = subprocess.run(cmd2, capture_output=True, text=True)
print("RC:", res.returncode)
print("STDOUT:", res.stdout)
print("STDERR:")
print(res.stderr[-2000:])
