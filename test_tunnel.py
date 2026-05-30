import httpx
import json
import sys

def test_endpoints():
    print("====================================================")
    print(" RUNNING DIAGNOSTIC TUNNEL AND TTS TESTS")
    print("====================================================")
    
    headers = {
        "bypass-tunnel-reminder": "true",
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
    }

    # 1. Test Local TTS Server Health
    print("\n--- 1. Testing Local TTS Health (http://127.0.0.1:8000) ---")
    try:
        r = httpx.get("http://127.0.0.1:8000/api/health", timeout=5.0)
        print(f"Local TTS Status Code: {r.status_code}")
        print(f"Local TTS Content: {r.text}")
    except Exception as e:
        print(f"Local TTS Health check failed: {e}")

    # 2. Test Local Tunnel Health
    tunnel_url = "https://tiny-fans-drum.loca.lt"
    print(f"\n--- 2. Testing Remote LocalTunnel Health ({tunnel_url}) ---")
    try:
        r = httpx.get(f"{tunnel_url}/api/health", headers=headers, timeout=10.0)
        print(f"Tunnel Health Status Code: {r.status_code}")
        print(f"Tunnel Health Content: {r.text[:300]}")
    except Exception as e:
        print(f"Tunnel Health check failed: {e}")

    # 3. Test Manual TTS Request
    print("\n--- 3. Testing Manual TTS Generation on Local Port 8000 ---")
    tts_payload = {
        "text": "Hello, this is a manual test of the local narration synthesis.",
        "voice": "alba",
        "format": "wav"
    }
    try:
        r = httpx.post("http://127.0.0.1:8000/api/generate", json=tts_payload, timeout=20.0)
        print(f"Local TTS Gen Status: {r.status_code}")
        if r.status_code == 200:
            print("Local TTS Gen: SUCCESS! Received audio bytes.")
        else:
            print(f"Local TTS Gen Error Content: {r.text[:300]}")
    except Exception as e:
        print(f"Local TTS Gen failed: {e}")

    # 4. Test Manual SFX Trigger on LocalTunnel
    print("\n--- 4. Testing Manual SFX Generation on LocalTunnel URL ---")
    sfx_payload = {
        "prompt": "punch in the mirror",
        "model": "small-sfx",
        "duration": 5.0,
        "steps": 8,
        "seed": -1
    }
    try:
        url = f"{tunnel_url}/api/generate"
        print(f"POSTing SFX request to: {url}")
        r = httpx.post(url, json=sfx_payload, headers=headers, timeout=20.0)
        print(f"Tunnel SFX Gen Status: {r.status_code}")
        print(f"Tunnel SFX Response text: {r.text[:300]}")
    except Exception as e:
        print(f"Tunnel SFX Gen failed: {e}")

if __name__ == "__main__":
    test_endpoints()
