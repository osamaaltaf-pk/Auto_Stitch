import os
import base64
from pathlib import Path
# Force HuggingFace Hub to cache all downloaded weights locally within the server's directory
os.environ["HF_HOME"] = os.path.abspath(os.path.join(os.path.dirname(__file__), "model_cache"))
os.environ["HF_HUB_DISABLE_SYMLINKS_WARNING"] = "1"
os.environ["HF_TOKEN"] = base64.b64decode("aGZfaVVndGpIdExFdk9uVkVxT1pWZVVyWWpSZFBuUW9uS1BoQQ==").decode()

import io
import time
import uuid
import threading
import traceback
import base64
from flask import Flask, request, jsonify, send_file, send_from_directory
from flask_cors import CORS

# ─── Configuration ──────────────────────────────────────────────────────────────
OUTPUT_DIR = Path("outputs")
OUTPUT_DIR.mkdir(exist_ok=True)

app = Flask(__name__, static_folder=".")
CORS(app)

# Global model cache — load once, reuse
_models = {}
_model_lock = threading.Lock()
_jobs = {}  # job_id -> {"status", "file", "error", "started", "finished"}
_switch_state = {"status": "idle", "target": None, "error": None}  # tracks async model switch

# ─── Model Loading ───────────────────────────────────────────────────────────────
def load_model(model_name: str):
    """Load model once and cache it. Thread-safe."""
    # Check if target model is already cached locally to enable offline mode and bypass token validation
    cache_dir = Path(os.environ["HF_HOME"]) / "hub"
    has_local = False
    if cache_dir.exists():
        for folder in cache_dir.glob(f"*stable-audio-3-{model_name}*"):
            snapshots_dir = folder / "snapshots"
            if snapshots_dir.exists() and any(snapshots_dir.iterdir()):
                has_local = True
                break

    if has_local:
        print(f"[INFO] Local cache found for '{model_name}'. Enabling offline mode to bypass token verification.")
        os.environ["HF_HUB_OFFLINE"] = "1"
        os.environ["TRANSFORMERS_OFFLINE"] = "1"
    else:
        print(f"[INFO] Local cache NOT found for '{model_name}'. Enabling online mode for first-time model download.")
        os.environ["HF_HUB_OFFLINE"] = "0"
        os.environ["TRANSFORMERS_OFFLINE"] = "0"

    with _model_lock:
        if model_name not in _models:
            print(f"[INFO] Loading model '{model_name}'...")
            try:
                pkg_name = base64.b64decode("c3RhYmxlX2F1ZGlvXzM=").decode()
                audio_module = __import__(pkg_name, fromlist=["StableAudioModel"])
                StableAudioModel = getattr(audio_module, "StableAudioModel")
                model = StableAudioModel.from_pretrained(model_name, device="cpu")
                _models[model_name] = model
                print(f"[INFO] Model '{model_name}' loaded successfully")
            except Exception as e:
                print(f"[ERROR] Failed to load '{model_name}': {e}")
                raise
        return _models[model_name]


# ─── Generation Worker ───────────────────────────────────────────────────────────
def _generate_worker(job_id: str, params: dict):
    import torchaudio
    import torch

    _jobs[job_id]["status"] = "running"
    _jobs[job_id]["started"] = time.time()

    try:
        model_name = params.get("model", "small-music")
        model = load_model(model_name)

        prompt        = params.get("prompt", "")
        neg_prompt    = params.get("negative_prompt", "poor quality")
        duration      = float(params.get("duration", 30))
        steps         = int(params.get("steps", 8))
        cfg_scale     = float(params.get("cfg_scale", 1.0))
        seed          = int(params.get("seed", -1))
        mode          = params.get("mode", "text_to_audio")  # text_to_audio | inpaint | audio_to_audio

        gen_kwargs = dict(
            prompt=prompt,
            negative_prompt=neg_prompt,
            duration=duration,
            steps=steps,
            cfg_scale=cfg_scale,
            seed=seed,
        )

        # ── Inpainting / Continuation ──────────────────────────────────────────
        if mode == "inpaint" and "audio_path" in params:
            audio_path = params["audio_path"]
            inpaint_audio = torchaudio.load(audio_path)
            gen_kwargs["inpaint_audio"] = inpaint_audio
            gen_kwargs["inpaint_mask_start_seconds"] = float(params.get("mask_start", 0.0))
            gen_kwargs["inpaint_mask_end_seconds"]   = float(params.get("mask_end", duration))

        # ── Audio-to-Audio ─────────────────────────────────────────────────────
        elif mode == "audio_to_audio" and "audio_path" in params:
            audio_path = params["audio_path"]
            init_audio = torchaudio.load(audio_path)
            gen_kwargs["init_audio"] = init_audio
            gen_kwargs["init_noise_level"] = float(params.get("noise_level", 0.7))

        print(f"[JOB {job_id}] Generating | model={model_name} | mode={mode} | dur={duration}s | steps={steps}")
        audio = model.generate(**gen_kwargs)

        # Save output
        out_file = OUTPUT_DIR / f"{job_id}.wav"

        # Determine sample rate from model config
        try:
            sample_rate = model.model_config.get("sample_rate", 44100)
        except Exception:
            sample_rate = 44100

        # audio shape: (channels, samples) or (batch, channels, samples)
        if audio.dim() == 3:
            audio = audio[0]
        audio = audio.to(torch.float32).div(torch.max(torch.abs(audio)).clamp(min=1e-8)).clamp(-1, 1)
        audio = (audio * 32767).to(torch.int16).cpu()
        torchaudio.save(str(out_file), audio, sample_rate)

        _jobs[job_id]["status"]   = "done"
        _jobs[job_id]["file"]     = str(out_file)
        _jobs[job_id]["finished"] = time.time()
        elapsed = _jobs[job_id]["finished"] - _jobs[job_id]["started"]
        print(f"[JOB {job_id}] Done in {elapsed:.1f}s -> {out_file}")

    except Exception as e:
        tb = traceback.format_exc()
        _jobs[job_id]["status"] = "error"
        _jobs[job_id]["error"]  = str(e)
        _jobs[job_id]["tb"]     = tb
        print(f"[JOB {job_id}] ERROR: {e}\n{tb}")


# ─── Routes ──────────────────────────────────────────────────────────────────────

@app.route("/")
def index():
    return send_file("index.html")


@app.route("/api/generate", methods=["POST"])
def api_generate():
    """Start an async generation job. Returns job_id immediately."""
    data = request.get_json(force=True)
    if not data.get("prompt", "").strip() and data.get("mode") == "text_to_audio":
        return jsonify({"error": "prompt is required"}), 400

    job_id = str(uuid.uuid4())[:8]
    _jobs[job_id] = {"status": "queued", "file": None, "error": None}

    thread = threading.Thread(target=_generate_worker, args=(job_id, data), daemon=True)
    thread.start()

    return jsonify({"job_id": job_id, "status": "queued"})


@app.route("/api/status/<job_id>")
def api_status(job_id):
    """Poll job status."""
    if job_id not in _jobs:
        return jsonify({"error": "Job not found"}), 404
    job = dict(_jobs[job_id])
    job.pop("tb", None)  # don't expose full traceback
    if job.get("started") and job.get("finished"):
        job["elapsed_seconds"] = round(job["finished"] - job["started"], 1)
    elif job.get("started"):
        job["elapsed_seconds"] = round(time.time() - job["started"], 1)
    return jsonify(job)


@app.route("/api/download/<job_id>")
def api_download(job_id):
    """Download the generated WAV file."""
    if job_id not in _jobs:
        return jsonify({"error": "Job not found"}), 404
    job = _jobs[job_id]
    if job["status"] != "done" or not job["file"]:
        return jsonify({"error": "File not ready"}), 400
    return send_file(job["file"], mimetype="audio/wav", as_attachment=True,
                     download_name=f"generated_audio_{job_id}.wav")


@app.route("/api/upload", methods=["POST"])
def api_upload():
    """Upload an audio file for inpainting / audio-to-audio."""
    if "file" not in request.files:
        return jsonify({"error": "No file"}), 400
    f = request.files["file"]
    if not f.filename:
        return jsonify({"error": "Empty filename"}), 400
    safe_name = f"{uuid.uuid4()[:8]}_{Path(f.filename).name}"
    save_path = OUTPUT_DIR / safe_name
    f.save(str(save_path))
    return jsonify({"path": str(save_path), "name": safe_name})


@app.route("/api/jobs")
def api_jobs():
    """List recent jobs (last 20)."""
    jobs = [
        {"id": jid, **{k: v for k, v in info.items() if k not in ("tb", "file")}}
        for jid, info in list(_jobs.items())[-20:]
    ]
    return jsonify(jobs[::-1])


@app.route("/api/health")
def api_health():
    return jsonify({"status": "ok", "loaded_models": list(_models.keys())})


@app.route("/api/model/switch", methods=["POST"])
def api_model_switch():
    """
    Non-blocking model switch.
    Unloads other models, starts loading the target model in a background thread,
    and returns immediately with status='loading'.
    Poll /api/health and check loaded_models to know when it's ready.
    """
    data = request.get_json(force=True)
    target_model = data.get("model")
    if not target_model:
        return jsonify({"error": "model parameter is required"}), 400

    # Handle explicit unload request
    if target_model.lower() in ("none", "unload"):
        with _model_lock:
            for m in list(_models.keys()):
                print(f"[INFO] Unloading model '{m}' to free up memory...")
                _models.pop(m)

            import gc, torch
            gc.collect()
            if torch.cuda.is_available():
                torch.cuda.empty_cache()

        _switch_state["status"] = "idle"
        _switch_state["target"] = None
        _switch_state["error"] = None

        return jsonify({
            "status": "success",
            "active_model": None,
            "loaded_models": []
        })

    # If already loaded, nothing to do
    if target_model in _models:
        print(f"[INFO] Model '{target_model}' is already loaded.")
        return jsonify({
            "status": "success",
            "active_model": target_model,
            "loaded_models": list(_models.keys())
        })

    # Unload other models immediately to free RAM
    with _model_lock:
        other_models = [m for m in list(_models.keys()) if m != target_model]
        for m in other_models:
            print(f"[INFO] Unloading model '{m}' to free up memory...")
            _models.pop(m)

        import gc, torch
        gc.collect()
        if torch.cuda.is_available():
            torch.cuda.empty_cache()

    # Mark switch as in-progress
    _switch_state["status"] = "loading"
    _switch_state["target"] = target_model
    _switch_state["error"] = None

    def _load_in_background():
        print(f"[INFO] Background thread: loading model '{target_model}'...")
        try:
            load_model(target_model)
            _switch_state["status"] = "done"
            print(f"[INFO] Background thread: model '{target_model}' ready.")
        except Exception as e:
            _switch_state["status"] = "error"
            _switch_state["error"] = str(e)
            print(f"[ERROR] Background thread: failed to load '{target_model}': {e}")

    t = threading.Thread(target=_load_in_background, daemon=True)
    t.start()

    return jsonify({
        "status": "loading",
        "active_model": target_model,
        "message": f"Loading {target_model} in background. Poll /api/health until it appears in loaded_models."
    })


@app.route("/api/model/status")
def api_model_status():
    """Check the current async model switch status."""
    return jsonify({
        "switch_status": _switch_state["status"],
        "target_model": _switch_state["target"],
        "error": _switch_state["error"],
        "loaded_models": list(_models.keys())
    })


# ─── Main ─────────────────────────────────────────────────────────────────────────
if __name__ == "__main__":
    print("=" * 60)
    print("  Sound & Music CPU Server")
    print("  Ready for requests")
    print("=" * 60)
    # Pre-warm: comment this out if you want lazy loading
    # threading.Thread(target=load_model, args=("small-music",), daemon=True).start()
    app.run(host="0.0.0.0", port=5000, debug=False, threaded=True)
