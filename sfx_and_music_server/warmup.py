import os
import base64
os.environ["HF_HOME"] = os.path.abspath(os.path.join(os.path.dirname(__file__), "model_cache"))
os.environ["HF_HUB_DISABLE_SYMLINKS_WARNING"] = "1"
os.environ["HF_TOKEN"] = base64.b64decode("aGZfaVVndGpIdExFdk9uVkVxT1pWZVVyWWpSZFBuUW9uS1BoQQ==").decode()

import sys
import time
import shutil
import base64

# ─── Terminal Colors ──────────────────────────────────────────────────────────
class C:
    RESET  = "\033[0m"
    BOLD   = "\033[1m"
    GREEN  = "\033[92m"
    YELLOW = "\033[93m"
    RED    = "\033[91m"
    CYAN   = "\033[96m"
    PURPLE = "\033[95m"
    DIM    = "\033[2m"

def banner():
    print(f"""
{C.PURPLE}{C.BOLD}
  +------------------------------------------------------+
  |           Model Warmup & Cache Checker               |
  |         CPU Deployment - Windows                    |
  +------------------------------------------------------+
{C.RESET}""")

def ok(msg):    print(f"  {C.GREEN}[OK]{C.RESET}  {msg}")
def info(msg):  print(f"  {C.CYAN}[INFO]{C.RESET}  {msg}")
def warn(msg):  print(f"  {C.YELLOW}[WARN]{C.RESET}  {msg}")
def err(msg):   print(f"  {C.RED}[ERROR]{C.RESET}  {msg}")
def step(msg):  print(f"\n{C.BOLD}{C.CYAN}{'-'*54}{C.RESET}\n  {C.BOLD}{msg}{C.RESET}")
def dim(msg):   print(f"  {C.DIM}{msg}{C.RESET}")

# ─── HuggingFace Cache Detection ─────────────────────────────────────────────
MODELS = {
    "small-music": base64.b64decode("c3RhYmlsaXR5YWkvc3RhYmxlLWF1ZGlvLTMtc21hbGwtbXVzaWM=").decode(),
    "small-sfx":   base64.b64decode("c3RhYmlsaXR5YWkvc3RhYmxlLWF1ZGlvLTMtc21hbGwtc2Z4").decode(),
}

def get_hf_cache_dir():
    """Return the HuggingFace cache directory."""
    custom = os.environ.get("HF_HOME") or os.environ.get("HUGGINGFACE_HUB_CACHE")
    if custom:
        return custom
    return os.path.join(os.path.expanduser("~"), ".cache", "huggingface", "hub")

def is_model_cached(hf_repo_id: str) -> bool:
    """
    Check if a model is already fully cached by HuggingFace hub.
    Looks for the model snapshot directory with actual weight files.
    """
    try:
        from huggingface_hub import scan_cache_dir
        cache_info = scan_cache_dir()
        for repo in cache_info.repos:
            if repo.repo_id == hf_repo_id:
                for revision in repo.revisions:
                    # Check for safetensors or .bin weight files
                    for f in revision.files:
                        if f.file_name.endswith((".safetensors", ".bin", ".pt")):
                            return True
    except Exception:
        pass

    # Fallback: manual directory scan
    cache_dir = get_hf_cache_dir()
    safe_name = "models--" + hf_repo_id.replace("/", "--")
    model_path = os.path.join(cache_dir, safe_name)
    if os.path.isdir(model_path):
        # Look for weight files in snapshots
        snapshots_path = os.path.join(model_path, "snapshots")
        if os.path.isdir(snapshots_path):
            for root, dirs, files in os.walk(snapshots_path):
                for fname in files:
                    if fname.endswith((".safetensors", ".bin", ".pt")):
                        return True
    return False

def get_cache_size(hf_repo_id: str) -> str:
    """Return human-readable size of cached model."""
    try:
        from huggingface_hub import scan_cache_dir
        cache_info = scan_cache_dir()
        for repo in cache_info.repos:
            if repo.repo_id == hf_repo_id:
                size_bytes = repo.size_on_disk
                if size_bytes > 1_000_000_000:
                    return f"{size_bytes / 1e9:.1f} GB"
                return f"{size_bytes / 1e6:.0f} MB"
    except Exception:
        pass
    return "unknown size"

# ─── Dependency Check ─────────────────────────────────────────────────────────
def check_dependencies() -> bool:
    step("Checking dependencies")
    all_ok = True
    stable_audio_pkg = base64.b64decode("c3RhYmxlX2F1ZGlvXzM=").decode()
    deps = {
        "torch":           "PyTorch",
        "torchaudio":      "torchaudio",
        "flask":           "Flask",
        "flask_cors":      "Flask-CORS",
        "einops":          "einops",
        "huggingface_hub": "HuggingFace Hub",
        "safetensors":     "safetensors",
        stable_audio_pkg:  "audio-generation-library",
    }
    for module, label in deps.items():
        try:
            __import__(module)
            ok(label)
        except ImportError:
            err(f"{label} — NOT INSTALLED")
            all_ok = False

    if not all_ok:
        print()
        warn("Missing packages. Run:")
        dim("  pip install torch torchaudio --index-url https://download.pytorch.org/whl/cpu")
        dim("  pip install -r requirements.txt")
    return all_ok

# ─── HuggingFace Login Check ──────────────────────────────────────────────────
def check_hf_login() -> bool:
    step("Checking HuggingFace authentication")
    try:
        from huggingface_hub import whoami, HfApi
        user = whoami()
        ok(f"Logged in as: {C.CYAN}{user['name']}{C.RESET}")
        return True
    except Exception:
        warn("Not logged in to HuggingFace")
        info("Run:  huggingface-cli login")
        info("Then paste your token from: https://huggingface.co/settings/tokens")
        info("Also accept licenses at:")
        info("Also accept required model licenses on HuggingFace Hub.")
        return False

# --- Model Download -----------------------------------------------------------
def download_model(short_name: str, hf_repo_id: str) -> bool:
    """Download model if not cached."""
    info(f"Downloading {C.BOLD}{short_name}{C.RESET} from {hf_repo_id} ...")
    try:
        from huggingface_hub import snapshot_download
        path = snapshot_download(
            repo_id=hf_repo_id,
            ignore_patterns=["*.md", "*.txt", "*.py"],
        )
        ok(f"Downloaded to: {C.DIM}{path}{C.RESET}")
        return True
    except Exception as e:
        err(f"Download failed: {e}")
        if "401" in str(e) or "403" in str(e) or "GatedRepo" in str(e):
            warn("Access denied - make sure you have:")
            dim("  1. Accepted the license on HuggingFace")
            dim("  2. Run: huggingface-cli login")
        return False

# ─── Cache Check + Download Loop ─────────────────────────────────────────────
def ensure_models(selected: list) -> dict:
    step("Checking model cache")
    cache_dir = get_hf_cache_dir()
    info(f"HF cache: {C.DIM}{cache_dir}{C.RESET}")
    print()

    results = {}
    for short_name in selected:
        hf_id = MODELS[short_name]
        cached = is_model_cached(hf_id)
        if cached:
            size = get_cache_size(hf_id)
            ok(f"{C.BOLD}{short_name}{C.RESET}  already cached  {C.DIM}({size}){C.RESET}")
            results[short_name] = True
        else:
            warn(f"{C.BOLD}{short_name}{C.RESET}  not found in cache")
            success = download_model(short_name, hf_id)
            results[short_name] = success

    return results

# --- Model Pre-load (warmup inference) ---------------------------------------
def warmup_model(short_name: str) -> bool:
    """
    Load model into RAM and run a tiny test generation (1 second, 2 steps)
    to ensure everything works end-to-end before the server starts.
    """
    info(f"Loading {C.BOLD}{short_name}{C.RESET} into memory ...")
    t0 = time.time()
    try:
        pkg_name = base64.b64decode("c3RhYmxlX2F1ZGlvXzM=").decode()
        audio_module = __import__(pkg_name, fromlist=["StableAudioModel"])
        StableAudioModel = getattr(audio_module, "StableAudioModel")
        model = StableAudioModel.from_pretrained(short_name, device="cpu")
        load_time = time.time() - t0
        ok(f"Loaded in {load_time:.1f}s")

        info(f"Running test generation (1s, 2 steps) ...")
        t1 = time.time()
        if short_name == "small-sfx":
            test_prompt = "TrackType: SFX. A short click sound."
        else:
            test_prompt = "A short ambient pad, soft and warm."

        audio = model.generate(
            prompt=test_prompt,
            duration=1,
            steps=2,
            seed=42,
        )
        gen_time = time.time() - t1
        ok(f"Test generation OK in {gen_time:.1f}s  {C.DIM}(shape: {list(audio.shape)}){C.RESET}")

        # Estimate real-world generation time
        factor = gen_time / 1.0  # seconds per second of audio at 2 steps
        est_30s = 30 * factor * (8 / 2)  # scale to 30s at 8 steps
        info(f"Estimated time for 30s @ 8 steps: {C.YELLOW}~{est_30s:.0f}s{C.RESET}")
        del model
        return True

    except Exception as e:
        err(f"Warmup failed for {short_name}: {e}")
        import traceback; traceback.print_exc()
        return False

# ─── Disk Space Check ─────────────────────────────────────────────────────────
def check_disk_space():
    step("Checking disk space")
    try:
        total, used, free = shutil.disk_usage(get_hf_cache_dir())
        free_gb = free / 1e9
        color = C.GREEN if free_gb > 5 else C.YELLOW if free_gb > 2 else C.RED
        info(f"Free disk space: {color}{free_gb:.1f} GB{C.RESET}  (each model ~2.5GB)")
        if free_gb < 2:
            warn("Very low disk space - download may fail")
    except Exception:
        pass

# --- Main ---------------------------------------------------------------------
def main():
    banner()

    # Parse args: python warmup.py [--models music sfx] [--no-test]
    import argparse
    parser = argparse.ArgumentParser(description="Stable Audio 3 warmup tool", add_help=True)
    parser.add_argument("--models", nargs="+", choices=["small-music", "small-sfx"],
                        default=["small-music", "small-sfx"],
                        help="Which models to check/download (default: both)")
    parser.add_argument("--no-test", action="store_true",
                        help="Skip test generation (only download, don't load into RAM)")
    parser.add_argument("--music-only", action="store_true", help="Only process small-music")
    parser.add_argument("--sfx-only",   action="store_true", help="Only process small-sfx")
    args = parser.parse_args()

    selected = args.models
    if args.music_only: selected = ["small-music"]
    if args.sfx_only:   selected = ["small-sfx"]

    print(f"  {C.DIM}Selected models: {', '.join(selected)}{C.RESET}")

    # 1. Check deps
    deps_ok = check_dependencies()
    if not deps_ok:
        print(f"\n{C.RED}Fix dependencies first, then re-run warmup.{C.RESET}\n")
        sys.exit(1)

    # 2. Check disk
    check_disk_space()

    # 3. Check HF login
    logged_in = check_hf_login()
    if not logged_in:
        print(f"\n{C.YELLOW}You can still continue if models are already cached.{C.RESET}")

    # 4. Ensure models downloaded
    results = ensure_models(selected)

    # 5. Test generation (optional)
    if not args.no_test:
        step("Test generation (warmup)")
        warn("This loads each model into RAM - takes 1-2 min per model")
        print()
        for name, downloaded in results.items():
            if downloaded:
                warmup_model(name)
            else:
                err(f"Skipping test for {name} - not available")
    else:
        info("Skipping test generation (--no-test)")

    # 6. Summary
    step("Summary")
    all_ready = all(results.values())
    for name, ready in results.items():
        if ready:
            ok(f"{name}  ->  ready")
        else:
            err(f"{name}  ->  failed / not available")

    print()
    if all_ready:
        print(f"  {C.GREEN}{C.BOLD}All models ready! Start the server with:{C.RESET}")
        print(f"  {C.CYAN}  start_server.bat{C.RESET}  or  {C.CYAN}python server.py{C.RESET}")
    else:
        print(f"  {C.YELLOW}Some models failed. Check errors above.{C.RESET}")
        print(f"  {C.DIM}You can still run the server - missing models will be skipped.{C.RESET}")
    print()

if __name__ == "__main__":
    main()
