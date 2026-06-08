with open("lip_sync_standalone/app.py", "r", encoding="utf-8") as f:
    for idx, line in enumerate(f):
        if "async def run_rhubarb_async" in line:
            print(f"Line {idx+1}: {line.strip()}")
