# REVIEW.md — AutoStitch v1 Open Issues & Pending Decisions
## Agent rule: Add items freely. Only mark RESOLVED when fully confirmed working.

---

## Format

```
## [STATUS] SHORT_TITLE
**Opened:** session N
**Resolved:** session N (or "open")
**Severity:** blocker / high / medium / low
**Description:** what the issue is
**Resolution:** what was done (fill in when resolved)
```

---

## [OPEN] Stable Audio inference interface unknown
**Opened:** Session 1
**Resolved:** open
**Severity:** blocker for Phase 4
**Description:**
Stable Audio repo not yet received. Cannot write `engine_sfx.py` until we know:
- The Python import path of the inference function
- Whether it's sync or async
- What arguments it takes (prompt str, duration float, output_path Path?)
- What audio format it outputs (wav? what samplerate?)
- Whether it requires CUDA or can run on CPU
**Resolution:** Pending repo delivery from project owner.

---

## [OPEN] PocketTTS inference interface unknown
**Opened:** Session 1
**Resolved:** open
**Severity:** blocker for Phase 5
**Description:**
PocketTTS repo not yet received. Cannot write `engine_tts.py` until we know:
- The Python import path of the inference function
- Voice selection mechanism (voice ID? file path to reference audio?)
- Whether it supports streaming output or batch only
- Output format (wav? mp3?)
- GPU vs CPU requirement
**Resolution:** Pending repo delivery from project owner.

---

## [OPEN] NiceGUI drag-and-drop for lane reordering
**Opened:** Session 1
**Resolved:** open
**Severity:** high
**Description:**
NiceGUI 1.4.x has `ui.sortable` (wraps SortableJS) for drag-and-drop reordering.
Need to confirm it works correctly when items are dynamically added/removed
and that the order change event fires reliably to update the manifest.
Agent implementing Phase 3 must test this with >5 items.
**Resolution:** Pending implementation.

---

## [OPEN] FFmpeg concat with mixed audio presence
**Opened:** Session 1
**Resolved:** open
**Severity:** medium
**Description:**
Some clip slots may have voice but no SFX, or SFX but no voice, or neither.
The FFmpeg filter_complex in stitcher.py must handle all four combinations
without crashing. The concat step must also handle clips with different
audio channel counts (mono vs stereo).
Specification is in STITCHER.md but needs to be validated in code.
**Resolution:** Pending Phase 6.

---

## [OPEN] Windows venv activation in .bat files
**Opened:** Session 1
**Resolved:** open
**Severity:** medium
**Description:**
Windows venv activation path is `.venv\Scripts\activate.bat` but this behaves
differently in cmd.exe vs PowerShell. All .bat files must be tested in both.
Also: if Python 3.11 is not the system default, warmup.bat needs to find it.
Consider using `py -3.11` launcher instead of bare `python`.
**Resolution:** Pending Phase 7.

---

## [OPEN] Model weight download size and disk space
**Opened:** Session 1
**Resolved:** open
**Severity:** low
**Description:**
Stable Audio and PocketTTS model weights are unknown size until repos arrive.
warmup.bat should check available disk space before downloading and warn the
user if < 10GB free. Also needs resume-on-failure for large downloads.
**Resolution:** Pending repo delivery.

---

## [OPEN] Thumbnail generation for video tiles
**Opened:** Session 1
**Resolved:** open
**Severity:** low
**Description:**
Lane 1 tiles should show a thumbnail of the first frame. This requires running
`ffprobe` + `ffmpeg -frames:v 1` per clip. For 20+ clips this could be slow.
Consider: generate thumbnails in a background thread on folder open, show
placeholder spinner until each thumbnail is ready.
**Resolution:** Pending Phase 3.

---

## RESOLVED items

<!-- Move items here when resolved, fill in Resolution field -->
