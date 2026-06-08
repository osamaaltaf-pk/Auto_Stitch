from pathlib import Path
import sys

sys.stdout.reconfigure(encoding='utf-8')

log_path = Path("C:/Users/Microsoft/.gemini/antigravity-ide/brain/1a63cbbe-9a38-44ee-b7d1-18285a46fce3/.system_generated/tasks/task-1965.log")

with open(log_path, "r", encoding="utf-8", errors="replace") as f:
    lines = f.readlines()

# Print lines 1030 to 1125 (1-indexed, so 1029 to 1124)
for idx in range(1029, 1125):
    if idx < len(lines):
        line_text = lines[idx].strip().encode('ascii', errors='replace').decode('ascii')
        print(f"{idx + 1}: {line_text}")
