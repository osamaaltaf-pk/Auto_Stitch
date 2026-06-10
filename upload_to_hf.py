"""
AutoStitch - Upload assets to HuggingFace
=========================================
Run this ONCE from your dev machine to push large files to HF.

Usage:
    pip install huggingface_hub
    huggingface-cli login
    python upload_to_hf.py
"""

import os
from pathlib import Path
from huggingface_hub import HfApi, create_repo

# ── CONFIG ────────────────────────────────────────────────────────────────────
HF_USERNAME   = "deepLEARNING786"
REPO_NAME     = "autostitch-assets"
REPO_ID       = f"{HF_USERNAME}/{REPO_NAME}"
REPO_TYPE     = "dataset"   # dataset repos have no file size limits
ROOT          = Path(__file__).parent  # folder where this script lives

# Files/folders to upload to HF assets repo (large binaries)
LARGE_FILES = [
    "bin/python-3.12.10-amd64.exe",
    "bin/ffmpeg.exe",
    "bin/ffprobe.exe",
    "bin/rhubarb.exe",
]

# ── MAIN ──────────────────────────────────────────────────────────────────────
api = HfApi()

print(f"Creating/verifying repo: {REPO_ID}")
create_repo(
    repo_id=REPO_ID,
    repo_type=REPO_TYPE,
    exist_ok=True,
    private=False,
)

for rel_path in LARGE_FILES:
    local = ROOT / rel_path
    if not local.exists():
        print(f"  [SKIP] Not found: {rel_path}")
        continue
    size_mb = local.stat().st_size / 1_048_576
    print(f"  Uploading {rel_path}  ({size_mb:.1f} MB)...")
    api.upload_file(
        path_or_fileobj=str(local),
        path_in_repo=rel_path,
        repo_id=REPO_ID,
        repo_type=REPO_TYPE,
    )
    print(f"  [OK] {rel_path}")

print()
print("====================================================")
print(" Upload complete!")
print(f" Assets at: https://huggingface.co/datasets/{REPO_ID}")
print("====================================================")
