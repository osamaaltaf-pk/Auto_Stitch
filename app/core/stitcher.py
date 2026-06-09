import asyncio
import logging
import subprocess
import re
from pathlib import Path
from typing import Optional, List, Callable, Dict, Any
from app.core.manifest import Manifest, BlockStatus
from app.utils import ffprobe

logger = logging.getLogger("autostitch")

def get_ffmpeg_path() -> Path:
    """Gets the path to the bundled ffmpeg binary or fallback."""
    project_root = Path(__file__).resolve().parent.parent.parent
    local_path = project_root / "bin" / "ffmpeg.exe"
    if local_path.exists():
        return local_path
    return Path("ffmpeg")

def run_ffmpeg(cmd: List[str]) -> None:
    """
    Runs an FFmpeg command synchronously.
    Logs the FULL stderr on failure so the real error is always visible.
    """
    logger.info(f"Running ffmpeg command: {' '.join(cmd)}")
    result = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
    if result.returncode != 0:
        stderr_text = result.stderr.decode('utf-8', errors='replace')
        logger.error(f"FFmpeg FAILED (code {result.returncode}).")
        logger.error(f"FULL STDERR:\n{stderr_text}")
        raise RuntimeError(f"FFmpeg failed with code {result.returncode}: {stderr_text[-800:]}")
    logger.info("FFmpeg command finished successfully.")

def escape_drawtext(text: str) -> str:
    """
    Correctly escapes text for use inside an FFmpeg drawtext filter value.
    The text is embedded as: text='ESCAPED_TEXT'

    KEY RULE — Inside FFmpeg single-quoted '...' option values:
      - Backslash must be escaped as \\\\ to be treated as a single literal backslash.
      - '   ends the quoted section immediately.
      - Therefore to embed a single quote: use the '\'' technique
        (close the outer quote, write backslash-quote unquoted, reopen the quote)
        e.g.  It's  →  It'\\''s   →  in filter: text='It'\\''s'
      - Colon (:) and comma (,) are parameter separators in FFmpeg filtergraphs.
        Even inside single quotes, they must be escaped as \\: and \\, to avoid breaking the parameter parsing.
      - Percent (%) does not need escaping if expansion=none is specified on the drawtext filter.
    """
    # 0. Sanitize: strip BOM, zero-width chars, control chars, and non-ASCII.
    #    FFmpeg drawtext / libass cannot handle these on Windows.
    text = text.replace('\ufeff', '')    # BOM (U+FEFF)
    text = text.replace('\u200b', '')    # Zero-width space
    text = text.replace('\u200c', '')    # Zero-width non-joiner
    text = text.replace('\u200d', '')    # Zero-width joiner
    text = text.replace('\u00a0', ' ')   # Non-breaking space → regular space
    text = re.sub(r'[\x00-\x1f\x7f]', '', text)             # C0 control characters
    text = text.encode('ascii', errors='ignore').decode('ascii')  # strip non-ASCII
    text = text.strip()
    if not text:
        return ''

    # 1. Backslash -> \\\\ (must be escaped first to prevent double-escaping subsequent backslashes)
    text = text.replace("\\", "\\\\")

    # 2. Single quote -> '\'' (close outer quote, backslash-quote unquoted, reopen outer quote)
    text = text.replace("'", "'\\''")

    # 3. Colon -> \\:
    text = text.replace(":", "\\:")

    # 4. Comma -> \\,
    text = text.replace(",", "\\,")

    return text

def get_font_file(style_name: str) -> str:
    style_name = style_name.lower().strip()
    fonts_dir = Path("C:/Windows/Fonts")
    font_files = {
        "arial": "arial.ttf",
        "courier": "cour.ttf",
        "times_new_roman": "times.ttf",
        "impact": "impact.ttf"
    }
    file_name = font_files.get(style_name, "arial.ttf")
    path = fonts_dir / file_name
    if path.exists():
        escaped_path = str(path).replace("\\", "/").replace(":", "\\:")
        return f"fontfile='{escaped_path}':"
    return "font=Arial:"

def get_line_timings(word_timings: List[Dict[str, Any]], words_per_line: int = 5) -> List[Dict[str, Any]]:
    if not word_timings:
        return []
    lines = []
    current_words = []
    
    for item in word_timings:
        current_words.append(item)
        word_str = item.get("word", "")
        if len(current_words) >= words_per_line or word_str.endswith((".", "?", "!")):
            line_text = " ".join([w.get("word", "") for w in current_words])
            start_time = current_words[0].get("start", 0.0)
            end_time = current_words[-1].get("end", 0.0)
            lines.append({
                "line": line_text,
                "start": start_time,
                "end": end_time
            })
            current_words = []
            
    if current_words:
        line_text = " ".join([w.get("word", "") for w in current_words])
        start_time = current_words[0].get("start", 0.0)
        end_time = current_words[-1].get("end", 0.0)
        lines.append({
            "line": line_text,
            "start": start_time,
            "end": end_time
        })
        
    return lines

def get_linear_word_timings(text: str, duration_s: float) -> List[Dict[str, Any]]:
    """Generates offline character-length-weighted linear word timings."""
    words = text.strip().split()
    if not words or duration_s <= 0:
        return []
    
    lengths = [len(w) for w in words]
    total_len = sum(lengths)
    if total_len == 0:
        return []
    
    char_duration = duration_s / total_len
    timings = []
    current_time = 0.0
    
    for word, length in zip(words, lengths):
        word_dur = length * char_duration
        timings.append({
            "word": word,
            "start": current_time,
            "end": current_time + word_dur
        })
        current_time += word_dur
        
    return timings

def build_ffmpeg_cmd(
    video_path: Path,
    voice_path: Optional[Path],
    sfx_path: Optional[Path],
    music_path: Optional[Path],
    output_path: Path,
    is_image: bool = False,
    duration: float = 5.0,
    video_volume: float = 1.0,
    voice_volume: float = 1.0,
    sfx_volume: float = 0.5,
    music_volume: float = 0.5,
    canvas_w: int = 1920,
    canvas_h: int = 1080,
    fit_mode: str = "letterbox",
    overlay_effect: str = "none",
    color_grading: str = "none",
    captions_enabled: bool = True,
    caption_mode: str = "word_by_word",
    caption_font_color: str = "yellow",
    caption_font_size: int = 40,
    caption_font_style: str = "arial",
    caption_placement: str = "bottom",
    caption_box_enabled: bool = True,
    caption_box_color: str = "black@0.5",
    caption_outline_color: str = "black",
    caption_outline_width: int = 0,
    word_timings: List[Dict[str, Any]] = None,
    sfx_label: Optional[str] = None,
    video_has_audio: bool = False,
    video_duration: float = 0.0,
    sfx_captions_enabled: bool = True
) -> List[str]:
    """
    Builds the exact FFmpeg arguments list based on filters, transitions, aspect ratio and audio tracks.
    """
    ffmpeg = get_ffmpeg_path()
    output_path.parent.mkdir(parents=True, exist_ok=True)

    # Base inputs
    if is_image:
        cmd = [str(ffmpeg), "-y", "-loop", "1", "-t", f"{duration:.3f}", "-r", "25", "-i", str(video_path)]
    else:
        cmd = [str(ffmpeg), "-y", "-i", str(video_path)]

    # Add audio inputs
    if voice_path:
        cmd.extend(["-i", str(voice_path)])
    if sfx_path:
        cmd.extend(["-i", str(sfx_path)])
    if music_path:
        cmd.extend(["-i", str(music_path)])

    curr_idx = 1
    voice_idx = None
    if voice_path:
        voice_idx = curr_idx
        curr_idx += 1
        
    sfx_idx = None
    if sfx_path:
        sfx_idx = curr_idx
        curr_idx += 1

    music_idx = None
    if music_path:
        music_idx = curr_idx
        curr_idx += 1

    # Append a silent reference audio track matching the exact target clip duration.
    # This ensures that intermediate clips are padded to the correct duration
    # and prevents audio desync during final video concatenation.
    silent_idx = curr_idx
    cmd.extend(["-f", "lavfi", "-t", f"{duration:.3f}", "-i", "anullsrc=r=44100:cl=stereo"])
    curr_idx += 1

    # Audio mixing filter complex (uses duration=longest to prevent truncation)
    audio_out = None
    audio_inputs = []
    filter_parts = []
    
    if video_has_audio:
        filter_parts.append(f"[0:a]volume={video_volume:.2f}[vid_a]")
        audio_inputs.append("[vid_a]")
        
    if voice_idx is not None:
        filter_parts.append(f"[{voice_idx}:a]volume={voice_volume:.2f}[voice_a]")
        audio_inputs.append("[voice_a]")
        
    if sfx_idx is not None:
        filter_parts.append(f"[{sfx_idx}:a]volume={sfx_volume:.2f}[sfx_a]")
        audio_inputs.append("[sfx_a]")
        
    if music_idx is not None:
        filter_parts.append(f"[{music_idx}:a]volume={music_volume:.2f}[music_a]")
        audio_inputs.append("[music_a]")
        
    if len(audio_inputs) > 0:
        # Mix in the silent reference track to ensure output is exactly duration seconds long.
        filter_parts.append(f"[{silent_idx}:a]volume=1.0[silent_a]")
        audio_inputs.append("[silent_a]")
        
        mix_input_labels = "".join(audio_inputs)
        filter_parts.append(f"{mix_input_labels}amix=inputs={len(audio_inputs)}:duration=longest:normalize=0[audio_mix]")
        filter_parts.append("[audio_mix]loudnorm[outnorm]")
            
        cmd.extend([
            "-filter_complex",
            ";".join(filter_parts)
        ])
        audio_out = "[outnorm]"
    else:
        # Use the silent reference track directly
        audio_out = f"{silent_idx}:a"


    # Video filters list
    vf_filters = []
    
    # Aspect Ratio Padding / Scaling
    if fit_mode == "fill_crop":
        vf_filters.append(f"scale=w='max({canvas_w},iw*{canvas_h}/ih)':h='max({canvas_h},ih*{canvas_w}/iw)',crop={canvas_w}:{canvas_h}")
    elif fit_mode == "stretch":
        vf_filters.append(f"scale={canvas_w}:{canvas_h}")
    else: # letterbox or native fallback
        vf_filters.append(f"scale=w='min({canvas_w},iw*{canvas_h}/ih)':h='min({canvas_h},ih*{canvas_w}/iw)',pad=w={canvas_w}:h={canvas_h}:x=({canvas_w}-iw)/2:y=({canvas_h}-ih)/2:color=black")

    # Pad video duration if audio is longer (freeze frame on last frame)
    if not is_image and video_duration > 0 and duration > video_duration:
        pad_dur = duration - video_duration
        vf_filters.append(f"tpad=stop_mode=clone:stop_duration={pad_dur:.3f}")

    # Color Grading Presets
    if color_grading == "cinematic":
        vf_filters.append("eq=contrast=1.15:saturation=1.2:brightness=0.02")
    elif color_grading == "cool_blue":
        vf_filters.append("colorbalance=rs=-0.1:gs=0.0:bs=0.15")
    elif color_grading == "warm_gold":
        vf_filters.append("colorbalance=rs=0.15:gs=0.08:bs=-0.12")
    elif color_grading == "vintage":
        vf_filters.append("colorchannelmixer=rr=0.393:rg=0.769:rb=0.189:gr=0.349:gg=0.686:gb=0.168:br=0.272:bg=0.534:bb=0.131")
    elif color_grading == "high_contrast":
        vf_filters.append("eq=contrast=1.4:saturation=1.3")
    elif color_grading == "cyberpunk":
        vf_filters.append("colorbalance=rs=0.2:gs=-0.1:bs=0.25,eq=contrast=1.2:saturation=1.3")
    elif color_grading == "bleach_bypass":
        vf_filters.append("eq=contrast=1.3:saturation=0.5")

    # Add overlay effect presets
    if overlay_effect == "film_grain":
        vf_filters.append("noise=alls=8:allf=t+u")
    elif overlay_effect == "vhs_glitch":
        vf_filters.append("chromashift=cbh=2:cah=-2:cbv=1:cav=-1,noise=alls=12:allf=t+u,eq=contrast=1.1:saturation=0.9")
    elif overlay_effect == "light_leak":
        vf_filters.append("colorchannelmixer=rr=1.1:rg=0.1:rb=0:gr=0:gg=0.9:gb=0:br=0:bg=0:bb=0.8")
    elif overlay_effect == "vignette":
        vf_filters.append("vignette=PI/4")
    elif overlay_effect == "film_burn":
        vf_filters.append("vignette=PI/5,eq=contrast=1.15:brightness=0.02")
    elif overlay_effect == "dust":
        vf_filters.append("noise=alls=4:allf=t+u")
    elif overlay_effect == "bw_classic":
        vf_filters.append("hue=s=0,eq=contrast=1.2:brightness=-0.05")
    elif overlay_effect == "glitch_digital":
        vf_filters.append("chromashift=cbh=5:cah=-5:cbv=2:cav=-2,eq=contrast=1.3:saturation=0.8")

    font_arg = get_font_file(caption_font_style)

    # Configure placement
    x_expr = "(w-tw)/2"
    if caption_placement == "top":
        y_expr = "100"
    elif caption_placement == "center":
        y_expr = "(h-th)/2"
    else: # bottom
        y_expr = "h-th-80"

    # Configure box vs outline style
    box_style_arg = ""
    if caption_box_enabled:
        box_style_arg = f":box=1:boxcolor={caption_box_color}:boxborderw=8"
    elif caption_outline_width > 0:
        box_style_arg = f":borderw={caption_outline_width}:bordercolor={caption_outline_color}"

    # Add SFX label styled exactly like voice captions
    if sfx_captions_enabled and sfx_label:
        clean_label = re.sub(r'[^a-zA-Z0-9\s]', '', sfx_label).strip().upper()
        words = clean_label.split()[:4]
        if words:
            label_text = f"[{' '.join(words)}]"
            escaped_text = escape_drawtext(label_text)
            
            sfx_y_expr = y_expr
            if caption_placement == "bottom" and word_timings:
                # Check if any voice timing starts before 2.0s
                has_voice_overlap = any(item.get("start", 0.0) < 2.0 for item in word_timings)
                if has_voice_overlap:
                    sfx_y_expr = "h-th-160"
                    
            if escaped_text:
                vf_filters.append(
                    f"drawtext={font_arg}text='{escaped_text}':expansion=none:enable='between(t,0,2.0)':"
                    f"x={x_expr}:y={sfx_y_expr}:fontcolor={caption_font_color}:fontsize={caption_font_size}{box_style_arg}"
                )

    # Add Word/Line captions
    if captions_enabled:
        if caption_mode == "line_by_line" and word_timings:
            line_timings = get_line_timings(word_timings)
            for item in line_timings:
                line_text = item.get("line", "").strip()
                start = item.get("start", 0.0)
                end = item.get("end", 0.0)
                if line_text and end > start:
                    escaped_line = escape_drawtext(line_text)
                    if escaped_line:
                        vf_filters.append(
                            f"drawtext={font_arg}text='{escaped_line}':expansion=none:enable='between(t,{start:.3f},{end:.3f})':"
                            f"x={x_expr}:y={y_expr}:fontcolor={caption_font_color}:fontsize={caption_font_size}{box_style_arg}"
                        )
        elif word_timings:
            for item in word_timings:
                word = item.get("word", "").strip()
                start = item.get("start", 0.0)
                end = item.get("end", 0.0)
                if word and end > start:
                    escaped_word = escape_drawtext(word)
                    if escaped_word:
                        vf_filters.append(
                            f"drawtext={font_arg}text='{escaped_word}':expansion=none:enable='between(t,{start:.3f},{end:.3f})':"
                            f"x={x_expr}:y={y_expr}:fontcolor={caption_font_color}:fontsize={caption_font_size}{box_style_arg}"
                        )

    # Ensure final dimensions are even to prevent libx264 yuv420p errors
    vf_filters.append("scale=trunc(iw/2)*2:trunc(ih/2)*2")

    # Map video stream and video filter
    cmd.extend([
        "-vf", ",".join(vf_filters),
        "-c:v", "libx264",
        "-pix_fmt", "yuv420p"
    ])

    # Map audio stream (forces standardized 44100 Hz layout)
    if audio_out:
        cmd.extend([
            "-map", "0:v",
            "-map", audio_out,
            "-c:a", "aac",
            "-ar", "44100",
            "-ac", "2",
            "-b:a", "192k"
        ])
    else:
        cmd.extend([
            "-map", "0:v",
            "-an"
        ])

    cmd.extend([
        "-t", f"{duration:.3f}",
        str(output_path)
    ])
    
    return cmd

async def render_all(
    manifest: Manifest,
    concat: bool = False,
    on_clip_done: Optional[Callable[[int, int], None]] = None,
    video_volume: float = 1.0,
    voice_volume: float = 1.0,
    sfx_volume: float = 0.5,
    music_volume: float = 0.5
) -> Path:
    """
    Renders all clips. Returns path to master.mp4 (if concat=True) or output_dir.
    """
    output_dir = Path(manifest.output_dir)
    output_dir.mkdir(parents=True, exist_ok=True)
    
    n = len(manifest.video_blocks)
    logger.info(f"Starting render_all for {n} clips...")

    # Clean up any old output files first to avoid stale clips in concat
    master_path = output_dir / "master.mp4"
    if master_path.exists():
        try:
            master_path.unlink()
        except Exception as e:
            logger.warning(f"Could not delete stale master {master_path}: {e}")
            
    for i in range(n):
        v_block, _, _, _ = manifest.get_slot(i)
        if v_block:
            output_path = output_dir / f"clip_{i:02d}_final.mp4"
            if output_path.exists():
                try:
                    output_path.unlink()
                except Exception as e:
                    logger.warning(f"Could not delete stale clip {output_path}: {e}")

    rendered_clips = []
    for i in range(n):
        v_block, sfx_block, vo_block, mu_block = manifest.get_slot(i)
        if not v_block:
            continue

        output_path = output_dir / f"clip_{i:02d}_final.mp4"
        v_path = Path(v_block.file_path)
        
        s_path = None
        if sfx_block and sfx_block.status == BlockStatus.DONE and sfx_block.file_path:
            potential_s_path = Path(sfx_block.file_path)
            if potential_s_path.exists():
                s_path = potential_s_path
            else:
                logger.warning(f"SFX file missing: {potential_s_path}")
            
        vo_path = None
        if vo_block and vo_block.file_path:
            if vo_block.status in (BlockStatus.DONE, BlockStatus.PROVIDED):
                potential_vo_path = Path(vo_block.file_path)
                if potential_vo_path.exists():
                    vo_path = potential_vo_path
                else:
                    logger.warning(f"Voice file missing: {potential_vo_path}")
                    
        mu_path = None
        if mu_block and mu_block.status == BlockStatus.DONE and mu_block.file_path:
            potential_mu_path = Path(mu_block.file_path)
            if potential_mu_path.exists():
                mu_path = potential_mu_path
            else:
                logger.warning(f"Music file missing: {potential_mu_path}")

        is_image = getattr(v_block, 'media_type', 'video') == 'image'
        video_has_audio = False
        
        # Check generated audio durations
        vo_dur = vo_block.duration_s if (vo_block and vo_block.duration_s) else 0.0
        sfx_dur = sfx_block.duration_s if (sfx_block and sfx_block.duration_s) else 0.0
        mu_dur = mu_block.duration_s if (mu_block and mu_block.duration_s) else 0.0
        
        computed_duration = 5.0
        if is_image:
            computed_duration = max(vo_dur, sfx_dur, mu_dur)
            if computed_duration <= 0.0:
                computed_duration = v_block.duration_s if (v_block and v_block.duration_s > 0) else 5.0
        else:
            video_dur = v_block.duration_s if (v_block and v_block.duration_s > 0) else 5.0
            computed_duration = max(video_dur, vo_dur, sfx_dur, mu_dur)


        # Dynamic Lip Sync is decoupled and managed outside of AutoStitch.

        # Check if output video has audio stream
        if not is_image and v_path.exists():
            meta = ffprobe.get_video_metadata(v_path)
            video_has_audio = meta.get("has_audio", False)
            if computed_duration <= 0.0:
                computed_duration = meta.get("duration_s", 5.0)

        # Get Canvas specifications
        canvas_w = getattr(manifest, 'canvas_width', 1920)
        canvas_h = getattr(manifest, 'canvas_height', 1080)
        canvas_fit = getattr(v_block, 'canvas_fit_mode', 'letterbox')
        overlay = getattr(v_block, 'overlay_effect', 'none')
        if overlay == 'none':
            overlay = getattr(manifest, 'global_overlay', 'none')
        
        # Word timings for subtitles
        word_timings = None
        captions_active = getattr(manifest, 'captions_enabled', True)
        if captions_active and vo_block and vo_block.prompt and computed_duration > 0:
            timing_duration = vo_dur if vo_dur > 0 else computed_duration
            word_timings = get_linear_word_timings(vo_block.prompt, timing_duration)
            
        sfx_label = None
        if sfx_block and getattr(sfx_block, 'prompt', None):
            sfx_label = sfx_block.prompt

        cmd = build_ffmpeg_cmd(
            video_path=v_path,
            voice_path=vo_path,
            sfx_path=s_path,
            music_path=mu_path,
            output_path=output_path,
            is_image=is_image,
            duration=computed_duration,
            video_volume=getattr(v_block, 'volume', video_volume),
            voice_volume=getattr(vo_block, 'volume', voice_volume) if vo_block else 1.0,
            sfx_volume=getattr(sfx_block, 'volume', sfx_volume) if sfx_block else 1.0,
            music_volume=getattr(mu_block, 'volume', music_volume) if mu_block else 1.0,
            canvas_w=canvas_w,
            canvas_h=canvas_h,
            fit_mode=canvas_fit,
            overlay_effect=overlay,
            color_grading=getattr(v_block, 'color_grading', 'none') if getattr(v_block, 'color_grading', 'none') != 'none' else getattr(manifest, 'global_color_grading', 'none'),
            captions_enabled=captions_active,
            caption_mode=getattr(manifest, 'caption_mode', 'word_by_word'),
            caption_font_color=getattr(manifest, 'caption_font_color', 'yellow'),
            caption_font_size=getattr(manifest, 'caption_font_size', 40),
            caption_font_style=getattr(manifest, 'caption_font_style', 'arial'),
            caption_placement=getattr(manifest, 'caption_placement', 'bottom'),
            caption_box_enabled=getattr(manifest, 'caption_box_enabled', True),
            caption_box_color=getattr(manifest, 'caption_box_color', 'black@0.5'),
            caption_outline_color=getattr(manifest, 'caption_outline_color', 'black'),
            caption_outline_width=getattr(manifest, 'caption_outline_width', 0),
            word_timings=word_timings,
            sfx_label=sfx_label,
            video_has_audio=video_has_audio,
            video_duration=v_block.duration_s,
            sfx_captions_enabled=getattr(manifest, 'sfx_captions_enabled', True)
        )
        
        logger.info(f"Rendering slot {i}...")
        try:
            await asyncio.get_event_loop().run_in_executor(None, run_ffmpeg, cmd)
            rendered_clips.append((i, output_path))
        except Exception as clip_err:
            logger.error(f"Slot {i} render FAILED — skipping and continuing. Reason: {clip_err}")
            if on_clip_done:
                on_clip_done(i + 1, n)  # still count as processed so progress advances
            continue
        
        if on_clip_done:
            on_clip_done(i + 1, n)

    if concat and len(rendered_clips) > 0:
        logger.info("Concatenating all clips...")
        master_path = await concat_clips(manifest, output_dir, rendered_clips)
        return master_path

    return output_dir

async def concat_clips(manifest: Manifest, output_dir: Path, rendered_clips: List[tuple]) -> Path:
    """
    Concatenates all successfully rendered final clips into master.mp4 using transitions.
    """
    ffmpeg = get_ffmpeg_path()
    num_clips = len(rendered_clips)
    master_path = output_dir / "master.mp4"
    
    if num_clips == 0:
        return master_path
        
    if num_clips == 1:
        single_clip = rendered_clips[0][1]
        if single_clip.exists():
            import shutil
            shutil.copy2(single_clip, master_path)
        return master_path

    durations = []
    transitions = []
    
    for original_i, clip_path in rendered_clips:
        meta = ffprobe.get_video_metadata(clip_path)
        dur_val = meta.get("duration_s", 0.0)
        if dur_val <= 0.0:
            dur_val = 5.0
        durations.append(dur_val)
        
        v_block, _, _, _ = manifest.get_slot(original_i)
        trans = getattr(v_block, 'transition', 'none')
        if trans == 'none':
            trans = getattr(manifest, 'global_transition', 'none')
        transitions.append(trans)

    has_transitions = any(t != 'none' for t in transitions[:-1])

    if not has_transitions:
        concat_file = output_dir / "concat_list.txt"
        with open(concat_file, "w", encoding="utf-8") as f:
            for _, clip_path in rendered_clips:
                f.write(f"file '{clip_path.name}'\n")
        cmd = [
            str(ffmpeg), "-y",
            "-f", "concat",
            "-safe", "0",
            "-i", str(concat_file),
            "-c:v", "libx264",
            "-pix_fmt", "yuv420p",
            "-c:a", "aac",
            "-b:a", "192k",
            str(master_path)
        ]
        await asyncio.get_event_loop().run_in_executor(None, run_ffmpeg, cmd)
        return master_path

    cmd = [str(ffmpeg), "-y"]
    for _, clip_path in rendered_clips:
        cmd.extend(["-i", str(clip_path)])

    filter_complex = []
    last_v = "[0:v]"
    current_offset = durations[0]
    trans_duration = 0.5
    
    for i in range(1, num_clips):
        trans = transitions[i-1]
        xfade_trans = "fade"
        if trans == "slide_left": xfade_trans = "slideleft"
        elif trans == "slide_right": xfade_trans = "slideright"
        elif trans == "zoom_blur": xfade_trans = "zoomblur"
        elif trans == "wipe": xfade_trans = "wipe"
        
        dur_val = trans_duration if trans != "none" else 0.04
        offset = max(0.0, current_offset - dur_val)
        
        out_v = f"[v_tmp{i}]"
        filter_complex.append(f"{last_v}[{i}:v]xfade=transition={xfade_trans}:duration={dur_val:.2f}:offset={offset:.2f}{out_v}")
        last_v = out_v
        current_offset = current_offset + durations[i] - dur_val

    last_a = "[0:a]"
    for i in range(1, num_clips):
        trans = transitions[i-1]
        dur_val = trans_duration if trans != "none" else 0.04
        out_a = f"[a_tmp{i}]"
        filter_complex.append(f"{last_a}[{i}:a]acrossfade=d={dur_val:.2f}{out_a}")
        last_a = out_a

    filter_str = ";".join(filter_complex)
    cmd.extend([
        "-filter_complex", filter_str,
        "-map", last_v,
        "-map", last_a,
        "-c:v", "libx264",
        "-pix_fmt", "yuv420p",
        "-c:a", "aac",
        "-b:a", "192k",
        str(master_path)
    ])
    
    await asyncio.get_event_loop().run_in_executor(None, run_ffmpeg, cmd)
    return master_path

