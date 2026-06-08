import httpx
import json

try:
    resp = httpx.get("http://127.0.0.1:5000/api/jobs", timeout=5.0)
    print("Status code:", resp.status_code)
    if resp.status_code == 200:
        jobs = resp.json()
        print(f"Recent {len(jobs)} jobs:")
        print(json.dumps(jobs, indent=2))
    else:
        print("Response text:", resp.text)
except Exception as e:
    print("Failed to query SFX server:", e)
