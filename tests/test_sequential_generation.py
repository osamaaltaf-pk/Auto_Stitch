import time
import httpx
import os

MAIN_SERVER_URL = "http://127.0.0.1:8080"
PROJECT_NAME = "TestProject"

def get_status():
    try:
        resp = httpx.get(f"{MAIN_SERVER_URL}/api/engines/status")
        if resp.status_code == 200:
            return resp.json()
    except Exception as e:
        print(f"Error fetching status: {e}")
    return None

def toggle_engine(engine, action):
    try:
        print(f"[TOGGLE] Sending request: engine={engine}, action={action}...")
        resp = httpx.post(
            f"{MAIN_SERVER_URL}/api/engines/toggle",
            json={"engine": engine, "action": action},
            timeout=130.0
        )
        print(f"[RESPONSE] {resp.status_code} | {resp.text}")
        return resp.status_code == 200
    except Exception as e:
        print(f"Error toggling engine: {e}")
    return False

def init_project():
    print(f"\n[INIT] Loading project '{PROJECT_NAME}'...")
    httpx.post(f"{MAIN_SERVER_URL}/api/project/load", json={"project_name": PROJECT_NAME})
    
    # Save a manifest with a voice block and an SFX block
    manifest = {
        "project_name": PROJECT_NAME,
        "project_dir": f"projects/{PROJECT_NAME}",
        "video_blocks": [
            {"id": "v_00", "file_path": "", "filename": "Blank_Clip.mp4", "duration_s": 5.0, "order": 0}
        ],
        "sfx_blocks": [
            {"id": "sfx_00", "prompt": "", "order": 0, "status": "idle", "file_path": None}
        ],
        "voice_blocks": [
            {"id": "vo_00", "prompt": "", "order": 0, "status": "idle", "file_path": None, "voice": "alba"}
        ]
    }
    print("[INIT] Saving test manifest...")
    resp = httpx.post(f"{MAIN_SERVER_URL}/api/project/save", json=manifest)
    print(f"[RESPONSE] Save Manifest: {resp.status_code}")

def wait_for_block_status(lane, block_id, expected_statuses, timeout_s=90):
    start_time = time.time()
    while time.time() - start_time < timeout_s:
        time.sleep(2)
        try:
            resp = httpx.post(f"{MAIN_SERVER_URL}/api/project/load", json={"project_name": PROJECT_NAME})
            if resp.status_code == 200:
                manifest = resp.json()
                blocks = manifest.get(f"{lane}_blocks", [])
                block = next((b for b in blocks if b["id"] == block_id), None)
                if block:
                    status = block.get("status")
                    print(f"  -> Block {block_id} status: {status}")
                    if status in expected_statuses:
                        return block
                    if status == "error":
                        print(f"  [ERROR] Block generation failed: {block.get('error_msg')}")
                        return block
        except Exception as e:
            print(f"  Error polling project: {e}")
    return None

def run_sequential_test():
    print("==========================================================")
    print("  AutoStitch Studio: Sequential Swapping & Generation Test")
    print("==========================================================")
    
    # Initialize project and manifest structure
    init_project()
    
    # Step 1: Start TTS
    print("\n[STEP 1] Starting TTS server...")
    toggle_engine("tts", "start")
    time.sleep(3)
    
    # Verify TTS is online
    status = get_status()
    print(f"Status: {status}")
    if not status.get("tts", {}).get("online"):
        print("[ERROR] TTS failed to report online. Exiting test.")
        return
        
    # Step 2: Generate TTS voice clip
    print("\n[STEP 2] Requesting TTS generation for block 'vo_00'...")
    resp = httpx.post(
        f"{MAIN_SERVER_URL}/api/generate/tts",
        json={"project_name": PROJECT_NAME, "block_id": "vo_00", "text": "This is a local text to speech voice test.", "voice": "alba"},
        timeout=10.0
    )
    print(f"[RESPONSE] TTS Trigger: {resp.status_code}")
    
    print("Polling voice block status...")
    block = wait_for_block_status("voice", "vo_00", ["provided", "done"])
    if block and block.get("status") in ("provided", "done"):
        path = block.get("file_path")
        if path and os.path.exists(path):
            print(f"[SUCCESS] TTS voiceover file generated at: {path} (Size: {os.path.getsize(path)} bytes)")
        else:
            print(f"[ERROR] Voiceover file path missing or does not exist: {path}")
    else:
        print("[ERROR] TTS generation failed.")
        
    # Step 3: Stop TTS
    print("\n[STEP 3] Shutting down TTS server to free RAM...")
    toggle_engine("tts", "stop")
    time.sleep(3)
    print(f"Status: {get_status()}")
    
    # Step 4: Start SFX (Stable Audio local CPU)
    print("\n[STEP 4] Starting Stable Audio SFX model locally...")
    toggle_engine("sfx", "start")
    
    # Wait for SFX model to report online
    print("Waiting for local Stable Audio server and model to report online...")
    sfx_online = False
    for i in range(12):
        time.sleep(5)
        status = get_status()
        print(f"  Status check {i+1}: {status}")
        if status.get("sfx", {}).get("online"):
            sfx_online = True
            break
            
    if not sfx_online:
        print("[ERROR] Stable Audio SFX model failed to report online. Exiting test.")
        return
        
    # Step 5: Generate SFX audio clip
    print("\n[STEP 5] Requesting SFX generation for block 'sfx_00'...")
    resp = httpx.post(
        f"{MAIN_SERVER_URL}/api/generate/sfx",
        json={"project_name": PROJECT_NAME, "block_id": "sfx_00", "prompt": "a dog barking loud", "duration": 5.0},
        timeout=10.0
    )
    print(f"[RESPONSE] SFX Trigger: {resp.status_code}")
    
    print("Polling SFX block status (Stable Audio CPU inference takes ~20-60s)...")
    block = wait_for_block_status("sfx", "sfx_00", ["done"], timeout_s=120)
    if block and block.get("status") == "done":
        path = block.get("file_path")
        if path and os.path.exists(path):
            print(f"[SUCCESS] SFX sound file generated at: {path} (Size: {os.path.getsize(path)} bytes)")
        else:
            print(f"[ERROR] SFX sound file path missing or does not exist: {path}")
    else:
        print("[ERROR] SFX generation failed.")
        
    # Step 6: Shutdown SFX
    print("\n[STEP 6] Shutting down Stable Audio SFX model...")
    toggle_engine("sfx", "stop")
    time.sleep(3)
    
    # Restore TTS state
    print("\n[STEP 7] Restoring original TTS server state...")
    toggle_engine("tts", "start")
    time.sleep(3)
    print(f"Final Status: {get_status()}")
    print("==========================================================")
    print("  Test Execution Complete!")
    print("==========================================================")

if __name__ == "__main__":
    run_sequential_test()
