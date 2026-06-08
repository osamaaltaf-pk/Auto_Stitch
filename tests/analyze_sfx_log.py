from pathlib import Path
import sys

sys.stdout.reconfigure(encoding='utf-8')

log_path = Path("C:/Users/Microsoft/.gemini/antigravity-ide/brain/1a63cbbe-9a38-44ee-b7d1-18285a46fce3/.system_generated/tasks/task-2015.log")

with open(log_path, "r", encoding="utf-8", errors="replace") as f:
    lines = f.readlines()

sfx_lines = []
for idx, line in enumerate(lines):
    if "sfx" in line.lower() or "stable_audio" in line.lower():
        sfx_lines.append((idx + 1, line.strip()))

print(f"Found {len(sfx_lines)} lines containing sfx/stable_audio:")
for lno, text in sfx_lines[-50:]:
    safe_text = text.encode('ascii', errors='replace').decode('ascii')
    print(f"Line {lno}: {safe_text}")
