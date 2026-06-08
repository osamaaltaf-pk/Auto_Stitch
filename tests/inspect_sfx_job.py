from pathlib import Path
import sys

sys.stdout.reconfigure(encoding='utf-8')

log_path = Path("C:/Users/Microsoft/.gemini/antigravity-ide/brain/1a63cbbe-9a38-44ee-b7d1-18285a46fce3/.system_generated/tasks/task-2015.log")

with open(log_path, "r", encoding="utf-8", errors="replace") as f:
    lines = f.readlines()

job_lines = []
for idx, line in enumerate(lines):
    if "cc2157ac" in line or "slot 18" in line.lower() or "slot 19" in line.lower() or "sfx_18" in line.lower():
        job_lines.append((idx + 1, line.strip()))

print(f"Found {len(job_lines)} lines:")
for lno, text in job_lines:
    safe_text = text.encode('ascii', errors='replace').decode('ascii')
    print(f"Line {lno}: {safe_text}")
