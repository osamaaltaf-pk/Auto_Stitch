# MEMORY.md — AutoStitch v1 Persistent Memory
## This file tracks cumulative progress across ALL sessions and agents.
## AGENT RULE: Append to this file at the END of every session. Never delete old entries.

---

## Feature completion checklist

### Phase 0 — Docs + scaffolding
- [x] AGENT.md created
- [x] ARCHITECTURE.md created
- [x] CONTEXT.md created
- [x] MEMORY.md created
- [x] DIFF_MEMORY.md created
- [x] REVIEW.md created
- [x] STACK.md created
- [x] MANIFEST.md created
- [x] UI_SPEC.md created
- [x] LANES.md created
- [x] ENGINES.md created
- [x] STITCHER.md created
- [x] INSTALLER.md created
- [x] CONSTRAINTS.md created
- [ ] README.md created
- [ ] Repo folder structure scaffolded (empty __init__.py files, dirs)

### Phase 1 — Core manifest + data model
- [ ] `app/core/manifest.py` — dataclasses defined
- [ ] `app/core/manifest.py` — load/save to JSON
- [ ] `app/core/manifest.py` — state machine transitions work
- [ ] `app/core/project.py` — save/load .autostitch project file
- [ ] Unit tests: manifest serialisation round-trip

### Phase 2 — NiceGUI UI shell
- [ ] `main.py` — starts NiceGUI, opens browser
- [ ] `app/ui/toolbar.py` — top bar with Render button
- [ ] `app/ui/left_panel.py` — file browser panel
- [ ] `app/ui/timeline.py` — outer timeline container
- [ ] `app/ui/styles.css` — dark theme, lane colours
- [ ] Config loads on startup
- [ ] ffmpeg.exe health check on startup

### Phase 3 — Lane 1 (Video)
- [ ] Open folder → scan for .mp4, sorted by name
- [ ] Clips appear as tiles in Lane 1
- [ ] Tiles are draggable (reorder)
- [ ] Tiles are selectable (click to highlight)
- [ ] Tile shows filename + thumbnail (ffprobe frame grab)
- [ ] Tile shows duration

### Phase 4 — Lane 2 (SFX)
- [ ] Drop .txt file → lines appear as SFX blocks
- [ ] Blocks align under their video slot
- [ ] Blocks are drag/drop reorderable
- [ ] Blocks are editable (double-click → inline text edit)
- [ ] Split block at cursor
- [ ] Merge two adjacent blocks
- [ ] Delete block
- [ ] Click-to-generate → calls engine_sfx.generate()
- [ ] Status colours: idle / generating / done / error
- [ ] engine_sfx.py wrapper written for Stable Audio
- [ ] engine_sfx.health_check() works

### Phase 5 — Lane 3 (Voice)
- [ ] Open folder → .mp3/.wav files appear as voice blocks
- [ ] Drop .txt file → lines appear as TTS blocks
- [ ] Blocks align under their video slot
- [ ] All same drag/edit/split/merge/delete as Lane 2
- [ ] Click-to-generate TTS → calls engine_tts.generate()
- [ ] Status colours match Lane 2
- [ ] engine_tts.py wrapper written for PocketTTS
- [ ] engine_tts.health_check() works

### Phase 6 — FFmpeg stitcher
- [ ] Per-clip: attach video + mix voice + mix sfx
- [ ] Audio ducking: SFX ducks under voice
- [ ] loudnorm applied to final output
- [ ] Output to /output/clip_NN_final.mp4
- [ ] Optional concat to /output/master.mp4
- [ ] Render progress shown in UI (% per clip)
- [ ] Render errors shown as toast + logged

### Phase 7 — Batch files
- [ ] warmup.bat — downloads ffmpeg.exe + ffprobe.exe
- [ ] warmup.bat — downloads Stable Audio model weights
- [ ] warmup.bat — downloads PocketTTS model weights
- [ ] installer.bat — creates venv, pip install -r requirements.txt
- [ ] installer.bat — launches app after install
- [ ] run.bat — shortcut to launch after first install
- [ ] All .bat files work on Windows 10 and 11 clean installs

### Phase 8 — Project save/load
- [ ] Save project → .autostitch JSON
- [ ] Load project → restores full timeline state
- [ ] Auto-save on render
- [ ] Recent projects list in left panel

### Phase 9 — QA
- [ ] Full render pass with real clips produces correct output
- [ ] All lane interactions tested (drag, edit, split, merge, delete)
- [ ] Engine errors handled gracefully (no crash)
- [ ] Missing file handled gracefully (no crash)
- [ ] Clean Windows install tested end-to-end with warmup.bat + installer.bat

---

## Permanent notes (things learned, never forget)

- Python 3.11 is pinned. Do not upgrade.
- Engine repos provided externally by project owner. Never modify them.
- NiceGUI reactive bindings require `ui.refreshable` decorator for dynamic lists.
  Use `@ui.refreshable` on lane render functions, call `.refresh()` on manifest change.
- FFmpeg bundled at `bin/ffmpeg.exe` — never rely on system PATH.
- All paths via `pathlib.Path`. No raw strings.
- Manifest is the ONLY place state is stored. UI is a view.
