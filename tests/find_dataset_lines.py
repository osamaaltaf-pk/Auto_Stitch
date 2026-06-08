with open("lip_sync_standalone/app.py", "r", encoding="utf-8") as f:
    for idx, line in enumerate(f):
        if "/api/dataset/" in line or "save_dataset" in line or "load_dataset" in line:
            print(f"Line {idx+1}: {line.strip()}")
