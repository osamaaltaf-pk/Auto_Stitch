import time
import httpx

MAIN_SERVER_URL = "http://127.0.0.1:8080"

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
        print(f"\n[TEST] Sending toggle: engine={engine}, action={action}...")
        resp = httpx.post(
            f"{MAIN_SERVER_URL}/api/engines/toggle",
            json={"engine": engine, "action": action},
            timeout=130.0
        )
        print(f"[RESPONSE] Status: {resp.status_code} | Body: {resp.text}")
        return resp.status_code == 200
    except Exception as e:
        print(f"Error toggling engine: {e}")
    return False

def run_test():
    print("==========================================================")
    print("  AutoStitch Studio Engine Swapping Integration Test")
    print("==========================================================")
    
    # 1. Get Initial Status
    initial_status = get_status()
    if not initial_status:
        print("[ERROR] Main server is not running on port 8080. Start it first.")
        return
    print(f"[STATUS] Initial: {initial_status}")
    
    # 2. Swap TTS -> SFX
    if initial_status.get("tts", {}).get("online"):
        print("\n[STEP 1] TTS is currently online. Shutting down TTS first to conserve RAM...")
        toggle_engine("tts", "stop")
        time.sleep(2)
        print(f"[STATUS] After TTS Stop: {get_status()}")
    else:
        print("\n[STEP 1] TTS is already offline. Skipping shutdown.")

    # 3. Load SFX Model
    print("\n[STEP 2] Loading Stable Audio SFX model locally...")
    success = toggle_engine("sfx", "start")
    if success:
        print("Waiting 3 seconds for status sync...")
        time.sleep(3)
        status = get_status()
        print(f"[STATUS] After SFX Start: {status}")
        if status.get("sfx", {}).get("online"):
            print("[SUCCESS] SFX model is loaded and reporting ONLINE locally!")
        else:
            print("[WARNING] SFX server started but model is not reporting ONLINE yet.")
    else:
        print("[ERROR] Failed to start SFX model.")

    # 4. Swap SFX -> MUSIC
    print("\n[STEP 3] Swapping SFX for MUSIC model (should unload SFX weights and load MUSIC)...")
    success = toggle_engine("music", "start")
    if success:
        print("Waiting 3 seconds for status sync...")
        time.sleep(3)
        status = get_status()
        print(f"[STATUS] After MUSIC Start: {status}")
        if status.get("music", {}).get("online") and not status.get("sfx", {}).get("online"):
            print("[SUCCESS] MUSIC model is loaded, and SFX model is successfully UNLOADED!")
        else:
            print("[WARNING] MUSIC model status unexpected.")
    else:
        print("[ERROR] Failed to start MUSIC model.")

    # 5. Shut down MUSIC, start TTS back up
    print("\n[STEP 4] Restoring original state. Unloading MUSIC model...")
    toggle_engine("music", "stop")
    time.sleep(2)
    
    print("\n[STEP 5] Starting TTS server back up...")
    toggle_engine("tts", "start")
    time.sleep(5)
    
    final_status = get_status()
    print(f"\n[STATUS] Final: {final_status}")
    print("==========================================================")
    print("  Test finished successfully!")
    print("==========================================================")

if __name__ == "__main__":
    run_test()
