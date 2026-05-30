# STITCHER.md — FFmpeg Stitching Pipeline

All video/audio mixing is done via FFmpeg subprocess calls.
FFmpeg binary is always at `bin/ffmpeg.exe` relative to project root.
NEVER use shell=True. NEVER build FFmpeg commands by string concatenation.
Always use explicit argument lists passed to `subprocess.run`.

---

## Per-clip render (the core operation)

For each clip slot (order index N), the stitcher:
1. Takes `video_path` from `video_blocks[N]`
2. Takes `sfx_path` from `sfx_blocks[N].file_path` (may be None)
3. Takes `voice_path` from `voice_blocks[N].file_path` (may be None)
4. Produces `output/clip_{N:02d}_final.mp4`

### Case A: Video + Voice + SFX (all three present)

```python
cmd = [
    str(ffmpeg), "-y",
    "-i", str(video_path),      # input 0: video
    "-i", str(voice_path),      # input 1: voice
    "-i", str(sfx_path),        # input 2: sfx
    "-filter_complex",
    (
        "[1:a]volume=1.0[voice];"          # voice at full volume
        "[2:a]volume=0.5[sfx];"            # sfx at 50% (ducks under voice)
        "[voice][sfx]amix=inputs=2:duration=first[audio];"
        "[audio]loudnorm[outnorm]"          # normalise final mix
    ),
    "-map", "0:v",               # video from input 0
    "-map", "[outnorm]",         # audio from filter
    "-c:v", "copy",              # no video re-encode
    "-c:a", "aac",               # encode audio to AAC
    "-b:a", "192k",
    "-shortest",                 # trim to shortest stream
    str(output_path)
]
```

### Case B: Video + Voice only (no SFX)

```python
cmd = [
    str(ffmpeg), "-y",
    "-i", str(video_path),
    "-i", str(voice_path),
    "-filter_complex", "[1:a]loudnorm[outnorm]",
    "-map", "0:v",
    "-map", "[outnorm]",
    "-c:v", "copy",
    "-c:a", "aac", "-b:a", "192k",
    "-shortest",
    str(output_path)
]
```

### Case C: Video + SFX only (no voice)

```python
cmd = [
    str(ffmpeg), "-y",
    "-i", str(video_path),
    "-i", str(sfx_path),
    "-filter_complex", "[1:a]volume=0.8,loudnorm[outnorm]",
    "-map", "0:v",
    "-map", "[outnorm]",
    "-c:v", "copy",
    "-c:a", "aac", "-b:a", "192k",
    "-shortest",
    str(output_path)
]
```

### Case D: Video only (no audio)

```python
cmd = [
    str(ffmpeg), "-y",
    "-i", str(video_path),
    "-c:v", "copy",
    "-an",                       # strip any existing audio
    str(output_path)
]
```

---

## Concat step (optional, user checkbox)

After all per-clip renders complete, concat into master:

```python
# Write concat list file
concat_file = output_dir / "concat_list.txt"
with open(concat_file, "w") as f:
    for n in range(num_clips):
        f.write(f"file 'clip_{n:02d}_final.mp4'\n")

cmd = [
    str(ffmpeg), "-y",
    "-f", "concat",
    "-safe", "0",
    "-i", str(concat_file),
    "-c", "copy",
    str(output_dir / "master.mp4")
]
```

---

## Running FFmpeg and reporting progress

```python
import subprocess
from app.utils.logger import log

def run_ffmpeg(cmd: list[str], on_progress=None) -> None:
    """
    Run FFmpeg command. Raises RuntimeError on non-zero exit.
    on_progress: optional callable(percent: float) for UI progress bar.
    """
    result = subprocess.run(
        cmd,
        capture_output=True,
        text=True
    )
    if result.returncode != 0:
        log.error("ffmpeg_failed", stderr=result.stderr[-500:])
        raise RuntimeError(f"FFmpeg failed: {result.stderr[-200:]}")
```

For progress reporting (if needed): run FFmpeg with `-progress pipe:1`
and parse stdout lines for `out_time_ms=` to compute percent.

---

## Render orchestration (app/core/stitcher.py)

```python
async def render_all(manifest: Manifest, concat: bool = False,
                     on_clip_done=None) -> Path:
    """
    Render all clips. Returns path to master.mp4 (if concat=True) or output_dir.
    on_clip_done: optional callable(clip_index: int, total: int)
    """
    output_dir = manifest.output_dir
    output_dir.mkdir(parents=True, exist_ok=True)

    n = len(manifest.video_blocks)
    for i in range(n):
        video_block = next((b for b in manifest.video_blocks if b.order == i), None)
        sfx_block   = next((b for b in manifest.sfx_blocks   if b.order == i), None)
        voice_block = next((b for b in manifest.voice_blocks if b.order == i), None)

        if video_block is None:
            continue

        output_path = output_dir / f"clip_{i:02d}_final.mp4"
        cmd = build_ffmpeg_cmd(
            video_path=video_block.file_path,
            voice_path=voice_block.file_path if voice_block and voice_block.status in (BlockStatus.DONE, BlockStatus.PROVIDED) else None,
            sfx_path=sfx_block.file_path if sfx_block and sfx_block.status == BlockStatus.DONE else None,
            output_path=output_path
        )
        # Run in executor so UI doesn't freeze
        await asyncio.get_event_loop().run_in_executor(None, run_ffmpeg, cmd)
        if on_clip_done:
            on_clip_done(i + 1, n)

    if concat:
        await concat_clips(manifest, output_dir)
        return output_dir / "master.mp4"

    return output_dir
```

---

## ffprobe helper (app/utils/ffprobe.py)

Used to get clip duration and extract thumbnail:

```python
def get_duration(file_path: Path, ffprobe: Path) -> float:
    """Return duration in seconds using ffprobe."""
    cmd = [
        str(ffprobe), "-v", "quiet",
        "-print_format", "json",
        "-show_streams",
        str(file_path)
    ]
    result = subprocess.run(cmd, capture_output=True, text=True)
    data = json.loads(result.stdout)
    return float(data["streams"][0]["duration"])

def extract_thumbnail(file_path: Path, output_path: Path, ffmpeg: Path) -> Path:
    """Extract first frame as JPEG thumbnail."""
    cmd = [
        str(ffmpeg), "-y",
        "-i", str(file_path),
        "-frames:v", "1",
        "-vf", "scale=120:-1",
        str(output_path)
    ]
    subprocess.run(cmd, capture_output=True)
    return output_path
```
