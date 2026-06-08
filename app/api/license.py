import json
import logging
import datetime
import hashlib
import httpx
from fastapi import APIRouter, HTTPException
from app.core.config import BASE_DIR, load_settings, SECURE_SALT, DEVELOPER_BYPASS_KEY
from app.models.schemas import LicenseActivateRequest

logger = logging.getLogger("autostitch.api.license")

router = APIRouter(prefix="/api/license", tags=["license"])

def generate_local_signature(key: str, gmail: str, machine_id: str, expiry: str) -> str:
    """Generates a secure cryptographic signature to prevent tampering of license.json."""
    raw = f"{key}||{gmail}||{machine_id}||{expiry}||{SECURE_SALT}"
    return hashlib.sha256(raw.encode()).hexdigest()

async def check_license_validity() -> tuple[bool, str]:
    """Offline and online license checker with 12-hour grace period enforcement."""
    license_path = BASE_DIR / "license.json"
    if not license_path.exists():
        return False, "Activation credentials missing! Run setup_all.bat to activate."

    try:
        with open(license_path, "r", encoding="utf-8") as f:
            data = json.load(f)
    except Exception:
        return False, "Corrupted license configuration."

    key = data.get("license_key", "")
    gmail = data.get("gmail", "")
    machine_id = data.get("machine_id", "")
    expiry = data.get("expiry_date", "")
    last_check_str = data.get("last_online_check", "")
    sig = data.get("signature", "")

    # 1. Developer Bypass Key
    if key == DEVELOPER_BYPASS_KEY:
        return True, "Lifetime Developer Bypass Unlocked"

    # 2. Check local signature integrity
    computed_sig = generate_local_signature(key, gmail, machine_id, expiry)
    if computed_sig != sig:
        return False, "Tampered license key detected!"

    # 3. Check expiration date locally
    try:
        # Strip trailing Z if exists for fromisoformat compatibility in older python
        expiry_clean = expiry.rstrip("Z")
        expiry_dt = datetime.datetime.fromisoformat(expiry_clean)
    except Exception as e:
        return False, f"Invalid expiry timestamp format: {e}"

    now = datetime.datetime.now()
    if now > expiry_dt:
        return False, f"Your license expired on {expiry_dt.date().isoformat()}."

    # 4. Attempt online real-time verification with Vercel server
    settings = load_settings()
    server_url = settings.get("license_server_url", "https://omni-automator.vercel.app").rstrip("/")
    url = f"{server_url}/api/verify"

    try:
        async with httpx.AsyncClient(trust_env=False) as client:
            resp = await client.post(
                url,
                json={"license_key": key, "machine_id": machine_id},
                headers={"Content-Type": "application/json"},
                timeout=3.0
            )
            if resp.status_code == 200:
                res_data = resp.json()
                if res_data.get("status") == "success":
                    # Update last online check timestamp and write back
                    data["last_online_check"] = datetime.datetime.now().isoformat() + "Z"
                    data["signature"] = generate_local_signature(key, gmail, machine_id, expiry)
                    with open(license_path, "w", encoding="utf-8") as f:
                        json.dump(data, f, indent=2)
                    return True, "License validated successfully online."
                else:
                    return False, res_data.get("message", "License validation rejected by Vercel server.")
            elif resp.status_code in (401, 403, 404):
                return False, resp.json().get("message", "License has expired or is invalid.")
    except Exception as e:
        logger.warning(f"Online license verification failed (operating in offline mode): {e}")

    # 5. Offline fallback: Enforce 12-hour grace period
    if not last_check_str:
        return False, "First-time verification requires an active internet connection."

    try:
        last_check_clean = last_check_str.rstrip("Z")
        last_check_dt = datetime.datetime.fromisoformat(last_check_clean)
    except Exception:
        return False, "Invalid offline timestamp configuration."

    elapsed = now - last_check_dt
    elapsed_hours = elapsed.total_seconds() / 3600.0

    if elapsed_hours <= 12.0:
        left = 12.0 - elapsed_hours
        return True, f"Offline Mode (12-hour grace period active. Time left: {left:.1f} hours)"
    else:
        return False, "12-Hour Offline Limit Reached. Please connect to the internet to verify your license."

@router.get("/status")
async def get_license_status():
    """Retrieve detailed activation state and expiry parameters."""
    ok, msg = await check_license_validity()
    
    gmail = ""
    expiry = ""
    key = ""
    license_path = BASE_DIR / "license.json"
    if license_path.exists():
        try:
            with open(license_path, "r", encoding="utf-8") as f:
                data = json.load(f)
                gmail = data.get("gmail", "")
                expiry = data.get("expiry_date", "")
                key = data.get("license_key", "")
        except Exception:
            pass
            
    return {
        "valid": ok,
        "message": msg,
        "gmail": gmail,
        "expiry_date": expiry,
        "license_key": key
    }

@router.post("/activate")
async def activate_license_endpoint(req: LicenseActivateRequest):
    """Enables users to activate their product directly from the React UI."""
    import activate
    settings = load_settings()
    server_url = settings.get("license_server_url", "https://omni-automator.vercel.app")
    
    success = activate.activate_license(req.license_key, req.gmail, req.password, server_url)
    if success:
        return {"status": "success", "message": "License activated successfully!"}
    else:
        raise HTTPException(
            status_code=403,
            detail="Activation failed! Check credentials, Vercel endpoints, or device limits."
        )
