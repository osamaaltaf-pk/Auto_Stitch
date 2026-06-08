from pathlib import Path
import sys

# Set stdout to use utf-8
sys.stdout.reconfigure(encoding='utf-8')

log_path = Path("C:/Users/Microsoft/.gemini/antigravity-ide/brain/1a63cbbe-9a38-44ee-b7d1-18285a46fce3/.system_generated/tasks/task-1965.log")

if not log_path.exists():
    print(f"Log path does not exist: {log_path}")
    exit(1)

print("Analyzing log file for errors...")
with open(log_path, "r", encoding="utf-8", errors="replace") as f:
    lines = f.readlines()

failures = []
for idx, line in enumerate(lines):
    if "[ERROR]" in line or "FAILED" in line or "failed" in line:
        failures.append((idx + 1, line.strip()))

print(f"Found {len(failures)} occurrences of failed/ERROR:")
for lno, text in failures:
    # Safely print only ascii or clean characters
    safe_text = text.encode('ascii', errors='replace').decode('ascii')
    print(f"Line {lno}: {safe_text}")
