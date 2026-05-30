# CONSTRAINTS.md — Hard Rules (Never Violate)

These are non-negotiable. No exceptions. No "but it would be easier if..."
If a constraint conflicts with a user request, raise it explicitly and ask for confirmation before proceeding.

---

## Code constraints

1. **Python 3.11 only.** No f-strings or syntax from 3.12+. No walrus operator (`:=`) in places that confuse 3.11. Pin `python_requires = "==3.11.*"` if a setup.py is ever created.

2. **No shell=True.** Every `subprocess.run` and `subprocess.Popen` call must use an explicit list of arguments. Never build shell strings.

3. **No raw string paths.** Every file path is a `pathlib.Path`. No `os.path.join`. No `"C:\\Users\\..."` strings.

4. **No engine repo modification.** The Stable Audio and PocketTTS repos are third-party. Write wrappers in `app/core/`. Never edit files inside `engines/`.

5. **No global mutable state outside manifest.py.** Engine singletons (`_model`) are the only allowed module-level mutable variables, and only in `engine_sfx.py` and `engine_tts.py`.

6. **Manifest is the only state store.** No hidden state in UI components, no class attributes that duplicate manifest data. UI reads manifest; UI events update manifest; manifest triggers UI refresh.

7. **No torch/torchaudio in requirements.txt.** Engine repos own their torch versions. AutoStitch requirements.txt contains only UI and utility packages.

8. **All async UI interactions use NiceGUI's `run.io_bound` or `run.cpu_bound`** for blocking calls. Never `await blocking_function()` directly — it will freeze the event loop.

9. **FFmpeg errors must never crash the app.** All `subprocess.run` calls for FFmpeg are wrapped in try/except. Errors are logged and shown as UI toasts, not raised to the top level.

10. **No internet calls from the running app.** The app is fully offline after warmup. No telemetry, no update checks, no API calls (those are v2 features).

---

## Architecture constraints

11. **One file = one responsibility.** `timeline.py` renders the timeline. `manifest.py` manages state. `stitcher.py` calls FFmpeg. No mixing.

12. **No circular imports.** The dependency direction is: `ui/` → `core/` → `utils/`. `core/` never imports from `ui/`. `utils/` never imports from `core/` or `ui/`.

13. **`app/ui/styles.css` is the only place for custom CSS.** No inline `style=` attributes on NiceGUI elements (except for dynamic values like width that can't be class-based).

14. **Project files are forward-compatible.** `manifest.py` must handle loading a manifest.json that has missing fields (use `default` in dataclass). Never break old project files with new schema changes.

---

## Windows constraints

15. **All `.bat` files use `py -3.11`, not `python`.** The `py` launcher handles multiple Python installs correctly on Windows.

16. **All paths in `.bat` files use backslash or forward slash consistently.** Windows cmd.exe accepts both, but be consistent. Prefer forward slash inside `powershell -Command` blocks.

17. **No UNIX-only commands in `.bat` files.** No `curl` (use PowerShell `Invoke-WebRequest`), no `wget`, no `sed`, no `grep`. Use `findstr` instead of `grep`.

18. **The app must work without admin rights.** No writing to `C:\Program Files`. No registry writes. Everything goes in the project directory.

---

## UI constraints

19. **No blocking calls on the NiceGUI event loop.** All engine calls, file I/O, and FFmpeg calls are run in executors.

20. **Every user-visible error has a toast notification.** `ui.notify(message, type="negative")` for errors, `ui.notify(message, type="positive")` for success. Never fail silently.

21. **The Render button is disabled during render.** Set `render_button.disable()` at render start, `render_button.enable()` at render end (success or failure).

22. **Lane tile widths are consistent.** All tiles across all lanes are the same width (120px in v1). This ensures visual alignment between lanes.

---

## Scope constraints

23. **Do not implement v2 features.** These are explicitly OUT OF SCOPE for v1:
    - Cloud API generation (Veo, ElevenLabs, Imagen, Stable Diffusion API)
    - Video preview/playback inside the timeline
    - OTIO / Kdenlive export
    - Undo/redo
    - Multi-project tabs
    - Real-time waveform display
    - Any feature not listed in AGENT.md MVP scope

    If the user asks for a v2 feature during v1 implementation: acknowledge it,
    add it to REVIEW.md as a future item, and do not implement it now.

24. **Do not add dependencies not in STACK.md without updating STACK.md first.**
    If a new package is genuinely needed, add it to STACK.md with rationale,
    then add to requirements.txt.
