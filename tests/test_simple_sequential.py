# -*- coding: utf-8 -*-
import sys, io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8', errors='replace')
"""
Simple Sequential Model Test
==============================
Tests one model at a time:
  1. Wake up TTS   -> generate 1 voice clip  -> shut down TTS
  2. Wake up SFX   -> generate 1 sfx clip   -> shut down SFX
  3. Wake up MUSIC -> generate 1 music clip -> shut down MUSIC

All calls go through the main server (port 8080) — exactly as clicking
a UI button would. No direct calls to sub-servers.

Usage:
  venv\\Scripts\\python.exe scratch\\test_simple_sequential.py
"""

import time
import httpx

# ─── Config ──────────────────────────────────────────────────────────────────
MAIN = "http://127.0.0.1:8080"
PROJECT = "SimpleTest"       # test project name — created automatically
TIMEOUT = 180                # max seconds to wait for each step

# ─── Helpers ─────────────────────────────────────────────────────────────────
def sep(label=""):
    print("\n" + "─" * 60)
    if label:
        print(f"  {label}")
        print("─" * 60)

def ok(msg):    print(f"  [OK]   {msg}")
def fail(msg):  print(f"  [FAIL] {msg}")
def info(msg):  print(f"  [..] {msg}")

def get(path, timeout=10):
    return httpx.get(f"{MAIN}{path}", timeout=timeout)

def post(path, body=None, timeout=30):
    return httpx.post(f"{MAIN}{path}", json=body or {}, timeout=timeout)

# ─── Step helpers ─────────────────────────────────────────────────────────────
def check_main_server():
    sep("STEP 0 — Check main server is running")
    try:
        r = get("/api/health", timeout=5)
        if r.status_code == 200:
            ok("Main server is UP on port 8080")
            data = r.json()
            info(f"TTS online : {data.get('tts_server', {}).get('online')}")
            info(f"SFX online : {data.get('sfx_server', {}).get('online')}")
            info(f"FFmpeg ok  : {data.get('ffmpeg', {}).get('ok')}")
            return True
        else:
            fail(f"Main server returned {r.status_code}")
    except Exception as e:
        fail(f"Main server not reachable: {e}")
    return False


def ensure_project():
    sep(f"STEP 1 — Create/load test project '{PROJECT}'")
    r = post("/api/project/load", {"project_name": PROJECT})
    if r.status_code == 200:
        manifest = r.json()
        ok(f"Project loaded. Voice blocks: {len(manifest.get('voice_blocks', []))}, SFX blocks: {len(manifest.get('sfx_blocks', []))}")
        return manifest
    fail(f"Could not load/create project: {r.status_code} {r.text[:200]}")
    return None


def engine_toggle(engine, action):
    """Simulates clicking a UI pill button (start/stop)."""
    info(f"→ UI button click: {action.upper()} {engine.upper()}")
    r = post("/api/engines/toggle", {"engine": engine, "action": action}, timeout=TIMEOUT)
    if r.status_code == 200:
        ok(r.json().get("message", "OK"))
        return True
    fail(f"Toggle failed [{r.status_code}]: {r.text[:300]}")
    return False


def engines_status():
    r = get("/api/engines/status", timeout=5)
    if r.status_code == 200:
        return r.json()
    return {}


def wait_for_online(engine_key, max_wait=60):
    """Poll until the given engine key reports online=True."""
    info(f"Waiting for {engine_key.upper()} to come online (max {max_wait}s)…")
    for i in range(max_wait):
        status = engines_status()
        e = status.get(engine_key, {})
        if e.get("online"):
            ok(f"{engine_key.upper()} is ONLINE after {i+1}s")
            return True
        time.sleep(1)
    fail(f"{engine_key.upper()} did NOT come online within {max_wait}s")
    return False


def add_dummy_blocks_if_needed(manifest):
    """
    The project needs at least 1 voice block and 1 sfx block.
    We scan a dummy folder or inject blocks directly via save.
    Simplest: just save a manifest with 1 dummy block of each type.
    """
    voice_blocks = manifest.get("voice_blocks", [])
    sfx_blocks   = manifest.get("sfx_blocks", [])

    changed = False
    if not voice_blocks:
        manifest["voice_blocks"] = [{
            "id": "vo_00", "order": 0, "text": "", "voice": "alba",
            "status": "idle", "file_path": None, "duration_s": 0.0,
            "prompt": "", "error_msg": None
        }]
        changed = True
    if not sfx_blocks:
        manifest["sfx_blocks"] = [{
            "id": "sfx_00", "order": 0, "prompt": "",
            "status": "idle", "file_path": None, "duration_s": 0.0,
            "model": "small-sfx", "error_msg": None
        }]
        changed = True

    if changed:
        r = post("/api/project/save", manifest, timeout=15)
        if r.status_code == 200:
            ok("Saved manifest with dummy blocks")
        else:
            fail(f"Could not save manifest: {r.status_code} {r.text[:200]}")
    return manifest


def generate_tts(manifest):
    sep("TTS GENERATION TEST — 1 voice clip")
    voice_blocks = manifest.get("voice_blocks", [])
    if not voice_blocks:
        fail("No voice blocks in project — skipping TTS generation")
        return False

    block_id = voice_blocks[0]["id"]
    payload = {
        "project_name": PROJECT,
        "block_id": block_id,
        "text": "Hello from AutoStitch. TTS model test successful.",
        "voice": "alba"
    }
    info(f"Generating TTS for block '{block_id}' with voice 'alba'…")
    r = post("/api/generate/tts", payload, timeout=60)
    if r.status_code == 200:
        ok(f"TTS generation queued. Response: {r.json().get('status')}")
        # Poll for completion
        info("Polling for TTS completion (max 90s)…")
        for i in range(90):
            time.sleep(1)
            pr = post("/api/project/load", {"project_name": PROJECT}, timeout=10)
            if pr.status_code == 200:
                updated = pr.json()
                vb = next((b for b in updated.get("voice_blocks", []) if b["id"] == block_id), None)
                if vb:
                    status = vb.get("status", "idle")
                    if status == "done":
                        ok(f"TTS DONE! File: {vb.get('file_path')}, Duration: {vb.get('duration_s'):.2f}s")
                        return True
                    elif status == "error":
                        fail(f"TTS ERROR: {vb.get('error_msg')}")
                        return False
                    elif i % 10 == 0:
                        info(f"  …still {status} ({i+1}s elapsed)")
        fail("TTS did not complete within 90s")
    else:
        fail(f"TTS generate request failed [{r.status_code}]: {r.text[:300]}")
    return False


def generate_sfx(manifest):
    sep("SFX GENERATION TEST — 1 sound effect clip")
    sfx_blocks = manifest.get("sfx_blocks", [])
    if not sfx_blocks:
        fail("No SFX blocks in project — skipping SFX generation")
        return False

    block_id = sfx_blocks[0]["id"]
    payload = {
        "project_name": PROJECT,
        "block_id": block_id,
        "prompt": "gentle rain on window, ambient, soft",
        "model": "small-sfx",
        "duration": 5.0,
        "steps": 8,
        "seed": 42
    }
    info(f"Generating SFX for block '{block_id}'...")
    r = post("/api/generate/sfx", payload, timeout=60)
    if r.status_code == 200:
        ok(f"SFX generation queued. Response: {r.json().get('status')}")
        info("Polling for SFX completion (max 120s)...")
        for i in range(120):
            time.sleep(1)
            pr = post("/api/project/load", {"project_name": PROJECT}, timeout=10)
            if pr.status_code == 200:
                updated = pr.json()
                sb = next((b for b in updated.get("sfx_blocks", []) if b["id"] == block_id), None)
                if sb:
                    status = sb.get("status", "idle")
                    if status == "done":
                        ok(f"SFX DONE! File: {sb.get('file_path')}, Duration: {sb.get('duration_s'):.2f}s")
                        return True
                    elif status == "error":
                        fail(f"SFX ERROR: {sb.get('error_msg')}")
                        return False
                    elif i % 10 == 0:
                        info(f"  ...still {status} ({i+1}s elapsed)")
        fail("SFX did not complete within 120s")
    else:
        fail(f"SFX generate request failed [{r.status_code}]: {r.text[:300]}")
    return False


def generate_music(manifest):
    sep("MUSIC GENERATION TEST — 1 music clip")
    # MUSIC reuses the same sfx_blocks lane — just switches model to small-music
    sfx_blocks = manifest.get("sfx_blocks", [])
    if not sfx_blocks:
        fail("No SFX/MUSIC blocks in project — skipping MUSIC generation")
        return False

    block_id = sfx_blocks[0]["id"]
    payload = {
        "project_name": PROJECT,
        "block_id": block_id,
        "prompt": "uplifting cinematic background music, orchestral, inspiring",
        "model": "small-music",     # <-- key difference from SFX
        "duration": 10.0,
        "steps": 8,
        "seed": 99
    }
    info(f"Generating MUSIC for block '{block_id}' (model=small-music, 10s)...")
    r = post("/api/generate/sfx", payload, timeout=60)  # same endpoint, different model
    if r.status_code == 200:
        ok(f"MUSIC generation queued. Response: {r.json().get('status')}")
        info("Polling for MUSIC completion (max 180s)...")
        for i in range(180):
            time.sleep(1)
            pr = post("/api/project/load", {"project_name": PROJECT}, timeout=10)
            if pr.status_code == 200:
                updated = pr.json()
                sb = next((b for b in updated.get("sfx_blocks", []) if b["id"] == block_id), None)
                if sb:
                    status = sb.get("status", "idle")
                    if status == "done":
                        ok(f"MUSIC DONE! File: {sb.get('file_path')}, Duration: {sb.get('duration_s'):.2f}s")
                        return True
                    elif status == "error":
                        fail(f"MUSIC ERROR: {sb.get('error_msg')}")
                        return False
                    elif i % 10 == 0:
                        info(f"  ...still {status} ({i+1}s elapsed)")
        fail("MUSIC did not complete within 180s")
    else:
        fail(f"MUSIC generate request failed [{r.status_code}]: {r.text[:300]}")
    return False


# ─── Main Test Runner ─────────────────────────────────────────────────────────
def run():
    print()
    print("==========================================================")
    print("  AutoStitch - Simple Sequential Model Test")
    print("  One model at a time: Load -> Test -> Shut down")
    print("==========================================================")

    results = {}

    # ── Pre-flight ────────────────────────────────────────────────
    if not check_main_server():
        print("\n⛔  Main server (port 8080) is not running.")
        print("    Start it first:  venv\\Scripts\\python.exe main.py")
        return

    manifest = ensure_project()
    if not manifest:
        return

    manifest = add_dummy_blocks_if_needed(manifest)

    # ════════════════════════════════════════════════════════════
    # PHASE 1 — TTS
    # ════════════════════════════════════════════════════════════
    sep("PHASE 1 — TTS (PocketTTS)")

    # Make sure SFX is off first
    sfx_status = engines_status().get("sfx", {})
    if sfx_status.get("running") or sfx_status.get("online"):
        info("SFX/Stable Audio is running — shutting down first to free RAM…")
        engine_toggle("stable_audio", "stop")
        time.sleep(2)

    info("Starting TTS engine (simulating UI 'Wake Up' button click)…")
    engine_toggle("tts", "start")
    tts_ok = wait_for_online("tts", max_wait=60)

    if tts_ok:
        results["tts_load"] = "✅ PASS"
        results["tts_generate"] = "✅ PASS" if generate_tts(manifest) else "❌ FAIL"
    else:
        results["tts_load"] = "❌ FAIL"
        results["tts_generate"] = "⏭  SKIP"

    sep("Shutting down TTS before loading SFX…")
    info("Simulating UI 'Shut Down' button click for TTS…")
    engine_toggle("tts", "stop")
    time.sleep(3)
    tts_after = engines_status().get("tts", {})
    if not tts_after.get("online"):
        ok("TTS is now OFFLINE — RAM freed")
        results["tts_shutdown"] = "✅ PASS"
    else:
        fail("TTS still appears online after stop")
        results["tts_shutdown"] = "❌ FAIL"

    # ════════════════════════════════════════════════════════════
    # PHASE 2 — SFX (Stable Audio)
    # ════════════════════════════════════════════════════════════
    sep("PHASE 2 — SFX (Stable Audio)")
    info("Starting SFX engine (simulating UI 'Wake Up' button click)…")
    info("⚠  This may take 2-5 min on first run (downloading model weights).")
    sfx_start_ok = engine_toggle("sfx", "start")

    if sfx_start_ok:
        sfx_ok = wait_for_online("sfx", max_wait=300)
        if sfx_ok:
            results["sfx_load"] = "✅ PASS"
            # Re-load manifest to get latest block states
            mr = post("/api/project/load", {"project_name": PROJECT}, timeout=10)
            if mr.status_code == 200:
                manifest = mr.json()
            results["sfx_generate"] = "✅ PASS" if generate_sfx(manifest) else "❌ FAIL"
        else:
            results["sfx_load"] = "❌ FAIL"
            results["sfx_generate"] = "⏭  SKIP"
    else:
        results["sfx_load"] = "❌ FAIL"
        results["sfx_generate"] = "⏭  SKIP"

    sep("Shutting down SFX before loading MUSIC...")
    info("Simulating UI 'Shut Down' button click for SFX...")
    engine_toggle("sfx", "stop")
    time.sleep(2)
    sfx_after = engines_status().get("sfx", {})
    if not sfx_after.get("online"):
        ok("SFX is now OFFLINE — RAM freed for MUSIC")
        results["sfx_shutdown"] = "✅ PASS"
    else:
        fail("SFX still appears online after stop")
        results["sfx_shutdown"] = "❌ FAIL"

    # ════════════════════════════════════════════════════════════
    # PHASE 3 — MUSIC (Stable Audio — small-music weights)
    # ════════════════════════════════════════════════════════════
    sep("PHASE 3 — MUSIC (Stable Audio small-music)")
    info("Starting MUSIC engine (simulating UI 'Wake Up' button click)...")
    info("NOTE: Swaps small-sfx weights for small-music weights on same server.")
    music_start_ok = engine_toggle("music", "start")

    if music_start_ok:
        music_ok = wait_for_online("music", max_wait=300)
        if music_ok:
            results["music_load"] = "✅ PASS"
            # Re-load manifest for fresh block states
            mr = post("/api/project/load", {"project_name": PROJECT}, timeout=10)
            if mr.status_code == 200:
                manifest = mr.json()
            results["music_generate"] = "✅ PASS" if generate_music(manifest) else "❌ FAIL"
        else:
            results["music_load"] = "❌ FAIL"
            results["music_generate"] = "⏭  SKIP"
    else:
        results["music_load"] = "❌ FAIL"
        results["music_generate"] = "⏭  SKIP"

    sep("Shutting down MUSIC...")
    info("Simulating UI 'Shut Down' button click for MUSIC...")
    engine_toggle("music", "stop")
    time.sleep(2)
    music_after = engines_status().get("music", {})
    if not music_after.get("online"):
        ok("MUSIC is now OFFLINE")
        results["music_shutdown"] = "✅ PASS"
    else:
        fail("MUSIC still appears online after stop")
        results["music_shutdown"] = "❌ FAIL"

    # ════════════════════════════════════════════════════════════
    # RESULTS SUMMARY
    # ════════════════════════════════════════════════════════════
    sep("RESULTS SUMMARY")
    labels = {
        "tts_load":      "TTS   load (wake up)",
        "tts_generate":  "TTS   generate (1 voice clip)",
        "tts_shutdown":  "TTS   shut down",
        "sfx_load":      "SFX   load (wake up)",
        "sfx_generate":  "SFX   generate (1 sfx clip)",
        "sfx_shutdown":  "SFX   shut down",
        "music_load":    "MUSIC load (wake up)",
        "music_generate":"MUSIC generate (1 music clip)",
        "music_shutdown":"MUSIC shut down",
    }
    all_pass = True
    for key, label in labels.items():
        result = results.get(key, "⏭  SKIP")
        print(f"  {result}  {label}")
        if "FAIL" in result:
            all_pass = False

    print()
    if all_pass:
        print("  *** ALL TESTS PASSED - model swapping works correctly! ***")
    else:
        print("  [!] Some tests FAILED. Check logs above for details.")
    print()


if __name__ == "__main__":
    run()
