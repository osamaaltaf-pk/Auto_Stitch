"""
AutoStitch - Upload full code repo to HuggingFace
==================================================
Pushes your entire codebase (excluding venvs, __pycache__, large bins)
to a HF Space or dataset repo so users can clone it.

Usage:
    pip install huggingface_hub
    huggingface-cli login
    python upload_code_to_hf.py
"""

import os
from pathlib import Path
from huggingface_hub import HfApi, create_repo

HF_USERNAME = "deepLEARNING786"
REPO_NAME   = "AutoStitch"
REPO_ID     = f"{HF_USERNAME}/{REPO_NAME}"
REPO_TYPE   = "dataset"
ROOT        = Path(__file__).parent

# Ignored pattern list for upload_folder (matches venvs, cache, user data, and skipped binaries)
IGNORE_PATTERNS = [
    "venv",
    "__pycache__",
    ".git",
    "node_modules",
    ".venv",
    "output",
    "outputs",
    "scratch",
    "projects",
    "model_cache",
    "thumbnails",
    "tts_audio",
    "sfx_audio",
    "uploaded_voices",
    "ffmpeg.exe",
    "ffprobe.exe",
    "rhubarb.exe",
    "python-3.12.10-amd64.exe",
    "license.json",
    "diff.txt",
    "cleaned-landing.html",
    "*.mp4",
]

api = HfApi()

print(f"Creating/verifying repo: {REPO_ID}")
create_repo(repo_id=REPO_ID, repo_type=REPO_TYPE, exist_ok=True, private=False)

print(f"\nUploading folder '{ROOT}' to Hugging Face '{REPO_ID}' in a single commit...")
print("This will upload all files (including large binaries like python installer and Sphinx models) via S3 and merge them in 1 commit.")

api.upload_folder(
    folder_path=str(ROOT),
    repo_id=REPO_ID,
    repo_type=REPO_TYPE,
    ignore_patterns=IGNORE_PATTERNS,
    commit_message="Upload entire codebase batch via upload_folder"
)

print()
print("====================================================")
print(" Done! Upload complete.")
print(f" Repo: https://huggingface.co/datasets/{REPO_ID}")
print("====================================================")
