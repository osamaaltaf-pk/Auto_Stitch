import sys
import os
import json
import urllib.request
import urllib.error
import subprocess
import hashlib
import datetime

# Cryptographic salt for secure local token validation
SECURE_SALT = "OMNI_STITCH_SECURE_SALT_2026"
DEVELOPER_BYPASS_KEY = "Osama@1232£-80£viu%*ajoy/(592@!(/@0862hkhakowpnbtaownyekn69vhwilwn"

def get_motherboard_uuid():
    """Extracts the unique Motherboard UUID using Windows WMI command."""
    try:
        cmd = "wmic csproduct get uuid"
        output = subprocess.check_output(cmd, shell=True).decode().split("\n")
        # Find the line that actually contains the UUID (not headers or empty lines)
        for line in output:
            line = line.strip()
            if line and "UUID" not in line:
                return line
    except Exception as e:
        print(f"[Warning] Failed to read motherboard UUID: {e}")
    
    # Secure fallback: Use network MAC address
    try:
        import uuid
        return str(uuid.getnode())
    except Exception:
        return "HARDWARE-STATIC-UUID-FALLBACK"

def generate_local_signature(key, gmail, machine_id, expiry):
    """Generates a secure cryptographic signature to prevent manual tampering of license.json."""
    raw = f"{key}||{gmail}||{machine_id}||{expiry}||{SECURE_SALT}"
    return hashlib.sha256(raw.encode()).hexdigest()

def activate_license(key, gmail, password, server_url):
    """Sends hardware fingerprint and credentials to Vercel/Supabase to activate license."""
    machine_id = get_motherboard_uuid()
    print(f"\n[Info] Machine Hardware ID: {machine_id}")

    # Developer Bypass Key logic
    if key == DEVELOPER_BYPASS_KEY:
        print("[Auth] Master Developer Bypass Key detected. Unlocking locally...")
        far_future = (datetime.datetime.now() + datetime.timedelta(days=365 * 50)).isoformat() + "Z"
        signature = generate_local_signature(key, gmail.lower().strip(), machine_id, far_future)
        
        token_data = {
            "license_key": key,
            "gmail": gmail.lower().strip(),
            "machine_id": machine_id,
            "expiry_date": far_future,
            "last_online_check": datetime.datetime.now().isoformat() + "Z",
            "signature": signature
        }
        with open("license.json", "w", encoding="utf-8") as f:
            json.dump(token_data, f, indent=2)
        print("[SUCCESS] Developer local activation completed! All systems unlocked.")
        return True

    payload = {
        "license_key": key,
        "gmail": gmail.lower().strip(),
        "password": password,
        "machine_id": machine_id
    }

    url = f"{server_url.rstrip('/')}/api/activate"
    print(f"[Info] Handshaking with secure activation server...")

    try:
        req = urllib.request.Request(url, data=json.dumps(payload).encode(), headers={'Content-Type': 'application/json'})
        with urllib.request.urlopen(req, timeout=15) as response:
            res = json.loads(response.read().decode())
            
            if res.get("status") == "success":
                expiry = res.get("expiry_date")
                signature = generate_local_signature(key, gmail.lower().strip(), machine_id, expiry)
                
                token_data = {
                    "license_key": key,
                    "gmail": gmail.lower().strip(),
                    "machine_id": machine_id,
                    "expiry_date": expiry,
                    "last_online_check": datetime.datetime.now().isoformat() + "Z",
                    "signature": signature
                }
                
                # Save securely to license.json
                with open("license.json", "w", encoding="utf-8") as f:
                    json.dump(token_data, f, indent=2)
                
                print(f"[SUCCESS] Activation complete! Account: {gmail}")
                print(f"[SUCCESS] Monthly Expiration Date: {expiry}")
                return True
            else:
                print(f"[ERROR] Activation rejected: {res.get('message', 'Unknown response error')}")
                return False
                
    except urllib.error.HTTPError as e:
        try:
            err_res = json.loads(e.read().decode())
            print(f"[ERROR] Activation rejected: {err_res.get('message', 'Server rejected request')}")
        except Exception:
            print(f"[ERROR] Connection failed: HTTP {e.code} - {e.reason}")
        return False
    except Exception as e:
        print(f"[ERROR] Server communication failure: {e}")
        print("[Tip] Check your internet connection and verify the server URL is correctly deployed on Vercel.")
        return False

def main():
    print("====================================================")
    print("  AutoStitch Studio — Product Activation Center")
    print("====================================================")

    # Load license server URL from settings.json if exists
    server_url = "https://omni-automator.vercel.app" # Default placeholder
    if os.path.exists("settings.json"):
        try:
            with open("settings.json", "r", encoding="utf-8") as f:
                settings = json.load(f)
                server_url = settings.get("license_server_url", server_url)
        except Exception:
            pass

    # Prompt user for credentials
    key = input("Enter License Key: ").strip()
    gmail = input("Enter Gmail Address: ").strip()
    password = input("Enter Password: ").strip()

    if not key or not gmail or not password:
        print("[ERROR] Credentials cannot be blank! Activation aborted.")
        sys.exit(1)

    success = activate_license(key, gmail, password, server_url)
    if success:
        sys.exit(0)
    else:
        sys.exit(1)

if __name__ == "__main__":
    main()
