with open("lip_sync_standalone/app.py", "r", encoding="utf-8") as f:
    for idx, line in enumerate(f):
        if "middleware" in line or "request" in line and "call_next" in line:
            print(f"Line {idx+1}: {line.strip()}")
